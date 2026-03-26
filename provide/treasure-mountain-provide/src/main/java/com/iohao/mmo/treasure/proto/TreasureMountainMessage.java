package com.iohao.mmo.treasure.proto;

import com.iohao.game.widget.light.protobuf.ProtoFileMerge;
import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PUBLIC)
@ProtoFileMerge(fileName = "treasure_mountain.proto", filePackage = "treasure_mountain")
public class TreasureMountainMessage {
    String mountainId;
    String name;
    String type;
    int requiredLevel;
    int maxDigTimes;
    boolean active;
}
