package com.iohao.mmo.arena.cmd;

import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.mmo.common.provide.cmd.CmdModule;

/**
 * 竞技场模块命令
 */
public interface ArenaCmd {
    int cmd = CmdModule.arenaCmd;

    /** 获取竞技场信息 */
    int getArenaInfo = 1;
    /** 获取对手列表 */
    int getOpponents = 2;
    /** 发起PVP对战 */
    int startPvpBattle = 3;
    /** 获取战斗结果 */
    int getBattleResult = 4;
    /** 获取天梯排名 */
    int getLadderRank = 5;
    /** 领取奖励 */
    int claimReward = 6;

    static CmdInfo of(int subCmd) {
        return CmdInfo.of(cmd, subCmd);
    }
}

