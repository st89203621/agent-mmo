package com.iohao.mmo.adventure.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document("native_adventure_progress")
public class NativeAdventureProgress {
    @Id
    public long userId;
    public int realm;
    public int submap;
    public float x = -.65f;
    public float z;
    public float yaw;
    public int health;
    public boolean initialized;
    public long reviveAt;
    public long lastMoveSequence;
    public long lastActionSequence;
    public int memoryMask;
    public int bossMask;
    public int treasureMask;
    public boolean introComplete;
    public List<Integer> realmKills = new ArrayList<>(List.of(0, 0, 0, 0, 0, 0, 0));
    public Map<String, Long> cooldowns = new HashMap<>();
    public long rewardSequence;
    public List<NativeRewardGrant> pendingRewards = new ArrayList<>();
    public long updatedAt;
    public Map<String, NativeSubmapProgress> submaps = new HashMap<>();
}
