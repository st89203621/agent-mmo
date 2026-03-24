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

import com.iohao.mmo.companion.entity.CompanionBag;
import com.iohao.mmo.companion.entity.SpiritCompanion;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * @author 渔民小镇
 * @date 2025-10-15
 */
@Slf4j
@Service
public class CompanionService {
    final MongoTemplate mongoTemplate;

    @Value("${volcengine.frontend-server-url:auto}")
    private String frontendServerUrl;

    public CompanionService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public CompanionBag ofCompanionBag(long userId) {
        CompanionBag bag = mongoTemplate.findById(userId, CompanionBag.class);
        if (bag == null) {
            bag = new CompanionBag();
            bag.setUserId(userId);
            bag.setCompanions(new ArrayList<>());
            bag.setTeam(new ArrayList<>());

            initDefaultCompanions(bag);

            mongoTemplate.save(bag);
        } else {
            ensureDefaultCompanions(bag);
        }
        return bag;
    }

    /**
     * 初始化预置灵侣
     */
    private void initDefaultCompanions(CompanionBag bag) {
        String[] defaultCompanionIds = {"flame_emperor", "little_flame"};

        for (String companionId : defaultCompanionIds) {
            CompanionTemplate template = CompanionTemplate.getTemplate(companionId);
            if (template != null) {
                SpiritCompanion companion = createCompanion(companionId, template);
                bag.addCompanion(companion);
            }
        }
    }

    /**
     * 确保预置灵侣存在（补充缺失的）
     */
    private void ensureDefaultCompanions(CompanionBag bag) {
        String[] defaultCompanionIds = {"flame_emperor", "little_flame"};
        boolean needSave = false;

        for (String companionId : defaultCompanionIds) {
            if (!bag.hasCompanion(companionId)) {
                CompanionTemplate template = CompanionTemplate.getTemplate(companionId);
                if (template != null) {
                    SpiritCompanion companion = createCompanion(companionId, template);
                    bag.addCompanion(companion);
                    needSave = true;
                }
            }
        }

        if (needSave) {
            mongoTemplate.save(bag);
        }
    }
    
    public void save(CompanionBag bag) {
        mongoTemplate.save(bag);
    }
    
    public SpiritCompanion createCompanion(String companionId, CompanionTemplate template) {
        SpiritCompanion companion = new SpiritCompanion();
        companion.setId(UUID.randomUUID().toString());
        companion.setCompanionId(companionId);
        companion.setName(template.getName());
        companion.setRealm(template.getRealm());
        companion.setType(template.getType());
        companion.setQuality(template.getQuality());
        companion.setLevel(1);
        companion.setExp(0);
        companion.setBondLevel(0);
        companion.setBondExp(0);
        companion.setMaxHp(template.getHp());
        companion.setCurrentHp(template.getHp());
        companion.setAtk(template.getAtk());
        companion.setDef(template.getDef());
        companion.setSpd(template.getSpd());
        companion.setAvatarUrl("");
        companion.setAvatarStyle("");
        companion.setAvatarEquipped(false);
        return companion;
    }
    
    public List<SpiritCompanion> listCompanions(long userId) {
        CompanionBag bag = ofCompanionBag(userId);
        List<SpiritCompanion> companions = bag.getCompanions();

        fixAvatarUrls(companions);
        fixCompanionIds(companions, bag, userId);

        return companions;
    }

    /**
     * 修复avatarUrl中的IP地址 - 自适应网络变化
     */
    private void fixAvatarUrls(List<SpiritCompanion> companions) {
        if (companions == null || companions.isEmpty()) {
            return;
        }

        String currentServerUrl = getCurrentServerUrl();
        Pattern pattern = Pattern.compile("http://[^/]+");

        for (SpiritCompanion companion : companions) {
            String avatarUrl = companion.getAvatarUrl();
            if (avatarUrl != null && !avatarUrl.isEmpty()) {
                Matcher matcher = pattern.matcher(avatarUrl);
                if (matcher.find()) {
                    String newUrl = matcher.replaceFirst(currentServerUrl);
                    companion.setAvatarUrl(newUrl);
                }
            }
        }
    }

    /**
     * 修复错误的companionId（如ai_blue等）
     */
    private void fixCompanionIds(List<SpiritCompanion> companions, CompanionBag bag, long userId) {
        if (companions == null || companions.isEmpty()) {
            return;
        }

        boolean needSave = false;

        for (SpiritCompanion companion : companions) {
            String companionId = companion.getCompanionId();

            if (companionId == null || companionId.isEmpty() || !isValidCompanionId(companionId)) {
                String fixedId = guessCompanionIdByName(companion.getName());
                if (fixedId != null) {
                    log.warn("修复错误的companionId: {} -> {} (用户: {}, 名称: {})",
                        companionId, fixedId, userId, companion.getName());
                    companion.setCompanionId(fixedId);
                    needSave = true;
                }
            }
        }

        if (needSave) {
            mongoTemplate.save(bag);
        }
    }

    /**
     * 检查companionId是否有效
     */
    private boolean isValidCompanionId(String companionId) {
        return CompanionTemplate.getTemplate(companionId) != null;
    }

    /**
     * 根据名称猜测正确的companionId
     */
    private String guessCompanionIdByName(String name) {
        if (name == null) return null;

        if (name.contains("炎帝")) return "flame_emperor";
        if (name.contains("小焰")) return "little_flame";
        if (name.contains("光影")) return "shadow_friend";
        if (name.contains("光")) return "hokage";
        if (name.contains("金狮子")) return "golden_lion";
        if (name.contains("星海")) return "star_ocean";
        if (name.contains("绿姐")) return "sister_green";
        if (name.contains("精灵女王")) return "elf_queen";
        if (name.contains("梦行者")) return "dream_walker";
        if (name.contains("蓝蝶")) return "blue_butterfly";
        if (name.contains("紫姐")) return "sister_violet";
        if (name.contains("冥少")) return "master_ming";
        if (name.contains("彩虹神")) return "rainbow_god";
        if (name.contains("光明天使")) return "light_angel";

        return null;
    }

    /**
     * 根据旧的错误ID猜测正确的companionId
     */
    public String guessCompanionIdByOldId(String oldId) {
        if (oldId == null) return null;

        if (oldId.contains("blue") || oldId.contains("蓝")) return "blue_butterfly";
        if (oldId.contains("flame") || oldId.contains("炎")) return "flame_emperor";
        if (oldId.contains("shadow") || oldId.contains("影")) return "shadow_friend";
        if (oldId.contains("golden") || oldId.contains("金")) return "golden_lion";
        if (oldId.contains("green") || oldId.contains("绿")) return "sister_green";
        if (oldId.contains("violet") || oldId.contains("紫")) return "sister_violet";
        if (oldId.contains("rainbow") || oldId.contains("彩虹")) return "rainbow_god";

        return null;
    }

    /** 培养灵侣（提升属性和羁绊） */
    public SpiritCompanion feed(long userId, String companionId) {
        CompanionBag bag = ofCompanionBag(userId);
        SpiritCompanion companion = bag.getCompanions().stream()
                .filter(c -> c.getId().equals(companionId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("灵侣不存在"));

        // 提升属性
        companion.setAtk(companion.getAtk() + 2);
        companion.setDef(companion.getDef() + 1);
        companion.setSpd(companion.getSpd() + 1);
        companion.setMaxHp(companion.getMaxHp() + 10);
        companion.setCurrentHp(companion.getMaxHp());
        companion.setBondExp(companion.getBondExp() + 20);
        // 羁绊升级
        if (companion.getBondExp() >= (companion.getBondLevel() + 1) * 50) {
            companion.setBondLevel(companion.getBondLevel() + 1);
            companion.setBondExp(0);
        }
        companion.setExp(companion.getExp() + 10);
        // 等级提升
        if (companion.getExp() >= companion.getLevel() * 20) {
            companion.setLevel(companion.getLevel() + 1);
            companion.setExp(0);
        }

        mongoTemplate.save(bag);
        return companion;
    }

    /** 设为出战灵侣 */
    public void setActive(long userId, String companionId) {
        CompanionBag bag = ofCompanionBag(userId);
        boolean exists = bag.getCompanions().stream().anyMatch(c -> c.getId().equals(companionId));
        if (!exists) throw new RuntimeException("灵侣不存在");
        List<String> team = new ArrayList<>();
        team.add(companionId);
        bag.setTeam(team);
        mongoTemplate.save(bag);
    }

    /** 获取灵侣技能列表 */
    public List<java.util.Map<String, Object>> getSkills(String companionId) {
        List<java.util.Map<String, Object>> skills = new ArrayList<>();
        // 根据灵侣等级解锁技能
        java.util.Map<String, Object> skill1 = new java.util.LinkedHashMap<>();
        skill1.put("name", "守护之心");
        skill1.put("description", "为主人提供额外防御加成");
        skill1.put("level", 1);
        skill1.put("icon", "🛡️");
        skills.add(skill1);

        java.util.Map<String, Object> skill2 = new java.util.LinkedHashMap<>();
        skill2.put("name", "灵息共鸣");
        skill2.put("description", "战斗中恢复少量生命值");
        skill2.put("level", 1);
        skill2.put("icon", "💚");
        skills.add(skill2);

        return skills;
    }

    /**
     * 获取当前服务器URL - 动态检测IP
     */
    private String getCurrentServerUrl() {
        if (frontendServerUrl.startsWith("http://") || frontendServerUrl.startsWith("https://")) {
            return frontendServerUrl;
        }

        int port = 8080;
        if (!"auto".equalsIgnoreCase(frontendServerUrl)) {
            try {
                port = Integer.parseInt(frontendServerUrl);
            } catch (NumberFormatException e) {
                log.warn("无法解析端口号: {}, 使用默认8080", frontendServerUrl);
            }
        }

        String ip = getLocalIpAddress();
        return String.format("http://%s:%d", ip, port);
    }

    /**
     * 获取本机IP地址 - 优先级：192.168.x.x > 10.x.x.x > 172.16-31.x.x
     */
    private String getLocalIpAddress() {
        try {
            InetAddress ip192 = null;
            InetAddress ip10 = null;
            InetAddress ip172 = null;
            InetAddress ipOther = null;

            Enumeration<NetworkInterface> networkInterfaces = NetworkInterface.getNetworkInterfaces();
            while (networkInterfaces.hasMoreElements()) {
                NetworkInterface networkInterface = networkInterfaces.nextElement();

                if (!networkInterface.isUp() || networkInterface.isLoopback()) {
                    continue;
                }

                Enumeration<InetAddress> inetAddresses = networkInterface.getInetAddresses();
                while (inetAddresses.hasMoreElements()) {
                    InetAddress inetAddress = inetAddresses.nextElement();

                    if (inetAddress.isLoopbackAddress() || !inetAddress.isSiteLocalAddress()) {
                        continue;
                    }

                    String ip = inetAddress.getHostAddress();

                    if (ip.startsWith("192.168.")) {
                        ip192 = inetAddress;
                    } else if (ip.startsWith("10.")) {
                        if (ip10 == null) {
                            ip10 = inetAddress;
                        }
                    } else if (ip.startsWith("172.")) {
                        String[] parts = ip.split("\\.");
                        if (parts.length == 4) {
                            int second = Integer.parseInt(parts[1]);
                            if (second >= 16 && second <= 31 && ip172 == null) {
                                ip172 = inetAddress;
                            }
                        }
                    } else if (ipOther == null) {
                        ipOther = inetAddress;
                    }
                }
            }

            InetAddress selectedAddress = ip192 != null ? ip192 :
                                         ip10 != null ? ip10 :
                                         ip172 != null ? ip172 :
                                         ipOther;

            if (selectedAddress != null) {
                return selectedAddress.getHostAddress();
            }

            InetAddress localHost = InetAddress.getLocalHost();
            String ip = localHost.getHostAddress();
            if (!ip.equals("127.0.0.1")) {
                return ip;
            }

        } catch (Exception e) {
            log.warn("获取本机IP失败: {}", e.getMessage());
        }

        return "localhost";
    }
}

