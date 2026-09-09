package com.iohao.mmo.story.repository;

import com.iohao.mmo.story.entity.AnimatedPortrait;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface AnimatedPortraitRepository extends MongoRepository<AnimatedPortrait, String> {
    List<AnimatedPortrait> findByGroupKeyOrderByCreateTimeDesc(String groupKey);
    Optional<AnimatedPortrait> findFirstByGroupKeyOrderByCreateTimeDesc(String groupKey);
}
