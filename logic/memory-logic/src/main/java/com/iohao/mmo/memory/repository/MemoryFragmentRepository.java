package com.iohao.mmo.memory.repository;

import com.iohao.mmo.memory.entity.MemoryFragment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MemoryFragmentRepository extends MongoRepository<MemoryFragment, String> {
    List<MemoryFragment> findByPlayerId(long playerId);
    List<MemoryFragment> findByPlayerIdAndWorldIndex(long playerId, int worldIndex);
    List<MemoryFragment> findByPlayerIdAndNpcIdAndWorldIndex(long playerId, String npcId, int worldIndex);
}
