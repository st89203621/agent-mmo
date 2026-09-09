package com.iohao.mmo.treasure.service;

import com.iohao.mmo.treasure.entity.MountainSession;
import com.iohao.mmo.treasure.entity.MountainType;
import com.iohao.mmo.treasure.repository.MountainSessionRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
public class TreasureMountainService {
    @Resource
    MountainSessionRepository sessionRepository;

    private final Random random = new Random();
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");

    /** 获取所有宝山信息 */
    public List<Map<String, Object>> listMountains() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (MountainType mt : MountainType.values()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("mountainType", mt.name());
            m.put("name", mt.getDisplayName());
            m.put("description", mt.getDescription());
            m.put("requiredGuildLevel", mt.getRequiredGuildLevel());
            m.put("maxDigTimes", mt.getMaxDigTimes());
            list.add(m);
        }
        return list;
    }

    /** 获取玩家当日挖掘状态 */
    public MountainSession getSessionToday(long userId, String mountainType) {
        int dateTag = todayTag();
        MountainSession session = sessionRepository.findByUserIdAndMountainTypeAndDateTag(userId, mountainType, dateTag);
        if (session == null) {
            session = new MountainSession();
            session.setUserId(userId);
            session.setMountainType(mountainType);
            session.setDateTag(dateTag);
            session.setDigCount(0);
            session.setTotalReward(0);
        }
        return session;
    }

    /**
     * 挖掘宝山（先实现金币宝山）
     * @return 本次挖掘获得的奖励值，0表示次数已用完
     */
    public Map<String, Object> dig(long userId, String guildId, String mountainType) {
        MountainType mt;
        try {
            mt = MountainType.valueOf(mountainType);
        } catch (IllegalArgumentException e) {
            return Map.of("success", false, "message", "无效的宝山类型");
        }

        MountainSession session = getSessionToday(userId, mountainType);
        if (session.getDigCount() >= mt.getMaxDigTimes()) {
            return Map.of("success", false, "message", "今日挖掘次数已用完",
                    "digCount", session.getDigCount(), "maxDigTimes", mt.getMaxDigTimes());
        }

        long reward = calcReward(mt);
        session.setDigCount(session.getDigCount() + 1);
        session.setTotalReward(session.getTotalReward() + reward);
        session.setGuildId(guildId);
        sessionRepository.save(session);

        log.info("宝山挖掘: userId={}, type={}, reward={}, digCount={}/{}",
                userId, mountainType, reward, session.getDigCount(), mt.getMaxDigTimes());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("reward", reward);
        result.put("rewardType", getRewardType(mt));
        result.put("digCount", session.getDigCount());
        result.put("maxDigTimes", mt.getMaxDigTimes());
        result.put("totalReward", session.getTotalReward());
        result.put("message", String.format("获得%s %d", getRewardType(mt), reward));
        return result;
    }

    private long calcReward(MountainType mt) {
        return switch (mt) {
            case GOLD -> 5000 + random.nextInt(15000);
            case EXP -> 3000 + random.nextInt(10000);
            case MATERIAL -> 1 + random.nextInt(5);
            case ENCHANT -> 1 + random.nextInt(3);
            case EQUIP -> 1;
            case DIVINE -> random.nextDouble() < 0.3 ? 1 : 0;
        };
    }

    private String getRewardType(MountainType mt) {
        return switch (mt) {
            case GOLD -> "金币";
            case EXP -> "经验";
            case MATERIAL -> "材料";
            case ENCHANT -> "符文";
            case EQUIP -> "装备";
            case DIVINE -> "神器碎片";
        };
    }

    private int todayTag() {
        return Integer.parseInt(LocalDate.now().format(DATE_FMT));
    }
}
