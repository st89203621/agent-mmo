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
package com.iohao.mmo.person.service;

import com.iohao.mmo.hero.service.HeroService;
import com.iohao.mmo.person.entity.BasicProperty;
import com.iohao.mmo.person.entity.Hero;
import com.iohao.mmo.person.entity.Person;
import lombok.AllArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

/**
 * @author 渔民小镇
 * @date 2023-07-24
 */
@Service
@AllArgsConstructor
public class PersonService {
    final MongoTemplate mongoTemplate;
    final HeroService heroService;

    /**
     * 初始化角色数据
     */
    public void initPerson(long userId) {
        Person existingPerson = mongoTemplate.findById(userId, Person.class);
        if (existingPerson != null) {
            // 检查并更新现有角色的名称
            if (existingPerson.getName() == null || existingPerson.getName().isEmpty()) {
                existingPerson.setName("玩家" + userId);
                mongoTemplate.save(existingPerson);
            }
            return; // 角色已存在
        }

        createPerson(userId);
    }

    /**
     * 创建新角色
     */
    private void createPerson(long userId) {
        BasicProperty basicProperty = createInitialProperty();
        Hero firstHero = heroService.getFirstHero();

        // 合并角色和英雄属性
        firstHero.setBasicProperty(basicProperty.plus(firstHero.getBasicProperty()));

        Person person = new Person();
        person.setId(userId);
        person.setName("玩家" + userId); // 设置默认角色名称
        person.setBasicProperty(basicProperty);
        person.setHeroList(List.of(firstHero));
        person.setCurrentHero(firstHero);

        mongoTemplate.save(person);
    }

    public Person getPersonById(long userId) {
        return mongoTemplate.findById(userId, Person.class);
    }

    /**
     * 更新角色名称
     */
    public void updateName(long userId, String name) {
        Person person = mongoTemplate.findById(userId, Person.class);
        if (person != null) {
            person.setName(name);
            mongoTemplate.save(person);
        }
    }

    /**
     * 保存角色
     */
    public void savePerson(Person person) {
        mongoTemplate.save(person);
    }

    /**
     * 创建初始属性
     */
    private BasicProperty createInitialProperty() {
        BasicProperty property = new BasicProperty();
        property.setHp(100);
        property.setMp(100);
        property.setPhysicsAttack(20);
        property.setPhysicsDefense(10);
        property.setMagicAttack(20);
        property.setMagicDefense(10);
        property.setTreatAttack(20);
        property.setSealAttack(20);
        property.setSealDefense(10);
        property.setSpeed(50);
        property.setAnger(0);
        return property;
    }
}
