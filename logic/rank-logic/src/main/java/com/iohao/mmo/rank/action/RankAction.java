package com.iohao.mmo.rank.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.mmo.rank.cmd.RankCmd;
import com.iohao.mmo.rank.entity.RankEntry;
import com.iohao.mmo.rank.proto.RankEntryMessage;
import com.iohao.mmo.rank.service.RankService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import jakarta.annotation.Resource;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
@ActionController(RankCmd.cmd)
public class RankAction {

    @Resource
    RankService rankService;

    @ActionMethod(RankCmd.getLevelRank)
    public List<RankEntryMessage> getLevelRank() {
        List<RankEntryMessage> result = convertToMessages(rankService.getRank("level", 100));
        log.info("🏆 返回等级排行榜数据，条数: {}", result.size());
        return result;
    }

    @ActionMethod(RankCmd.getPowerRank)
    public List<RankEntryMessage> getPowerRank() {
        List<RankEntryMessage> result = convertToMessages(rankService.getRank("power", 100));
        log.info("🏆 返回战力排行榜数据，条数: {}", result.size());
        return result;
    }

    @ActionMethod(RankCmd.getWealthRank)
    public List<RankEntryMessage> getWealthRank() {
        List<RankEntryMessage> result = convertToMessages(rankService.getRank("wealth", 100));
        log.info("🏆 返回财富排行榜数据，条数: {}", result.size());
        return result;
    }

    @ActionMethod(RankCmd.getAchievementRank)
    public List<RankEntryMessage> getAchievementRank() {
        List<RankEntryMessage> result = convertToMessages(rankService.getRank("achievement", 100));
        log.info("🏆 返回成就排行榜数据，条数: {}", result.size());
        return result;
    }

    @ActionMethod(RankCmd.getPlayerRank)
    public int getPlayerRank(String rankType, long playerId) {
        return rankService.getPlayerRank(rankType, playerId);
    }

    private List<RankEntryMessage> convertToMessages(List<RankEntry> entries) {
        return entries.stream().map(entry -> {
            RankEntryMessage msg = new RankEntryMessage();
            msg.rank = entry.getRank();
            msg.playerId = entry.getPlayerId();
            msg.playerName = entry.getPlayerName();
            msg.level = entry.getLevel();
            msg.value = entry.getValue();
            msg.rankType = entry.getRankType();
            return msg;
        }).collect(Collectors.toList());
    }
}

