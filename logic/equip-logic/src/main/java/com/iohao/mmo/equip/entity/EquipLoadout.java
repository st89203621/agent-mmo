package com.iohao.mmo.equip.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.HashMap;
import java.util.Map;

@Data
@Document("equip_loadout")
public class EquipLoadout {
    @Id
    long userId;
    boolean starterGranted;
    Map<Integer, String> slots = new HashMap<>();
}
