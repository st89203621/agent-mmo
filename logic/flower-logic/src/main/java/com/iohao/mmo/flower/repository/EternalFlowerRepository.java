package com.iohao.mmo.flower.repository;

import com.iohao.mmo.flower.entity.EternalFlower;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface EternalFlowerRepository extends MongoRepository<EternalFlower, Long> {
}
