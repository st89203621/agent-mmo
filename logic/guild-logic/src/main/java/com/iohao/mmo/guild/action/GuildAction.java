package com.iohao.mmo.guild.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.guild.cmd.GuildCmd;
import com.iohao.mmo.guild.entity.Guild;
import com.iohao.mmo.guild.entity.GuildMember;
import com.iohao.mmo.guild.proto.GuildMemberMessage;
import com.iohao.mmo.guild.proto.GuildMessage;
import com.iohao.mmo.guild.service.GuildService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@ActionController(GuildCmd.cmd)
public class GuildAction {

    @Resource
    GuildService guildService;

    @ActionMethod(GuildCmd.getGuild)
    public GuildMessage getGuild(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Guild guild = guildService.getGuildByPlayer(userId);
        return toMessage(guild);
    }

    @ActionMethod(GuildCmd.listGuilds)
    public List<GuildMessage> listGuilds() {
        return guildService.listGuilds().stream().map(this::toMessage).toList();
    }

    @ActionMethod(GuildCmd.listMembers)
    public List<GuildMemberMessage> listMembers(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Guild guild = guildService.getGuildByPlayer(userId);
        if (guild == null) return List.of();
        return guild.getMembers().stream().map(this::toMemberMessage).toList();
    }

    private GuildMessage toMessage(Guild g) {
        GuildMessage m = new GuildMessage();
        if (g == null) return m;
        m.guildId = g.getId();
        m.name = g.getName();
        m.leaderId = g.getLeaderId();
        m.leaderName = g.getLeaderName();
        m.memberCount = g.getMembers().size();
        m.maxMembers = g.getMaxMembers();
        m.level = g.getLevel();
        m.notice = g.getNotice();
        m.totalConstruction = g.getTotalConstruction();
        m.totalHonor = g.getTotalHonor();
        return m;
    }

    private GuildMemberMessage toMemberMessage(GuildMember gm) {
        GuildMemberMessage m = new GuildMemberMessage();
        m.playerId = gm.getPlayerId();
        m.playerName = gm.getPlayerName();
        m.position = gm.getPosition();
        m.contribution = gm.getContribution();
        m.construction = gm.getConstruction();
        m.honor = gm.getHonor();
        m.joinTime = gm.getJoinTime();
        return m;
    }
}
