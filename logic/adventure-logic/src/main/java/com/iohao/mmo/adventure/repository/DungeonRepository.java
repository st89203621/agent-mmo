package com.iohao.mmo.adventure.repository;

import com.iohao.mmo.adventure.entity.Dungeon;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DungeonRepository extends MongoRepository<Dungeon, String> {
    List<Dungeon> findByUserId(long userId);
    Dungeon findByUserIdAndDungeonId(long userId, String dungeonId);
    List<Dungeon> findByUserIdAndStatus(long userId, Dungeon.DungeonStatus status);
}

