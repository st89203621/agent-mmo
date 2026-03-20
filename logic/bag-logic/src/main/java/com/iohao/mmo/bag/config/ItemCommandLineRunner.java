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
package com.iohao.mmo.bag.config;

import com.iohao.mmo.common.provide.item.ItemTypeIdConst;
import com.iohao.mmo.bag.entity.ItemTypeConfig;
import com.iohao.mmo.bag.region.ItemTypeConfigRegion;
import com.iohao.mmo.bag.region.UseRegion;
import com.iohao.mmo.bag.region.internal.DefaultUseProcess;
import com.iohao.mmo.bag.region.internal.equip.BuildEquipUseProcess;
import jakarta.annotation.Resource;
import lombok.AllArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * @author 渔民小镇
 * @date 2023-08-06
 */
@Component
@AllArgsConstructor
public class ItemCommandLineRunner implements CommandLineRunner {
    @Resource
    MongoTemplate mongoTemplate;
    final UseRegion useRegion;
    final DefaultUseProcess defaultUseProcess;
    final BuildEquipUseProcess buildEquipUseProcess;

    @Override
    public void run(String... args) {
        List<ItemTypeConfig> itemTypeConfigs = initConfigExcel();
        itemTypeConfigs.forEach(ItemTypeConfigRegion::addItemTypeConfig);

        useRegion.addUseProcess(defaultUseProcess);
        useRegion.addUseProcess(buildEquipUseProcess);
    }

    final List<ItemTypeConfig> configList = new ArrayList<>();

    private List<ItemTypeConfig> initConfigExcel() {

        ItemTypeConfig config = new ItemTypeConfig();
        configList.add(config);

        config.setItemTypeId(ItemTypeIdConst.expId);
        config.setName("经验值道具");
        config.setDescription("增加经验值");

        config = new ItemTypeConfig();
        configList.add(config);
        config.setItemTypeId(ItemTypeIdConst.hpId);
        config.setName("气血药");
        config.setDescription("增加气血值");

        config = new ItemTypeConfig();
        configList.add(config);
        config.setItemTypeId(ItemTypeIdConst.equipWeaponBook10);
        config.setName("10级-武器书");
        config.setDescription("装备制造书");

        config = new ItemTypeConfig();
        configList.add(config);
        config.setItemTypeId(ItemTypeIdConst.iron10);
        config.setName("10级-铁");
        config.setDescription("合成装备的精铁");

        config = new ItemTypeConfig();
        configList.add(config);
        config.setItemTypeId(ItemTypeIdConst.equipWeapon10);
        config.setName("10级-飞龙在天");
        config.setDescription("赵云的私房枪之一，因害怕被张飞拿错，而一直放在房内！");

        extractedPet();

        // 临时配置
        return configList;
    }

    private void extractedPet() {
        ItemTypeConfig config;
        config = new ItemTypeConfig();
        configList.add(config);
        config.setItemTypeId(ItemTypeIdConst.petTianBing);
        config.setName("天兵");
        config.setDescription("天庭的神兵");

        config = new ItemTypeConfig();
        configList.add(config);
        config.setItemTypeId(ItemTypeIdConst.petGuiJiang);
        config.setName("鬼将");
        config.setDescription("冥界的鬼将");
    }
}
