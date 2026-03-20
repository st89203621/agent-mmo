package com.iohao.mmo.fate.repository;

import com.iohao.mmo.fate.entity.NpcTemplate;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface NpcTemplateRepository extends MongoRepository<NpcTemplate, String> {
    Optional<NpcTemplate> findByNpcId(String npcId);
}
