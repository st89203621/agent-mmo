package com.iohao.mmo.auction.proto;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PUBLIC)
public class AuctionListReq {
    /** active / ended / mybids / mysales */
    String tab;
    int    page;
}
