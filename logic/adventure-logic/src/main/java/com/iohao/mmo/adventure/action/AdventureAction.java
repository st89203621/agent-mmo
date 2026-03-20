package com.iohao.mmo.adventure.action;

import com.alibaba.fastjson2.JSON;
import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.adventure.cmd.AdventureCmd;
import com.iohao.mmo.adventure.entity.*;
import com.iohao.mmo.adventure.mapper.AdventureMapper;
import com.iohao.mmo.adventure.proto.AdventureRequest;
import com.iohao.mmo.adventure.proto.DungeonMessage;
import com.iohao.mmo.adventure.service.AdventureService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ActionController(AdventureCmd.cmd)
public class AdventureAction {

    @Resource
    AdventureService adventureService;

    // ========== 副本系统 ==========

    @ActionMethod(AdventureCmd.listDungeons)
    public List<DungeonMessage> listDungeons(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        List<Dungeon> dungeons = adventureService.listDungeons(userId);
        return AdventureMapper.ME.convertList(dungeons);
    }

    @ActionMethod(AdventureCmd.enterDungeon)
    public DungeonMessage enterDungeon(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Dungeon dungeon = adventureService.enterDungeon(userId, request.dungeonId, request.difficulty);
        return AdventureMapper.ME.convert(dungeon);
    }

    @ActionMethod(AdventureCmd.exitDungeon)
    public DungeonMessage exitDungeon(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Dungeon dungeon = adventureService.exitDungeon(userId, request.dungeonId);
        return AdventureMapper.ME.convert(dungeon);
    }

    @ActionMethod(AdventureCmd.completeStage)
    public DungeonMessage completeStage(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Dungeon dungeon = adventureService.completeStage(userId, request.dungeonId, request.stageId, request.stars);
        return AdventureMapper.ME.convert(dungeon);
    }
    
    // ========== 探险系统 ==========

    @ActionMethod(AdventureCmd.startExploration)
    public String startExploration(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Exploration exploration = adventureService.startExploration(userId, request.location);
        return JSON.toJSONString(exploration);
    }

    @ActionMethod(AdventureCmd.explorationEvent)
    public String explorationEvent(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Exploration.ExplorationEvent event = adventureService.triggerExplorationEvent(userId, request.explorationId);
        return JSON.toJSONString(event);
    }

    @ActionMethod(AdventureCmd.getExplorationHistory)
    public String getExplorationHistory(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        List<Exploration> history = adventureService.getExplorationHistory(userId);
        return JSON.toJSONString(history);
    }

    // ========== 宝藏猎人 ==========

    @ActionMethod(AdventureCmd.getTreasureMaps)
    public String getTreasureMaps(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        List<TreasureHunt> maps = adventureService.getTreasureMaps(userId);
        return JSON.toJSONString(maps);
    }

    @ActionMethod(AdventureCmd.startTreasureHunt)
    public String startTreasureHunt(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        TreasureHunt hunt = adventureService.startTreasureHunt(userId, request.mapId);
        return JSON.toJSONString(hunt);
    }
    
    @ActionMethod(AdventureCmd.digTreasure)
    public String digTreasure(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        TreasureHunt hunt = adventureService.digTreasure(userId, request.id);
        return JSON.toJSONString(hunt);
    }

    @ActionMethod(AdventureCmd.openTreasureChest)
    public String openTreasureChest(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        TreasureHunt.TreasureChest chest = adventureService.openTreasureChest(userId, request.id);
        return JSON.toJSONString(chest);
    }

    // ========== 时空裂缝 ==========

    @ActionMethod(AdventureCmd.listTimeRifts)
    public String listTimeRifts() {
        List<TimeRift> rifts = adventureService.listTimeRifts();
        return JSON.toJSONString(rifts);
    }

    @ActionMethod(AdventureCmd.enterTimeRift)
    public String enterTimeRift(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        TimeRift rift = adventureService.enterTimeRift(userId, request.riftId);
        return JSON.toJSONString(rift);
    }

    @ActionMethod(AdventureCmd.timeRiftChallenge)
    public String timeRiftChallenge(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        TimeRift rift = adventureService.timeRiftChallenge(userId, request.riftId, request.wave);
        return JSON.toJSONString(rift);
    }

    // ========== 无尽试炼 ==========

    @ActionMethod(AdventureCmd.startEndlessTrial)
    public String startEndlessTrial(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        EndlessTrial trial = adventureService.startEndlessTrial(userId, request.playerName);
        return JSON.toJSONString(trial);
    }

    @ActionMethod(AdventureCmd.nextWave)
    public String nextWave(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        EndlessTrial trial = adventureService.nextWave(userId, request.trialId, request.kills, request.damage);
        return JSON.toJSONString(trial);
    }

    @ActionMethod(AdventureCmd.getTrialRanking)
    public String getTrialRanking() {
        List<EndlessTrial> ranking = adventureService.getTrialRanking();
        return JSON.toJSONString(ranking);
    }

    // ========== 秘境探索 ==========

    @ActionMethod(AdventureCmd.listSecretRealms)
    public String listSecretRealms(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        List<SecretRealm> realms = adventureService.listSecretRealms(userId);
        return JSON.toJSONString(realms);
    }

    @ActionMethod(AdventureCmd.enterSecretRealm)
    public String enterSecretRealm(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        SecretRealm realm = adventureService.enterSecretRealm(userId, request.realmId);
        return JSON.toJSONString(realm);
    }

    @ActionMethod(AdventureCmd.exploreSecretRealm)
    public String exploreSecretRealm(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        SecretRealm realm = adventureService.exploreSecretRealm(userId, request.realmId);
        return JSON.toJSONString(realm);
    }

    @ActionMethod(AdventureCmd.challengeRealmBoss)
    public String challengeRealmBoss(AdventureRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        SecretRealm realm = adventureService.challengeRealmBoss(userId, request.realmId, request.victory);
        return JSON.toJSONString(realm);
    }
}

