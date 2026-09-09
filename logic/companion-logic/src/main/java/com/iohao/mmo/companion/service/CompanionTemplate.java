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
package com.iohao.mmo.companion.service;

import lombok.Data;

import java.util.HashMap;
import java.util.Map;

/**
 * @author 渔民小镇
 * @date 2025-10-15
 */
@Data
public class CompanionTemplate {
    String id;
    String name;
    String realm;
    String type;
    String quality;
    int hp;
    int atk;
    int def;
    int spd;
    
    private static final Map<String, CompanionTemplate> TEMPLATES = new HashMap<>();
    
    static {
        // 红莲战界
        addTemplate("flame_emperor", "炎帝", "CRIMSON", "WARRIOR", "LEGENDARY", 1200, 150, 100, 80);
        addTemplate("little_flame", "小焰", "CRIMSON", "WARRIOR", "EPIC", 1000, 120, 80, 90);
        
        // 橙光忍界
        addTemplate("shadow_friend", "光影", "ORANGE", "ASSASSIN", "LEGENDARY", 900, 140, 70, 120);
        addTemplate("hokage", "光", "ORANGE", "MAGE", "LEGENDARY", 800, 130, 60, 100);
        
        // 黄金海域
        addTemplate("golden_lion", "金狮子", "GOLDEN", "WARRIOR", "LEGENDARY", 1300, 160, 110, 70);
        addTemplate("star_ocean", "星海", "GOLDEN", "SUPPORT", "EPIC", 950, 100, 90, 85);
        
        // 翡翠生界
        addTemplate("sister_green", "绿姐", "EMERALD", "HEALER", "LEGENDARY", 1100, 90, 100, 95);
        addTemplate("elf_queen", "精灵女王", "EMERALD", "MAGE", "EPIC", 850, 125, 75, 105);
        
        // 蔚蓝梦界
        addTemplate("dream_walker", "梦行者", "AZURE", "MAGE", "LEGENDARY", 900, 145, 65, 110);
        addTemplate("blue_butterfly", "蓝蝶", "AZURE", "SUPPORT", "RARE", 800, 95, 70, 115);
        
        // 紫冥魔界
        addTemplate("sister_violet", "紫姐", "VIOLET", "MAGE", "LEGENDARY", 950, 155, 70, 100);
        addTemplate("master_ming", "冥少", "VIOLET", "ASSASSIN", "EPIC", 880, 135, 65, 125);
        
        // 彩虹神界
        addTemplate("rainbow_god", "彩虹神", "RAINBOW", "SUPPORT", "MYTHIC", 1500, 180, 120, 90);
        addTemplate("light_angel", "光明天使", "RAINBOW", "HEALER", "LEGENDARY", 1200, 110, 105, 100);
    }
    
    private static void addTemplate(String id, String name, String realm, String type, String quality, int hp, int atk, int def, int spd) {
        CompanionTemplate template = new CompanionTemplate();
        template.setId(id);
        template.setName(name);
        template.setRealm(realm);
        template.setType(type);
        template.setQuality(quality);
        template.setHp(hp);
        template.setAtk(atk);
        template.setDef(def);
        template.setSpd(spd);
        TEMPLATES.put(id, template);
    }
    
    public static CompanionTemplate getTemplate(String id) {
        return TEMPLATES.get(id);
    }
}

