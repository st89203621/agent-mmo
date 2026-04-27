package com.iohao.mmo.story.repository;

import com.iohao.mmo.story.entity.SceneImage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SceneImageRepository extends MongoRepository<SceneImage, String> {
    List<SceneImage> findByCacheKey(String cacheKey);
    List<SceneImage> findByCacheKeyStartingWithOrderByCreateTimeDesc(String prefix);
}
