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
package com.iohao.mmo;

import com.iohao.game.action.skeleton.ext.spring.ActionFactoryBeanForSpring;
import com.iohao.game.bolt.broker.client.AbstractBrokerClientStartup;
import com.iohao.game.external.core.ExternalServer;
import com.iohao.game.external.core.config.ExternalGlobalConfig;
import com.iohao.game.external.core.netty.simple.NettyRunOne;
import com.iohao.mmo.bag.BagLogicServer;
import com.iohao.mmo.broker.MyBrokerServer;
import com.iohao.mmo.chat.ChatLogicServer;
import com.iohao.mmo.common.config.MyGlobalSetting;
import com.iohao.mmo.equip.EquipLogicServer;
import com.iohao.mmo.external.MyExternalServer;
import com.iohao.mmo.gift.GiftLogicServer;
import com.iohao.mmo.level.LevelLogicServer;
import com.iohao.mmo.login.LoginLogicServer;
import com.iohao.mmo.mail.MailLogicServer;
import com.iohao.mmo.map.MapLogicServer;
import com.iohao.mmo.person.PersonLogicServer;
import com.iohao.mmo.pet.PetLogicServer;
import com.iohao.mmo.companion.CompanionLogicServer;
import com.iohao.mmo.worldboss.WorldBossLogicServer;
import com.iohao.mmo.shop.ShopLogicServer;
import com.iohao.mmo.rank.RankLogicServer;
import com.iohao.mmo.arena.ArenaLogicServer;
import com.iohao.mmo.quest.QuestLogicServer;
import com.iohao.mmo.enchant.EnchantLogicServer;
import com.iohao.mmo.adventure.AdventureLogicServer;
import com.iohao.mmo.bookworld.BookWorldLogicServer;
import com.iohao.mmo.rebirth.RebirthLogicServer;
import com.iohao.mmo.fate.FateLogicServer;
import com.iohao.mmo.story.StoryLogicServer;
import com.iohao.mmo.memory.MemoryLogicServer;
import com.iohao.mmo.title.TitleLogicServer;
import com.iohao.mmo.guild.GuildLogicServer;
import com.iohao.mmo.treasure.TreasureMountainLogicServer;
import com.iohao.mmo.flower.FlowerLogicServer;
import com.iohao.mmo.trade.TradeLogicServer;
import com.iohao.mmo.teambattle.TeamBattleLogicServer;
import com.iohao.mmo.coexplore.CoexploreLogicServer;
import com.iohao.mmo.auction.AuctionLogicServer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.*;

import java.util.List;

/**
 * 游戏服务器启动类
 *
 * @author 渔民小镇
 * @date 2023-07-21
 */
@Slf4j
@ComponentScan({"com.iohao.mmo.**"})
@SpringBootApplication
@org.springframework.session.data.mongo.config.annotation.web.http.EnableMongoHttpSession(maxInactiveIntervalInSeconds = 604800)
public class OneApplication {
    public static void main(String[] args) {
        SpringApplication.run(OneApplication.class, args);

        extractedConfig();

        // 游戏逻辑服列表
        List<AbstractBrokerClientStartup> logicServers = listLogic();

        // 游戏对外服列表，启动了 tcp、webSocket 两种连接方式的游戏对外服
        List<ExternalServer> externalServers = new MyExternalServer()
                .listExternalServer(ExternalGlobalConfig.externalPort);

        new NettyRunOne()
                // 游戏对外服列表
                .setExternalServerList(externalServers)
                // Broker（游戏网关服）
                .setBrokerServer(new MyBrokerServer().createBrokerServer())
                // 游戏逻辑服列表
                .setLogicServerList(logicServers)
                // 启动游戏服务器
                .startup();
    }

    static List<AbstractBrokerClientStartup> listLogic() {
        // 游戏逻辑服列表
        return List.of(
                // 登录
                new LoginLogicServer()
                // 人物
                , new PersonLogicServer()
                // 地图
                , new MapLogicServer()
                // 等级
                , new LevelLogicServer()
                // 背包
                , new BagLogicServer()
                // 邮件
                , new MailLogicServer()
                // 宠物、宝宝
                , new PetLogicServer()
                // 灵侣
                , new CompanionLogicServer()
                // 装备
                , new EquipLogicServer()
                // 礼包码
                , new GiftLogicServer()
                // 聊天
                , new ChatLogicServer()
                // 世界BOSS
                , new WorldBossLogicServer()
                // 商城
                , new ShopLogicServer()
                // 排行榜
                , new RankLogicServer()
                // 竞技场
                , new ArenaLogicServer()
                // 任务
                , new QuestLogicServer()
                // 附魔
                , new EnchantLogicServer()
                // 冒险
                , new AdventureLogicServer()
                // 书籍世界
                , new BookWorldLogicServer()
                // 七世轮回
                , new RebirthLogicServer()
                // 缘分关系
                , new FateLogicServer()
                // 剧情对话
                , new StoryLogicServer()
                // 记忆碎片
                , new MemoryLogicServer()
                // 称号
                , new TitleLogicServer()
                // 盟会
                , new GuildLogicServer()
                // 宝山
                , new TreasureMountainLogicServer()
                // 情花
                , new FlowerLogicServer()
                // 玩家交易
                , new TradeLogicServer()
                // 组队PvP
                , new TeamBattleLogicServer()
                // 共探书境
                , new CoexploreLogicServer()
                // 拍卖行
                , new AuctionLogicServer()
        );
    }

    public static void extractedConfig() {
        // 统一的默认配置
        MyGlobalSetting.defaultSetting();
    }

    @Bean
    public ActionFactoryBeanForSpring actionFactoryBean() {
        // 将业务框架交给 spring 管理
        return ActionFactoryBeanForSpring.me();
    }
}
