package com.iohao.mmo.treasure.service;

import com.iohao.mmo.guild.service.NativeGuildAccess;
import com.iohao.mmo.bag.service.ServerEconomyService;
import com.iohao.mmo.bag.service.EconomyGrant;
import com.iohao.mmo.treasure.entity.MountainSession;
import com.iohao.mmo.treasure.proto.NativeMountainEntry;
import com.iohao.mmo.treasure.proto.NativeMountainRequest;
import com.iohao.mmo.treasure.proto.NativeMountainState;
import com.iohao.mmo.treasure.repository.MountainSessionRepository;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.dao.OptimisticLockingFailureException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Objects;
import java.util.Random;
import java.util.Map;
import java.util.stream.IntStream;

@Service
public class NativeMountainService {
    @Resource MountainSessionRepository repository;
    @Resource ServerEconomyService economy;
    @Resource NativeGuildAccess guildAccess;
    private final Random random = new Random();

    public synchronized NativeMountainState state(long userId) {
        return response(load(userId), true, "宝山状态已更新");
    }

    public synchronized NativeMountainState act(long userId, int hp, int attack, NativeMountainRequest request) {
        MountainSession s = load(userId);
        if (request == null || request.operation == null) return response(s, false, "请选择宝山操作");
        long now = System.currentTimeMillis();
        String message;
        switch (request.operation.toUpperCase(java.util.Locale.ROOT)) {
            case "ENTER":
                if (request.mountain < 0 || request.mountain >= NativeMountainRules.NAMES.length)
                    return response(s, false, "无效的宝山");
                if (s.getNativeClaimedMountains().contains(request.mountain)) return response(s, false, "这座宝山今日奖励已领取");
                if ("COMPLETED".equals(s.getNativeStatus())) return response(s, false, "请先领取上一轮挑战奖励");
                if ("ACTIVE".equals(s.getNativeStatus()) && now < s.getNativeExpiresAt())
                    return response(s, true, "继续尚未完成的挑战");
                NativeMountainRules.start(s, request.mountain, hp, attack, now, random);
                s.setGuildId(guildAccess.guildId(userId));
                message = "进入" + NativeMountainRules.NAMES[request.mountain];
                break;
            case "ACT":
                if (!validSession(s, request)) return response(s, false, "挑战已失效，请重新进入宝山");
                message = NativeMountainRules.act(s, request.choice, now, random);
                break;
            case "CLAIM":
                if (!validSession(s, request)) return response(s, false, "挑战已失效，请重新进入宝山");
                if ("CLAIMED".equals(s.getNativeStatus())) return response(s, true, "奖励已领取，请勿重复领取");
                if (!"COMPLETED".equals(s.getNativeStatus())) return response(s, false, "完成挑战后才能领取奖励");
                // Both aggregate mutations carry the same receipt, so a crash between them can be retried.
                String receipt = "mountain:" + userId + ":" + s.getDateTag() + ":" + s.getNativeMountain();
                economy.grant(userId, new EconomyGrant(receipt, (int) NativeMountainRules.coins(s.getNativeMountain()), 0,
                        s.getNativeMountain() == 3 || s.getNativeMountain() == 4 ? Map.of("golden_bean", 1) : Map.of()));
                guildAccess.creditMountain(userId, s.getGuildId(), receipt, NativeMountainRules.honor(s.getNativeMountain()));
                s.setNativeStatus("CLAIMED");
                s.getNativeClaimedMountains().add(s.getNativeMountain());
                s.setDigCount(s.getDigCount() + 1);
                s.setTotalReward(s.getTotalReward() + NativeMountainRules.coins(s.getNativeMountain()));
                message = "宝山奖励已存入行囊";
                break;
            case "LEAVE":
                if (!validSession(s, request)) return response(s, false, "挑战已失效");
                if ("COMPLETED".equals(s.getNativeStatus())) return response(s, false, "请先领取已完成的挑战奖励");
                s.setNativeStatus("ABANDONED"); message = "已离开宝山";
                break;
            default: return response(s, false, "未知宝山操作");
        }
        try { repository.save(s); }
        catch (OptimisticLockingFailureException exception) { return response(load(userId), false, "状态已改变，请重试"); }
        return response(s, true, message);
    }

    private boolean validSession(MountainSession s, NativeMountainRequest request) {
        return request.sessionId != null && !request.sessionId.isBlank() && Objects.equals(request.sessionId, s.getNativeRunId());
    }

    private MountainSession load(long userId) {
        int day = Integer.parseInt(LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE));
        String id = "native:" + userId + ":" + day;
        MountainSession s = repository.findById(id).orElseGet(() -> {
            MountainSession fresh = new MountainSession(); fresh.setId(id); fresh.setUserId(userId);
            fresh.setDateTag(day); fresh.setMountainType("NATIVE"); return fresh;
        });
        if (s.getNativeClaimedMountains() == null) s.setNativeClaimedMountains(new ArrayList<>());
        return s;
    }

    private NativeMountainState response(MountainSession s, boolean success, String message) {
        NativeMountainState result = new NativeMountainState(); result.success = success; result.message = message;
        result.mountains = IntStream.range(0, NativeMountainRules.NAMES.length).mapToObj(index -> {
            NativeMountainEntry e = new NativeMountainEntry(); e.mountain = index; e.name = NativeMountainRules.NAMES[index];
            e.description = NativeMountainRules.DESCRIPTIONS[index]; e.claimedToday = s.getNativeClaimedMountains().contains(index);
            e.active = !e.claimedToday; e.rewardCoins = NativeMountainRules.coins(index); e.rewardHonor = NativeMountainRules.honor(index);
            e.rewardGoldenBeans = index == 3 || index == 4 ? 1 : 0; return e;
        }).toList();
        if (s.getNativeRunId() != null && !"ABANDONED".equals(s.getNativeStatus())) result.run = NativeMountainRules.view(s, System.currentTimeMillis());
        return result;
    }
}
