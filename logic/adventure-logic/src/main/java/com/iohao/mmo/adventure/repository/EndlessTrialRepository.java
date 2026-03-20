package com.iohao.mmo.adventure.repository;

import com.iohao.mmo.adventure.entity.EndlessTrial;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EndlessTrialRepository extends MongoRepository<EndlessTrial, String> {
    List<EndlessTrial> findByUserId(long userId);
    List<EndlessTrial> findTop100ByOrderByMaxWaveReachedDescScoreDesc();
}

