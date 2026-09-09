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
package com.iohao.mmo.companion.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * 灵侣背包
 *
 * @author 渔民小镇
 * @date 2025-10-15
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CompanionBag {
    @Id
    long userId;
    
    /** 拥有的灵侣列表 */
    List<SpiritCompanion> companions = new ArrayList<>();
    
    /** 当前出战队伍(最多3个) */
    List<String> team = new ArrayList<>();
    
    public void addCompanion(SpiritCompanion companion) {
        if (companions == null) {
            companions = new ArrayList<>();
        }
        companions.add(companion);
    }
    
    public SpiritCompanion getCompanion(String companionId) {
        if (companions == null) {
            return null;
        }
        return companions.stream()
                .filter(c -> c.getCompanionId().equals(companionId))
                .findFirst()
                .orElse(null);
    }
    
    public boolean hasCompanion(String companionId) {
        return getCompanion(companionId) != null;
    }
}

