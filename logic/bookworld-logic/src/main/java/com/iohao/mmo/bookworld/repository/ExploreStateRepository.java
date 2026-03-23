package com.iohao.mmo.bookworld.repository;

import com.iohao.mmo.bookworld.explore.ExploreState;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ExploreStateRepository extends MongoRepository<ExploreState, String> {
    Optional<ExploreState> findByUserId(long userId);
}
