package com.iohao.mmo.bag.service;

/** Internal trusted economy boundary used by server gameplay modules. */
public interface ServerEconomyService {
    EconomyGrantResult grant(long userId, EconomyGrant grant);
    boolean spendGold(long userId, int amount, String sourceId);
}
