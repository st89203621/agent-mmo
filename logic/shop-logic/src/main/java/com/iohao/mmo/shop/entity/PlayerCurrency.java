package com.iohao.mmo.shop.entity;

import lombok.Data;

@Data
public class PlayerCurrency {
    private long userId;
    private int gold;
    private int diamond;

    public PlayerCurrency(long userId) {
        this.userId = userId;
        this.gold = 99999;
        this.diamond = 9999;
    }

    public boolean hasEnough(String currency, int amount) {
        if ("gold".equals(currency)) {
            return gold >= amount;
        } else if ("diamond".equals(currency)) {
            return diamond >= amount;
        }
        return false;
    }

    public void deduct(String currency, int amount) {
        if ("gold".equals(currency)) {
            gold -= amount;
        } else if ("diamond".equals(currency)) {
            diamond -= amount;
        }
    }
}

