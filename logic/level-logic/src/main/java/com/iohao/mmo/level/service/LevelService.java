/*
 * ioGame
 * Copyright (C) 2021 - 2023  渔民小镇 （262610965@qq.com、luoyizhu@gmail.com） . All Rights Reserved.
 * # iohao.com . 渔民小镇
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package com.iohao.mmo.level.service;

import com.iohao.mmo.level.entity.Level;
import com.iohao.mmo.level.entity.PersonLevelConfig;
import com.iohao.mmo.level.repository.LevelRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.Optional;

/**
 * @author 渔民小镇
 * @date 2023-07-30
 */
@Service
@AllArgsConstructor
public class LevelService {
    final MongoTemplate mongoTemplate;
    final LevelRepository levelRepository;

    public Level ofLevel(long id) {

        Level level = mongoTemplate.findById(id, Level.class);

        if (Objects.isNull(level)) {
            level = new Level();
            level.setId(id);
            level.setExp(0);
            level.setLevel(1);
            mongoTemplate.save(level);
        }

        return level;
    }

    public Optional<Level> getById(long primaryKey) {
        return levelRepository.findById(primaryKey);
    }

    public void save(Level level) {
        mongoTemplate.save(level);
    }

    public PersonLevelConfig getPersonLevelConfigByLevel(int level) {
        Query query = new Query(Criteria.where("level").is(level));
        return mongoTemplate.findOne(query, PersonLevelConfig.class);
    }
}
