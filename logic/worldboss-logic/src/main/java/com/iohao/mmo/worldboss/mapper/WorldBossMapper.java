package com.iohao.mmo.worldboss.mapper;

import com.iohao.mmo.worldboss.entity.*;
import com.iohao.mmo.worldboss.proto.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.util.List;
import java.util.stream.Collectors;

@Mapper
public interface WorldBossMapper {
    WorldBossMapper ME = Mappers.getMapper(WorldBossMapper.class);

    @Mapping(target = "status", expression = "java(boss.getStatus().getValue())")
    WorldBossMessage convert(WorldBoss boss);

    List<WorldBossMessage> convertList(List<WorldBoss> bossList);

    @Mapping(target = "skillType", expression = "java(skill.getSkillType().getValue())")
    BossSkillMessage convert(BossSkill skill);

    List<BossSkillMessage> convertSkills(List<BossSkill> skills);

    DropItemMessage convert(DropItem item);

    List<DropItemMessage> convertDropItems(List<DropItem> items);

    @Mapping(target = "damagePercent", expression = "java(damage.getDamagePercent(totalDamage))")
    PlayerDamageInfo convert(PlayerDamage damage, long totalDamage);

    default List<PlayerDamageInfo> convertDamageList(List<PlayerDamage> damageList, long totalDamage) {
        return damageList.stream()
                .map(d -> convert(d, totalDamage))
                .collect(Collectors.toList());
    }
}

