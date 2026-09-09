package com.iohao.mmo.shop.entity;

import lombok.Data;

@Data
public class PurchaseHistory {
    private String itemId;
    private String itemName;
    private int quantity;
    private int price;
    private String currency;
    private long timestamp;
    private long userId;
}

