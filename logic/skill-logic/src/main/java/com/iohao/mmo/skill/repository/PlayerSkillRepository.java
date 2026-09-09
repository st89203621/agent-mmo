package com.iohao.mmo.skill.repository;

import com.iohao.mmo.skill.entity.PlayerSkill;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PlayerSkillRepository extends MongoRepository<PlayerSkill, String> {
    List<PlayerSkill> findByUserId(long userId);
    Optional<PlayerSkill> findByUserIdAndSkillTemplateId(long userId, String skillTemplateId);
}
