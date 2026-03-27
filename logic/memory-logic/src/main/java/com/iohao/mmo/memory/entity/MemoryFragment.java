package com.iohao.mmo.memory.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MemoryFragment {
    @Id
    String id;

    long playerId;
    String npcId;
    String npcName;
    int worldIndex;
    String title;
    String excerpt;
    int fateScore;
    String imageUrl;
    long createTime;
    boolean locked;
    String unlockCondition;
    String bookTitle;
    String era;
    String emotionTone;
    boolean affectsNextWorld;

    /** 是否已被缘值激活（激活后给予属性加成） */
    boolean activated;
    /** 激活所需缘值 */
    int activateFateCost;
    /** 激活后的属性加成类型：ATK/DEF/HP/SPEED */
    String bonusType;
    /** 激活后的属性加成数值 */
    int bonusValue;

    /** 根据缘分值计算激活成本和加成 */
    public void calculateActivation() {
        this.activateFateCost = Math.max(10, fateScore / 2);
        if (fateScore >= 80) {
            this.bonusType = "ATK";
            this.bonusValue = 15;
        } else if (fateScore >= 60) {
            this.bonusType = "DEF";
            this.bonusValue = 10;
        } else if (fateScore >= 40) {
            this.bonusType = "HP";
            this.bonusValue = 50;
        } else {
            this.bonusType = "SPEED";
            this.bonusValue = 5;
        }
    }
}
