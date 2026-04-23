package com.iohao.mmo.map.proto;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PUBLIC)
public class MoveZoneReq {
    String zoneId;
}
