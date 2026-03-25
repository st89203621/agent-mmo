# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

# 前端开发（game-client 目录下）
cd game-client && npm run dev    # Vite dev server, port 3000
cd game-client && npm run build  # 生产构建到 dist/
```

## 架构

```
前端 (React+Phaser, :3000) → External (:9200 WS / :9300 TCP) → Broker (:10200) → 30+ LogicServer → MongoDB (:27017)
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
**前端**: React 18, TypeScript, Vite 6, Zustand (状态管理), Phaser 3 (游戏引擎), React Router 6

## 前端代理配置 (vite.config.ts)

- `/api` → `http://localhost:8090` (REST API)
- `/ws` → `ws://localhost:9200` (WebSocket 游戏服务)

## 开发注意事项

- 前端路径别名：`@/*` 映射到 `src/*`
- 后端使用 Bolt 协议进行服务间通信，不是 HTTP
- AI 能力通过 Volcengine API 集成（图片生成、对话）
- 数据库为 MongoDB (`mmo_game`)，Session 也存储在 MongoDB
