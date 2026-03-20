package com.iohao.mmo.arena.mapper;

import com.iohao.mmo.arena.entity.ArenaPlayer;
import com.iohao.mmo.arena.proto.ArenaPlayerMessage;
import com.iohao.mmo.arena.proto.BattleResultMessage;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;
import java.util.Map;

@Mapper
public interface ArenaMapper {
    ArenaMapper ME = Mappers.getMapper(ArenaMapper.class);

    ArenaPlayerMessage convert(ArenaPlayer player);

    List<ArenaPlayerMessage> convertList(List<ArenaPlayer> players);

    default BattleResultMessage convertBattleResult(Map<String, Object> result) {
        BattleResultMessage message = new BattleResultMessage();
        message.win = (Boolean) result.get("win");
        message.reward = (Integer) result.get("reward");
        return message;
    }
}

