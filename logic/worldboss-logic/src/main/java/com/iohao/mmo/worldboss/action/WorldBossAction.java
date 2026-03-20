package com.iohao.mmo.worldboss.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.exception.ActionErrorEnum;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.worldboss.cmd.WorldBossCmd;
import com.iohao.mmo.worldboss.entity.PlayerDamage;
import com.iohao.mmo.worldboss.entity.WorldBoss;
import com.iohao.mmo.worldboss.mapper.WorldBossMapper;
import com.iohao.mmo.worldboss.proto.*;
import com.iohao.mmo.worldboss.service.WorldBossService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@ActionController(WorldBossCmd.cmd)
public class WorldBossAction {

    @Resource
    WorldBossService worldBossService;

    @ActionMethod(WorldBossCmd.listBoss)
    public List<WorldBossMessage> listBoss() {
        List<WorldBoss> bossList = worldBossService.listBoss();
        return WorldBossMapper.ME.convertList(bossList);
    }

    @ActionMethod(WorldBossCmd.getBossInfo)
    public WorldBossMessage getBossInfo(String bossId) {
        log.info("🔍 getBossInfo 收到请求, bossId: [{}], 长度: {}", bossId, bossId != null ? bossId.length() : 0);
        WorldBoss boss = worldBossService.getBoss(bossId);
        log.info("🔍 查询结果: {}", boss != null ? boss.getBossName() : "null");
        ActionErrorEnum.dataNotExist.assertNonNull(boss);
        return WorldBossMapper.ME.convert(boss);
    }

    @ActionMethod(WorldBossCmd.attackBoss)
    public AttackBossResponse attackBoss(AttackBossRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();

        WorldBoss boss = worldBossService.getBoss(request.bossId);
        ActionErrorEnum.dataNotExist.assertNonNull(boss);

        int playerAttack = 1000;
        String playerName = "玩家" + userId;

        AttackBossResponse response = worldBossService.attackBoss(
                request.bossId, userId, playerName, playerAttack, flowContext);

        ActionErrorEnum.dataNotExist.assertNonNull(response);
        return response;
    }

    @ActionMethod(WorldBossCmd.getDamageRank)
    public DamageRankMessage getDamageRank(String bossId) {
        log.info("🔍 getDamageRank 收到请求, bossId: [{}]", bossId);
        WorldBoss boss = worldBossService.getBoss(bossId);
        log.info("🔍 getDamageRank 查询结果: {}", boss != null ? boss.getBossName() : "null");
        ActionErrorEnum.dataNotExist.assertNonNull(boss);

        List<PlayerDamage> rankList = worldBossService.getDamageRank(bossId);
        long totalDamage = boss.getMaxHp() - boss.getCurrentHp();

        DamageRankMessage message = new DamageRankMessage();
        message.bossId = bossId;
        message.rankList = WorldBossMapper.ME.convertDamageList(rankList, totalDamage);

        return message;
    }
}

