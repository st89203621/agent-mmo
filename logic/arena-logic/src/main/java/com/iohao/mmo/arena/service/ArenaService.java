package com.iohao.mmo.arena.service;

import com.iohao.mmo.arena.entity.ArenaPlayer;
import org.springframework.stereotype.Service;
import java.util.*;

/**
 * 竞技场服务
 */
@Service
public class ArenaService {
    private Map<Long, ArenaPlayer> arenaPlayers = new HashMap<>();
    
    public ArenaPlayer getArenaInfo(long playerId) {
        return arenaPlayers.getOrDefault(playerId, createNewArenaPlayer(playerId));
    }
    
    public List<ArenaPlayer> getOpponents(long playerId, int count) {
        List<ArenaPlayer> opponents = new ArrayList<>(arenaPlayers.values());
        opponents.removeIf(p -> p.getPlayerId() == playerId);
        opponents.sort((a, b) -> Integer.compare(b.getRating(), a.getRating()));
        return opponents.subList(0, Math.min(count, opponents.size()));
    }
    
    public boolean startPvpBattle(long playerId, long opponentId) {
        ArenaPlayer player = getArenaInfo(playerId);
        if (!player.isCanBattle()) return false;
        player.setCanBattle(false);
        player.setLastBattleTime(System.currentTimeMillis());
        return true;
    }
    
    public Map<String, Object> getBattleResult(long playerId, long opponentId) {
        Map<String, Object> result = new HashMap<>();
        ArenaPlayer player = getArenaInfo(playerId);
        ArenaPlayer opponent = getArenaInfo(opponentId);

        // 基于战力计算胜率：胜率 = playerPower / (playerPower + opponentPower)
        int playerPower = Math.max(player.getPower(), 1);
        int opponentPower = Math.max(opponent.getPower(), 1);
        double winChance = (double) playerPower / (playerPower + opponentPower);
        boolean win = Math.random() < winChance;

        // 更新积分（ELO简化版）
        int ratingChange = win ? 25 : -20;
        player.setRating(Math.max(0, player.getRating() + ratingChange));
        if (win) {
            player.setWins(player.getWins() + 1);
            opponent.setLosses(opponent.getLosses() + 1);
            opponent.setRating(Math.max(0, opponent.getRating() - 15));
        } else {
            player.setLosses(player.getLosses() + 1);
            opponent.setWins(opponent.getWins() + 1);
            opponent.setRating(opponent.getRating() + 15);
        }
        player.setCanBattle(true);

        result.put("win", win);
        result.put("ratingChange", ratingChange);
        result.put("newRating", player.getRating());
        result.put("reward", win ? 100 : 10);
        return result;
    }
    
    public List<ArenaPlayer> getLadderRank(int limit) {
        List<ArenaPlayer> ranks = new ArrayList<>(arenaPlayers.values());
        ranks.sort((a, b) -> Integer.compare(b.getRating(), a.getRating()));
        return ranks.subList(0, Math.min(limit, ranks.size()));
    }
    
    private ArenaPlayer createNewArenaPlayer(long playerId) {
        ArenaPlayer player = new ArenaPlayer();
        player.setPlayerId(playerId);
        player.setPlayerName("玩家" + playerId);
        player.setLevel(1);
        player.setPower(100);
        player.setWins(0);
        player.setLosses(0);
        player.setRating(1000);
        player.setRank(9999);
        player.setCanBattle(true);
        arenaPlayers.put(playerId, player);
        return player;
    }
}

