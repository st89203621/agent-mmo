package com.iohao.mmo.adventure.proto;

import com.baidu.bjf.remoting.protobuf.annotation.ProtobufClass;
import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import com.iohao.mmo.FileMerge;

@ProtobufClass
@ProtoFileMerge(fileName = FileMerge.fileName, filePackage = FileMerge.filePackage)
public class NativeWorldSnapshot {
    public boolean accepted;
    public String message;
    public long serverTime;
    public int realm;
    public String realmName;
    public float x;
    public float z;
    public float yaw;
    public int health;
    public int maxHealth;
    public long reviveAt;
    public long lastMoveSequence;
    public long lastActionSequence;
    public java.util.List<NativeEnemyMessage> enemies = new java.util.ArrayList<>();
    public java.util.List<NativePlayerMessage> players = new java.util.ArrayList<>();
    public java.util.List<NativeLandmarkMessage> landmarks = new java.util.ArrayList<>();
    public java.util.List<NativeCooldownMessage> cooldowns = new java.util.ArrayList<>();
    public int memoryMask;
    public int bossMask;
    public int treasureMask;
    public boolean introComplete;
    public java.util.List<Integer> realmKills = new java.util.ArrayList<>();
    public String questTitle;
    public String questDetail;
    public int unlockedRealmMask;
    public java.util.List<NativeCombatEvent> events = new java.util.ArrayList<>();
    public java.util.List<NativeRewardMessage> rewards = new java.util.ArrayList<>();
    public int level;
    public long experience;
    public int attack;
    public int defense;
    public int activePetLevel;
    public int submap;
    public String submapName;
    public int submapMemoryMask;
    public int submapKills;
    public boolean submapBossDefeated;
    public boolean submapTreasureCollected;
    public int unlockedSubmapMask;
    public java.util.List<Integer> mapMemoryMasks = new java.util.ArrayList<>();
    public int unlockedMapMask;
}
