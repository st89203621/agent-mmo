package com.iohao.mmo.rebirth.service;

import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.rebirth.entity.PlayerWorld;
import com.iohao.mmo.rebirth.entity.PlayerWorld.WorldRecord;
import com.iohao.mmo.rebirth.entity.PlayerWorld.WorldRecord.WorldStatus;
import com.iohao.mmo.rebirth.repository.PlayerWorldRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
public class RebirthService {

    private static final String[] REBIRTH_POEMS = {
            "",
            "前世青云一别后，今生江湖再相逢，她不记得你也忘，唯有心间那丝牵绊",
            "两世情缘未了尽，第三轮回始相知，斗气大陆寻旧梦，遥望彼岸花正开",
            "三世缘分渐深重，完美世界共荒古，命运洪流难阻隔，七世圆满待来生",
            "四世繁华已成烟，都市重逢身份变，前世记忆若隐现，缘分牵引再相见",
            "五世情深入骨髓，未来星际重聚首，科技纵横情未改，轮回路上不回头",
            "六世漫漫终将尽，第七轮回归来处，七世缘分汇一身，圆满之境等你来"
    };

    @Resource
    PlayerWorldRepository playerWorldRepository;

    public PlayerWorld ofPlayerWorld(long userId) {
        return playerWorldRepository.findById(userId).orElseGet(() -> {
            PlayerWorld playerWorld = new PlayerWorld();
            playerWorld.setId(userId);
            playerWorld.initDefault();

            WorldRecord firstWorld = new WorldRecord();
            firstWorld.setWorldIndex(1);
            firstWorld.setEnterTime(System.currentTimeMillis());
            firstWorld.setStatus(WorldStatus.CURRENT);

            List<WorldRecord> worlds = new ArrayList<>();
            worlds.add(firstWorld);
            playerWorld.setWorlds(worlds);

            return playerWorldRepository.save(playerWorld);
        });
    }

    public PlayerWorld getCurrentWorld(long userId) {
        return ofPlayerWorld(userId);
    }

    public WorldRecord selectNextBook(long userId, String bookId, String bookTitle) {
        PlayerWorld playerWorld = ofPlayerWorld(userId);
        int nextIndex = playerWorld.getCurrentWorldIndex() + 1;
        if (nextIndex > 7) {
            log.info("用户 {} 已完成七世轮回", userId);
            return null;
        }

        if (playerWorld.getWorlds() == null) {
            playerWorld.setWorlds(new ArrayList<>());
        }
        final List<WorldRecord> worlds = playerWorld.getWorlds();

        // 检查是否已有该世界的预选记录
        WorldRecord nextRecord = worlds.stream()
                .filter(w -> w.getWorldIndex() == nextIndex)
                .findFirst()
                .orElseGet(() -> {
                    WorldRecord record = new WorldRecord();
                    record.setWorldIndex(nextIndex);
                    record.setStatus(WorldStatus.PENDING);
                    worlds.add(record);
                    return record;
                });

        nextRecord.setBookId(bookId);
        nextRecord.setBookTitle(bookTitle);
        nextRecord.setStatus(WorldStatus.PENDING);

        playerWorldRepository.save(playerWorld);
        return nextRecord;
    }

    public PlayerWorld doRebirth(long userId, FlowContext flowContext) {
        PlayerWorld playerWorld = ofPlayerWorld(userId);
        int currentIndex = playerWorld.getCurrentWorldIndex();

        if (currentIndex >= 7) {
            log.info("用户 {} 已达第七世，无法继续轮回", userId);
            return playerWorld;
        }

        WorldRecord currentRecord = playerWorld.getCurrentWorldRecord();
        if (Objects.nonNull(currentRecord)) {
            currentRecord.setExitTime(System.currentTimeMillis());
            currentRecord.setStatus(WorldStatus.COMPLETED);
            // 生成轮回诗句
            String poem = generateRebirthPoem(currentIndex,
                    currentRecord.getBookTitle() != null ? currentRecord.getBookTitle() : "",
                    "");
            currentRecord.setRebirthPoem(poem);
        }

        int nextIndex = currentIndex + 1;
        playerWorld.setCurrentWorldIndex(nextIndex);
        playerWorld.setTotalRebirths(playerWorld.getTotalRebirths() + 1);
        playerWorld.setLastRebirthTime(System.currentTimeMillis());

        // 激活或创建下一世记录
        final List<WorldRecord> worlds = playerWorld.getWorlds();
        WorldRecord nextRecord = worlds.stream()
                .filter(w -> w.getWorldIndex() == nextIndex)
                .findFirst()
                .orElseGet(() -> {
                    WorldRecord record = new WorldRecord();
                    record.setWorldIndex(nextIndex);
                    worlds.add(record);
                    return record;
                });

        if (nextRecord.getEnterTime() == 0) {
            nextRecord.setEnterTime(System.currentTimeMillis());
        }
        nextRecord.setStatus(WorldStatus.CURRENT);

        playerWorldRepository.save(playerWorld);
        log.info("用户 {} 完成轮回，从第{}世进入第{}世", userId, currentIndex, nextIndex);
        return playerWorld;
    }

    public String generateRebirthPoem(int worldIndex, String fromBook, String toBook) {
        if (worldIndex >= 1 && worldIndex <= 6) {
            return REBIRTH_POEMS[worldIndex];
        }
        return "七世轮回终圆满，缘分已成永恒";
    }

    public Map<String, Object> getWorldSummary(long userId, int worldIndex) {
        PlayerWorld playerWorld = ofPlayerWorld(userId);
        Map<String, Object> summary = new HashMap<>();
        summary.put("userId", userId);
        summary.put("worldIndex", worldIndex);

        if (playerWorld.getWorlds() != null) {
            playerWorld.getWorlds().stream()
                    .filter(w -> w.getWorldIndex() == worldIndex)
                    .findFirst()
                    .ifPresent(record -> {
                        summary.put("bookId", record.getBookId());
                        summary.put("bookTitle", record.getBookTitle());
                        summary.put("enterTime", record.getEnterTime());
                        summary.put("exitTime", record.getExitTime());
                        summary.put("finalFateScore", record.getFinalFateScore());
                        summary.put("rebirthPoem", record.getRebirthPoem());
                        summary.put("status", record.getStatus() != null ? record.getStatus().name() : "PENDING");
                    });
        }

        return summary;
    }
}
