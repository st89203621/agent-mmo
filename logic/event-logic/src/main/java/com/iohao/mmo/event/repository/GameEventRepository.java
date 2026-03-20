package com.iohao.mmo.event.repository;

import com.iohao.mmo.common.event.EventType;
import com.iohao.mmo.event.entity.GameEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface GameEventRepository extends MongoRepository<GameEvent, String> {
    List<GameEvent> findByStatus(GameEvent.EventStatus status);
    List<GameEvent> findByEventType(EventType eventType);
    List<GameEvent> findByStatusAndEventType(GameEvent.EventStatus status, EventType eventType);
}

