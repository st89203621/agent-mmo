package com.iohao.mmo.skill.service;

import com.iohao.mmo.level.entity.Level;
import com.iohao.mmo.level.service.LevelService;
import com.iohao.mmo.shop.entity.PlayerCurrency;
import com.iohao.mmo.shop.service.ShopService;
import com.iohao.mmo.skill.entity.PlayerSkill;
import com.iohao.mmo.skill.entity.SkillTemplate;
import com.iohao.mmo.skill.repository.PlayerSkillRepository;
import com.iohao.mmo.skill.repository.SkillTemplateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SkillServiceTest {
    private SkillTemplateRepository templates;
    private PlayerSkillRepository playerSkills;
    private LevelService levels;
    private ShopService shop;
    private SkillService service;

    @BeforeEach
    void setUp() throws Exception {
        templates = mock(SkillTemplateRepository.class);
        playerSkills = mock(PlayerSkillRepository.class);
        levels = mock(LevelService.class);
        shop = mock(ShopService.class);
        service = new SkillService(templates, playerSkills, levels, shop);

        SkillTemplate slash = template("slash", 5, 3, 100, 3);
        SkillTemplate finisher = template("finisher", 10, 1, 250, 2);
        finisher.setPrerequisites(List.of("slash"));
        setTemplateCache(Map.of("slash", slash, "finisher", finisher));

        Level level = new Level();
        level.setLevel(5);
        when(levels.ofLevel(anyLong())).thenReturn(level);
        PlayerCurrency currency = new PlayerCurrency(7);
        currency.setGold(1000);
        when(shop.getPlayerCurrency(7)).thenReturn(currency);
        when(playerSkills.save(any(PlayerSkill.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void unlockRequiresLevelBeforeCharging() {
        Level low = new Level();
        low.setLevel(1);
        when(levels.ofLevel(7)).thenReturn(low);

        assertThrows(IllegalStateException.class, () -> service.unlockSkillAndCharge(7, "slash"));
        verify(shop, never()).trySpendGold(anyLong(), anyInt());
        verify(playerSkills, never()).save(any());
    }

    @Test
    void unlockAtomicallyChargesAndReturnsActualCost() {
        when(playerSkills.findByUserIdAndSkillTemplateId(7, "slash")).thenReturn(Optional.empty());
        when(shop.trySpendGold(7, 100)).thenReturn(true);

        SkillService.UnlockResult result = service.unlockSkillAndCharge(7, "slash");

        assertEquals(100, result.goldCost());
        assertTrue(result.skill().isUnlocked());
        assertEquals(1, result.skill().getLevel());
        verify(shop).trySpendGold(7, 100);
        verify(playerSkills).save(result.skill());
    }

    @Test
    void failedSkillSaveRefundsGold() {
        when(playerSkills.findByUserIdAndSkillTemplateId(7, "slash")).thenReturn(Optional.empty());
        when(shop.trySpendGold(7, 100)).thenReturn(true);
        when(playerSkills.save(any())).thenThrow(new IllegalStateException("db unavailable"));

        assertThrows(IllegalStateException.class, () -> service.unlockSkillAndCharge(7, "slash"));
        verify(shop).refundGold(7, 100);
    }

    @Test
    void upgradeRequiresGoldAndDoesNotMutateOnInsufficientBalance() {
        PlayerSkill skill = unlocked("slash", 1);
        when(playerSkills.findByUserIdAndSkillTemplateId(7, "slash")).thenReturn(Optional.of(skill));
        when(shop.trySpendGold(7, 100)).thenReturn(false);

        assertThrows(IllegalStateException.class, () -> service.upgradeSkill(7, "slash"));
        assertEquals(1, skill.getLevel());
        verify(playerSkills, never()).save(any());
    }

    @Test
    void upgradeChargesPerLevelAndStopsAtMaximum() {
        PlayerSkill skill = unlocked("slash", 2);
        when(playerSkills.findByUserIdAndSkillTemplateId(7, "slash")).thenReturn(Optional.of(skill));
        when(shop.trySpendGold(7, 100)).thenReturn(true);

        assertEquals(3, service.upgradeSkill(7, "slash").getLevel());
        verify(shop).trySpendGold(7, 100);

        assertThrows(IllegalStateException.class, () -> service.upgradeSkill(7, "slash"));
        verify(shop, times(1)).trySpendGold(7, 100);
    }

    @Test
    void questRewardUnlockIsFreeAndIdempotent() {
        when(playerSkills.findByUserIdAndSkillTemplateId(7, "slash"))
                .thenReturn(Optional.empty())
                .thenAnswer(invocation -> Optional.of(unlocked("slash", 1)));

        PlayerSkill granted = service.grantSkillReward(7, "slash");
        PlayerSkill repeated = service.grantSkillReward(7, "slash");

        assertTrue(granted.isUnlocked());
        assertTrue(repeated.isUnlocked());
        verify(shop, never()).trySpendGold(anyLong(), anyInt());
        verify(playerSkills, times(2)).save(any());
    }

    private void setTemplateCache(Map<String, SkillTemplate> cache) throws Exception {
        Field field = SkillService.class.getDeclaredField("templateMap");
        field.setAccessible(true);
        field.set(service, cache);
    }

    private static SkillTemplate template(String id, int requiredLevel, int maxLevel, int cost, int sortOrder) {
        SkillTemplate template = new SkillTemplate();
        template.setId(id);
        template.setName(id);
        template.setRequiredLevel(requiredLevel);
        template.setMaxLevel(maxLevel);
        template.setCostPerLevel(cost);
        template.setSortOrder(sortOrder);
        return template;
    }

    private static PlayerSkill unlocked(String id, int level) {
        PlayerSkill skill = new PlayerSkill();
        skill.setUserId(7);
        skill.setSkillTemplateId(id);
        skill.setLevel(level);
        skill.setUnlocked(true);
        return skill;
    }
}
