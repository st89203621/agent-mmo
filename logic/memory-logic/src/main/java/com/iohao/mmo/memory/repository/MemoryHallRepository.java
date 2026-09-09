package com.iohao.mmo.memory.repository;

import com.iohao.mmo.memory.entity.MemoryHall;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MemoryHallRepository extends MongoRepository<MemoryHall, Long> {
}
