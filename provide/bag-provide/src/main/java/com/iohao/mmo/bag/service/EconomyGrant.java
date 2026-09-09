package com.iohao.mmo.bag.service;

import java.util.Collections;
import java.util.Map;

/** Trusted server-side reward description. Do not expose this as a client action. */
public record EconomyGrant(String sourceId, int gold, int experience, Map<String, Integer> items) {
    public EconomyGrant {
        if (sourceId == null || sourceId.isBlank() || sourceId.length() > 160) throw new IllegalArgumentException("sourceId无效");
        if (gold < 0 || gold > 100000000 || experience < 0) throw new IllegalArgumentException("奖励金额无效");
        if (experience != 0) throw new IllegalArgumentException("经验请由等级模块发放");
        items = items == null ? Collections.emptyMap() : Map.copyOf(items);
        items.forEach((id, count) -> {
            if (id == null || !id.matches("[a-zA-Z0-9_-]{1,64}") || count == null || count <= 0 || count > 100000)
                throw new IllegalArgumentException("奖励物品无效");
        });
    }
}
