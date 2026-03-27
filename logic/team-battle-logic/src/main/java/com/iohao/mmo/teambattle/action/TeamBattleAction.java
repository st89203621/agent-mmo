package com.iohao.mmo.teambattle.action;

import com.alibaba.fastjson2.JSON;
import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.teambattle.cmd.TeamBattleCmd;
import com.iohao.mmo.teambattle.entity.Team;
import com.iohao.mmo.teambattle.proto.TeamBattleResultMessage;
import com.iohao.mmo.teambattle.proto.TeamMessage;
import com.iohao.mmo.teambattle.service.TeamBattleService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ActionController(TeamBattleCmd.cmd)
public class TeamBattleAction {

    @Resource
    TeamBattleService teamBattleService;

    @ActionMethod(TeamBattleCmd.createTeam)
    public TeamMessage createTeam(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Team team = teamBattleService.createTeam(userId, "");
        return toMessage(team);
    }

    @ActionMethod(TeamBattleCmd.joinTeam)
    public TeamMessage joinTeam(String teamId, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Team team = teamBattleService.joinTeam(teamId, userId, "");
        if (team == null) return new TeamMessage();
        return toMessage(team);
    }

    @ActionMethod(TeamBattleCmd.leaveTeam)
    public TeamMessage leaveTeam(String teamId, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Team team = teamBattleService.leaveTeam(teamId, userId);
        if (team == null) return new TeamMessage();
        return toMessage(team);
    }

    @ActionMethod(TeamBattleCmd.getTeamInfo)
    public TeamMessage getTeamInfo(String teamId, FlowContext flowContext) {
        Team team = teamBattleService.getTeam(teamId);
        if (team == null) return new TeamMessage();
        return toMessage(team);
    }

    private TeamMessage toMessage(Team team) {
        TeamMessage msg = new TeamMessage();
        msg.teamId = team.getId();
        msg.leaderId = team.getLeaderId();
        msg.leaderName = team.getLeaderName() != null ? team.getLeaderName() : "";
        msg.memberIds = team.getMemberIds() != null ? JSON.toJSONString(team.getMemberIds()) : "[]";
        msg.memberNames = team.getMemberNames() != null ? JSON.toJSONString(team.getMemberNames()) : "[]";
        msg.teamSize = team.getTeamSize();
        msg.status = team.getStatus();
        msg.totalPower = team.getTotalPower();
        return msg;
    }
}
