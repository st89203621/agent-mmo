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
package com.iohao.mmo.level.config;

import com.iohao.mmo.level.entity.PersonLevelConfig;
import jakarta.annotation.Resource;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * @author 渔民小镇
 * @date 2023-07-30
 */
@Component
public class LevelCommandLineRunner implements CommandLineRunner {
    @Resource
    MongoTemplate mongoTemplate;

    @Override
    public void run(String... args) {
        initConfigExcel();
    }

    private void initConfigExcel() {
        mongoTemplate.dropCollection(PersonLevelConfig.class);

        List<PersonLevelConfig> configList = new ArrayList<>();
        for (int i = 1; i < 100; i++) {
            PersonLevelConfig config = new PersonLevelConfig();
            configList.add(config);

            config.setLevel(i);
            config.setExp(i * 10);
        }

        mongoTemplate.insert(configList, PersonLevelConfig.class);

    }
}
