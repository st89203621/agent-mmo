package com.iohao.mmo.teambattle.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Team {
    @Id
    String id;

    long leaderId;
    String leaderName;
    List<Long> memberIds;
    List<String> memberNames;
    /** WAITING / MATCHING / IN_BATTLE / DISBANDED */
    String status;
    int totalPower;
    long createTime;

    public void addMember(long playerId, String name) {
        if (memberIds == null) memberIds = new ArrayList<>();
        if (memberNames == null) memberNames = new ArrayList<>();
        if (!memberIds.contains(playerId) && memberIds.size() < 3) {
            memberIds.add(playerId);
            memberNames.add(name);
        }
    }

    public void removeMember(long playerId) {
        if (memberIds == null) return;
        int idx = memberIds.indexOf(playerId);
        if (idx >= 0) {
            memberIds.remove(idx);
            if (memberNames != null && idx < memberNames.size()) {
                memberNames.remove(idx);
            }
        }
    }

    public int getTeamSize() {
        return memberIds != null ? memberIds.size() : 0;
    }
}
