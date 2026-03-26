package com.iohao.mmo.shop.entity;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class ShopItem {
    private String id;
    private String name;
    private String icon;
    private String description;
    private int price;
    private String currency;
    private String category;
    private String quality;
    private boolean isHot;
    private int stock;
    private List<String> contents;
    private Map<String, Integer> attributes;
    private Effect effect;
    private int duration;
    /** 装备槽位（1武器 2护甲 3饰品），非装备为 -1 */
    private int equipPosition = -1;

    @Data
    public static class Effect {
        private String type;
        private int value;
    }
}

