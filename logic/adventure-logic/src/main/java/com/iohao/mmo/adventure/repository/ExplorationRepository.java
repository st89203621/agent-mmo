package com.iohao.mmo.adventure.repository;

import com.iohao.mmo.adventure.entity.Exploration;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExplorationRepository extends MongoRepository<Exploration, String> {
    List<Exploration> findByUserId(long userId);
    Exploration findByUserIdAndExplorationId(long userId, String explorationId);
}

