package com.iohao.mmo.common.ai.impl;

import com.volcengine.ark.runtime.service.ArkService;
import okhttp3.ConnectionPool;
import okhttp3.Dispatcher;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * 按 apiKey 缓存 ArkService，避免重复构建底层线程池。
 */
public final class VolcengineArkHolder {

    private static final ConcurrentHashMap<String, ArkService> CACHE = new ConcurrentHashMap<>();

    private VolcengineArkHolder() {
    }

    public static ArkService get(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("volcengine api key 未配置");
        }
        return CACHE.computeIfAbsent(apiKey, k -> ArkService.builder()
                .dispatcher(new Dispatcher())
                .connectionPool(new ConnectionPool(5, 1, TimeUnit.SECONDS))
                .apiKey(k)
                .build());
    }
}
