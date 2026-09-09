package com.iohao.mmo.guild.service;

/** Internal service boundary for social rewards; never exposed as a client action. */
public interface NativeGuildAccess {
    String guildId(long userId);
    void creditMountain(long userId, String guildId, String receipt, long honor);
}
