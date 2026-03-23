package com.iohao.mmo.skill.repository;

import com.iohao.mmo.skill.entity.SkillTemplate;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SkillTemplateRepository extends MongoRepository<SkillTemplate, String> {
    List<SkillTemplate> findByBranchOrderBySortOrder(String branch);
}
