package com.iohao.mmo.auction.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document("auction_items")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuctionItem {
    @Id
    String id;

    @Indexed
    long   sellerId;
    String sellerName;

    String itemId;
    String itemName;
    String itemQuality;
    String description;

    long   startPrice;
    long   buyNowPrice;    // 0 = 无一口价
    long   currentBid;
    long   highBidderId;
    String highBidderName;
    int    bidCount;

    LocalDateTime endTime;
    LocalDateTime createTime;

    /** ACTIVE / SOLD / CANCELLED / EXPIRED */
    @Indexed
    String status;
}
