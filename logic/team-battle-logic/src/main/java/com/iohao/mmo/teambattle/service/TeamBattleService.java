package com.iohao.mmo.teambattle.service;

import com.iohao.mmo.teambattle.entity.Team;
import com.iohao.mmo.teambattle.entity.TeamBattleRecord;
import com.iohao.mmo.teambattle.repository.TeamBattleRecordRepository;
import com.iohao.mmo.teambattle.repository.TeamRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class TeamBattleService {

    @Resource
    TeamRepository teamRepository;

    @Resource
    TeamBattleRecordRepository battleRecordRepository;

    public Team createTeam(long leaderId, String leaderName) {
        Team team = new Team();
        team.setId(UUID.randomUUID().toString());
        team.setLeaderId(leaderId);
        team.setLeaderName(leaderName);
        team.setStatus("WAITING");
        team.setCreateTime(System.currentTimeMillis());
        team.addMember(leaderId, leaderName);
        return teamRepository.save(team);
    }

    public Team joinTeam(String teamId, long playerId, String playerName) {
        Team team = teamRepository.findById(teamId).orElse(null);
        if (team == null || !"WAITING".equals(team.getStatus())) return null;
        team.addMember(playerId, playerName);
        return teamRepository.save(team);
    }

    public Team leaveTeam(String teamId, long playerId) {
        Team team = teamRepository.findById(teamId).orElse(null);
        if (team == null) return null;
        if (team.getLeaderId() == playerId) {
            team.setStatus("DISBANDED");
        } else {
            team.removeMember(playerId);
        }
        return teamRepository.save(team);
    }

    public Team getTeam(String teamId) {
        return teamRepository.findById(teamId).orElse(null);
    }

    public TeamBattleRecord startMatch(Team teamA, Team teamB) {
        teamA.setStatus("IN_BATTLE");
        teamB.setStatus("IN_BATTLE");
        teamRepository.save(teamA);
        teamRepository.save(teamB);

        String winner = teamA.getTotalPower() >= teamB.getTotalPower() ? "A" : "B";

        TeamBattleRecord record = new TeamBattleRecord();
        record.setId(UUID.randomUUID().toString());
        record.setTeamAId(teamA.getId());
        record.setTeamBId(teamB.getId());
        record.setTeamAMembers(teamA.getMemberIds());
        record.setTeamBMembers(teamB.getMemberIds());
        record.setWinner(winner);
        record.setFateReward(5);
        record.setTrustReward(3);
        record.setBattleTime(System.currentTimeMillis());

        teamA.setStatus("WAITING");
        teamB.setStatus("WAITING");
        teamRepository.save(teamA);
        teamRepository.save(teamB);

        return battleRecordRepository.save(record);
    }

    public List<Team> findWaitingTeams() {
        return teamRepository.findByStatus("MATCHING");
    }
}
