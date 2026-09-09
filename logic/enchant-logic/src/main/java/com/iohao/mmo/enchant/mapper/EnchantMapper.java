package com.iohao.mmo.enchant.mapper;

import com.iohao.mmo.enchant.entity.EquipEnchant;
import com.iohao.mmo.enchant.proto.EnchantMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper
public interface EnchantMapper {
    EnchantMapper ME = Mappers.getMapper(EnchantMapper.class);
    
    @Mapping(target = "attributeBonus", source = "totalAttributeBonus")
    EnchantMessage convert(EquipEnchant enchant);
}

