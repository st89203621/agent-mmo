# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目概述

分布式 MMO 游戏服务器，基于 ioGame 框架，采用 logic + provide 模块配对架构。

## 构建与运行

```bash
# 后端编译（Java 21 + Maven）
mvn compile -T 4 -DskipTests

# 打包一体化应用
mvn package -pl one-application --also-make -DskipTests

# 启动后端（Spring Boot + ioGame 全部服务）
# 入口: one-application/src/main/java/com/iohao/mmo/OneApplication.java
```

客户端在 `unity-client/`（Unity/团结引擎 C# 工程），不在 Maven 构建中。Android 构建脚本：`unity-client/Build-Android.ps1`，详见 `unity-client/README.md`。

## 架构

```
Unity 客户端 (C#, unity-client) → External (:9200 WS / :9300 TCP) → Broker (:10200) → 30+ LogicServer → MongoDB (:27017)
```

- **Spring Boot** (:8090): REST API + 静态资源服务
- **External**: 游戏对外服，处理 WebSocket/TCP 连接
- **Broker**: 游戏网关，消息路由分发
- **LogicServer**: 各业务逻辑服（登录、人物、背包、装备、宠物等）

## 模块约定

每个业务模块成对出现：
- `logic/{业务名}-logic/` — 业务逻辑实现（Action、Entity、Repository）
- `provide/{业务名}-provide/` — 数据契约定义（Cmd 路由常量、Proto 消息协议）

关键共享模块：
- `common/common-core/` — 通用工具和基础类
- `one-application/` — 一体化启动入口，聚合所有服务

## 技术栈

**后端**: Java 21, Spring Boot 3.2.3, ioGame 21.25, MongoDB, Redis (Redisson), MapStruct, Lombok, FastJSON2
**客户端**: Unity/团结引擎 C#（`unity-client/`，内置渲染管线 + UGUI），通过 ioGame Unity SDK 以 WebSocket 连接 External

## 客户端连接配置

Unity 客户端连接地址在运行时通过区服设置页配置（保存在手机上），默认 `ws://192.168.74.47:9200`。Spring Boot REST API 在 `:8090`。

## 开发注意事项

- 后端使用 Bolt 协议进行服务间通信，不是 HTTP
- AI 能力通过 Volcengine API 集成（图片生成、对话）
- 数据库为 MongoDB (`mmo_game`)，Session 也存储在 MongoDB
