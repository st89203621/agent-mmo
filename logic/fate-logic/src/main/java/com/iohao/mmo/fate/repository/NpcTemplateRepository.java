package com.iohao.mmo.fate.repository;

import com.iohao.mmo.fate.entity.NpcTemplate;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NpcTemplateRepository extends MongoRepository<NpcTemplate, String> {
    List<NpcTemplate> findByNpcId(String npcId);
}
