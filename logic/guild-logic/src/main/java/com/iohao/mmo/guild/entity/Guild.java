package com.iohao.mmo.guild.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * 盟会实体
 * 创建需要500万金币
 */
@Data
@Document("guild")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Guild {
    @Id
    String id;
    String name;
    long leaderId;
    String leaderName;
    String notice;
    int level = 1;
    int maxMembers = 50;
    long totalConstruction;
    long totalHonor;
    long createTime;
    List<GuildMember> members = new ArrayList<>();

    public GuildMember getMember(long playerId) {
        return members.stream()
                .filter(m -> m.getPlayerId() == playerId)
                .findFirst().orElse(null);
    }

    public void removeMember(long playerId) {
        members.removeIf(m -> m.getPlayerId() == playerId);
    }
}
