package com.iohao.mmo.event.repository;

import com.iohao.mmo.event.entity.PlayerEventProgress;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PlayerEventProgressRepository extends MongoRepository<PlayerEventProgress, String> {
    Optional<PlayerEventProgress> findByUserIdAndEventId(long userId, String eventId);
    List<PlayerEventProgress> findByUserId(long userId);
    List<PlayerEventProgress> findByEventId(String eventId);
}

