package com.iohao.mmo.map.proto;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PUBLIC)
public class NearbyPlayerProto {
    long   playerId;
    String name;
    int    level;
    String zoneId;
    String portraitUrl;
}
