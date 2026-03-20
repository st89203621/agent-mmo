package com.iohao.mmo.arena.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.arena.cmd.ArenaCmd;
import com.iohao.mmo.arena.entity.ArenaPlayer;
import com.iohao.mmo.arena.mapper.ArenaMapper;
import com.iohao.mmo.arena.proto.ArenaPlayerMessage;
import com.iohao.mmo.arena.proto.BattleResultMessage;
import com.iohao.mmo.arena.service.ArenaService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import jakarta.annotation.Resource;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@ActionController(ArenaCmd.cmd)
public class ArenaAction {

    @Resource
    ArenaService arenaService;

    @ActionMethod(ArenaCmd.getArenaInfo)
    public ArenaPlayerMessage getArenaInfo(long playerId) {
        ArenaPlayer player = arenaService.getArenaInfo(playerId);
        return ArenaMapper.ME.convert(player);
    }

    @ActionMethod(ArenaCmd.getOpponents)
    public List<ArenaPlayerMessage> getOpponents(long playerId) {
        List<ArenaPlayer> opponents = arenaService.getOpponents(playerId, 5);
        return ArenaMapper.ME.convertList(opponents);
    }

    @ActionMethod(ArenaCmd.startPvpBattle)
    public ArenaPlayerMessage startPvpBattle(long playerId, long opponentId) {
        arenaService.startPvpBattle(playerId, opponentId);
        ArenaPlayer player = arenaService.getArenaInfo(playerId);
        return ArenaMapper.ME.convert(player);
    }

    @ActionMethod(ArenaCmd.getBattleResult)
    public BattleResultMessage getBattleResult(long playerId, long opponentId) {
        Map<String, Object> result = arenaService.getBattleResult(playerId, opponentId);
        return ArenaMapper.ME.convertBattleResult(result);
    }

    @ActionMethod(ArenaCmd.getLadderRank)
    public List<ArenaPlayerMessage> getLadderRank() {
        List<ArenaPlayer> ranks = arenaService.getLadderRank(100);
        return ArenaMapper.ME.convertList(ranks);
    }
}

