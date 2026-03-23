package com.iohao.mmo.skill.service;

import com.iohao.mmo.skill.entity.PlayerSkill;
import com.iohao.mmo.skill.entity.SkillTemplate;
import com.iohao.mmo.skill.repository.PlayerSkillRepository;
import com.iohao.mmo.skill.repository.SkillTemplateRepository;
import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@AllArgsConstructor
public class SkillService {

    final SkillTemplateRepository skillTemplateRepository;
    final PlayerSkillRepository playerSkillRepository;

    private List<SkillTemplate> cachedTemplates;
    private Map<String, SkillTemplate> templateMap;

    @PostConstruct
    private void init() {
        cachedTemplates = skillTemplateRepository.findAll();
        templateMap = cachedTemplates.stream()
                .collect(Collectors.toMap(SkillTemplate::getId, t -> t));
        log.info("加载技能模板 {} 个", cachedTemplates.size());
    }

    public List<SkillTemplate> listTemplates() {
        return cachedTemplates;
    }

    public List<SkillTemplate> listTemplatesByBranch(String branch) {
        return cachedTemplates.stream()
                .filter(t -> branch.equalsIgnoreCase(t.getBranch()))
                .sorted(Comparator.comparingInt(SkillTemplate::getSortOrder))
                .toList();
    }

    public List<PlayerSkill> listPlayerSkills(long userId) {
        return playerSkillRepository.findByUserId(userId);
    }

    /**
     * 解锁技能
     */
    public PlayerSkill unlockSkill(long userId, String skillTemplateId) {
        SkillTemplate template = templateMap.get(skillTemplateId);
        if (template == null) {
            throw new IllegalArgumentException("技能模板不存在");
        }

        // 检查是否已解锁
        Optional<PlayerSkill> existing = playerSkillRepository
                .findByUserIdAndSkillTemplateId(userId, skillTemplateId);
        if (existing.isPresent() && existing.get().isUnlocked()) {
            return existing.get();
        }

        // 检查前置技能
        if (template.getPrerequisites() != null) {
            for (String preId : template.getPrerequisites()) {
                Optional<PlayerSkill> pre = playerSkillRepository
                        .findByUserIdAndSkillTemplateId(userId, preId);
                if (pre.isEmpty() || !pre.get().isUnlocked()) {
                    throw new IllegalStateException("前置技能未解锁: " + preId);
                }
            }
        }

        PlayerSkill skill = existing.orElseGet(() -> {
            PlayerSkill ps = new PlayerSkill();
            ps.setUserId(userId);
            ps.setSkillTemplateId(skillTemplateId);
            return ps;
        });
        skill.setUnlocked(true);
        skill.setLevel(Math.max(skill.getLevel(), 1));
        return playerSkillRepository.save(skill);
    }

    /**
     * 升级技能
     */
    public PlayerSkill upgradeSkill(long userId, String skillTemplateId) {
        SkillTemplate template = templateMap.get(skillTemplateId);
        if (template == null) {
            throw new IllegalArgumentException("技能模板不存在");
        }

        PlayerSkill skill = playerSkillRepository
                .findByUserIdAndSkillTemplateId(userId, skillTemplateId)
                .orElseThrow(() -> new IllegalStateException("技能未解锁"));

        if (!skill.isUnlocked()) {
            throw new IllegalStateException("技能未解锁");
        }

        if (skill.getLevel() >= template.getMaxLevel()) {
            throw new IllegalStateException("已达最大等级");
        }

        skill.setLevel(skill.getLevel() + 1);
        return playerSkillRepository.save(skill);
    }
}
