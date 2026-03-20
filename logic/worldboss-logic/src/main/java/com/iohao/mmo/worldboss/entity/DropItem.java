package com.iohao.mmo.worldboss.entity;

import lombok.Data;

@Data
public class DropItem {
    private int itemId;
    private String itemName;
    private int quantity;
    private double dropRate;
}

