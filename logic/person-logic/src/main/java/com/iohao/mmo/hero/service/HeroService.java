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
package com.iohao.mmo.hero.service;

import com.iohao.mmo.person.entity.BasicProperty;
import com.iohao.mmo.person.entity.Hero;
import lombok.AllArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

/**
 * @author 渔民小镇
 * @date 2023-07-27
 */
@Service
@AllArgsConstructor
public class HeroService {
    final MongoTemplate mongoTemplate;

    public Hero getFirstHero() {
        // 得到第一个英雄，即使后期我们有几十个英雄，也初始化这一个（类似新手英雄）
        String heroId = "hero-1";
        Hero hero = mongoTemplate.findById(heroId, Hero.class);

        // 如果英雄不存在，则创建一个
        if (hero == null) {
            initHeroData();
            hero = mongoTemplate.findById(heroId, Hero.class);
        }

        return hero;
    }

    private void initHeroData() {
        // 初始化一些英雄数配置，后期将移到 excel 中做。

        Hero hero = new Hero();
        hero.setId("hero-1");
        hero.setName("阿里克斯");

        BasicProperty basicProperty = getInitBasicProperty();
        hero.setBasicProperty(basicProperty);

        mongoTemplate.save(hero);
    }

    private BasicProperty getInitBasicProperty() {
        BasicProperty basicProperty = new BasicProperty();
        basicProperty.setHp(200);
        basicProperty.setMp(200);
        basicProperty.setPhysicsAttack(60);
        basicProperty.setPhysicsDefense(20);

        basicProperty.setMagicAttack(10);
        basicProperty.setMagicDefense(10);

        basicProperty.setTreatAttack(20);
        basicProperty.setSealAttack(20);
        basicProperty.setSealDefense(10);
        basicProperty.setSpeed(50);
        basicProperty.setAnger(0);
        return basicProperty;
    }
}
