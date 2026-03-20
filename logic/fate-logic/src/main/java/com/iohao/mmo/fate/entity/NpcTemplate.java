package com.iohao.mmo.fate.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NpcTemplate {
    @Id
    String id;

    String npcId;
    String npcName;
    String bookWorldId;
    String bookTitle;
    String personality;
    String role;
    String emotion;
    String portraitBase;
    Map<String, String> personas;
}
