package com.iohao.mmo.guild.service;

import com.iohao.mmo.guild.entity.Guild;
import com.iohao.mmo.guild.entity.GuildMember;
import lombok.AllArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@AllArgsConstructor
public class GuildService {
    static final long CREATE_COST = 5_000_000L;

    final MongoTemplate mongoTemplate;

    public Guild createGuild(long leaderId, String leaderName, String guildName) {
        Guild guild = new Guild();
        guild.setName(guildName);
        guild.setLeaderId(leaderId);
        guild.setLeaderName(leaderName);
        guild.setCreateTime(System.currentTimeMillis());

        GuildMember leader = new GuildMember();
        leader.setPlayerId(leaderId);
        leader.setPlayerName(leaderName);
        leader.setPosition("LEADER");
        leader.setJoinTime(System.currentTimeMillis());
        guild.getMembers().add(leader);

        return mongoTemplate.save(guild);
    }

    public Guild getGuildById(String guildId) {
        return mongoTemplate.findById(guildId, Guild.class);
    }

    public Guild getGuildByPlayer(long playerId) {
        return mongoTemplate.findOne(
            Query.query(Criteria.where("members.playerId").is(playerId)), Guild.class);
    }

    public List<Guild> listGuilds() {
        return mongoTemplate.findAll(Guild.class);
    }

    public boolean joinGuild(String guildId, long playerId, String playerName) {
        Guild guild = getGuildById(guildId);
        if (guild == null || guild.getMembers().size() >= guild.getMaxMembers()) return false;
        if (guild.getMember(playerId) != null) return false;
        if (getGuildByPlayer(playerId) != null) return false;

        GuildMember member = new GuildMember();
        member.setPlayerId(playerId);
        member.setPlayerName(playerName);
        member.setPosition("MEMBER");
        member.setJoinTime(System.currentTimeMillis());
        guild.getMembers().add(member);
        mongoTemplate.save(guild);
        return true;
    }

    public boolean leaveGuild(long playerId) {
        Guild guild = getGuildByPlayer(playerId);
        if (guild == null) return false;
        if (guild.getLeaderId() == playerId) return false;
        guild.removeMember(playerId);
        mongoTemplate.save(guild);
        return true;
    }

    public boolean dissolveGuild(long playerId) {
        Guild guild = getGuildByPlayer(playerId);
        if (guild == null || guild.getLeaderId() != playerId) return false;
        mongoTemplate.remove(guild);
        return true;
    }

    public boolean kickMember(long leaderId, long targetId) {
        Guild guild = getGuildByPlayer(leaderId);
        if (guild == null) return false;
        GuildMember leader = guild.getMember(leaderId);
        if (leader == null || "MEMBER".equals(leader.getPosition())) return false;
        if (leaderId == targetId) return false;
        guild.removeMember(targetId);
        mongoTemplate.save(guild);
        return true;
    }

    public void donateGold(long playerId, long amount) {
        Guild guild = getGuildByPlayer(playerId);
        if (guild == null) return;
        GuildMember member = guild.getMember(playerId);
        if (member == null) return;
        member.setContribution(member.getContribution() + amount);
        guild.setTotalConstruction(guild.getTotalConstruction() + amount / 10);
        mongoTemplate.save(guild);
    }

    public void donateMaterial(long playerId, long constructionValue) {
        Guild guild = getGuildByPlayer(playerId);
        if (guild == null) return;
        GuildMember member = guild.getMember(playerId);
        if (member == null) return;
        member.setConstruction(member.getConstruction() + constructionValue);
        guild.setTotalConstruction(guild.getTotalConstruction() + constructionValue);
        mongoTemplate.save(guild);
    }

    public void addHonor(long playerId, long honorValue) {
        Guild guild = getGuildByPlayer(playerId);
        if (guild == null) return;
        GuildMember member = guild.getMember(playerId);
        if (member == null) return;
        member.setHonor(member.getHonor() + honorValue);
        guild.setTotalHonor(guild.getTotalHonor() + honorValue);
        mongoTemplate.save(guild);
    }

    public boolean setPosition(long leaderId, long targetId, String position) {
        Guild guild = getGuildByPlayer(leaderId);
        if (guild == null || guild.getLeaderId() != leaderId) return false;
        GuildMember target = guild.getMember(targetId);
        if (target == null) return false;
        target.setPosition(position);
        mongoTemplate.save(guild);
        return true;
    }

    public long getCreateCost() {
        return CREATE_COST;
    }
}
