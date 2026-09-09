package com.iohao.mmo.rank.service;

import com.iohao.mmo.rank.entity.RankEntry;
import org.springframework.stereotype.Service;
import java.util.*;

/**
 * 排行榜服务
 */
@Service
public class RankService {
    private Map<String, List<RankEntry>> ranks = new HashMap<>();

    public RankService() {
        initializeRanks();
        initMockData();
    }

    private void initializeRanks() {
        ranks.put("level", new ArrayList<>());
        ranks.put("power", new ArrayList<>());
        ranks.put("wealth", new ArrayList<>());
        ranks.put("achievement", new ArrayList<>());
    }

    private void initMockData() {
        String[] names = {"龙战士", "剑圣", "法师", "刺客", "牧师", "战士", "猎人", "盗贼", "骑士", "术士"};

        for (int i = 0; i < 10; i++) {
            RankEntry levelEntry = new RankEntry();
            levelEntry.setPlayerId(1000 + i);
            levelEntry.setPlayerName(names[i]);
            levelEntry.setLevel(50 - i);
            levelEntry.setValue(50 - i);
            levelEntry.setRankType("level");
            updateRank("level", levelEntry);

            RankEntry powerEntry = new RankEntry();
            powerEntry.setPlayerId(1000 + i);
            powerEntry.setPlayerName(names[i]);
            powerEntry.setLevel(40 + i);
            powerEntry.setValue(10000 - i * 500);
            powerEntry.setRankType("power");
            updateRank("power", powerEntry);

            RankEntry wealthEntry = new RankEntry();
            wealthEntry.setPlayerId(1000 + i);
            wealthEntry.setPlayerName(names[i]);
            wealthEntry.setLevel(35 + i);
            wealthEntry.setValue(1000000 - i * 50000);
            wealthEntry.setRankType("wealth");
            updateRank("wealth", wealthEntry);

            RankEntry achievementEntry = new RankEntry();
            achievementEntry.setPlayerId(1000 + i);
            achievementEntry.setPlayerName(names[i]);
            achievementEntry.setLevel(30 + i);
            achievementEntry.setValue(100 - i * 5);
            achievementEntry.setRankType("achievement");
            updateRank("achievement", achievementEntry);
        }
    }
    
    public List<RankEntry> getRank(String rankType, int limit) {
        List<RankEntry> rankList = ranks.getOrDefault(rankType, new ArrayList<>());
        return rankList.subList(0, Math.min(limit, rankList.size()));
    }
    
    public int getPlayerRank(String rankType, long playerId) {
        List<RankEntry> rankList = ranks.getOrDefault(rankType, new ArrayList<>());
        for (int i = 0; i < rankList.size(); i++) {
            if (rankList.get(i).getPlayerId() == playerId) {
                return i + 1;
            }
        }
        return 9999;
    }
    
    public void updateRank(String rankType, RankEntry entry) {
        List<RankEntry> rankList = ranks.getOrDefault(rankType, new ArrayList<>());
        rankList.removeIf(e -> e.getPlayerId() == entry.getPlayerId());
        rankList.add(entry);
        rankList.sort((a, b) -> Long.compare(b.getValue(), a.getValue()));
        
        for (int i = 0; i < rankList.size(); i++) {
            rankList.get(i).setRank(i + 1);
        }
    }
}

