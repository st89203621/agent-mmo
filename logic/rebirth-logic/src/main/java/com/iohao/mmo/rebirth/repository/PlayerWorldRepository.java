package com.iohao.mmo.rebirth.repository;

import com.iohao.mmo.rebirth.entity.PlayerWorld;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PlayerWorldRepository extends MongoRepository<PlayerWorld, Long> {
}
