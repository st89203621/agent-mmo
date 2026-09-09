package com.iohao.mmo.map.repository;

import com.iohao.mmo.map.zone.PlayerZoneRecord;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PlayerZoneRepository extends MongoRepository<PlayerZoneRecord, Long> {
}
