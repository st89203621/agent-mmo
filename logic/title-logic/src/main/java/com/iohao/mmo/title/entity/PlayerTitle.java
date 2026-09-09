package com.iohao.mmo.title.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/**
 * 玩家拥有的称号
 */
@Data
@Document("player_title")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PlayerTitle {
    @Id
    String id;
    @Indexed
    long playerId;
    /** 已拥有的称号模板ID列表 */
    List<String> ownedTitleIds = new ArrayList<>();
    /** 当前装备的称号模板ID */
    String equippedTitleId;
}
