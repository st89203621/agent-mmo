package com.iohao.mmo.event.repository;

import com.iohao.mmo.event.entity.TimedRealmEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TimedRealmEventRepository extends MongoRepository<TimedRealmEvent, String> {
    List<TimedRealmEvent> findByEventId(String eventId);
}

