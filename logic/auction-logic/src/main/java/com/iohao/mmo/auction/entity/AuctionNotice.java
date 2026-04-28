package com.iohao.mmo.auction.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("auction_notices")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuctionNotice {
    @Id String id;

    @Indexed
    long playerId;

    /** BID_OUTBID / SOLD_AS_SELLER / WON_AS_BUYER / EXPIRED */
    String type;

    String auctionId;
    String itemName;
    long amount;
    Instant createdAt;
    boolean read;
}
