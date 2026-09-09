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
package com.iohao.mmo.equip.service;

import com.iohao.mmo.common.config.GameCode;
import com.iohao.mmo.common.provide.item.ItemTypeIdConst;
import com.iohao.mmo.equip.entity.*;
import lombok.AllArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import java.util.List;

/**
 * 装备库
 *
 * @author 唐斌
 * @date 2023-07-30
 * @description: 装备库实现类
 */
@Service
@AllArgsConstructor
public class EquipTemplateService {

    final MongoTemplate mongoTemplate;

    /**
     * 通过id查询装备库
     * @param id 装备库id
     * @return
     */
    public EquipTemplate findById(String id) {
        return  mongoTemplate.findById(id, EquipTemplate.class);
    }

    /**
     * 通过itemTypeId查询装备库
     * @param itemTypeId 物品分类标识
     * @return
     */
    public EquipTemplate findByItemTypeId(String itemTypeId) {
        return  mongoTemplate.findOne(
                Query.query(new Criteria("itemTypeId").is(itemTypeId)), EquipTemplate.class);
    }

    /**
     * 保存装备库
     * @param equipTemplate 装备库
     */
    public void save(EquipTemplate equipTemplate) {
        mongoTemplate.save(equipTemplate);
    }

    /**
     * 根据装备库id列表批量删除装备库
     * @param idList 装备库id列表
     */
    public void delBatch(List<String> idList) {
        Query query = new Query(new Criteria("id").in(idList));
        mongoTemplate.remove(query, EquipTemplate.class);
    }


    /**
     * 初始化装备库（临时方法，后期移除改为从运营数据中导入）
     */
    public void initEquipTemplate() {
        // 初始化一些装备配置，后期将移到 excel 中做。
        EquipTemplate equipTemplate = new EquipTemplate();
        equipTemplate.setPosition(1);
        equipTemplate.setLevel(10);
        equipTemplate.setFixedEquipPropertyMin(FixedEquipProperty.builder()
                        .hp(100)
                        .mp(100)
                        .physicsDefense(10)
                        .magicDefense(10)
                        .sealDefense(10)
                .build());
        equipTemplate.setFixedEquipPropertyMax(FixedEquipProperty.builder()
                .hp(300)
                .mp(300)
                .physicsDefense(30)
                .magicDefense(30)
                .sealDefense(30)
                .build());
        equipTemplate.setTotalAttrMin(20);
        equipTemplate.setTotalAttrMax(30);

        equipTemplate.setItemTypeId(ItemTypeIdConst.equipClothing10);

        mongoTemplate.save(equipTemplate);

        // 初始化一些装备配置，后期将移到 excel 中做。
        EquipTemplate equipTemplate2 = new EquipTemplate();
        equipTemplate2.setPosition(2);
        equipTemplate2.setLevel(10);
        equipTemplate2.setFixedEquipPropertyMin(FixedEquipProperty.builder()
                .physicsAttack(10)
                .magicAttack(10)
                .treatAttack(10)
                .sealAttack(10)
                .anger(10)
                .build());
        equipTemplate2.setFixedEquipPropertyMax(FixedEquipProperty.builder()
                .physicsAttack(30)
                .magicAttack(30)
                .treatAttack(30)
                .sealAttack(30)
                .anger(30)
                .build());
        equipTemplate2.setTotalAttrMin(20);
        equipTemplate2.setTotalAttrMax(30);

        equipTemplate2.setItemTypeId(ItemTypeIdConst.equipWeapon10);
        mongoTemplate.save(equipTemplate2);
    }

    /**
     * 根据装备库列表批量随机新的装备
     * @param itemTypeIdList 物品分类标识列表
     * @param userId 用户id
     * @return
     */
    public List<Equip> randomEquipBatch(List<String> itemTypeIdList,long userId){
        List<Equip> equipList = itemTypeIdList.stream()
                .map(itemTypeId -> randomEquip(itemTypeId,userId))
                .toList();
        return equipList;
    }

    /**
     * 根据装备库随机一件新的装备
     * @param itemTypeId itemTypeId
     * @param userId 用户id
     * @return
     */
    public Equip randomEquip(String itemTypeId, long userId){
        //取到装备库
        EquipTemplate equipTemplate = findByItemTypeId(itemTypeId);
        GameCode.objNotFound.assertTrue(equipTemplate!=null,"找不到对应装备库");
        //将装备库属性拷贝到装备中
        Equip equip = copyTemplate2Equip(equipTemplate);
        equip.setUserId(userId);
        mongoTemplate.save(equip);
        return equip;
    }

    /**
     * 根据需要拷贝装备库属性到装备
     * @param equipTemplate 装备库
     * @return
     */
    public Equip copyTemplate2Equip(EquipTemplate equipTemplate){

        return Equip.builder()
                .itemTypeId(equipTemplate.getItemTypeId())
                .quality(0) //品质
                .fixedEquipProperty(
                        FixedEquipProperty.randomFixed(equipTemplate.getFixedEquipPropertyMin(),
                                equipTemplate.getFixedEquipPropertyMax())) //装备固定属性
                .attrTotal(0)
                .undistributedAttr(0)
                .elseEquipProperty(ElseEquipProperty.resetElseEquipProperty()) //初始化分配的具体属性点
                .position(equipTemplate.getPosition())
                .level(equipTemplate.getLevel())
                .identifyCount(0)
                .fixedEquipPropertyMin(equipTemplate.getFixedEquipPropertyMin())
                .fixedEquipPropertyMax(equipTemplate.getFixedEquipPropertyMax())
                .totalAttrMin(equipTemplate.getTotalAttrMin())
                .totalAttrMax(equipTemplate.getTotalAttrMax())
                .equipTemplateId(equipTemplate.getItemTypeId())
                .build();
    }
}
