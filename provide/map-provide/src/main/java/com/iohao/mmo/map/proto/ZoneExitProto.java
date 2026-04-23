package com.iohao.mmo.map.proto;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PUBLIC)
public class ZoneExitProto {
    /** 东/西/南/北 */
    String direction;
    String targetZoneId;
    String label;
}
