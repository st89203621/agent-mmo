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
        initSeedTemplates();
        cachedTemplates = skillTemplateRepository.findAll();
        templateMap = cachedTemplates.stream()
                .collect(Collectors.toMap(SkillTemplate::getId, t -> t));
        log.info("加载技能模板 {} 个", cachedTemplates.size());
    }

    /** 技能种子数据 — 仅在集合为空时初始化 */
    private void initSeedTemplates() {
        if (skillTemplateRepository.count() > 0) return;

        List<SkillTemplate> seeds = new ArrayList<>();

        // ── 战斗系 COMBAT ──
        seeds.add(buildTemplate("combat_slash", "烈火斩", "🔥", "COMBAT", "ACTIVE",
                "释放烈焰一斩，造成1.5倍物攻伤害", 5, 1, 100, null,
                "{\"mpCost\":15,\"multiplier\":1.5,\"effectType\":\"physical_damage\"}", 10));

        seeds.add(buildTemplate("combat_frost", "冰霜新星", "❄️", "COMBAT", "ACTIVE",
                "召唤冰霜之力，造成1.8倍魔攻伤害", 5, 5, 200, null,
                "{\"mpCost\":20,\"multiplier\":1.8,\"effectType\":\"magic_damage\"}", 20));

        seeds.add(buildTemplate("combat_heal", "治愈之光", "💚", "COMBAT", "ACTIVE",
                "以魔力治愈伤口，恢复生命", 5, 3, 150, null,
                "{\"mpCost\":25,\"multiplier\":1.2,\"effectType\":\"heal\"}", 30));

        seeds.add(buildTemplate("combat_thunder", "雷霆一击", "⚡", "COMBAT", "ACTIVE",
                "蓄力释放雷电，造成2.5倍物攻伤害", 3, 10, 500, List.of("combat_slash"),
                "{\"mpCost\":35,\"multiplier\":2.5,\"effectType\":\"physical_damage\"}", 40));

        seeds.add(buildTemplate("combat_iron_wall", "铁壁", "🏰", "COMBAT", "PASSIVE",
                "增加20%物理防御", 3, 5, 200, null,
                "{\"defenseBonus\":0.2}", 50));

        seeds.add(buildTemplate("combat_magic_barrier", "魔法屏障", "🔮", "COMBAT", "PASSIVE",
                "增加20%魔法防御", 3, 5, 200, null,
                "{\"magicDefenseBonus\":0.2}", 60));

        // ── 情感系 EMOTION ──
        seeds.add(buildTemplate("emotion_empathy", "共情", "💗", "EMOTION", "PASSIVE",
                "对话缘分提升10%", 3, 1, 80, null,
                "{\"fateBonus\":0.1}", 10));

        seeds.add(buildTemplate("emotion_insight", "洞察", "👁️", "EMOTION", "PASSIVE",
                "探索奖励提升10%", 3, 3, 120, null,
                "{\"exploreBonus\":0.1}", 20));

        seeds.add(buildTemplate("emotion_resonance", "灵犀", "✨", "EMOTION", "ACTIVE",
                "对话中获得额外选项", 3, 5, 300, List.of("emotion_empathy"),
                "{\"dialogueExtra\":true}", 30));

        skillTemplateRepository.saveAll(seeds);
        log.info("初始化技能种子数据 {} 个", seeds.size());
    }

    private SkillTemplate buildTemplate(String id, String name, String icon, String branch, String type,
                                         String desc, int maxLevel, int reqLevel, int costPerLevel,
                                         List<String> prerequisites, String effectJson, int sortOrder) {
        SkillTemplate t = new SkillTemplate();
        t.setId(id);
        t.setName(name);
        t.setIcon(icon);
        t.setBranch(branch);
        t.setType(type);
        t.setDescription(desc);
        t.setMaxLevel(maxLevel);
        t.setRequiredLevel(reqLevel);
        t.setCostPerLevel(costPerLevel);
        t.setPrerequisites(prerequisites);
        t.setEffectJson(effectJson);
        t.setSortOrder(sortOrder);
        return t;
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

    public SkillTemplate getTemplate(String id) {
        return templateMap.get(id);
    }

    /**
     * 解锁技能（检查前置、消耗金币）
     * @param goldBalance 玩家当前金币，用于校验
     * @return 解锁成功的技能；goldCost 通过返回值的 level 判断（首次解锁 cost = costPerLevel）
     */
    public UnlockResult unlockSkill(long userId, String skillTemplateId, int goldBalance) {
        SkillTemplate template = templateMap.get(skillTemplateId);
        if (template == null) throw new IllegalArgumentException("技能模板不存在");

        Optional<PlayerSkill> existing = playerSkillRepository
                .findByUserIdAndSkillTemplateId(userId, skillTemplateId);
        if (existing.isPresent() && existing.get().isUnlocked()) {
            return new UnlockResult(existing.get(), 0);
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

        // 检查金币消耗
        int cost = template.getCostPerLevel();
        if (cost > 0 && goldBalance < cost) {
            throw new IllegalStateException("金币不足，需要 " + cost + " 金币");
        }

        PlayerSkill skill = existing.orElseGet(() -> {
            PlayerSkill ps = new PlayerSkill();
            ps.setUserId(userId);
            ps.setSkillTemplateId(skillTemplateId);
            return ps;
        });
        skill.setUnlocked(true);
        skill.setLevel(Math.max(skill.getLevel(), 1));
        playerSkillRepository.save(skill);
        return new UnlockResult(skill, cost);
    }

    /** 向后兼容的解锁方法（不检查消耗） */
    public PlayerSkill unlockSkill(long userId, String skillTemplateId) {
        return unlockSkill(userId, skillTemplateId, Integer.MAX_VALUE).skill();
    }

    public record UnlockResult(PlayerSkill skill, int goldCost) {}

    /**
     * 升级技能
     */
    public PlayerSkill upgradeSkill(long userId, String skillTemplateId) {
        SkillTemplate template = templateMap.get(skillTemplateId);
        if (template == null) throw new IllegalArgumentException("技能模板不存在");

        PlayerSkill skill = playerSkillRepository
                .findByUserIdAndSkillTemplateId(userId, skillTemplateId)
                .orElseThrow(() -> new IllegalStateException("技能未解锁"));

        if (!skill.isUnlocked()) throw new IllegalStateException("技能未解锁");
        if (skill.getLevel() >= template.getMaxLevel()) throw new IllegalStateException("已达最大等级");

        skill.setLevel(skill.getLevel() + 1);
        return playerSkillRepository.save(skill);
    }
}
