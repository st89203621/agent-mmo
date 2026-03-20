package com.iohao.mmo.adventure.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

/**
 * 冒险模块命令
 * 超炫酷的冒险系统
 */
public interface AdventureCmd {
    int cmd = CmdModule.adventureCmd;
    
    // ========== 副本系统 ==========
    /** 获取副本列表 */
    int listDungeons = 1;
    /** 进入副本 */
    int enterDungeon = 2;
    /** 退出副本 */
    int exitDungeon = 3;
    /** 获取副本进度 */
    int getDungeonProgress = 4;
    /** 完成副本关卡 */
    int completeStage = 5;
    /** 获取副本奖励 */
    int claimDungeonReward = 6;
    
    // ========== 探险系统 ==========
    /** 开始探险 */
    int startExploration = 10;
    /** 探险事件 */
    int explorationEvent = 11;
    /** 完成探险 */
    int completeExploration = 12;
    /** 获取探险历史 */
    int getExplorationHistory = 13;
    
    // ========== 宝藏猎人 ==========
    /** 获取宝藏地图 */
    int getTreasureMaps = 20;
    /** 开始寻宝 */
    int startTreasureHunt = 21;
    /** 挖掘宝藏 */
    int digTreasure = 22;
    /** 打开宝箱 */
    int openTreasureChest = 23;
    
    // ========== 时空裂缝 ==========
    /** 获取裂缝列表 */
    int listTimeRifts = 30;
    /** 进入时空裂缝 */
    int enterTimeRift = 31;
    /** 时空挑战 */
    int timeRiftChallenge = 32;
    /** 获取裂缝奖励 */
    int claimRiftReward = 33;
    
    // ========== 无尽试炼 ==========
    /** 开始无尽试炼 */
    int startEndlessTrial = 40;
    /** 下一波敌人 */
    int nextWave = 41;
    /** 获取试炼排行 */
    int getTrialRanking = 42;
    /** 领取试炼奖励 */
    int claimTrialReward = 43;
    
    // ========== 秘境探索 ==========
    /** 获取秘境列表 */
    int listSecretRealms = 50;
    /** 进入秘境 */
    int enterSecretRealm = 51;
    /** 秘境探索 */
    int exploreSecretRealm = 52;
    /** 秘境BOSS挑战 */
    int challengeRealmBoss = 53;
    
    // ========== 成就与记录 ==========
    /** 获取冒险成就 */
    int getAdventureAchievements = 60;
    /** 获取冒险统计 */
    int getAdventureStats = 61;
    /** 获取冒险排行榜 */
    int getAdventureRanking = 62;
    
    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}

