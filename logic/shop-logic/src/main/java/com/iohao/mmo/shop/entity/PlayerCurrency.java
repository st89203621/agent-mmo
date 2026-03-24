package com.iohao.mmo.shop.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("player_currency")
public class PlayerCurrency {
    @Id
    private String id;
    @Indexed(unique = true)
    private long userId;
    private int gold;
    private int diamond;

    public PlayerCurrency() {}

    public PlayerCurrency(long userId) {
        this.userId = userId;
        this.gold = 10000;
        this.diamond = 500;
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

    public void addGold(int amount) {
        this.gold += amount;
    }

    public void addDiamond(int amount) {
        this.diamond += amount;
    }
}

