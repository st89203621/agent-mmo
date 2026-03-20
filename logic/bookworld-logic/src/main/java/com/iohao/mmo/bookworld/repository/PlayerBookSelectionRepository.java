package com.iohao.mmo.bookworld.repository;

import com.iohao.mmo.bookworld.entity.PlayerBookSelection;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PlayerBookSelectionRepository extends MongoRepository<PlayerBookSelection, String> {
    Optional<PlayerBookSelection> findByUserIdAndWorldIndexAndActiveTrue(long userId, int worldIndex);
    List<PlayerBookSelection> findByUserId(long userId);
}
