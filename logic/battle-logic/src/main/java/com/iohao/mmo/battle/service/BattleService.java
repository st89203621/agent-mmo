package com.iohao.mmo.battle.service;

import com.iohao.mmo.battle.entity.BattleAction;
import com.iohao.mmo.battle.entity.BattleState;
import com.iohao.mmo.battle.entity.BattleState.BattleSkill;
import com.iohao.mmo.battle.entity.BattleUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 回合制战斗服务
 */
@Slf4j
@Service
public class BattleService {

    private final MongoTemplate mongoTemplate;

    public BattleService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    /**
     * 发起探索遭遇战（敌人名由AI生成，属性按难度缩放）
     */
    public BattleState startBattleWithEnemy(long userId, String enemyName,
                                            int playerHp, int playerMp,
                                            int pAtk, int pDef, int mAtk, int mDef, int speed) {
        BattleState state = buildBattle(userId, playerHp, playerMp, pAtk, pDef, mAtk, mDef, speed, null);
        if (enemyName != null && !enemyName.isBlank()) {
            state.getEnemyUnits().forEach(e -> e.setName(enemyName));
        }
        return mongoTemplate.save(state);
    }

    /**
     * 发起副本关卡战斗（敌人属性按副本难度和关卡等级缩放）
     */
    public BattleState startDungeonBattle(long userId, String enemyName, int enemyLevel,
                                           boolean isBoss, int dungeonDifficulty,
                                           int playerHp, int playerMp,
                                           int pAtk, int pDef, int mAtk, int mDef, int speed,
                                           List<BattleSkill> skills) {
        mongoTemplate.remove(
                Query.query(Criteria.where("userId").is(userId).and("status").is("ONGOING")),
                BattleState.class);

        BattleUnit player = buildPlayerUnit(playerHp, playerMp, pAtk, pDef, mAtk, mDef, speed);
        BattleUnit enemy = generateDungeonEnemy(player, enemyName, enemyLevel, isBoss, dungeonDifficulty);

        BattleState state = new BattleState();
        state.setUserId(userId);
        state.setRound(1);
        state.setStatus("ONGOING");
        state.setPlayerUnits(new ArrayList<>(List.of(player)));
        state.setEnemyUnits(new ArrayList<>(List.of(enemy)));
        state.setStartTime(System.currentTimeMillis());
        state.setAvailableSkills(buildAvailableSkills(skills));

        return mongoTemplate.save(state);
    }

    /** 生成副本敌人（按关卡等级和难度缩放） */
    private BattleUnit generateDungeonEnemy(BattleUnit player, String name, int level,
                                             boolean isBoss, int difficulty) {
        ThreadLocalRandom rng = ThreadLocalRandom.current();
        String grade = isBoss ? rollBossGrade(rng, difficulty) : rollGrade(rng, difficulty);
        double levelScale = 1.0 + (level - 1) * 0.08;
        double diffScale = 1.0 + (difficulty - 1) * 0.15;
        double bossScale = isBoss ? 1.8 : 1.0;
        double total = levelScale * diffScale * bossScale;

        BattleUnit enemy = new BattleUnit();
        enemy.setUnitId("enemy_1");
        enemy.setName(name);
        enemy.setUnitType("MONSTER");
        enemy.setGrade(grade);
        enemy.setMaxHp((int) (player.getMaxHp() * total * rng.nextInt(90, 111) / 100));
        enemy.setHp(enemy.getMaxHp());
        enemy.setMaxMp((int) (player.getMaxMp() * total * rng.nextInt(70, 101) / 100));
        enemy.setMp(enemy.getMaxMp());
        enemy.setPhysicsAttack((int) (player.getPhysicsAttack() * total * rng.nextInt(85, 106) / 100));
        enemy.setPhysicsDefense((int) (player.getPhysicsDefense() * total * rng.nextInt(80, 106) / 100));
        enemy.setMagicAttack((int) (player.getMagicAttack() * total * rng.nextInt(75, 106) / 100));
        enemy.setMagicDefense((int) (player.getMagicDefense() * total * rng.nextInt(75, 106) / 100));
        enemy.setSpeed((int) (player.getSpeed() * total * rng.nextInt(85, 116) / 100));
        return enemy;
    }

    /** BOSS 等级保底更高 */
    private String rollBossGrade(ThreadLocalRandom rng, int difficulty) {
        int[] weights = switch (difficulty) {
            case 1  -> new int[]{ 0, 10, 30, 35, 20,  5};
            case 2  -> new int[]{ 0,  5, 20, 35, 28, 12};
            case 3  -> new int[]{ 0,  0, 10, 30, 35, 25};
            case 4  -> new int[]{ 0,  0,  5, 20, 35, 40};
            case 5  -> new int[]{ 0,  0,  0, 10, 30, 60};
            default -> new int[]{ 0, 15, 35, 30, 15,  5};
        };
        String[] grades = {"C", "B", "A", "S", "SS", "SSS"};
        int total = 0;
        for (int w : weights) total += w;
        int r = rng.nextInt(total);
        int cum = 0;
        for (int i = 0; i < weights.length; i++) {
            cum += weights[i];
            if (r < cum) return grades[i];
        }
        return "S";
    }

    /**
     * 发起战斗（PvE），支持传入可用技能
     */
    public BattleState startBattle(long userId, int playerHp, int playerMp,
                                   int pAtk, int pDef, int mAtk, int mDef, int speed) {
        return startBattle(userId, playerHp, playerMp, pAtk, pDef, mAtk, mDef, speed, null);
    }

    public BattleState startBattle(long userId, int playerHp, int playerMp,
                                   int pAtk, int pDef, int mAtk, int mDef, int speed,
                                   List<BattleSkill> skills) {
        mongoTemplate.remove(
                Query.query(Criteria.where("userId").is(userId).and("status").is("ONGOING")),
                BattleState.class);
        return mongoTemplate.save(buildBattle(userId, playerHp, playerMp, pAtk, pDef, mAtk, mDef, speed, skills));
    }

    public BattleState startBattle(long userId, int playerHp, int playerMp,
                                   int pAtk, int pDef, int mAtk, int mDef, int speed,
                                   List<BattleSkill> skills, String enemyName, int enemyLevel) {
        mongoTemplate.remove(
                Query.query(Criteria.where("userId").is(userId).and("status").is("ONGOING")),
                BattleState.class);
        BattleState state = buildBattle(userId, playerHp, playerMp, pAtk, pDef, mAtk, mDef, speed, skills);
        applyEnemyContext(state, enemyName, enemyLevel);
        return mongoTemplate.save(state);
    }

    private void applyEnemyContext(BattleState state, String enemyName, int enemyLevel) {
        if (state == null || state.getEnemyUnits() == null) return;
        for (BattleUnit enemy : state.getEnemyUnits()) {
            if (enemyName != null && !enemyName.isBlank()) {
                enemy.setName(enemyName);
            }
            if (enemyLevel > 0) {
                double scale = 1.0 + Math.min(60, Math.max(1, enemyLevel) - 1) * 0.04;
                enemy.setMaxHp((int) Math.max(enemy.getMaxHp(), enemy.getMaxHp() * scale));
                enemy.setHp(enemy.getMaxHp());
                enemy.setPhysicsAttack((int) Math.max(enemy.getPhysicsAttack(), enemy.getPhysicsAttack() * scale));
                enemy.setPhysicsDefense((int) Math.max(enemy.getPhysicsDefense(), enemy.getPhysicsDefense() * scale));
                enemy.setMagicAttack((int) Math.max(enemy.getMagicAttack(), enemy.getMagicAttack() * scale));
                enemy.setMagicDefense((int) Math.max(enemy.getMagicDefense(), enemy.getMagicDefense() * scale));
                enemy.setSpeed((int) Math.max(enemy.getSpeed(), enemy.getSpeed() * Math.min(1.8, scale)));
            }
        }
    }

    private BattleState buildBattle(long userId, int playerHp, int playerMp,
                                    int pAtk, int pDef, int mAtk, int mDef, int speed,
                                    List<BattleSkill> skills) {
        BattleUnit player = buildPlayerUnit(playerHp, playerMp, pAtk, pDef, mAtk, mDef, speed);
        BattleUnit enemy = generateEnemy(player);

        BattleState state = new BattleState();
        state.setUserId(userId);
        state.setRound(1);
        state.setStatus("ONGOING");
        state.setPlayerUnits(new ArrayList<>(List.of(player)));
        state.setEnemyUnits(new ArrayList<>(List.of(enemy)));
        state.setStartTime(System.currentTimeMillis());
        state.setAvailableSkills(buildAvailableSkills(skills));
        return state;
    }

    private BattleUnit buildPlayerUnit(int playerHp, int playerMp,
                                       int pAtk, int pDef, int mAtk, int mDef, int speed) {
        BattleUnit player = new BattleUnit();
        player.setUnitId("player");
        player.setName("玩家");
        player.setUnitType("PLAYER");
        player.setMaxHp(Math.max(playerHp, 100));
        player.setHp(player.getMaxHp());
        player.setMaxMp(Math.max(playerMp, 50));
        player.setMp(player.getMaxMp());
        player.setPhysicsAttack(Math.max(pAtk, 10));
        player.setPhysicsDefense(Math.max(pDef, 5));
        player.setMagicAttack(Math.max(mAtk, 8));
        player.setMagicDefense(Math.max(mDef, 5));
        player.setSpeed(Math.max(speed, 10));
        player.setActionGauge(100); // 玩家先手
        return player;
    }

    private List<BattleSkill> buildAvailableSkills(List<BattleSkill> extra) {
        List<BattleSkill> available = new ArrayList<>();
        available.add(buildDefaultSkill("attack", "普通攻击", "⚔️", 0, 1.0, "physical_damage"));
        available.add(buildDefaultSkill("defend", "防御", "🛡️", 0, 0, "buff_defense"));
        if (extra != null) available.addAll(extra);
        return available;
    }

    private BattleSkill buildDefaultSkill(String id, String name, String icon,
                                           int mpCost, double multiplier, String effectType) {
        BattleSkill s = new BattleSkill();
        s.setSkillId(id);
        s.setName(name);
        s.setIcon(icon);
        s.setMpCost(mpCost);
        s.setDamageMultiplier(multiplier);
        s.setEffectType(effectType);
        return s;
    }

    public BattleState getBattleState(long userId) {
        return mongoTemplate.findOne(
                Query.query(Criteria.where("userId").is(userId).and("status").is("ONGOING")),
                BattleState.class);
    }

    /**
     * 执行玩家行动并触发敌方回合
     * @param skillId 使用的技能ID（null则为普攻）
     */
    public BattleState executeAction(long userId, String actionType, String targetId) {
        return executeAction(userId, actionType, targetId, null);
    }

    public BattleState executeAction(long userId, String actionType, String targetId, String skillId) {
        BattleState state = getBattleState(userId);
        if (state == null || state.isFinished()) return state;

        state.setActionLog(new ArrayList<>());

        BattleUnit player = state.getPlayerUnits().stream()
                .filter(BattleUnit::isAlive).findFirst().orElse(null);
        if (player == null) {
            state.setStatus("DEFEAT");
            return mongoTemplate.save(state);
        }

        // 玩家行动，清除防御状态
        player.setDefending(false);
        executePlayerAction(state, player, actionType, targetId, skillId);
        player.setActionGauge(0);

        if (!checkBattleEnd(state)) {
            // ATB：推进行动条直到玩家再次就绪
            advanceUntilPlayerReady(state);
            if (!state.isFinished()) {
                state.setRound(state.getRound() + 1);
            }
        }

        return mongoTemplate.save(state);
    }

    /** 检查胜负，设置状态，返回是否已结束 */
    private boolean checkBattleEnd(BattleState state) {
        if (state.allEnemiesDead()) {
            state.setStatus("VICTORY");
            state.setRewards("战斗胜利");
            return true;
        } else if (state.allPlayersDead()) {
            state.setStatus("DEFEAT");
            return true;
        }
        return false;
    }

    /**
     * ATB推进：每tick各单位行动条 += speed，满100时怪物行动；
     * 直到玩家行动条 >= 100 或战斗结束。
     */
    private void advanceUntilPlayerReady(BattleState state) {
        List<BattleUnit> allUnits = new ArrayList<>();
        allUnits.addAll(state.getPlayerUnits());
        allUnits.addAll(state.getEnemyUnits());

        for (int tick = 0; tick < 2000; tick++) {
            for (BattleUnit unit : allUnits) {
                if (unit.isAlive()) {
                    unit.setActionGauge(unit.getActionGauge() + unit.getSpeed());
                }
            }

            // 怪物行动
            for (BattleUnit unit : allUnits) {
                if (!unit.isAlive() || !"MONSTER".equals(unit.getUnitType())) continue;
                if (unit.getActionGauge() >= 100) {
                    unit.setActionGauge(unit.getActionGauge() - 100);
                    unit.setDefending(false);
                    executeEnemyAction(state, unit);
                    if (checkBattleEnd(state)) return;
                }
            }

            // 玩家就绪则等待输入
            boolean playerReady = state.getPlayerUnits().stream()
                    .anyMatch(u -> u.isAlive() && u.getActionGauge() >= 100);
            if (playerReady || state.allEnemiesDead()) return;
        }
    }

    private void executePlayerAction(BattleState state, BattleUnit player,
                                     String actionType, String targetId, String skillId) {
        // 查找技能定义
        BattleSkill skill = null;
        if (skillId != null) {
            skill = state.getAvailableSkills().stream()
                    .filter(s -> skillId.equals(s.getSkillId()))
                    .findFirst().orElse(null);
        }

        if ("DEFEND".equals(actionType) || (skill != null && "buff_defense".equals(skill.getEffectType()))) {
            player.setDefending(true);
            BattleAction action = new BattleAction();
            action.setActorId(player.getUnitId());
            action.setActorName(player.getName());
            action.setActionType("DEFEND");
            action.setEffectType("buff_defense");
            action.setDescription(player.getName() + " 进入防御姿态，减伤50%");
            state.getActionLog().add(action);
            return;
        }

        // 找目标
        BattleUnit target = state.getEnemyUnits().stream()
                .filter(BattleUnit::isAlive)
                .filter(e -> targetId == null || targetId.equals(e.getUnitId()))
                .findFirst().orElse(null);
        if (target == null) return;

        BattleAction action = new BattleAction();
        action.setActorId(player.getUnitId());
        action.setActorName(player.getName());
        action.setTargetId(target.getUnitId());
        action.setTargetName(target.getName());

        if (skill != null && skill.getMpCost() > 0 && player.getMp() >= skill.getMpCost()) {
            player.setMp(player.getMp() - skill.getMpCost());
            action.setActionType("SKILL");
            action.setSkillName(skill.getName());
            action.setEffectType(skill.getEffectType());

            if ("heal".equals(skill.getEffectType())) {
                int healAmount = (int) (player.getMagicAttack() * skill.getDamageMultiplier());
                player.heal(healAmount);
                action.setHeal(healAmount);
                action.setDescription(player.getName() + " 使用 " + skill.getName() + " 恢复 " + healAmount + " 点生命");
            } else if ("magic_damage".equals(skill.getEffectType())) {
                int damage = (int) (calcMagicDamage(player, target) * skill.getDamageMultiplier());
                int actual = target.takeDamage(damage);
                action.setDamage(actual);
                action.setDescription(player.getName() + " 使用 " + skill.getName() + " 对 " + target.getName() + " 造成 " + actual + " 点魔法伤害");
            } else {
                int damage = (int) (calcPhysicsDamage(player, target) * skill.getDamageMultiplier());
                int actual = target.takeDamage(damage);
                action.setDamage(actual);
                action.setEffectType("physical_damage");
                action.setDescription(player.getName() + " 使用 " + skill.getName() + " 对 " + target.getName() + " 造成 " + actual + " 点伤害");
            }
        } else {
            action.setActionType("ATTACK");
            action.setEffectType("physical_damage");
            int damage = calcPhysicsDamage(player, target);
            int actual = target.takeDamage(damage);
            action.setDamage(actual);
            action.setDescription(player.getName() + " 攻击 " + target.getName() + " 造成 " + actual + " 点伤害");
        }

        state.getActionLog().add(action);
    }

    /**
     * 敌人AI：
     * - HP < 30% 且随机 < 30% → 防御
     * - MP >= 15 且随机 < 40% → 法术攻击
     * - 否则 → 普通攻击
     */
    private void executeEnemyAction(BattleState state, BattleUnit enemy) {
        BattleUnit target = state.getPlayerUnits().stream()
                .filter(BattleUnit::isAlive)
                .findFirst().orElse(null);
        if (target == null) return;

        ThreadLocalRandom rng = ThreadLocalRandom.current();
        double hpRatio = (double) enemy.getHp() / Math.max(1, enemy.getMaxHp());

        BattleAction action = new BattleAction();
        action.setActorId(enemy.getUnitId());
        action.setActorName(enemy.getName());
        action.setTargetId(target.getUnitId());
        action.setTargetName(target.getName());

        if (hpRatio < 0.3 && rng.nextDouble() < 0.3) {
            enemy.setDefending(true);
            action.setActionType("DEFEND");
            action.setEffectType("buff_defense");
            action.setDescription(enemy.getName() + " 进入防御姿态");
        } else if (enemy.getMp() >= 15 && rng.nextDouble() < 0.4) {
            enemy.setMp(enemy.getMp() - 15);
            int damage = (int) (calcMagicDamage(enemy, target) * 1.3);
            int actual = target.takeDamage(damage);
            action.setActionType("SKILL");
            action.setSkillName("妖术");
            action.setEffectType("magic_damage");
            action.setDamage(actual);
            action.setDescription(enemy.getName() + " 施放妖术 对 " + target.getName() + " 造成 " + actual + " 点魔法伤害");
        } else {
            action.setActionType("ATTACK");
            action.setEffectType("physical_damage");
            int damage = calcPhysicsDamage(enemy, target);
            int actual = target.takeDamage(damage);
            action.setDamage(actual);
            action.setDescription(enemy.getName() + " 攻击 " + target.getName() + " 造成 " + actual + " 点伤害");
        }

        state.getActionLog().add(action);
    }

    private int calcPhysicsDamage(BattleUnit attacker, BattleUnit defender) {
        int base = attacker.getPhysicsAttack() - defender.getPhysicsDefense() / 2;
        int variance = ThreadLocalRandom.current().nextInt(-3, 4);
        return Math.max(1, base + variance);
    }

    private int calcMagicDamage(BattleUnit attacker, BattleUnit defender) {
        int base = attacker.getMagicAttack() * 15 / 10 - defender.getMagicDefense() / 2;
        int variance = ThreadLocalRandom.current().nextInt(-2, 5);
        return Math.max(1, base + variance);
    }

    private BattleUnit generateEnemy(BattleUnit player) {
        String[] names = {"妖狐", "石魔", "幽灵", "蛮兽", "暗影刺客", "血蝠", "冰魄", "火灵"};
        ThreadLocalRandom rng = ThreadLocalRandom.current();
        String grade = rollGrade(rng, 0);
        double gm = gradeMultiplier(grade);

        BattleUnit enemy = new BattleUnit();
        enemy.setUnitId("enemy_1");
        enemy.setName(names[rng.nextInt(names.length)]);
        enemy.setUnitType("MONSTER");
        enemy.setGrade(grade);
        enemy.setMaxHp((int) (player.getMaxHp() * gm * rng.nextInt(80, 121) / 100));
        enemy.setHp(enemy.getMaxHp());
        enemy.setMaxMp((int) (player.getMaxMp() * gm * rng.nextInt(60, 101) / 100));
        enemy.setMp(enemy.getMaxMp());
        enemy.setPhysicsAttack((int) (player.getPhysicsAttack() * gm * rng.nextInt(75, 110) / 100));
        enemy.setPhysicsDefense((int) (player.getPhysicsDefense() * gm * rng.nextInt(70, 110) / 100));
        enemy.setMagicAttack((int) (player.getMagicAttack() * gm * rng.nextInt(60, 100) / 100));
        enemy.setMagicDefense((int) (player.getMagicDefense() * gm * rng.nextInt(60, 100) / 100));
        enemy.setSpeed((int) (player.getSpeed() * gm * rng.nextInt(80, 120) / 100));
        return enemy;
    }

    /** 随机怪物等级，difficulty 0=普通关卡，1-5=副本难度 */
    private String rollGrade(ThreadLocalRandom rng, int difficulty) {
        // 概率表：[C, B, A, S, SS, SSS]，difficulty 越高高级概率越大
        int[] weights = switch (difficulty) {
            case 1  -> new int[]{35, 30, 20, 10, 4, 1};
            case 2  -> new int[]{20, 25, 25, 18, 9, 3};
            case 3  -> new int[]{10, 15, 25, 25, 18, 7};
            case 4  -> new int[]{ 5, 10, 20, 28, 25, 12};
            case 5  -> new int[]{ 2,  5, 13, 25, 30, 25};
            default -> new int[]{40, 30, 18,  8,  3,  1};
        };
        String[] grades = {"C", "B", "A", "S", "SS", "SSS"};
        int total = 0;
        for (int w : weights) total += w;
        int r = rng.nextInt(total);
        int cum = 0;
        for (int i = 0; i < weights.length; i++) {
            cum += weights[i];
            if (r < cum) return grades[i];
        }
        return "C";
    }

    private double gradeMultiplier(String grade) {
        return switch (grade) {
            case "B"   -> 1.15;
            case "A"   -> 1.35;
            case "S"   -> 1.65;
            case "SS"  -> 2.2;
            case "SSS" -> 3.0;
            default    -> 1.0; // C
        };
    }

    /** 获取玩家的胜利场次 */
    public int getVictoryCount(long userId) {
        long count = mongoTemplate.count(
                Query.query(Criteria.where("userId").is(userId).and("status").is("VICTORY")),
                BattleState.class);
        return (int) count;
    }
}
