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
package com.iohao.mmo.bag.region.internal.equip;

import com.iohao.game.action.skeleton.core.exception.ActionErrorEnum;
import com.iohao.mmo.bag.pojo.UseItemPOJO;
import com.iohao.mmo.common.config.GameCode;
import com.iohao.mmo.common.kit.CommonSplitParam;
import com.iohao.mmo.common.provide.item.ItemTypeConst;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.util.HashMap;
import java.util.Map;

/**
 * 装备制造所需物品解析
 *
 * @author 渔民小镇
 * @date 2023-08-08
 */
@FieldDefaults(level = AccessLevel.PRIVATE)
class BuildEquipParse {
    final Map<String, BuildParam> paramMap = new HashMap<>();

    BuildEquipParse(Map<String, UseItemPOJO> useItemMap) {
        for (Map.Entry<String, UseItemPOJO> entry : useItemMap.entrySet()) {
            UseItemPOJO value = entry.getValue();
            // 物品 id
            String itemTypeId = value.itemTypeId;

            var param = new BuildParam(itemTypeId, value);
            paramMap.put(param.getItemType(), param);
        }
    }

    /**
     * 所需物品校验
     */
    void verify() {
        /*
         * 装备的制造最少需要两样物品
         * 1 装备制造书
         * 2 装备制造材料
         */
        ActionErrorEnum validateErrCode = ActionErrorEnum.validateErrCode;

        // 装备打造业务，目前只支持使用两样物品
        validateErrCode.assertTrue(paramMap.size() == 2);

        // 校验制造书相关
        BuildParam equipBuildParam = getEquipBuildParam();
        validateErrCode.assertNonNull(equipBuildParam, "没有使用装备制造书");
        GameCode.quantityNotEnough
                .assertTrue(equipBuildParam.useItem.quantity == 1, "制造书数量错误");

        // 校验制造材料相关
        BuildParam ironBuildParam = getIronBuildParam();
        validateErrCode.assertNonNull(ironBuildParam, "没有使用装备制造材料");
        GameCode.quantityNotEnough
                .assertTrue(ironBuildParam.useItem.quantity == 1, "制造材料数量错误");

        // 校验材料匹配相关
        boolean result = equipBuildParam.getLevel() > ironBuildParam.getLevel();
        validateErrCode.assertTrueThrows(result, "装备制造错误，材料不匹配");
    }

    /**
     * 得到装备制造书
     *
     * @return 装备制造书
     */
    BuildParam getEquipBuildParam() {
        // 得到装备
        return paramMap.get(ItemTypeConst.EQUIP.getValue());
    }

    /**
     * 得到装备制造材料 - 铁
     *
     * @return 装备制造材料 - 铁
     */
    BuildParam getIronBuildParam() {
        // 得到装备制造材料 - 铁
        return paramMap.get(ItemTypeConst.IRON.getValue());
    }

    @Getter
    @FieldDefaults(level = AccessLevel.PRIVATE)
    static class BuildParam extends CommonSplitParam {
        final UseItemPOJO useItem;

        public BuildParam(String itemTypeId, UseItemPOJO useItem) {
            super(itemTypeId);
            this.useItem = useItem;
        }

        String getItemType() {
            return this.getString(0);
        }

        int getLevel() {
            // 约定最后一个参数是等级
            int length = length();
            return this.getInt(length - 1, 0);
        }

        int length() {
            return this.getSplit().length;
        }

        String getEquipItemTypeId() {
            String itemTypeId = useItem.itemTypeId;
            return itemTypeId.replace("book_", "");
        }
    }
}
