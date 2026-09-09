package com.iohao.mmo.auction.proto;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PUBLIC)
public class AuctionItemProto {
    String auctionId;
    String itemId;
    String itemName;
    String itemQuality;
    long   sellerId;
    String sellerName;
    long   currentBid;
    long   buyNowPrice;    // 0 表示无一口价
    long   endTime;        // Unix 毫秒
    int    bidCount;
    long   myBid;          // 当前玩家的出价，0 表示未出价
    String description;
    /** ACTIVE / SOLD / CANCELLED / EXPIRED */
    String status;
}
