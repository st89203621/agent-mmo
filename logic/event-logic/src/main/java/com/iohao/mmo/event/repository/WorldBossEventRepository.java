package com.iohao.mmo.event.repository;

import com.iohao.mmo.event.entity.WorldBossEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface WorldBossEventRepository extends MongoRepository<WorldBossEvent, String> {
    List<WorldBossEvent> findByEventId(String eventId);
    List<WorldBossEvent> findByStatus(WorldBossEvent.BossStatus status);
}

