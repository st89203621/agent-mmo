package com.iohao.mmo.map.zone;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("player_zones")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PlayerZoneRecord {
    @Id
    long playerId;
    String zoneId;
    Instant updatedAt;
}
