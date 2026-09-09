package com.iohao.mmo.guild.service;

import com.iohao.mmo.guild.entity.Guild;
import com.iohao.mmo.guild.entity.GuildMember;
import com.iohao.mmo.guild.proto.GuildMessage;
import com.iohao.mmo.guild.proto.GuildMemberMessage;
import com.iohao.mmo.guild.proto.NativeGuildRequest;
import com.iohao.mmo.guild.proto.NativeGuildState;
import com.iohao.mmo.bag.service.ServerEconomyService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import java.time.LocalDate;
import java.util.List;

@Service
public class NativeGuildService implements NativeGuildAccess {
    @Resource GuildService guildService;
    @Resource ServerEconomyService economy;
    @Resource MongoTemplate mongoTemplate;

    public NativeGuildState state(long userId, boolean success, String message) {
        NativeGuildState result = new NativeGuildState();
        Guild guild = guildService.getGuildByPlayer(userId);
        result.success = success; result.message = message;
        result.guild = guild == null ? null : guildMessage(guild);
        result.guilds = guildService.listGuilds().stream().limit(100).map(this::guildMessage).toList();
        result.members = guild == null ? List.of() : guild.getMembers().stream().map(this::memberMessage).toList();
        if (guild != null) {
            GuildMember member = guild.getMember(userId);
            result.contribution = member.getContribution(); result.honor = member.getHonor(); result.construction = member.getConstruction();
        }
        result.createCost = guildService.getCreateCost(); result.donationCost = 1000;
        return result;
    }

    public synchronized NativeGuildState mutate(long userId, String playerName, NativeGuildRequest request) {
        if (request == null || request.operation == null) return state(userId, false, "请选择盟会操作");
        Guild guild = guildService.getGuildByPlayer(userId);
        switch (request.operation.toUpperCase(java.util.Locale.ROOT)) {
            case "CREATE": {
                if (guild != null) return state(userId, false, "你已有盟会");
                String name = request.name == null ? "" : request.name.trim();
                if (!name.matches("[\\p{L}\\p{N} ]{2,12}")) return state(userId, false, "盟名需要 2 至 12 个汉字、字母或数字");
                String guildId = "native_" + userId;
                Guild existing = guildService.getGuildById(guildId);
                if (existing != null) return state(userId, false, "你创建的盟会仍然存在");
                if (!spendOnce(userId, "guild-create:" + userId, (int) guildService.getCreateCost()))
                    return state(userId, false, "创建盟会需要 500 万金币");
                Guild created = new Guild(); created.setId(guildId); created.setName(name); created.setLeaderId(userId);
                created.setLeaderName(playerName); created.setCreateTime(System.currentTimeMillis()); created.setNotice("同赴山海，共守盟约");
                GuildMember member = new GuildMember(); member.setPlayerId(userId); member.setPlayerName(playerName);
                member.setPosition("LEADER"); member.setJoinTime(System.currentTimeMillis()); created.getMembers().add(member);
                mongoTemplate.save(created);
                return state(userId, true, "盟会创建成功");
            }
            case "JOIN": {
                if (guild != null) return state(userId, false, "请先退出当前盟会");
                if (request.guildId == null || !guildService.joinGuild(request.guildId, userId, playerName))
                    return state(userId, false, "无法加入：盟会不存在、已满员或已有盟会");
                return state(userId, true, "已加入盟会");
            }
            case "LEAVE":
                return state(userId, guildService.leaveGuild(userId), guild != null && guild.getLeaderId() == userId
                        ? "盟主不能直接退出盟会" : "退出请求已处理");
            case "DONATE": {
                if (guild == null) return state(userId, false, "请先加入盟会");
                String receipt = "guild-donate:" + userId + ":" + guild.getId() + ":" + LocalDate.now();
                if (guild.getNativeSocialReceipts().contains(receipt)) return state(userId, true, "今日捐献已完成");
                if (!spendOnce(userId, receipt, 1000)) return state(userId, false, "捐献需要 1000 金币");
                mongoTemplate.updateFirst(Query.query(Criteria.where("_id").is(guild.getId())
                                .and("members.playerId").is(userId).and("nativeSocialReceipts").ne(receipt)),
                        new Update().inc("members.$.contribution", 10).inc("members.$.construction", 10)
                                .inc("totalConstruction", 10).addToSet("nativeSocialReceipts", receipt), Guild.class);
                return state(userId, true, "捐献完成，贡献与建设各增加 10 点");
            }
            default: return state(userId, false, "未知盟会操作");
        }
    }

    private boolean spendOnce(long userId, String receipt, int amount) {
        return economy.spendGold(userId, amount, receipt);
    }

    @Override
    public String guildId(long userId) {
        Guild guild = guildService.getGuildByPlayer(userId);
        return guild == null ? null : guild.getId();
    }

    @Override
    public void creditMountain(long userId, String guildId, String receipt, long honor) {
        if (guildId == null || guildId.isBlank()) return;
        mongoTemplate.updateFirst(Query.query(Criteria.where("_id").is(guildId).and("members.playerId").is(userId)
                        .and("nativeSocialReceipts").ne(receipt)),
                new Update().inc("members.$.honor", honor).inc("members.$.contribution", honor)
                        .inc("totalHonor", honor).addToSet("nativeSocialReceipts", receipt), Guild.class);
    }

    private GuildMessage guildMessage(Guild g) {
        GuildMessage m = new GuildMessage(); m.guildId = g.getId(); m.name = g.getName(); m.leaderId = g.getLeaderId();
        m.leaderName = g.getLeaderName(); m.memberCount = g.getMembers().size(); m.maxMembers = g.getMaxMembers();
        m.level = g.getLevel(); m.notice = g.getNotice(); m.totalConstruction = g.getTotalConstruction(); m.totalHonor = g.getTotalHonor();
        return m;
    }

    private GuildMemberMessage memberMessage(GuildMember member) {
        GuildMemberMessage m = new GuildMemberMessage(); m.playerId = member.getPlayerId(); m.playerName = member.getPlayerName();
        m.position = member.getPosition(); m.contribution = member.getContribution(); m.honor = member.getHonor();
        m.construction = member.getConstruction(); m.joinTime = member.getJoinTime(); return m;
    }
}
