package com.iohao.mmo.auction.proto;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;

@Data
@FieldDefaults(level = AccessLevel.PUBLIC)
public class ListItemReq {
    String itemId;
    long   startPrice;
    long   buyNowPrice;   // 0 表示无一口价
    int    durationHours; // 1 / 6 / 24
}
