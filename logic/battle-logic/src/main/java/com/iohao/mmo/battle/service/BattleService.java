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
        BattleState state = startBattle(userId, playerHp, playerMp, pAtk, pDef, mAtk, mDef, speed);
        if (enemyName != null && !enemyName.isBlank()) {
            state.getEnemyUnits().forEach(e -> e.setName(enemyName));
            mongoTemplate.save(state);
        }
        return state;
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
        // 清理旧战斗
        mongoTemplate.remove(
                Query.query(Criteria.where("userId").is(userId).and("status").is("ONGOING")),
                BattleState.class);

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

        BattleUnit enemy = generateEnemy(player);

        BattleState state = new BattleState();
        state.setUserId(userId);
        state.setRound(1);
        state.setStatus("ONGOING");
        state.setPlayerUnits(new ArrayList<>(List.of(player)));
        state.setEnemyUnits(new ArrayList<>(List.of(enemy)));
        state.setStartTime(System.currentTimeMillis());

        // 构建可用技能列表（始终包含普攻和防御）
        List<BattleSkill> available = new ArrayList<>();
        available.add(buildDefaultSkill("attack", "普通攻击", "⚔️", 0, 1.0, "physical_damage"));
        available.add(buildDefaultSkill("defend", "防御", "🛡️", 0, 0, "buff_defense"));
        if (skills != null) {
            available.addAll(skills);
        }
        state.setAvailableSkills(available);

        return mongoTemplate.save(state);
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

        // 回合开始：清除所有防御状态
        state.getPlayerUnits().forEach(u -> u.setDefending(false));
        state.getEnemyUnits().forEach(u -> u.setDefending(false));

        // 按速度排序
        List<BattleUnit> allUnits = new ArrayList<>();
        allUnits.addAll(state.getPlayerUnits());
        allUnits.addAll(state.getEnemyUnits());
        allUnits.sort((a, b) -> b.getSpeed() - a.getSpeed());

        for (BattleUnit unit : allUnits) {
            if (!unit.isAlive()) continue;
            if (state.allPlayersDead() || state.allEnemiesDead()) break;

            if ("PLAYER".equals(unit.getUnitType())) {
                executePlayerAction(state, unit, actionType, targetId, skillId);
            } else {
                executeEnemyAction(state, unit);
            }
        }

        // 检查胜负
        if (state.allEnemiesDead()) {
            state.setStatus("VICTORY");
            state.setRewards("战斗胜利");
        } else if (state.allPlayersDead()) {
            state.setStatus("DEFEAT");
        } else {
            state.setRound(state.getRound() + 1);
        }

        return mongoTemplate.save(state);
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

        // 如果传了skillId但找不到对应技能，或actionType是DEFEND
        if ("DEFEND".equals(actionType) || (skill != null && "buff_defense".equals(skill.getEffectType()))) {
            player.setDefending(true);
            BattleAction action = new BattleAction();
            action.setActorId(player.getUnitId());
            action.setActorName(player.getName());
            action.setActionType("DEFEND");
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
            // 使用技能
            player.setMp(player.getMp() - skill.getMpCost());
            action.setActionType("SKILL");
            action.setSkillName(skill.getName());

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
                // physical_damage
                int damage = (int) (calcPhysicsDamage(player, target) * skill.getDamageMultiplier());
                int actual = target.takeDamage(damage);
                action.setDamage(actual);
                action.setDescription(player.getName() + " 使用 " + skill.getName() + " 对 " + target.getName() + " 造成 " + actual + " 点伤害");
            }
        } else {
            // 普通攻击
            action.setActionType("ATTACK");
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

        // AI决策
        if (hpRatio < 0.3 && rng.nextDouble() < 0.3) {
            // 防御
            enemy.setDefending(true);
            action.setActionType("DEFEND");
            action.setDescription(enemy.getName() + " 进入防御姿态");
        } else if (enemy.getMp() >= 15 && rng.nextDouble() < 0.4) {
            // 法术攻击
            enemy.setMp(enemy.getMp() - 15);
            int damage = (int) (calcMagicDamage(enemy, target) * 1.3);
            int actual = target.takeDamage(damage);
            action.setActionType("SKILL");
            action.setSkillName("妖术");
            action.setDamage(actual);
            action.setDescription(enemy.getName() + " 施放妖术 对 " + target.getName() + " 造成 " + actual + " 点魔法伤害");
        } else {
            // 普通攻击
            action.setActionType("ATTACK");
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

        BattleUnit enemy = new BattleUnit();
        enemy.setUnitId("enemy_1");
        enemy.setName(names[rng.nextInt(names.length)]);
        enemy.setUnitType("MONSTER");
        int hpScale = rng.nextInt(80, 121);
        enemy.setMaxHp(player.getMaxHp() * hpScale / 100);
        enemy.setHp(enemy.getMaxHp());
        // 敌人也有MP，支持法术
        enemy.setMaxMp(player.getMaxMp() * rng.nextInt(60, 101) / 100);
        enemy.setMp(enemy.getMaxMp());
        enemy.setPhysicsAttack(player.getPhysicsAttack() * rng.nextInt(75, 110) / 100);
        enemy.setPhysicsDefense(player.getPhysicsDefense() * rng.nextInt(70, 110) / 100);
        enemy.setMagicAttack(player.getMagicAttack() * rng.nextInt(60, 100) / 100);
        enemy.setMagicDefense(player.getMagicDefense() * rng.nextInt(60, 100) / 100);
        enemy.setSpeed(player.getSpeed() * rng.nextInt(80, 120) / 100);
        return enemy;
    }

    /** 获取玩家的胜利场次 */
    public int getVictoryCount(long userId) {
        long count = mongoTemplate.count(
                Query.query(Criteria.where("userId").is(userId).and("status").is("VICTORY")),
                BattleState.class);
        return (int) count;
    }
}
