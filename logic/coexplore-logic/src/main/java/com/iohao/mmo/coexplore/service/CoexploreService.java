package com.iohao.mmo.coexplore.service;

import com.iohao.mmo.coexplore.entity.CoexploreRound;
import com.iohao.mmo.coexplore.entity.CoexploreSession;
import com.iohao.mmo.coexplore.entity.CoexploreSession.Location;
import com.iohao.mmo.coexplore.repository.CoexploreSessionRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
public class CoexploreService {

    @Resource
    CoexploreSessionRepository sessionRepository;

    // ── 场景数据池 ──────────────────────────────────

    private static final String[][] LOCATION_POOL = {
            {"ancient_temple", "古刹", "香烟缭绕的破败庙宇，墙上有模糊的壁画", "你在神像底座发现一块刻有铭文的玉佩", "你闻到远处飘来的檀香"},
            {"dark_forest", "幽林", "迷雾弥漫的密林，树上挂着奇怪的符咒", "你在一棵古树的树洞中发现一封密信", "你注意到地上有新鲜的脚印"},
            {"river_bank", "河畔", "月光下的河岸，水面倒映着不属于此处的影子", "你在河中捞起一面铜镜，镜中映出奇异景象", "你听到上游传来低沉的吟唱声"},
            {"old_inn", "客栈", "灯火昏暗的客栈，掌柜似乎认识你", "你在柜台下发现一本泛黄的账簿，记载着可疑的交易", "桌上有一杯尚温的茶"},
            {"cliff_edge", "断崖", "悬崖边有一座孤零零的石碑", "石碑上的文字忽然发光，你看到了一段前世记忆", "崖壁上有人留下的抓痕"},
            {"underground", "地穴", "阴冷的地下洞穴，回荡着水滴声", "你在石壁暗格中发现一柄断剑和一幅画像", "洞壁上有新刻的箭头标记"},
            {"market_ruins", "废墟集市", "废弃的集市，摊位上还留着货物", "你翻到一张标注神秘地点的地图", "有人刚刚翻动过这里的东西"},
            {"pagoda", "古塔", "七层宝塔，每层都封印着不同的气息", "你在第三层发现一卷封印的经书", "你感到塔内有另一股灵力在探索"},
    };

    private static final String[][] VOTE_POOL = {
            {"confront", "正面查探", "直接前往线索指向的地方"},
            {"stealth", "暗中调查", "不打草惊蛇，迂回收集更多情报"},
            {"seek_ally", "寻找帮手", "去找可能知情的NPC求助"},
            {"set_trap", "设下埋伏", "在关键位置设伏，等待真相浮现"},
    };

    // ── 创建 / 加入 ──────────────────────────────────

    public CoexploreSession createSession(long hostId, String hostName) {
        CoexploreSession session = new CoexploreSession();
        session.setId(UUID.randomUUID().toString().substring(0, 8));
        session.setHostId(hostId);
        session.setHostName(hostName);
        session.setStatus("WAITING");
        session.setCurrentRound(0);
        session.setCurrentPhase("WAIT");
        session.setCreateTime(System.currentTimeMillis());
        return sessionRepository.save(session);
    }

    public CoexploreSession joinSession(String sessionId, long guestId, String guestName) {
        CoexploreSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null || !"WAITING".equals(session.getStatus())) return null;
        if (session.getHostId() == guestId) return null;

        session.setGuestId(guestId);
        session.setGuestName(guestName);
        startNewRound(session);
        return sessionRepository.save(session);
    }

    public CoexploreSession getSession(String sessionId) {
        return sessionRepository.findById(sessionId).orElse(null);
    }

    public List<CoexploreSession> listWaiting() {
        return sessionRepository.findByStatus("WAITING");
    }

    public CoexploreSession leaveSession(String sessionId, long playerId) {
        CoexploreSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) return null;
        session.setStatus("COMPLETED");
        return sessionRepository.save(session);
    }

    // ── 探索阶段 ──────────────────────────────────

    public CoexploreSession explore(String sessionId, long playerId, String locationId) {
        CoexploreSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null || !"EXPLORING".equals(session.getStatus())) return null;

        CoexploreRound round = getCurrentRound(session);
        if (round == null) return null;

        // 找到选择的地点
        Location chosen = session.getLocations().stream()
                .filter(l -> l.getId().equals(locationId))
                .findFirst().orElse(null);
        if (chosen == null) return null;

        boolean isHost = playerId == session.getHostId();
        if (isHost) {
            if (round.getHostLocationId() != null) return session; // 已选
            round.setHostLocationId(locationId);
            round.setHostDiscovery(chosen.getDiscovery());
            round.setHostFateGain(round.getHostFateGain() + chosen.getFateReward());
            session.setHostFateValue(session.getHostFateValue() + chosen.getFateReward());
        } else {
            if (round.getGuestLocationId() != null) return session;
            round.setGuestLocationId(locationId);
            round.setGuestDiscovery(chosen.getDiscovery());
            round.setGuestFateGain(round.getGuestFateGain() + chosen.getFateReward());
            session.setGuestFateValue(session.getGuestFateValue() + chosen.getFateReward());
        }

        // 生成痕迹（对方能看到的线索）
        Location hostLoc = session.getLocations().stream()
                .filter(l -> l.getId().equals(round.getHostLocationId())).findFirst().orElse(null);
        Location guestLoc = session.getLocations().stream()
                .filter(l -> l.getId().equals(round.getGuestLocationId())).findFirst().orElse(null);

        if (round.getHostLocationId() != null && hostLoc != null) {
            // guest能看到host的痕迹
            round.setHostTrace(findTrace(hostLoc.getId()));
        }
        if (round.getGuestLocationId() != null && guestLoc != null) {
            round.setGuestTrace(findTrace(guestLoc.getId()));
        }

        // 双方都已选择 → 进入汇合阶段
        if (round.getHostLocationId() != null && round.getGuestLocationId() != null) {
            session.setStatus("GATHERING");
            session.setCurrentPhase("GATHER");
            generateVoteOptions(round);
        }

        return sessionRepository.save(session);
    }

    // ── 投票阶段 ──────────────────────────────────

    public CoexploreSession vote(String sessionId, long playerId, String voteId) {
        CoexploreSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) return null;
        // 允许在 GATHERING 或 VOTING 状态投票
        if (!"GATHERING".equals(session.getStatus()) && !"VOTING".equals(session.getStatus())) return null;

        CoexploreRound round = getCurrentRound(session);
        if (round == null) return null;

        boolean isHost = playerId == session.getHostId();
        if (isHost) {
            round.setHostVote(voteId);
        } else {
            round.setGuestVote(voteId);
        }

        // 投票加缘分
        int voteBonus = 5;
        if (isHost) {
            round.setHostFateGain(round.getHostFateGain() + voteBonus);
            session.setHostFateValue(session.getHostFateValue() + voteBonus);
        } else {
            round.setGuestFateGain(round.getGuestFateGain() + voteBonus);
            session.setGuestFateValue(session.getGuestFateValue() + voteBonus);
        }

        // 双方都投票 → 决定结果
        if (round.getHostVote() != null && round.getGuestVote() != null) {
            // 一致额外加分
            if (round.getHostVote().equals(round.getGuestVote())) {
                int consensusBonus = 10;
                session.setHostFateValue(session.getHostFateValue() + consensusBonus);
                session.setGuestFateValue(session.getGuestFateValue() + consensusBonus);
                round.setHostFateGain(round.getHostFateGain() + consensusBonus);
                round.setGuestFateGain(round.getGuestFateGain() + consensusBonus);
                round.setVoteResult(round.getHostVote());
            } else {
                // 不一致随机选一个
                round.setVoteResult(new Random().nextBoolean() ? round.getHostVote() : round.getGuestVote());
            }

            // 判断是否进入Boss战或下一轮
            if (session.getCurrentRound() >= 3) {
                session.setStatus("BOSS");
                session.setCurrentPhase("BOSS");
                initBoss(session);
            } else {
                startNewRound(session);
            }
        } else {
            session.setStatus("VOTING");
            session.setCurrentPhase("VOTE");
        }

        return sessionRepository.save(session);
    }

    // ── Boss战 ──────────────────────────────────

    public CoexploreSession bossBattle(String sessionId, long playerId) {
        CoexploreSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null || !"BOSS".equals(session.getStatus())) return null;

        boolean isHost = playerId == session.getHostId();
        int fateValue = isHost ? session.getHostFateValue() : session.getGuestFateValue();

        // 伤害 = 基础伤害 + 缘分值加成
        int baseDamage = 30;
        int fateBonusDamage = fateValue / 5;
        int totalDamage = baseDamage + fateBonusDamage;

        if (isHost) {
            session.setBossDamageHost(session.getBossDamageHost() + totalDamage);
        } else {
            session.setBossDamageGuest(session.getBossDamageGuest() + totalDamage);
        }

        int totalBossDamage = session.getBossDamageHost() + session.getBossDamageGuest();
        if (totalBossDamage >= session.getBossHp()) {
            session.setStatus("COMPLETED");
            session.setCurrentPhase("RESULT");
        }

        return sessionRepository.save(session);
    }

    // ── 内部方法 ──────────────────────────────────

    private void startNewRound(CoexploreSession session) {
        int nextRound = session.getCurrentRound() + 1;
        session.setCurrentRound(nextRound);
        session.setStatus("EXPLORING");
        session.setCurrentPhase("EXPLORE");

        CoexploreRound round = new CoexploreRound();
        round.setRound(nextRound);
        session.getRounds().add(round);

        // 随机选4个地点
        List<String[]> pool = new ArrayList<>(Arrays.asList(LOCATION_POOL));
        Collections.shuffle(pool);
        List<Location> locations = new ArrayList<>();
        for (int i = 0; i < Math.min(4, pool.size()); i++) {
            String[] raw = pool.get(i);
            Location loc = new Location();
            loc.setId(raw[0]);
            loc.setName(raw[1]);
            loc.setDescription(raw[2]);
            loc.setDiscovery(raw[3]);
            loc.setFateReward(8 + new Random().nextInt(8)); // 8-15
            locations.add(loc);
        }
        session.setLocations(locations);
    }

    private void generateVoteOptions(CoexploreRound round) {
        List<String[]> pool = new ArrayList<>(Arrays.asList(VOTE_POOL));
        Collections.shuffle(pool);
        List<CoexploreRound.VoteOption> options = new ArrayList<>();
        for (int i = 0; i < Math.min(3, pool.size()); i++) {
            String[] raw = pool.get(i);
            CoexploreRound.VoteOption opt = new CoexploreRound.VoteOption();
            opt.setId(raw[0]);
            opt.setText(raw[1]);
            opt.setDescription(raw[2]);
            options.add(opt);
        }
        round.setVoteOptions(options);
    }

    private void initBoss(CoexploreSession session) {
        session.setBossHp(200);
        session.setBossDamageHost(0);
        session.setBossDamageGuest(0);
    }

    private CoexploreRound getCurrentRound(CoexploreSession session) {
        List<CoexploreRound> rounds = session.getRounds();
        if (rounds == null || rounds.isEmpty()) return null;
        return rounds.get(rounds.size() - 1);
    }

    private String findTrace(String locationId) {
        for (String[] loc : LOCATION_POOL) {
            if (loc[0].equals(locationId)) return loc[4];
        }
        return "你感觉有人来过这里";
    }
}
