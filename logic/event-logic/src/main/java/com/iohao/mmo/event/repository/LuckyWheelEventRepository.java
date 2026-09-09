package com.iohao.mmo.event.repository;

import com.iohao.mmo.event.entity.LuckyWheelEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface LuckyWheelEventRepository extends MongoRepository<LuckyWheelEvent, String> {
    List<LuckyWheelEvent> findByEventId(String eventId);
}

