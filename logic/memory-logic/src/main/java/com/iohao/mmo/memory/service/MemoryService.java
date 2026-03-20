package com.iohao.mmo.memory.service;

import com.iohao.mmo.fate.entity.Relation;
import com.iohao.mmo.memory.entity.MemoryFragment;
import com.iohao.mmo.memory.entity.MemoryHall;
import com.iohao.mmo.memory.repository.MemoryFragmentRepository;
import com.iohao.mmo.memory.repository.MemoryHallRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class MemoryService {

    @Resource
    MemoryFragmentRepository memoryFragmentRepository;

    @Resource
    MemoryHallRepository memoryHallRepository;

    public MemoryHall getOrCreateHall(long userId) {
        return memoryHallRepository.findById(userId).orElseGet(() -> {
            MemoryHall hall = new MemoryHall();
            hall.setId(userId);
            hall.setTotalFragments(0);
            hall.setUnlockedFragments(0);
            return memoryHallRepository.save(hall);
        });
    }

    public List<MemoryFragment> listMemories(long userId) {
        return memoryFragmentRepository.findByPlayerId(userId);
    }

    public List<MemoryFragment> listByWorld(long userId, int worldIndex) {
        return memoryFragmentRepository.findByPlayerIdAndWorldIndex(userId, worldIndex);
    }

    public Optional<MemoryFragment> getMemory(String fragmentId) {
        return memoryFragmentRepository.findById(fragmentId);
    }

    public MemoryFragment createMemory(long userId, String npcId, String npcName, int worldIndex,
                                        String bookTitle, int fateScore, String dialogueSummary) {
        MemoryFragment fragment = new MemoryFragment();
        fragment.setId(UUID.randomUUID().toString());
        fragment.setPlayerId(userId);
        fragment.setNpcId(npcId);
        fragment.setNpcName(npcName);
        fragment.setWorldIndex(worldIndex);
        fragment.setBookTitle(bookTitle);
        fragment.setFateScore(fateScore);
        fragment.setCreateTime(System.currentTimeMillis());
        fragment.setAffectsNextWorld(fateScore >= 60);

        // 生成标题
        fragment.setTitle(buildMemoryTitle(npcName, fateScore));

        // 生成摘录
        if (dialogueSummary != null && !dialogueSummary.isEmpty()) {
            fragment.setExcerpt(dialogueSummary.length() > 100
                    ? dialogueSummary.substring(0, 100)
                    : dialogueSummary);
        } else {
            fragment.setExcerpt("与" + npcName + "在" + bookTitle + "世界的相遇，缘分值" + fateScore);
        }

        // 设置情感基调
        if (fateScore >= 80) {
            fragment.setEmotionTone("深情");
        } else if (fateScore >= 60) {
            fragment.setEmotionTone("温柔");
        } else if (fateScore >= 40) {
            fragment.setEmotionTone("平静");
        } else {
            fragment.setEmotionTone("淡然");
        }

        // 设置锁定状态
        boolean locked = fateScore < 40;
        fragment.setLocked(locked);
        if (locked) {
            fragment.setUnlockCondition("缘分达到40解锁");
        } else if (fateScore < 60) {
            fragment.setUnlockCondition("缘分达到60解锁完整内容");
        }

        fragment = memoryFragmentRepository.save(fragment);

        // 更新记忆馆
        MemoryHall hall = getOrCreateHall(userId);
        hall.addFragment(fragment.getId());
        if (!locked) {
            hall.setUnlockedFragments(hall.getUnlockedFragments() + 1);
        }
        memoryHallRepository.save(hall);

        log.info("为玩家 {} 创建记忆碎片：{}（缘分{}，NPC {}）", userId, fragment.getTitle(), fateScore, npcName);
        return fragment;
    }

    public Optional<MemoryFragment> checkMilestoneAndCreate(long userId, String npcId, String npcName,
                                                              int worldIndex, String bookTitle, Relation relation) {
        if (Objects.isNull(relation)) {
            return Optional.empty();
        }

        int fateScore = relation.getFateScore();
        int milestone = relation.isAtMilestone();
        if (milestone == 0) {
            return Optional.empty();
        }

        // 检查是否已有该里程碑的碎片
        List<MemoryFragment> existing = memoryFragmentRepository
                .findByPlayerIdAndNpcIdAndWorldIndex(userId, npcId, worldIndex);
        boolean alreadyHasMilestone = existing.stream()
                .anyMatch(f -> f.getFateScore() >= milestone);

        if (alreadyHasMilestone) {
            return Optional.empty();
        }

        String summary = "在" + bookTitle + "世界，与" + npcName + "的缘分达到了" + fateScore + "，触发了缘分里程碑。";
        MemoryFragment fragment = createMemory(userId, npcId, npcName, worldIndex, bookTitle, fateScore, summary);
        return Optional.of(fragment);
    }

    public String buildMemoryTitle(String npcName, int fateScore) {
        if (fateScore >= 80) {
            return npcName + "：若有来世";
        } else if (fateScore >= 60) {
            return npcName + "：那一回眸";
        } else if (fateScore >= 40) {
            return npcName + "：缘起之时";
        } else {
            return "与" + npcName + "的邂逅";
        }
    }
}
