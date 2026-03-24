package com.iohao.mmo.bookworld.explore;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@Document("explore_event")
public class ExploreEvent {
    @Id
    private String eventId;
    @Indexed
    private long userId;
    private String type;
    private String title;
    private String description;
    private List<Choice> choices;
    private String npcId;
    private String sceneHint;
    /** 遭遇战关联的战斗ID */
    private String battleId;
    /** 遭遇战敌人名称 */
    private String enemyName;
    /** 所属世界序号 */
    private int worldIndex;
    /** 书名 */
    private String bookTitle;
    private boolean resolved;
    private Instant createTime = Instant.now();

    @Data
    public static class Choice {
        private int id;
        private String text;
        private String risk;
    }
}
