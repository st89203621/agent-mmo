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
        createPerson(userId, "ATTACK");
    }

    /**
     * 按职业创建新角色
     */
    public void createPerson(long userId, String profession) {
        BasicProperty basicProperty = createInitialProperty(profession);
        Hero firstHero = heroService.getFirstHero();

        firstHero.setBasicProperty(basicProperty.plus(firstHero.getBasicProperty()));

        Person person = new Person();
        person.setId(userId);
        person.setName("玩家" + userId);
        person.setProfession(profession);
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
     * 根据职业创建初始属性
     * ATTACK(无坚不摧): 高攻击，中防御，低敏捷
     * DEFENSE(金刚护体): 高防御高血量，中攻击，低敏捷
     * AGILITY(行动敏捷): 平庸攻防，超高敏捷，附加属性强
     */
    public BasicProperty createInitialProperty(String profession) {
        BasicProperty p = new BasicProperty();
        p.setMp(100);
        p.setAnger(0);

        switch (profession != null ? profession : "ATTACK") {
            case "DEFENSE" -> {
                p.setHp(200);
                p.setPhysicsAttack(12);
                p.setPhysicsDefense(25);
                p.setMagicAttack(10);
                p.setMagicDefense(20);
                p.setTreatAttack(15);
                p.setSealAttack(10);
                p.setSealDefense(20);
                p.setSpeed(30);
                p.setAgility(10);
            }
            case "AGILITY" -> {
                p.setHp(100);
                p.setPhysicsAttack(15);
                p.setPhysicsDefense(10);
                p.setMagicAttack(15);
                p.setMagicDefense(10);
                p.setTreatAttack(12);
                p.setSealAttack(15);
                p.setSealDefense(12);
                p.setSpeed(80);
                p.setAgility(50);
            }
            default -> { // ATTACK
                p.setHp(120);
                p.setPhysicsAttack(30);
                p.setPhysicsDefense(10);
                p.setMagicAttack(25);
                p.setMagicDefense(8);
                p.setTreatAttack(20);
                p.setSealAttack(20);
                p.setSealDefense(8);
                p.setSpeed(50);
                p.setAgility(15);
            }
        }

        p.recalcBonus();
        return p;
    }
}
