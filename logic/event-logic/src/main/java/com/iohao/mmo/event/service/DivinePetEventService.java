package com.iohao.mmo.event.service;

import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.event.entity.DivinePetEgg;
import com.iohao.mmo.event.entity.PlayerEventProgress;
import com.iohao.mmo.event.repository.DivinePetEggRepository;
import com.iohao.mmo.event.repository.PlayerEventProgressRepository;
import com.iohao.mmo.pet.entity.Pet;
import com.iohao.mmo.pet.entity.PetBag;
import com.iohao.mmo.pet.entity.PetTemplate;
import com.iohao.mmo.pet.service.PetService;
import jakarta.annotation.Resource;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;

/**
 * 天降神宠活动服务
 */
@Service
public class DivinePetEventService {
    
    @Resource
    DivinePetEggRepository eggRepository;
    
    @Resource
    PlayerEventProgressRepository progressRepository;
    
    @Resource
    PetService petService;
    
    private final Random random = new Random();
    
    /**
     * 生成宠物蛋掉落
     */
    public DivinePetEgg spawnPetEgg(String eventId, int posX, int posY) {
        DivinePetEgg egg = new DivinePetEgg();
        egg.setId(new ObjectId().toString());
        egg.setEventId(eventId);
        egg.setQuality(randomQuality());
        egg.setPosX(posX);
        egg.setPosY(posY);
        egg.setDropTime(System.currentTimeMillis());
        egg.setLifeTime(300000); // 5分钟存活时间
        egg.setSmashed(false);
        egg.setQualityBonus(egg.getQuality().getQualityBonus());
        
        return eggRepository.save(egg);
    }
    
    /**
     * 批量生成宠物蛋(天降神宠活动开始时)
     */
    public List<DivinePetEgg> spawnMultipleEggs(String eventId, int count) {
        List<DivinePetEgg> eggs = new java.util.ArrayList<>();
        
        for (int i = 0; i < count; i++) {
            int posX = random.nextInt(2000) - 1000;
            int posY = random.nextInt(2000) - 1000;
            eggs.add(spawnPetEgg(eventId, posX, posY));
        }
        
        return eggs;
    }
    
    /**
     * 砸宠物蛋
     */
    public SmashResult smashEgg(String eggId, long userId, FlowContext flowContext) {
        DivinePetEgg egg = eggRepository.findById(eggId).orElse(null);
        
        if (egg == null) {
            return SmashResult.error("宠物蛋不存在");
        }
        
        if (!egg.canSmash()) {
            return SmashResult.error("宠物蛋已过期或已被砸开");
        }
        
        // 标记为已砸开
        egg.setSmashed(true);
        egg.setSmashedBy(userId);
        egg.setSmashTime(System.currentTimeMillis());
        
        // 生成宠物
        List<PetTemplate> templates = petService.listPetTemplates().stream().toList();
        PetTemplate template = templates.get(random.nextInt(templates.size()));
        egg.setPetTemplateId(template.getId());
        
        // 创建宠物并应用资质加成
        PetBag petBag = petService.ofPetBag(userId);
        Pet pet = template.createPet();
        
        // 应用资质加成
        int bonus = egg.getQualityBonus();
        int basePoints = pet.getPropertyPointNum();
        int bonusPoints = (int) (basePoints * bonus / 100.0);
        pet.setPropertyPointNum(basePoints + bonusPoints);
        
        petBag.addPet(pet);
        petService.save(petBag);
        
        eggRepository.save(egg);
        
        // 更新玩家进度
        updatePlayerProgress(userId, egg.getEventId());
        
        return SmashResult.success(egg, pet);
    }
    
    /**
     * 获取活动中的所有宠物蛋
     */
    public List<DivinePetEgg> getActiveEggs(String eventId) {
        return eggRepository.findByEventIdAndSmashedFalse(eventId);
    }
    
    /**
     * 清理过期的宠物蛋
     */
    public int cleanExpiredEggs(String eventId) {
        List<DivinePetEgg> eggs = eggRepository.findByEventIdAndSmashedFalse(eventId);
        int cleaned = 0;
        
        for (DivinePetEgg egg : eggs) {
            if (egg.isExpired()) {
                eggRepository.delete(egg);
                cleaned++;
            }
        }
        
        return cleaned;
    }
    
    /**
     * 更新玩家活动进度
     */
    private void updatePlayerProgress(long userId, String eventId) {
        PlayerEventProgress progress = progressRepository
            .findByUserIdAndEventId(userId, eventId)
            .orElseGet(() -> {
                PlayerEventProgress p = new PlayerEventProgress();
                p.setId(new ObjectId().toString());
                p.setUserId(userId);
                p.setEventId(eventId);
                p.setJoinTime(System.currentTimeMillis());
                return p;
            });
        
        progress.incrementEggSmash();
        progressRepository.save(progress);
    }
    
    /**
     * 随机生成宠物蛋品质
     */
    private DivinePetEgg.EggQuality randomQuality() {
        int rand = random.nextInt(10000);
        
        if (rand < 10) return DivinePetEgg.EggQuality.MYTHIC;        // 0.1%
        if (rand < 100) return DivinePetEgg.EggQuality.LEGENDARY;    // 0.9%
        if (rand < 500) return DivinePetEgg.EggQuality.EPIC;         // 4%
        if (rand < 2000) return DivinePetEgg.EggQuality.RARE;        // 15%
        if (rand < 5000) return DivinePetEgg.EggQuality.UNCOMMON;    // 30%
        return DivinePetEgg.EggQuality.COMMON;                        // 50%
    }
    
    /**
     * 砸蛋结果
     */
    public static class SmashResult {
        private boolean success;
        private String message;
        private DivinePetEgg egg;
        private Pet pet;
        
        public static SmashResult success(DivinePetEgg egg, Pet pet) {
            SmashResult result = new SmashResult();
            result.success = true;
            result.message = "成功砸开宠物蛋!";
            result.egg = egg;
            result.pet = pet;
            return result;
        }
        
        public static SmashResult error(String message) {
            SmashResult result = new SmashResult();
            result.success = false;
            result.message = message;
            return result;
        }
        
        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
        public DivinePetEgg getEgg() { return egg; }
        public Pet getPet() { return pet; }
    }
}

