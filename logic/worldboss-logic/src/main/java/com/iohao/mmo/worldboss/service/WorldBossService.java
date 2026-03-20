package com.iohao.mmo.worldboss.service;

import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.worldboss.entity.*;
import com.iohao.mmo.worldboss.proto.AttackBossResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.concurrent.*;

@Slf4j
@Service
public class WorldBossService {
    private final Map<String, WorldBoss> bossMap = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
    private final Random random = new Random();

    @PostConstruct
    public void init() {
        initBosses();
        log.info("✅ WorldBoss service initialized, count: {}, list: {}", bossMap.size(), bossMap.keySet());
        startBossSpawnScheduler();
        startBossSkillScheduler();
    }

    private void initBosses() {
        WorldBoss boss1 = createBoss("boss_001", "火焰魔龙", 50, 1000000, 5000, 1000, 100, 100, "map_001");
        WorldBoss boss2 = createBoss("boss_002", "冰霜巨人", 60, 1500000, 6000, 1200, 200, 200, "map_002");
        WorldBoss boss3 = createBoss("boss_003", "暗影领主", 70, 2000000, 7000, 1500, 300, 300, "map_003");

        bossMap.put(boss1.getBossId(), boss1);
        bossMap.put(boss2.getBossId(), boss2);
        bossMap.put(boss3.getBossId(), boss3);
    }

    private WorldBoss createBoss(String id, String name, int level, long hp, int atk, int def, double x, double y, String mapId) {
        WorldBoss boss = new WorldBoss();
        boss.setBossId(id);
        boss.setBossName(name);
        boss.setBossLevel(level);
        boss.setMaxHp(hp);
        boss.setCurrentHp(hp);
        boss.setAttack(atk);
        boss.setDefense(def);
        boss.setX(x);
        boss.setY(y);
        boss.setMapId(mapId);
        boss.setStatus(WorldBoss.BossStatus.ALIVE);
        boss.setSpawnTime(System.currentTimeMillis());

        List<BossSkill> skills = new ArrayList<>();
        skills.add(createSkill(1, "火焰吐息", "喷射火焰造成大量伤害", BossSkill.SkillType.AOE, 3000, 5.0, 10000));
        skills.add(createSkill(2, "尾击", "用尾巴横扫周围敌人", BossSkill.SkillType.AOE, 2000, 3.0, 5000));
        skills.add(createSkill(3, "咆哮", "发出震耳欲聋的咆哮", BossSkill.SkillType.AOE, 1500, 8.0, 15000));
        boss.setSkills(skills);

        List<DropItem> drops = new ArrayList<>();
        drops.add(createDropItem(1001, "传说武器", 1, 0.05));
        drops.add(createDropItem(1002, "史诗装备", 1, 0.15));
        drops.add(createDropItem(1003, "稀有材料", 5, 0.50));
        drops.add(createDropItem(1004, "金币", 1000, 1.0));
        boss.setDropItems(drops);

        return boss;
    }

    private BossSkill createSkill(int id, String name, String desc, BossSkill.SkillType type, int damage, double range, int cooldown) {
        BossSkill skill = new BossSkill();
        skill.setSkillId(id);
        skill.setSkillName(name);
        skill.setSkillDesc(desc);
        skill.setSkillType(type);
        skill.setDamage(damage);
        skill.setRange(range);
        skill.setCooldown(cooldown);
        return skill;
    }

    private DropItem createDropItem(int id, String name, int quantity, double rate) {
        DropItem item = new DropItem();
        item.setItemId(id);
        item.setItemName(name);
        item.setQuantity(quantity);
        item.setDropRate(rate);
        return item;
    }

    private void startBossSpawnScheduler() {
        scheduler.scheduleAtFixedRate(() -> {
            long now = System.currentTimeMillis();
            bossMap.values().forEach(boss -> {
                if (boss.getStatus() == WorldBoss.BossStatus.WAITING && now >= boss.getNextSpawnTime()) {
                    boss.reset();
                    log.info("WorldBoss {} respawned", boss.getBossName());
                }
            });
        }, 0, 1, TimeUnit.SECONDS);
    }

    private void startBossSkillScheduler() {
        scheduler.scheduleAtFixedRate(() -> {
            bossMap.values().forEach(boss -> {
                if (boss.getStatus() == WorldBoss.BossStatus.ALIVE) {
                    long now = System.currentTimeMillis();
                    if (now - boss.getLastSkillTime() > 8000) {
                        useBossSkill(boss);
                        boss.setLastSkillTime(now);
                    }
                }
            });
        }, 5, 2, TimeUnit.SECONDS);
    }

    private void useBossSkill(WorldBoss boss) {
        if (boss.getSkills() == null || boss.getSkills().isEmpty()) return;
        BossSkill skill = boss.getSkills().get(random.nextInt(boss.getSkills().size()));
      //  log.debug("BOSS {} used skill: {}", boss.getBossName(), skill.getSkillName());
    }

    public List<WorldBoss> listBoss() {
        return new ArrayList<>(bossMap.values());
    }

    public WorldBoss getBoss(String bossId) {
        log.info("🔍 getBoss query, bossId: [{}], length: {}, keys: {}", bossId, bossId != null ? bossId.length() : 0, bossMap.keySet());

        if (bossId == null || bossId.isEmpty()) {
            log.warn("⚠️ bossId is empty");
            return null;
        }

        WorldBoss boss = bossMap.get(bossId);
        log.info("🔍 getBoss result: {}", boss != null ? boss.getBossName() + " (status: " + boss.getStatus() + ")" : "null");

        if (boss == null) {
            log.warn("⚠️ Boss not found, bossId: [{}], available: {}", bossId, bossMap.keySet());
        }

        return boss;
    }

    public AttackBossResponse attackBoss(String bossId, long userId, String playerName, int playerAttack, FlowContext flowContext) {
        WorldBoss boss = bossMap.get(bossId);
        if (boss == null || boss.getStatus() != WorldBoss.BossStatus.ALIVE) {
            return null;
        }

        long damage = calculateDamage(playerAttack, boss.getDefense());
        boolean isCritical = random.nextDouble() < 0.2;
        if (isCritical) {
            damage *= 2;
        }

        boss.takeDamage(damage);
        boss.addDamage(userId, playerName, damage);

        AttackBossResponse response = new AttackBossResponse();
        response.damage = damage;
        response.bossCurrentHp = boss.getCurrentHp();
        response.isCritical = isCritical;
        response.isDead = boss.isDead();

        PlayerDamage playerDamage = boss.getDamageMap().get(userId);
        if (playerDamage != null) {
            response.totalDamage = playerDamage.getTotalDamage();
            response.rank = boss.getDamageRankList().indexOf(playerDamage) + 1;
        }

        if (boss.isDead()) {
            handleBossDeath(boss);
        }

        return response;
    }

    private long calculateDamage(int attack, int defense) {
        long baseDamage = attack - defense / 2;
        baseDamage = Math.max(baseDamage, attack / 10);
        return baseDamage + random.nextInt((int) (baseDamage * 0.2));
    }

    private void handleBossDeath(WorldBoss boss) {
        log.info("WorldBoss {} killed", boss.getBossName());
        boss.setStatus(WorldBoss.BossStatus.WAITING);
        boss.setNextSpawnTime(System.currentTimeMillis() + 300000);
        distributeRewards(boss);
    }

    private void distributeRewards(WorldBoss boss) {
        List<PlayerDamage> rankList = boss.getDamageRankList();
        for (int i = 0; i < Math.min(10, rankList.size()); i++) {
            PlayerDamage player = rankList.get(i);
            log.info("Player {} rank {} rewarded", player.getPlayerName(), player.getRank());
        }
    }

    public List<PlayerDamage> getDamageRank(String bossId) {
        WorldBoss boss = bossMap.get(bossId);
        return boss != null ? boss.getDamageRankList() : new ArrayList<>();
    }
}

