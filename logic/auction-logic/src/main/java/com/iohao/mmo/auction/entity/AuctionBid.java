package com.iohao.mmo.auction.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document("auction_bids")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuctionBid {
    @Id
    String id;

    @Indexed
    String auctionId;

    @Indexed
    long   bidderId;
    String bidderName;
    long   amount;
    LocalDateTime bidTime;
}
