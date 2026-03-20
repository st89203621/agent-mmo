package com.iohao.mmo.adventure.mapper;

import com.iohao.mmo.adventure.entity.*;
import com.iohao.mmo.adventure.proto.DungeonMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper
public interface AdventureMapper {
    AdventureMapper ME = Mappers.getMapper(AdventureMapper.class);

    @Mapping(target = "type", expression = "java(dungeon.getType() != null ? dungeon.getType().name() : null)")
    @Mapping(target = "status", expression = "java(dungeon.getStatus() != null ? dungeon.getStatus().name() : null)")
    DungeonMessage convert(Dungeon dungeon);

    List<DungeonMessage> convertList(List<Dungeon> dungeons);

    DungeonMessage.StageProgressMessage convert(Dungeon.StageProgress stageProgress);

    List<DungeonMessage.StageProgressMessage> convertStageProgressList(List<Dungeon.StageProgress> stageProgressList);

    DungeonMessage.RewardMessage convert(Dungeon.DungeonReward reward);

    DungeonMessage.ItemDropMessage convert(Dungeon.ItemDrop itemDrop);

    List<DungeonMessage.ItemDropMessage> convertItemDropList(List<Dungeon.ItemDrop> itemDrops);
}

