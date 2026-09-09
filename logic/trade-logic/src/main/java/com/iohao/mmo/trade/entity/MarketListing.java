package com.iohao.mmo.trade.entity;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("market_listings")
@FieldDefaults(level = AccessLevel.PRIVATE)
@CompoundIndexes({
    @CompoundIndex(name = "idx_status_category", def = "{'status': 1, 'itemCategory': 1}"),
    @CompoundIndex(name = "idx_seller_status", def = "{'sellerId': 1, 'status': 1}")
})
public class MarketListing {

    @Id
    String id;

    @Indexed
    long sellerId;
    String sellerName;
    String itemId;
    String itemName;
    /** weapon/armor/accessory/pet/material/misc */
    String itemCategory;
    /** white/green/blue/purple/orange */
    String itemQuality;
    long unitPrice;
    int quantity;
    int sold;
    long createdAt;

    @Indexed
    ListingStatus status;

    public enum ListingStatus {
        ACTIVE, SOLD_OUT, CANCELLED
    }
}
