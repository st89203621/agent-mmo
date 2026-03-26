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
import com.iohao.mmo.equip.entity.ElseEquipProperty;
import com.iohao.mmo.equip.entity.Equip;
import com.iohao.mmo.equip.kit.EquipRandomKit;
import lombok.AllArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;
import java.util.Random;

/**
 * 装备
 *
 * @author 唐斌
 * @date 2023-07-30
 * @description: 装备属性实现类
 */
@Service
@AllArgsConstructor
public class EquipService {
    final MongoTemplate mongoTemplate;

    /**
     * 通过装备id查询装备
     * @param id 装备id
     * @return
     */
    public Equip findById(String id) {
        return  mongoTemplate.findById(id, Equip.class);
    }

    /**
     * 根据用户查找所有装备
     * @param userId 用户id
     * @return
     */
    public List<Equip> listByUser(long userId) {
        Query query = new Query();
        query.addCriteria(Criteria.where("userId").is(userId));

        return  mongoTemplate.find(query,Equip.class);
    }

    /**
     * 根据装备id列表批量删除装备
     * @param idList 装备id列表
     */
    public void delBatch(List<String> idList) {
        Query query = new Query(new Criteria("id").in(idList));
        mongoTemplate.remove(query, Equip.class);
    }

    /**
     * 分配装备属性点
     * @param equip 带有分配后属性点的装备
     */
    public void allotEquip(Equip equip){
        //判定总点数是否合法
        Equip oldEquip = findById(equip.getId());

        GameCode.objNotFound.assertTrue(oldEquip!=null);

        ElseEquipProperty elseEquipProperty = equip.getElseEquipProperty();
        int saveAttrTotal = elseEquipProperty.getConstitution()
                + elseEquipProperty.getMagicPower()
                + elseEquipProperty.getPower()
                + elseEquipProperty.getEndurance()
                + elseEquipProperty.getAgile();

        GameCode.allotNotEnough.assertTrue(saveAttrTotal<=oldEquip.getAttrTotal());

        // 查询条件，如果数据存在更新
        Query query = new Query();
        query.addCriteria(Criteria.where("id").is(equip.getId()));

        // 更新的字段
        Update update = new Update();
        //获取分配的字段

        update.set("undistributedAttr", oldEquip.getAttrTotal()-saveAttrTotal);
        update.set("elseEquipProperty", elseEquipProperty);
        mongoTemplate.upsert(query,update,Equip.class);
    }

    /**
     * 重新随机总属性点（鉴定装备）
     * @param id 装备id
     * @param excellentRate 增加的极品率
     */
    public Equip resetEquip(String id, BigDecimal excellentRate){
        Equip equip = findById(id);
        GameCode.objNotFound.assertTrue(equip!=null);

        int randomMin = equip.getTotalAttrMin();
        int randomMax = equip.getTotalAttrMax();
        //本次是否生成极品
        boolean excellentFlag = EquipRandomKit.isExcellent(excellentRate);
        //品质
        equip.setQuality(excellentFlag?2:1);
        //额外属性值
        int newAttrTotal = EquipRandomKit.randomFromExcellent(randomMin,randomMax,excellentFlag);
        // 直接替换掉原装备的属性值
        return replaceEquipAttr(equip,newAttrTotal);
    }

    private static final int MAX_GRADE = 21;
    private static final int MAX_FURNACE = 30;
    private final Random random = new Random();

    /**
     * 装备加品（35级后可用，最高21级）
     * 成功率随等级递减：(22 - currentGrade) * 4%
     * 加品提升装备总属性 5% 每级
     */
    public Equip upgradeGrade(String id) {
        Equip equip = findById(id);
        GameCode.objNotFound.assertTrue(equip != null);

        int grade = equip.getGrade();
        if (grade >= MAX_GRADE) return equip;

        double successRate = (MAX_GRADE + 1 - grade) * 0.04;
        boolean success = random.nextDouble() < successRate;

        if (success) {
            equip.setGrade(grade + 1);
            int bonusAttr = (int) (equip.getAttrTotal() * 0.05);
            equip.setAttrTotal(equip.getAttrTotal() + bonusAttr);
            equip.setUndistributedAttr(equip.getUndistributedAttr() + bonusAttr);
            mongoTemplate.save(equip);
        }
        return equip;
    }

    /**
     * 鬼炉提升品质（加品21级以上可用，最高30级）
     * 成功率：(31 - currentFurnace) * 3%
     * 每级提升装备总属性 3%
     */
    public Equip furnaceUpgrade(String id) {
        Equip equip = findById(id);
        GameCode.objNotFound.assertTrue(equip != null);

        if (equip.getGrade() < MAX_GRADE) return equip;
        int furnace = equip.getFurnaceGrade();
        if (furnace >= MAX_FURNACE) return equip;

        double successRate = (MAX_FURNACE + 1 - furnace) * 0.03;
        boolean success = random.nextDouble() < successRate;

        if (success) {
            equip.setFurnaceGrade(furnace + 1);
            int bonusAttr = (int) (equip.getAttrTotal() * 0.03);
            equip.setAttrTotal(equip.getAttrTotal() + bonusAttr);
            equip.setUndistributedAttr(equip.getUndistributedAttr() + bonusAttr);
            mongoTemplate.save(equip);
        }
        return equip;
    }

    /**
     * @param equip 装备
     * @param newAttrTotal 新随机的可分配属性点
     * @return
     */
    private Equip replaceEquipAttr(Equip equip,int newAttrTotal){
        equip.setElseEquipProperty(ElseEquipProperty.resetElseEquipProperty());
        equip.setAttrTotal(newAttrTotal);
        equip.setUndistributedAttr(newAttrTotal);
        //鉴定次数+1
        equip.setIdentifyCount(equip.getIdentifyCount()+1);
        mongoTemplate.save(equip);
        return equip;
    }

}
