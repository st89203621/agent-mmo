package com.iohao.mmo.equip.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 装备和装备库的逻辑删除回收类
 *
 * @author 唐斌
 * @date 2023-08-16
 * @description: 物品回收站
 */
@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EquipGarbage {
    String id;
    String type;
    Object data;
    @Indexed
    String collectedTime;
}
