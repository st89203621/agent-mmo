package com.iohao.mmo.fate.repository;

import com.iohao.mmo.fate.entity.Relation;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface RelationRepository extends MongoRepository<Relation, String> {
    Optional<Relation> findByPlayerIdAndNpcIdAndWorldIndex(long playerId, String npcId, int worldIndex);
    List<Relation> findByPlayerId(long playerId);
    List<Relation> findByPlayerIdOrderByFateScoreDesc(long playerId);
}
