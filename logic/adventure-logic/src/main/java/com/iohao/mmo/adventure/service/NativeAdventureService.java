package com.iohao.mmo.adventure.service;

import com.iohao.mmo.adventure.entity.NativeAdventureProgress;
import com.iohao.mmo.adventure.entity.NativeRewardGrant;
import com.iohao.mmo.adventure.entity.NativeSubmapProgress;
import com.iohao.mmo.adventure.proto.*;
import com.iohao.mmo.equip.entity.Equip;
import com.iohao.mmo.equip.service.EquipService;
import com.iohao.mmo.enchant.entity.EquipEnchant;
import com.iohao.mmo.level.service.LevelService;
import com.iohao.mmo.person.entity.BasicProperty;
import com.iohao.mmo.person.entity.Person;
import com.iohao.mmo.person.service.PersonService;
import com.iohao.mmo.pet.entity.PetBag;
import com.iohao.mmo.quest.entity.Quest;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.LongSupplier;
import static com.iohao.mmo.adventure.service.NativeAdventureCatalog.*;

@Service
public class NativeAdventureService {
    private final MongoTemplate mongo;
    private final PersonService people;
    private final LevelService levels;
    private final EquipService equipment;
    private final NativeAdventureRewards rewards;
    private final LongSupplier clock;
    private final Map<Long, Player> players = new HashMap<>();
    private final Map<Integer, Realm> worlds = new HashMap<>();
    private long eventSequence;
    private static final long PRESENCE_TIMEOUT = 45_000;
    private static final float MOVE_SPEED = 6;

    @org.springframework.beans.factory.annotation.Autowired
    public NativeAdventureService(MongoTemplate mongo, PersonService people, LevelService levels,
                                  EquipService equipment, NativeAdventureRewards rewards) {
        this(mongo, people, levels, equipment, rewards, System::currentTimeMillis);
    }

    NativeAdventureService(MongoTemplate mongo, PersonService people, LevelService levels,
                           EquipService equipment, NativeAdventureRewards rewards, LongSupplier clock) {
        this.mongo = mongo; this.people = people; this.levels = levels;
        this.equipment = equipment; this.rewards = rewards; this.clock = clock;
    }

    public synchronized NativeWorldSnapshot enter(long userId, NativeWorldRequest request) {
        Player player = player(userId);
        long now = clock.getAsLong();
        if (request == null || !request.resume && !validSubmap(request.realm, request.submap)) return response(player, false, "场景不存在");
        refreshStats(player);
        int realm = request.resume ? player.progress.realm : request.realm;
        int submap = request.resume ? player.progress.submap : request.submap;
        if (player.level < requiredLevel(realm, submap)) return response(player, false, "等级不足，暂未开启此场景");
        if (!submapUnlocked(player.progress, realm, submap)) return response(player, false, "请先领取上一场景的旅途宝箱");
        if (realm != player.progress.realm || submap != player.progress.submap) {
            if (player.progress.health <= 0 || now - player.lastDamage < 5_000)
                return response(player, false, "请先离开战斗再穿行七界");
            player.progress.realm = realm;
            player.progress.submap = submap;
            player.progress.x = spawnX(realm, submap); player.progress.z = spawnZ(realm, submap); player.progress.yaw = 0;
            player.moveBudget = 1; player.moveAt = now;
            player.eventCursor = eventSequence;
            player.action = ""; player.actionAt = 0; player.combo = 0;
        }
        player.lastSeen = now;
        player.present = true;
        world(realm, submap);
        save(player);
        projectQuest(player);
        return response(player, true, story(realm, submap));
    }

    public synchronized NativeWorldSnapshot snapshot(long userId) {
        Player player = player(userId);
        player.lastSeen = clock.getAsLong();
        refreshStats(player);
        return response(player, true, "");
    }

    public synchronized NativeWorldSnapshot move(long userId, NativeMoveRequest request) {
        Player player = player(userId);
        NativeAdventureProgress p = player.progress;
        long now = clock.getAsLong();
        player.lastSeen = now;
        if (request == null || !player.present || request.realm != p.realm || request.submap != p.submap || p.health <= 0)
            return response(player, false, "当前无法移动");
        if (request.sequence <= p.lastMoveSequence) return response(player, true, "");
        if (request.sequence > p.lastMoveSequence + 10_000 || !Float.isFinite(request.yaw)
                || !positionValid(p.realm, p.submap, request.x, request.z)) return response(player, false, "移动位置无效");
        player.moveBudget = Math.min(now < player.invulnerableUntil ? 6 : 3,
                player.moveBudget + Math.max(0, now - player.moveAt) * MOVE_SPEED / 1000f);
        player.moveAt = now;
        double length = distance(p.x, p.z, request.x, request.z);
        if (length > player.moveBudget + .05 || !pathValid(p.realm, p.submap, p.x, p.z, request.x, request.z))
            return response(player, false, "移动过快，已校正位置");
        player.moveBudget -= (float) length;
        p.x = request.x; p.z = request.z; p.yaw = ((request.yaw % 360) + 360) % 360;
        p.lastMoveSequence = request.sequence;
        if (now - player.lastSave >= 1_000) save(player);
        return response(player, true, "");
    }

    public synchronized NativeWorldSnapshot action(long userId, NativeCombatRequest request) {
        Player player = player(userId);
        NativeAdventureProgress p = player.progress;
        long now = clock.getAsLong();
        player.lastSeen = now;
        if (request == null || request.realm != p.realm || request.submap != p.submap || !player.present || p.health <= 0)
            return response(player, false, "当前无法使用技能");
        if (request.sequence <= p.lastActionSequence) return response(player, true, "");
        if (request.sequence > p.lastActionSequence + 10_000) return response(player, false, "技能序号无效");
        String action = request.action == null ? "" : request.action;
        if (!Set.of("attack", "skill", "ultimate", "pet", "dodge", "heal").contains(action))
            return response(player, false, "技能不存在");
        if (p.cooldowns.getOrDefault(action, 0L) > now || player.globalReadyAt > now)
            return response(player, false, "技能尚未恢复");
        refreshStats(player);
        Realm realm = world(p.realm, p.submap);
        Enemy target = realm.enemies.get(request.targetId);
        boolean defense = "skill".equals(action) && "DEFENSE".equals(player.person.getProfession());
        boolean support = defense || "heal".equals(action) || "dodge".equals(action);
        double range = "attack".equals(action) ? 3.9 : "pet".equals(action) ? 12 : 7.5;
        if (!support && (target == null || target.health <= 0 || distance(p.x, p.z, target.x, target.z) > range))
            return response(player, false, "请靠近有效的目标");
        if ("pet".equals(action) && player.petLevel == 0) return response(player, false, "请先让宝宝出战");
        long cooldown = switch (action) { case "attack" -> 520; case "skill" -> defense ? 6000 : 4200;
            case "ultimate" -> 8000; case "pet" -> 7000; case "dodge" -> 1800; default -> 16000; };
        p.lastActionSequence = request.sequence;
        p.cooldowns.put(action, now + cooldown);
        player.globalReadyAt = now + 160;
        player.action = action; player.actionAt = now;
        if ("dodge".equals(action)) { player.invulnerableUntil = now + 550; player.moveBudget = Math.min(6, player.moveBudget + 3); }
        else if (defense) { player.shieldUntil = now + 4000; heal(player, (int) (player.maxHealth * .12), action); }
        else if ("heal".equals(action)) heal(player, (int) (player.maxHealth * .42), action);
        else {
            double multiplier = "ultimate".equals(action) ? 2.5 : "skill".equals(action) ? 1.8 : 1;
            int damage = "pet".equals(action) ? 28 + player.petLevel * 5 : (int) (player.attack * multiplier);
            if (!"pet".equals(action)) {
                player.combo = now > player.comboUntil ? 1 : Math.min(30, player.combo + 1);
                player.comboUntil = now + 2800;
                damage = (int) (damage * (1 + Math.min(10, player.combo) * .05));
                if (java.util.concurrent.ThreadLocalRandom.current().nextInt(100) < player.criticalRate) damage = (int) (damage * 1.7);
            }
            List<Enemy> targets = new ArrayList<>();
            targets.add(target);
            if ("skill".equals(action) || "ultimate".equals(action)) {
                for (Enemy enemy : realm.enemies.values()) if (enemy != target && enemy.health > 0
                        && distance(target.x, target.z, enemy.x, enemy.z) < 4.8) targets.add(enemy);
            }
            for (Enemy enemy : targets) damage(player, enemy, damage, action, now);
        }
        emit(realm, "skill", Long.toString(userId), support ? Long.toString(userId) : request.targetId, action, 0, p.x, p.z, now);
        save(player);
        return response(player, true, "");
    }

    public synchronized NativeWorldSnapshot interact(long userId, NativeInteractRequest request) {
        Player player = player(userId);
        NativeAdventureProgress p = player.progress;
        player.lastSeen = clock.getAsLong();
        if (request == null || request.realm != p.realm || request.submap != p.submap || !player.present || p.health <= 0)
            return response(player, false, "当前无法交互");
        NativeLandmarkMessage landmark = landmarks(player).stream().filter(item -> item.id.equals(request.targetId)).findFirst().orElse(null);
        if (landmark == null || distance(p.x, p.z, landmark.x, landmark.z) > 3.4)
            return response(player, false, "请先走到目标附近");
        if (landmark.collected) return response(player, true, "已领取，不会重复发放");
        if (!landmark.available) return response(player, false, memoryCount(p) < 3 ? "请先收集三份回忆" : "请先净化四名山灵并击败守护者");
        if ("guide".equals(landmark.kind)) { p.introComplete = true; save(player); projectQuest(player); return response(player, true, STORIES[0]); }
        NativeRewardGrant reward = new NativeRewardGrant();
        if ("memory".equals(landmark.kind)) {
            if (p.submap == 0) p.memoryMask |= 1 << landmark.bit;
            else currentSubmap(p).memoryMask |= 1 << landmark.bit;
            reward.gold = 100; reward.experience = 35;
        } else {
            if (p.submap == 0) p.treasureMask |= 1 << p.realm;
            else currentSubmap(p).treasureCollected = true;
            reward.gold = 800; reward.experience = 120; reward.ore = 20; reward.essence = 12; reward.goldenBeans = 1;
            reward.equipment = true; reward.equipmentQuality = 2; reward.equipmentLevel = requiredLevel(p.realm, p.submap); reward.equipmentSlot = 1;
        }
        enqueueReward(player, reward);
        save(player);
        projectQuest(player);
        return response(player, true, landmark.title + "已收入行囊");
    }

    public synchronized NativeWorldSnapshot revive(long userId) {
        Player player = player(userId);
        long now = clock.getAsLong();
        player.lastSeen = now;
        if (player.progress.health > 0) return response(player, false, "当前无需复苏");
        if (now < player.progress.reviveAt) return response(player, false, "正在返回花径，请稍候");
        refreshStats(player);
        player.progress.health = player.maxHealth; player.progress.reviveAt = 0;
        player.progress.x = spawnX(player.progress.realm, player.progress.submap);
        player.progress.z = spawnZ(player.progress.realm, player.progress.submap); player.invulnerableUntil = now + 3000;
        player.moveBudget = 1; player.moveAt = now;
        save(player);
        return response(player, true, "已在花径复苏");
    }

    public synchronized NativeWorldSnapshot leave(long userId) {
        Player player = player(userId);
        player.present = false;
        save(player);
        return response(player, true, "已离开探险");
    }

    @Scheduled(fixedDelay = 100)
    public synchronized void tick() {
        long now = clock.getAsLong();
        for (Player player : players.values()) {
            if (now - player.lastSeen > PRESENCE_TIMEOUT) player.present = false;
        }
        for (Realm realm : worlds.values()) {
            float elapsed = Math.max(0, Math.min(.25f, (now - realm.lastTick) / 1000f));
            realm.lastTick = now;
            for (Enemy enemy : realm.enemies.values()) tickEnemy(realm, enemy, elapsed, now);
        }
        for (Player player : players.values()) {
            if (player.present && player.progress.health > 0 && now - player.lastDamage > 7000) {
                if (now - player.lastRegen >= 1000) {
                    player.progress.health = Math.min(player.maxHealth, player.progress.health + Math.max(1, (int) (player.maxHealth * .035)));
                    player.lastRegen = now;
                }
            }
            if (now - player.lastSave >= 5000) save(player);
        }
        players.values().removeIf(player -> !player.present && now - player.lastSeen > 120_000);
    }

    private void tickEnemy(Realm realm, Enemy enemy, float dt, long now) {
        if (enemy.health <= 0) {
            if (now >= enemy.respawnAt) { enemy.health = enemy.maximum; enemy.x = enemy.spawnX; enemy.z = enemy.spawnZ; enemy.contributors.clear(); enemy.readyAt = now + 1500; }
            return;
        }
        Player target = players.values().stream().filter(player -> player.present && sameRoom(player.progress, realm)
                        && player.progress.health > 0 && now - player.lastSeen < PRESENCE_TIMEOUT
                        && distance(player.progress.x, player.progress.z, enemy.spawnX, enemy.spawnZ) < (enemy.boss ? 22 : 15))
                .min(Comparator.comparingDouble(player -> distance(player.progress.x, player.progress.z, enemy.x, enemy.z))).orElse(null);
        if (enemy.castEndsAt > 0) {
            if (now < enemy.castEndsAt) return;
            for (Player player : players.values()) if (player.present && sameRoom(player.progress, realm) && player.progress.health > 0
                    && distance(player.progress.x, player.progress.z, enemy.castX, enemy.castZ) <= enemy.castRadius) {
                if (now < player.invulnerableUntil) continue;
                int damage = Math.max(3, (enemy.boss ? 30 : 9) + requiredLevel(realm.id, realm.submap) * 3 - player.defense / 5);
                if (now < player.shieldUntil) damage = Math.max(1, (int) (damage * .35));
                player.progress.health = Math.max(0, player.progress.health - damage); player.lastDamage = now;
                if (player.progress.health == 0) player.progress.reviveAt = now + 4000;
                emit(realm, "damage", enemy.id, Long.toString(player.progress.userId), "enemy", damage, player.progress.x, player.progress.z, now);
                save(player);
            }
            enemy.castEndsAt = 0; enemy.readyAt = now + (enemy.boss ? 2000 : 1900);
            return;
        }
        if (target == null) { enemy.targetUserId = 0; enemy.x = approach(enemy.x, enemy.spawnX, dt * 3); enemy.z = approach(enemy.z, enemy.spawnZ, dt * 3); return; }
        enemy.targetUserId = target.progress.userId;
        double range = distance(target.progress.x, target.progress.z, enemy.x, enemy.z);
        if (range > (enemy.boss ? 5 : 2.2)) {
            float amount = Math.min(1, (float) (dt * (enemy.boss ? 2.3 : 2.8) / Math.max(.01, range)));
            enemy.x += (target.progress.x - enemy.x) * amount; enemy.z += (target.progress.z - enemy.z) * amount;
        } else if (now >= enemy.readyAt) {
            enemy.castX = target.progress.x; enemy.castZ = target.progress.z;
            enemy.castStyle = enemy.boss ? enemy.cycle++ % 3 : 0;
            enemy.castRadius = enemy.boss ? enemy.castStyle == 2 ? 5.5f : 3.8f : 2.3f;
            enemy.castEndsAt = now + (enemy.boss ? enemy.health < enemy.maximum / 2 ? 850 : 1300 : 750);
            emit(realm, "cast", enemy.id, Long.toString(target.progress.userId), "enemy", 0, enemy.castX, enemy.castZ, now);
        }
    }

    private void damage(Player player, Enemy enemy, int amount, String action, long now) {
        if (enemy.health <= 0) return;
        enemy.health = Math.max(0, enemy.health - amount);
        enemy.contributors.put(player.progress.userId, now);
        Realm realm = world(player.progress.realm, player.progress.submap);
        emit(realm, "damage", Long.toString(player.progress.userId), enemy.id, action, amount, enemy.x, enemy.z, now);
        if (enemy.health > 0) return;
        enemy.castEndsAt = 0; enemy.respawnAt = now + (enemy.boss ? 120000 : 35000);
        emit(realm, "death", Long.toString(player.progress.userId), enemy.id, action, 0, enemy.x, enemy.z, now);
        for (var contribution : enemy.contributors.entrySet()) {
            Player member = players.get(contribution.getKey());
            if (member == null || !member.present || !sameRoom(member.progress, realm) || now - contribution.getValue() > 15000
                    || distance(member.progress.x, member.progress.z, enemy.x, enemy.z) > 25) continue;
            NativeAdventureProgress progress = member.progress;
            if (progress.submap == 0) {
                progress.realmKills.set(realm.id, Math.min(1_000_000, progress.realmKills.get(realm.id) + (enemy.boss ? 0 : 1)));
                if (enemy.boss) progress.bossMask |= 1 << realm.id;
            } else {
                NativeSubmapProgress local = currentSubmap(progress);
                local.kills = Math.min(1_000_000, local.kills + (enemy.boss ? 0 : 1));
                if (enemy.boss) local.bossDefeated = true;
            }
            NativeRewardGrant grant = new NativeRewardGrant();
            grant.gold = enemy.boss ? 400 : 60; grant.experience = enemy.boss ? 160 : 25;
            grant.ore = enemy.boss ? 12 : 2; grant.essence = enemy.boss ? 8 : 0;
            grant.goldenBeans = enemy.boss ? 1 : 0;
            grant.equipment = enemy.boss || (kills(progress) % 4 == 0);
            grant.equipmentLevel = requiredLevel(realm.id, realm.submap); grant.equipmentQuality = enemy.boss ? 2 : 1; grant.equipmentSlot = 2;
            enqueueReward(member, grant);
            save(member);
            projectQuest(member);
        }
    }

    private void enqueueReward(Player player, NativeRewardGrant reward) {
        reward.sequence = ++player.progress.rewardSequence;
        player.progress.pendingRewards.add(reward);
    }

    private Player player(long userId) {
        if (userId <= 0) throw new IllegalArgumentException("请先登录");
        Player existing = players.get(userId);
        if (existing != null) return existing;
        NativeAdventureProgress progress = mongo.findById(userId, NativeAdventureProgress.class);
        if (progress == null) { progress = new NativeAdventureProgress(); progress.userId = userId; }
        if (!validRealm(progress.realm)) progress.realm = 0;
        if (!validSubmap(progress.realm, progress.submap)) progress.submap = 0;
        if (!positionValid(progress.realm, progress.submap, progress.x, progress.z)) {
            progress.x = spawnX(progress.realm, progress.submap); progress.z = spawnZ(progress.realm, progress.submap);
        }
        if (progress.realmKills == null || progress.realmKills.size() != 7) progress.realmKills = new ArrayList<>(List.of(0,0,0,0,0,0,0));
        if (progress.cooldowns == null) progress.cooldowns = new HashMap<>();
        if (progress.pendingRewards == null) progress.pendingRewards = new ArrayList<>();
        if (progress.submaps == null) progress.submaps = new HashMap<>();
        Player player = new Player(progress);
        player.lastSeen = player.moveAt = clock.getAsLong();
        refreshStats(player);
        if (!progress.initialized) { progress.health = player.maxHealth; progress.initialized = true; }
        else progress.health = Math.min(player.maxHealth, progress.health);
        players.put(userId, player);
        world(progress.realm, progress.submap);
        return player;
    }

    private void refreshStats(Player player) {
        long now = clock.getAsLong();
        if (player.person != null && now - player.statsAt < 2000) return;
        long userId = player.progress.userId;
        people.initPerson(userId);
        player.person = people.getPersonById(userId);
        BasicProperty basic = player.person.getBasicProperty();
        var level = levels.ofLevel(userId); player.level = level.getLevel(); player.experience = level.getExp();
        player.maxHealth = Math.max(1, basic.getHp()) + player.level * 9 + 120;
        player.attack = Math.max(1, basic.getPhysicsAttack() + basic.getBonusAttack() / 3) + 18 + player.level * 2;
        player.defense = Math.max(0, basic.getPhysicsDefense() + basic.getBonusDefense());
        player.criticalRate = Math.min(65, Math.max(0, basic.getCritRate()));
        applyTitleBonus(player, userId);
        for (String id : equipment.loadout(userId).getSlots().values()) {
            Equip equip = equipment.findById(id);
            if (equip == null || equip.getUserId() != userId || equip.getLevel() > player.level || equip.getFixedEquipProperty() == null) continue;
            var fixed = equip.getFixedEquipProperty();
            double multiplier = 1 + equip.getGrade() * .05 + equip.getFurnaceGrade() * .03;
            EquipEnchant enchant = mongo.findOne(Query.query(Criteria.where("equipId").is(id).and("userId").is(userId)), EquipEnchant.class);
            if (enchant != null) multiplier *= 1 + Math.max(0, Math.min(10, enchant.getEnchantLevel())) * .3;
            player.maxHealth += (int) (fixed.getHp() * multiplier);
            player.attack += (int) (fixed.getPhysicsAttack() * multiplier);
            player.defense += (int) (fixed.getPhysicsDefense() * multiplier);
            if (equip.getElseEquipProperty() != null) {
                player.attack += equip.getElseEquipProperty().getPower() * 2;
                player.maxHealth += equip.getElseEquipProperty().getConstitution() * 5;
                player.defense += equip.getElseEquipProperty().getEndurance();
            }
        }
        PetBag bag = mongo.findById(userId, PetBag.class);
        var pet = bag == null || bag.getPetMap() == null ? null : bag.getPetMap().get(bag.getActivePetId());
        player.petLevel = pet == null ? 0 : Math.max(1, pet.getLevel());
        if (player.progress.initialized) player.progress.health = Math.min(player.progress.health, player.maxHealth);
        player.statsAt = now;
    }

    private void applyTitleBonus(Player player, long userId) {
        Document owned = mongo.findOne(Query.query(Criteria.where("playerId").is(userId)), Document.class, "player_title");
        if (owned == null) return;
        Object equipped = owned.get("equippedTitleId");
        if (equipped == null || equipped.toString().isBlank()) return;
        Document title = mongo.findOne(Query.query(Criteria.where("_id").is(equipped.toString())), Document.class, "title_template");
        if (title == null) return;
        player.maxHealth += number(title, "bonusHp");
        player.attack += number(title, "bonusAtk") + number(title, "bonusMagicAtk") / 2
                + number(title, "bonusExtraAtk");
        player.defense += number(title, "bonusDef") + number(title, "bonusExtraDef");
        player.criticalRate = Math.min(65, player.criticalRate + number(title, "bonusAgility") / 5);
    }

    private static int number(Document source, String key) {
        Object value = source.get(key);
        return value instanceof Number number ? number.intValue() : 0;
    }

    private Realm world(int id, int submap) {
        return worlds.computeIfAbsent(id * 3 + submap, key -> new Realm(id, submap, clock.getAsLong()));
    }

    private static boolean sameRoom(NativeAdventureProgress progress, Realm realm) {
        return progress.realm == realm.id && progress.submap == realm.submap;
    }

    private NativeWorldSnapshot response(Player player, boolean accepted, String message) {
        NativeAdventureProgress p = player.progress;
        NativeWorldSnapshot result = new NativeWorldSnapshot();
        result.accepted = accepted; result.message = message; result.serverTime = clock.getAsLong();
        result.realm = p.realm; result.realmName = REALMS[p.realm]; result.x = p.x; result.z = p.z; result.yaw = p.yaw;
        result.submap = p.submap; result.submapName = mapName(p.realm, p.submap);
        result.submapMemoryMask = memoryBits(p); result.submapKills = kills(p);
        result.submapBossDefeated = bossDefeated(p); result.submapTreasureCollected = treasureCollected(p);
        for (int submap = 0; submap < submapCount(p.realm); submap++)
            if (player.level >= requiredLevel(p.realm, submap) && submapUnlocked(p, p.realm, submap)) result.unlockedSubmapMask |= 1 << submap;
        result.health = p.health; result.maxHealth = player.maxHealth; result.reviveAt = p.reviveAt;
        result.lastMoveSequence = p.lastMoveSequence; result.lastActionSequence = p.lastActionSequence;
        result.memoryMask = p.memoryMask; result.bossMask = p.bossMask; result.treasureMask = p.treasureMask; result.introComplete = p.introComplete;
        result.realmKills.addAll(p.realmKills); result.questTitle = p.submap == 0 ? TITLES[p.realm] : mapName(p.realm, p.submap);
        result.questDetail = !hasEnemies(p.realm, p.submap) ? "收集散落回忆 " + memoryCount(p) + "/3"
                : "净化山灵 " + Math.min(4, kills(p)) + "/4 · 回忆 " + memoryCount(p) + "/3 · " + (bossDefeated(p) ? "守护者已安息" : "挑战守护者");
        for (int realm = 0; realm < 7; realm++) if (player.level >= LEVELS[realm]) result.unlockedRealmMask |= 1 << realm;
        result.landmarks.addAll(landmarks(player));
        p.cooldowns.forEach((action, time) -> { NativeCooldownMessage item = new NativeCooldownMessage(); item.action = action; item.readyAt = time; result.cooldowns.add(item); });
        Realm realm = world(p.realm, p.submap);
        for (Enemy enemy : realm.enemies.values()) result.enemies.add(enemy.message(p.realm));
        for (Player other : players.values()) if (other != player && other.present && sameRoom(other.progress, realm)
                && result.serverTime - other.lastSeen < PRESENCE_TIMEOUT && distance(p.x,p.z,other.progress.x,other.progress.z) < 55) result.players.add(other.message());
        for (NativeCombatEvent event : realm.events) if (event.id > player.eventCursor) result.events.add(event);
        player.eventCursor = eventSequence;
        if (!p.pendingRewards.isEmpty()) { result.rewards.addAll(rewards.drain(p)); player.statsAt = 0; refreshStats(player); }
        for (int realmId = 0; realmId < REALMS.length; realmId++) for (int submap = 0; submap < 3; submap++) {
            int key = realmId * 3 + submap;
            int memories = 0;
            if (validSubmap(realmId, submap)) {
                NativeSubmapProgress progress = submap == 0 ? null : p.submaps.get(realmId + "_" + submap);
                memories = submap == 0 ? (p.memoryMask >>> (realmId * 3)) & 7 : progress == null ? 0 : progress.memoryMask & 7;
                if (player.level >= requiredLevel(realmId, submap) && submapUnlocked(p, realmId, submap)) result.unlockedMapMask |= 1 << key;
            }
            result.mapMemoryMasks.add(memories);
        }
        result.level = player.level; result.experience = player.experience; result.attack = player.attack; result.defense = player.defense; result.activePetLevel = player.petLevel;
        return result;
    }

    private List<NativeLandmarkMessage> landmarks(Player player) {
        NativeAdventureProgress p = player.progress;
        List<NativeLandmarkMessage> result = new ArrayList<>();
        if (p.realm == 0 && p.submap == 0) { NativeLandmarkMessage guide = landmark("guide", "情花", 1.9f, 5.1f, "guide"); guide.collected = p.introComplete; result.add(guide); }
        for (int i = 0; i < 3; i++) {
            int bit = p.submap == 0 ? p.realm * 3 + i : i;
            NativeLandmarkMessage memory = landmark("memory-" + i, memoryName(p.realm, p.submap, i),
                    memoryX(p.realm, p.submap, i), memoryZ(p.realm, p.submap, i), "memory");
            memory.bit = bit; memory.collected = (memoryBits(p) & (1 << i)) != 0; result.add(memory);
        }
        NativeLandmarkMessage chest = landmark("chest", "旅途宝箱", chestX(p.realm, p.submap), chestZ(p.realm, p.submap), "chest");
        chest.bit = p.submap == 0 ? p.realm : 0; chest.collected = treasureCollected(p);
        chest.available = memoryCount(p) == 3 && (!hasEnemies(p.realm, p.submap) || kills(p) >= 4 && bossDefeated(p));
        result.add(chest);
        return result;
    }

    private static NativeLandmarkMessage landmark(String id, String name, float x, float z, String kind) {
        NativeLandmarkMessage result = new NativeLandmarkMessage(); result.id = id; result.title = name; result.x = x; result.z = z; result.kind = kind; result.available = true; return result;
    }
    private static NativeSubmapProgress currentSubmap(NativeAdventureProgress p) {
        return p.submaps.computeIfAbsent(p.realm + "_" + p.submap, key -> new NativeSubmapProgress());
    }
    private static boolean submapUnlocked(NativeAdventureProgress p, int realm, int submap) {
        if (submap == 0) return true;
        if (submap == 1) return (p.treasureMask & (1 << realm)) != 0;
        NativeSubmapProgress previous = p.submaps.get(realm + "_" + (submap - 1));
        return previous != null && previous.treasureCollected;
    }
    private static int memoryBits(NativeAdventureProgress p) {
        return p.submap == 0 ? (p.memoryMask >>> (p.realm * 3)) & 7 : currentSubmap(p).memoryMask & 7;
    }
    private static int memoryCount(NativeAdventureProgress p) { return Integer.bitCount(memoryBits(p)); }
    private static int kills(NativeAdventureProgress p) { return p.submap == 0 ? p.realmKills.get(p.realm) : currentSubmap(p).kills; }
    private static boolean bossDefeated(NativeAdventureProgress p) { return p.submap == 0 ? (p.bossMask & (1 << p.realm)) != 0 : currentSubmap(p).bossDefeated; }
    private static boolean treasureCollected(NativeAdventureProgress p) { return p.submap == 0 ? (p.treasureMask & (1 << p.realm)) != 0 : currentSubmap(p).treasureCollected; }

    private void save(Player player) { player.lastSave = player.progress.updatedAt = clock.getAsLong(); mongo.save(player.progress); }

    private void projectQuest(Player player) {
        NativeAdventureProgress p = player.progress;
        String suffix = p.submap == 0 ? "" : "_" + p.submap;
        String id = "native_main_" + p.userId + "_" + p.realm + suffix;
        Quest quest = mongo.findById(id, Quest.class);
        if (quest == null) { quest = new Quest(); quest.setId(id); quest.setUserId(p.userId); quest.setQuestId("native_main_" + p.realm + suffix);
            quest.setQuestType(Quest.QuestType.MAIN); quest.setRequiredLevel(requiredLevel(p.realm, p.submap)); quest.setAcceptTime(clock.getAsLong()); quest.setRewards(List.of()); }
        quest.setQuestName(p.submap == 0 ? TITLES[p.realm] : mapName(p.realm, p.submap)); quest.setDescription(story(p.realm, p.submap)); quest.setNpcId("qinghua");
        int value = memoryCount(p) + (!hasEnemies(p.realm, p.submap) ? 0 : Math.min(4,kills(p)) + (bossDefeated(p) ? 1 : 0));
        quest.setCurrentProgress(value); quest.setTargetProgress(!hasEnemies(p.realm, p.submap) ? 3 : 8);
        quest.setStatus(treasureCollected(p) ? Quest.QuestStatus.REWARDED : Quest.QuestStatus.ACCEPTED);
        if (quest.getStatus() == Quest.QuestStatus.REWARDED) quest.setCompleteTime(clock.getAsLong());
        mongo.save(quest);
    }

    private void heal(Player player, int amount, String action) {
        int restored = Math.min(player.maxHealth - player.progress.health, amount);
        player.progress.health += restored;
        emit(world(player.progress.realm, player.progress.submap),"heal", Long.toString(player.progress.userId),Long.toString(player.progress.userId),action,restored,player.progress.x,player.progress.z,clock.getAsLong());
    }
    private void emit(Realm realm, String kind, String source, String target, String action, int amount, float x,float z,long now) {
        NativeCombatEvent event = new NativeCombatEvent(); event.id = ++eventSequence; event.kind=kind; event.sourceId=source; event.targetId=target; event.action=action; event.amount=amount; event.x=x; event.z=z; event.time=now;
        realm.events.addLast(event); while (realm.events.size() > 96) realm.events.removeFirst();
    }
    static boolean pathValid(int realm, float x, float z, float targetX, float targetZ) {
        return pathValid(realm, 0, x, z, targetX, targetZ);
    }
    static boolean pathValid(int realm, int submap, float x, float z, float targetX, float targetZ) {
        int steps = Math.max(1,(int)Math.ceil(distance(x,z,targetX,targetZ) / .5));
        for(int i=1;i<=steps;i++) if(!positionValid(realm,submap,x+(targetX-x)*i/steps,z+(targetZ-z)*i/steps)) return false;
        return true;
    }
    private static float approach(float value,float target,float amount) { return value < target ? Math.min(target,value+amount) : Math.max(target,value-amount); }

    private static final class Player {
        final NativeAdventureProgress progress;
        Person person;
        boolean present;
        int maxHealth,attack,defense,level,criticalRate,petLevel,combo;
        long experience,lastSeen,lastSave,statsAt,moveAt,lastDamage,lastRegen,invulnerableUntil,shieldUntil,globalReadyAt,comboUntil,eventCursor,actionAt;
        float moveBudget=1;
        String action="";
        Player(NativeAdventureProgress progress) { this.progress=progress; }
        NativePlayerMessage message() {
            NativePlayerMessage message = new NativePlayerMessage(); message.userId=progress.userId; message.nickname=person.getName(); message.profession=person.getProfession(); message.gender=person.getGender(); message.appearanceJson=person.getAppearanceJson();
            message.x=progress.x; message.z=progress.z; message.yaw=progress.yaw; message.health=progress.health; message.maxHealth=maxHealth; message.level=level; message.action=action; message.actionAt=actionAt; return message;
        }
    }
    private static final class Realm {
        final int id, submap;
        final Map<String,Enemy> enemies=new LinkedHashMap<>();
        final Deque<NativeCombatEvent> events=new ArrayDeque<>();
        long lastTick;
        Realm(int id,int submap,long now) { this.id=id;this.submap=submap;lastTick=now;
            if(hasEnemies(id,submap)) for(int i=0;i<5;i++) { Enemy enemy=new Enemy(id,submap,i,now); enemies.put(enemy.id,enemy); }
        }
    }
    private static final class Enemy {
        final String id,name;
        final int archetype,maximum;
        final boolean boss;
        final float spawnX,spawnZ;
        float x,z,castX,castZ,castRadius;
        int health,castStyle,cycle;
        long respawnAt,castEndsAt,readyAt,targetUserId;
        final Map<Long,Long> contributors=new HashMap<>();
        Enemy(int realm,int submap,int index,long now) { id="realm-"+realm+(submap==0?"":"-submap-"+submap)+"-enemy-"+index;boss=index==4;
            archetype=Math.abs(realm*3+submap+index)%4;name=boss?bossName(realm,submap):MONSTERS[archetype];
            x=spawnX=enemyX(realm,submap,index);z=spawnZ=enemyZ(realm,submap,index);
            health=maximum=boss?640+requiredLevel(realm,submap)*14:110+requiredLevel(realm,submap)*5;readyAt=now+1500;
        }
        NativeEnemyMessage message(int realm) { NativeEnemyMessage m=new NativeEnemyMessage();m.id=id;m.name=name;m.archetype=archetype;m.realm=realm;m.boss=boss;m.x=x;m.z=z;m.spawnX=spawnX;m.spawnZ=spawnZ;m.health=health;m.maxHealth=maximum;m.respawnAt=respawnAt;m.castEndsAt=castEndsAt;m.castX=castX;m.castZ=castZ;m.castRadius=castRadius;m.castStyle=castStyle;m.targetUserId=targetUserId;return m; }
    }
}
