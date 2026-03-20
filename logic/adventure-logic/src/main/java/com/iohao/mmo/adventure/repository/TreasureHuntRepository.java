package com.iohao.mmo.adventure.repository;

import com.iohao.mmo.adventure.entity.TreasureHunt;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TreasureHuntRepository extends MongoRepository<TreasureHunt, String> {
    List<TreasureHunt> findByUserId(long userId);
    List<TreasureHunt> findByUserIdAndStatus(long userId, TreasureHunt.TreasureStatus status);
}

