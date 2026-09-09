package com.iohao.mmo.event.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

/**
 * 活动模块命令
 */
public interface EventCmd {
    int cmd = CmdModule.eventCmd;
    
    // ========== 活动通用 ==========
    /** 获取活动列表 */
    int listEvents = 1;
    /** 获取活动详情 */
    int getEventDetail = 2;
    /** 参加活动 */
    int joinEvent = 3;
    /** 领取活动奖励 */
    int claimEventReward = 4;
    
    // ========== 天降神宠 ==========
    /** 获取宠物蛋列表 */
    int listPetEggs = 10;
    /** 砸宠物蛋 */
    int smashPetEgg = 11;
    
    // ========== 世界BOSS ==========
    /** 挑战世界BOSS */
    int challengeWorldBoss = 20;
    /** 获取BOSS排行榜 */
    int getBossRanking = 21;
    
    // ========== 幸运转盘 ==========
    /** 转盘抽奖 */
    int spinWheel = 30;
    /** 获取转盘配置 */
    int getWheelConfig = 31;
    
    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}

