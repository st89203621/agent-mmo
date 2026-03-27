package com.iohao.mmo.trade.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TradeOrder {
    @Id
    String id;

    @Indexed
    long sellerId;
    String sellerName;
    String itemId;
    String itemName;
    int quantity;
    int price;
    /** gold / diamond */
    String currency;
    long buyerId;
    long createTime;
    long completeTime;
    /** OPEN / SOLD / CANCELLED */
    String status;
    /** 交易产生的缘值（双方各获得） */
    int fateReward;
}
