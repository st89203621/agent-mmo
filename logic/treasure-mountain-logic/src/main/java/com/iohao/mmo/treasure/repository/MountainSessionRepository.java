package com.iohao.mmo.treasure.repository;

import com.iohao.mmo.treasure.entity.MountainSession;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MountainSessionRepository extends MongoRepository<MountainSession, String> {
    MountainSession findByUserIdAndMountainTypeAndDateTag(long userId, String mountainType, int dateTag);
}
