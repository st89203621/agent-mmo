package com.iohao.mmo.flower.service;

import com.iohao.mmo.flower.entity.EternalFlower;
import com.iohao.mmo.flower.repository.EternalFlowerRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class FlowerService {

    @Resource
    EternalFlowerRepository flowerRepository;

    public EternalFlower getOrCreate(long playerId) {
        return flowerRepository.findById(playerId).orElseGet(() -> {
            EternalFlower flower = new EternalFlower();
            flower.setPlayerId(playerId);
            return flowerRepository.save(flower);
        });
    }

    /** 浇灌情花：消耗全局缘值和信值 */
    public EternalFlower water(long playerId, int fateAmount, int trustAmount) {
        EternalFlower flower = getOrCreate(playerId);
        flower.water(fateAmount, trustAmount);
        log.info("玩家 {} 浇灌情花：缘值+{} 信值+{}, 当前阶段={}", playerId, fateAmount, trustAmount, flower.getStage());
        return flowerRepository.save(flower);
    }

    /** 轮回时归档当世浇灌量 */
    public EternalFlower archiveWorld(long playerId, int worldIndex, int fateInWorld, int trustInWorld) {
        EternalFlower flower = getOrCreate(playerId);
        flower.recordWorldWatering(worldIndex, fateInWorld, trustInWorld);
        return flowerRepository.save(flower);
    }

    /** 七世完成，情花绽放 */
    public EternalFlower bloom(long playerId, String verse) {
        EternalFlower flower = getOrCreate(playerId);
        flower.setBloomed(true);
        flower.setFlowerVerse(verse);
        log.info("玩家 {} 情花绽放：{} - {}", playerId, flower.getFlowerName(), verse);
        return flowerRepository.save(flower);
    }
}
