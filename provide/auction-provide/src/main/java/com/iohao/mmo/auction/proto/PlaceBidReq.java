package com.iohao.mmo.auction.proto;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PUBLIC)
public class PlaceBidReq {
    String auctionId;
    long   amount;
}
