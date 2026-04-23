package com.iohao.mmo.auction.proto;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@FieldDefaults(level = AccessLevel.PUBLIC)
public class AuctionListRes {
    List<AuctionItemProto> items;
    int total;
}
