package com.iohao.mmo.bookworld.repository;

import com.iohao.mmo.bookworld.explore.ExploreEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ExploreEventRepository extends MongoRepository<ExploreEvent, String> {
    Optional<ExploreEvent> findByEventId(String eventId);

    List<ExploreEvent> findByUserIdAndResolvedTrueOrderByCreateTimeDesc(long userId);
}
