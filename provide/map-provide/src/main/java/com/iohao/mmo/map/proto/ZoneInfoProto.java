package com.iohao.mmo.map.proto;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@FieldDefaults(level = AccessLevel.PUBLIC)
public class ZoneInfoProto {
    String zoneId;
    String name;
    int    coordX;
    int    coordY;
    String description;
    String sceneHint;
    List<ZoneExitProto>      exits;
    List<NearbyPlayerProto>  nearbyPlayers;
    List<ZoneHotEventProto>  hotEvents;
}
