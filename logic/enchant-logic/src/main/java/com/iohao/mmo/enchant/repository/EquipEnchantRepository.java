package com.iohao.mmo.enchant.repository;

import com.iohao.mmo.enchant.entity.EquipEnchant;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface EquipEnchantRepository extends MongoRepository<EquipEnchant, String> {
    EquipEnchant findByEquipId(String equipId);
    List<EquipEnchant> findByUserId(long userId);
}

