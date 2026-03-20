package com.iohao.mmo.event.repository;

import com.iohao.mmo.event.entity.DivinePetEgg;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DivinePetEggRepository extends MongoRepository<DivinePetEgg, String> {
    List<DivinePetEgg> findByEventIdAndSmashedFalse(String eventId);
    List<DivinePetEgg> findByEventId(String eventId);
    List<DivinePetEgg> findBySmashedBy(Long userId);
}

