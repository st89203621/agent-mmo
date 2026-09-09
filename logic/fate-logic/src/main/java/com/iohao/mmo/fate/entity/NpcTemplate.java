package com.iohao.mmo.fate.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NpcTemplate {
    @Id
    String id;

    @Indexed(unique = true)
    String npcId;
    String npcName;
    String bookWorldId;
    String bookTitle;
    String personality;
    String role;
    String emotion;
    String portraitBase;
    Map<String, String> personas;

    /** 性别：男/女 */
    String gender;
    /** 年龄描述：如 "18岁少女"、"中年" */
    String age;
    /** 外貌特征描述 */
    String features;
}
