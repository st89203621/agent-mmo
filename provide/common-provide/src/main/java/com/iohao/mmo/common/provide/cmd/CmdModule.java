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
package com.iohao.mmo.common.provide.cmd;

/**
 * 模块 cmd
 *
 * @author 渔民小镇
 * @date 2023-07-21
 */
public interface CmdModule {
    /** 相对通用的模块 */
    int commandCmd = 0;
    /** 大厅 - 登录 */
    int loginCmd = 1;
    /** 人物 */
    int personCmd = 2;
    /** 地图 */
    int mapCmd = 3;
    /** 英雄 */
    int heroCmd = 4;
    /** 等级 */
    int levelCmd = 5;
    /** 物品 */
    int itemCmd = 6;
    /** 背包 */
    int bagCmd = 7;
    /** 邮件 */
    int mailCmd = 8;
    /** 宠物 */
    int petCmd = 9;
    /** 装备 */
    int equipCmd = 10;
    /** 礼包码 */
    int giftCodeCmd = 11;
    /** 礼包 */
    int giftBagCmd = 12;
    /** 聊天 */
    int chatCmd = 13;
    /** 灵侣 */
    int companionCmd = 15;
    /** 活动 */
    int eventCmd = 18;
    /** 竞技场 */
    int arenaCmd = 19;
    /** 任务 */
    int questCmd = 20;
    /** 附魔 */
    int enchantCmd = 21;
    /** 冒险 */
    int adventureCmd = 22;
    /** 书籍世界 */
    int bookWorldCmd = 23;
    /** 七世轮回 */
    int rebirthCmd = 24;
    /** 缘分关系 */
    int fateCmd = 25;
    /** 剧情对话 */
    int storyCmd = 26;
    /** 记忆碎片 */
    int memoryCmd = 27;
    /** 排行榜 */
    int rankCmd = 28;
    /** 称号 */
    int titleCmd = 29;
    /** 盟会 */
    int guildCmd = 30;
    /** 宝山 */
    int treasureMountainCmd = 31;
    /** 情花 */
    int flowerCmd = 32;
    /** 玩家交易 */
    int tradeCmd = 33;
    /** 组队PvP */
    int teamBattleCmd = 34;
}
