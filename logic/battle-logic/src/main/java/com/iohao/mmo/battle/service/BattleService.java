package com.iohao.mmo.battle.service;

import com.iohao.mmo.battle.entity.BattleAction;
import com.iohao.mmo.battle.entity.BattleState;
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
        // 用AI生成的敌人名替换默认名
        if (enemyName != null && !enemyName.isBlank()) {
            state.getEnemyUnits().forEach(e -> e.setName(enemyName));
            mongoTemplate.save(state);
        }
        return state;
    }

    /**
     * 发起战斗（PvE）
     */
    public BattleState startBattle(long userId, int playerHp, int playerMp,
                                   int pAtk, int pDef, int mAtk, int mDef, int speed) {
        // 清理此用户的旧战斗
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

        // 生成敌人（基于玩家属性浮动）
        BattleUnit enemy = generateEnemy(player);

        BattleState state = new BattleState();
        state.setUserId(userId);
        state.setRound(1);
        state.setStatus("ONGOING");
        state.setPlayerUnits(new ArrayList<>(List.of(player)));
        state.setEnemyUnits(new ArrayList<>(List.of(enemy)));
        state.setStartTime(System.currentTimeMillis());

        return mongoTemplate.save(state);
    }

    /**
     * 获取当前战斗状态
     */
    public BattleState getBattleState(long userId) {
        return mongoTemplate.findOne(
                Query.query(Criteria.where("userId").is(userId).and("status").is("ONGOING")),
                BattleState.class);
    }

    /**
     * 执行玩家行动并触发敌方回合
     */
    public BattleState executeAction(long userId, String actionType, String targetId) {
        BattleState state = getBattleState(userId);
        if (state == null || state.isFinished()) return state;

        state.setActionLog(new ArrayList<>());

        // 收集所有存活单位按速度排序
        List<BattleUnit> allUnits = new ArrayList<>();
        allUnits.addAll(state.getPlayerUnits());
        allUnits.addAll(state.getEnemyUnits());
        allUnits.sort((a, b) -> b.getSpeed() - a.getSpeed());

        for (BattleUnit unit : allUnits) {
            if (!unit.isAlive()) continue;
            if (state.allPlayersDead() || state.allEnemiesDead()) break;

            if ("PLAYER".equals(unit.getUnitType())) {
                executePlayerAction(state, unit, actionType, targetId);
            } else {
                executeEnemyAction(state, unit);
            }
        }

        // 检查胜负
        if (state.allEnemiesDead()) {
            state.setStatus("VICTORY");
            state.setRewards("经验+50, 金币+100");
        } else if (state.allPlayersDead()) {
            state.setStatus("DEFEAT");
        } else {
            state.setRound(state.getRound() + 1);
        }

        return mongoTemplate.save(state);
    }

    private void executePlayerAction(BattleState state, BattleUnit player,
                                     String actionType, String targetId) {
        BattleAction action = new BattleAction();
        action.setActorId(player.getUnitId());
        action.setActorName(player.getName());
        action.setActionType(actionType);

        if ("DEFEND".equals(actionType)) {
            action.setDescription(player.getName() + " 进入防御姿态");
            state.getActionLog().add(action);
            return;
        }

        // 找目标
        BattleUnit target = state.getEnemyUnits().stream()
                .filter(BattleUnit::isAlive)
                .filter(e -> targetId == null || targetId.equals(e.getUnitId()))
                .findFirst()
                .orElse(null);
        if (target == null) return;

        action.setTargetId(target.getUnitId());
        action.setTargetName(target.getName());

        if ("SKILL".equals(actionType) && player.getMp() >= 10) {
            // 法术攻击
            int damage = calcMagicDamage(player, target);
            int actual = target.takeDamage(damage);
            player.setMp(player.getMp() - 10);
            action.setDamage(actual);
            action.setSkillName("法术攻击");
            action.setDescription(player.getName() + " 使用法术对 " + target.getName() + " 造成 " + actual + " 点伤害");
        } else {
            // 普通攻击
            int damage = calcPhysicsDamage(player, target);
            int actual = target.takeDamage(damage);
            action.setDamage(actual);
            action.setDescription(player.getName() + " 攻击 " + target.getName() + " 造成 " + actual + " 点伤害");
        }

        state.getActionLog().add(action);
    }

    private void executeEnemyAction(BattleState state, BattleUnit enemy) {
        BattleUnit target = state.getPlayerUnits().stream()
                .filter(BattleUnit::isAlive)
                .findFirst()
                .orElse(null);
        if (target == null) return;

        BattleAction action = new BattleAction();
        action.setActorId(enemy.getUnitId());
        action.setActorName(enemy.getName());
        action.setActionType("ATTACK");
        action.setTargetId(target.getUnitId());
        action.setTargetName(target.getName());

        int damage = calcPhysicsDamage(enemy, target);
        int actual = target.takeDamage(damage);
        action.setDamage(actual);
        action.setDescription(enemy.getName() + " 攻击 " + target.getName() + " 造成 " + actual + " 点伤害");

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
        String[] names = {"妖狐", "石魔", "幽灵", "蛮兽", "暗影刺客"};
        ThreadLocalRandom rng = ThreadLocalRandom.current();

        BattleUnit enemy = new BattleUnit();
        enemy.setUnitId("enemy_1");
        enemy.setName(names[rng.nextInt(names.length)]);
        enemy.setUnitType("MONSTER");
        int hpScale = rng.nextInt(80, 121);
        enemy.setMaxHp(player.getMaxHp() * hpScale / 100);
        enemy.setHp(enemy.getMaxHp());
        enemy.setMaxMp(0);
        enemy.setMp(0);
        enemy.setPhysicsAttack(player.getPhysicsAttack() * rng.nextInt(75, 110) / 100);
        enemy.setPhysicsDefense(player.getPhysicsDefense() * rng.nextInt(70, 110) / 100);
        enemy.setMagicAttack(player.getMagicAttack() * rng.nextInt(60, 100) / 100);
        enemy.setMagicDefense(player.getMagicDefense() * rng.nextInt(60, 100) / 100);
        enemy.setSpeed(player.getSpeed() * rng.nextInt(80, 120) / 100);
        return enemy;
    }
}
