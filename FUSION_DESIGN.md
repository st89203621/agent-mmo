# 七世轮回 × 气盖山河 融合设计文档

> **版本**: v1.0 · 2026-04-23  
> **目标**: 将 lunhui/scenes83 所代表的传统 MMO 玩法体系，深度融合进"七世轮回书"现有架构，形成一款兼具经典 MMO 深度与 AI 叙事差异化的产品。

---

## 一、融合总纲

### 核心思路

| 维度 | lunhui（参考原型） | 现有项目（主体） | 融合结果 |
|---|---|---|---|
| **世界观** | 单一服务器（气盖山河区） | 多书境并行（七世轮回书） | 每个书境内部都有 lunhui 式地理结构 |
| **地图** | 命名区域 + 坐标方向导航 | 自由坐标移动（Phaser） | ScenePage 升级为「区域枢纽」，保留 Phaser 背景 |
| **游戏循环** | 区域移动 → 活动 → 经济流通 | AI故事 → 书境探索 → 缘分成长 | 两个循环互相喂养：经济循环驱动留存，AI叙事驱动付费 |
| **差异化** | 无 | AI对话/立绘/轮回 | 保留并强化；AI 包装 lunhui 的每个经典功能 |

### 世界结构映射

```
七世轮回书（主界面 Home）
│
├── [书境选择] BookWorldPage → 选择进入哪个书境
│
└── [书境内] ScenePage（游戏主枢纽）← 核心改造点
    ├── 当前位置：{书境主城} (2,2) [刷新][聊天][任务][传送]
    │
    ├── 活动区
    │   ├── 天降神宠 / 充值礼包 / 节日活动   ← ActivityPage 入口
    │   └── 全民冲级 / 全民神宠 / 全民附魔   ← 服务器事件
    │
    ├── 功能区（固定菜单）
    │   ├── 拍卖 | 商城 | 神匠 | 家产
    │   └── 集市 | 小摊 | 砸蛋 | 宝宝
    │
    ├── 地图导航（方向移动）
    │   ├── ← 西: 婚介代练区 (1,2)
    │   └── ↓ 南: 猎场宝山 (2,1)
    │
    └── 角色面板
        └── 状态 | 道具 | 四周 | 消息 | 宝宝 | 功能
```

NPC「梦中人」（传送枢纽）在每个书境有不同的 AI 故事身份，但功能域恒定：
- **功能区**: 充值礼包 · 在线领奖 · 探险 · 活动
- **经济区**: 商城 · 集市 · 小摊 · 代练 · 拍卖
- **战斗区**: 追杀 · 武斗 · 狩猎
- **社交区**: 婚介 · 游乐 · 钓鱼

---

## 二、工作流分解（8 条并行流）

以下 8 条流可由独立 Agent 并行执行，无强依赖关系。依赖关系在各流内部说明。

---

## 流 A — 前端：ScenePage 升级为游戏主枢纽

**目标**: 将当前简陋的场景列表页，改造为 lunhui 风格的区域枢纽，成为玩家日常停留的核心界面。

### A1. 重写 `game-client/src/components/pages/ScenePage.tsx`

**当前状态**: 仅是一个场景卡片列表，点击"进入"。  
**目标状态**: 全功能区域枢纽，包含：

```
┌─────────────────────────────────────────┐
│  {书境名} · {区域名} ({x},{y})  [传送]  │  ← 顶部状态栏
│  [刷新] [聊天] [玩友] [任务]            │
├─────────────────────────────────────────┤
│  [区域背景图 - Phaser 或 AI 生成]       │  ← 视觉区
│  活动公告: ★天降神宠★  ★充值礼包★    │
├─────────────────────────────────────────┤
│  功能菜单（2行×4列）                    │  ← 快捷功能
│  拍卖 │ 商城 │ 神匠 │ 家产             │
│  集市 │ 小摊 │ 砸蛋 │ 宝宝             │
├─────────────────────────────────────────┤
│  地图导航                               │  ← 方向导航
│  ← 婚介代练 (1,2)   猎场宝山 (2,1) ↓  │
├─────────────────────────────────────────┤
│  状态 │ 道具 │ 四周 │ 消息 │ 宝宝 │功能│  ← 角色面板
└─────────────────────────────────────────┘
```

**新增 PageId**: 在 `types/index.ts` 的 PageId 中已有 `scene`，无需新增。  
**新增跳转目标**:
- `auction`（新增 PageId）
- `market`（新增 PageId，对应集市，区别于 shop）
- `forge`（新增 PageId，对应神匠）
- `housing`（新增 PageId，对应家产）

### A2. 区域数据结构（前端类型扩展）

在 `game-client/src/types/index.ts` 新增：

```typescript
/** 书境内区域（对应 lunhui 地图节点） */
export interface ZoneInfo {
  zoneId: string;
  name: string;           // 如"极北大陆"
  coordinates: [number, number];  // [x, y]
  description: string;
  sceneHint: string;      // 区域氛围描述，用于 AI 生成背景图
  exits: ZoneExit[];      // 方向出口
  activities: ZoneActivity[];  // 区域内可用功能
  nearbyPlayers: NearbyPlayer[];
}

export interface ZoneExit {
  direction: '东' | '西' | '南' | '北';
  targetZoneId: string;
  label: string;          // 如"婚介代练(1,2)"
}

export interface ZoneActivity {
  type: 'combat' | 'social' | 'economy' | 'event' | 'feature';
  id: string;             // 对应 PageId 或功能 key
  label: string;
  isNew?: boolean;
  isHot?: boolean;
}

export interface NearbyPlayer {
  playerId: number;
  name: string;
  level: number;
  zoneId: string;
}
```

### A3. 新增 API 接口（`services/api.ts`）

```typescript
// 获取当前区域信息
export function fetchCurrentZone(): Promise<ZoneInfo>
// 移动到相邻区域
export function moveToZone(zoneId: string): Promise<ZoneInfo>
// 获取附近玩家（四周）
export function fetchNearbyPlayers(): Promise<NearbyPlayer[]>
```

### A4. 传送面板组件（新建）

新建 `game-client/src/components/scene/TeleportPanel.tsx`，对应 `02_teleport_menu.html` 的梦中人传送菜单：

```typescript
// 分4个区域展示传送目标
// 功能区、经济区、战斗区、社交区
// 每个目标点击直接导航到对应 PageId
```

### A5. 附近玩家组件（新建）

新建 `game-client/src/components/scene/NearbyPlayersPanel.tsx`，对应 lunhui 的「四周」功能：
- 显示同区域在线玩家列表
- 支持点击查看资料、挑战、交易、加好友

---

## 流 B — 前端：拍卖行页面（全新）

**目标**: 新建拍卖行页面，这是 lunhui 经济体系中最重要的缺失模块。

### B1. 新增 PageId

在 `types/index.ts` 的 `PageId` union 中添加 `'auction'`。

### B2. 新建 `game-client/src/components/pages/AuctionPage.tsx`

**功能规格**（参考 `main_拍卖.html`，它有 387 chars/33 links，是功能最丰富的页面之一）：

```
Tab: [出售中] [已结束] [我的竞拍] [我的出售]

出售中列表:
┌────────────────────────────────┐
│ [物品图标] 神器·绝世长剑        │
│ 品质: 橙色  剩余: 2小时33分    │
│ 当前价: 50,000 金币            │
│ 一口价: 200,000 金币   [竞拍]  │
└────────────────────────────────┘

[上架物品] 按钮 → 弹出上架面板
  - 选择背包中物品
  - 设置起拍价 / 一口价
  - 设置拍卖时长（1h / 6h / 24h）
```

### B3. 新增 API（`services/api.ts`）

```typescript
export function fetchAuctionList(tab: 'active'|'ended'|'mybids'|'mysales'): Promise<AuctionListRes>
export function placeBid(auctionId: string, amount: number): Promise<void>
export function buyNow(auctionId: string): Promise<void>
export function listItem(params: ListItemParams): Promise<void>
export function cancelListing(auctionId: string): Promise<void>
```

### B4. 新增前端类型

```typescript
export interface AuctionItem {
  auctionId: string;
  itemId: string;
  itemName: string;
  itemQuality: 'white'|'green'|'blue'|'purple'|'orange';
  sellerId: number;
  sellerName: string;
  currentBid: number;
  buyNowPrice: number | null;
  endTime: number;      // Unix timestamp
  bidCount: number;
  myBid?: number;
}
```

---

## 流 C — 前端：集市/交易市场升级

**目标**: 将当前 TradePage 升级为「集市」（玩家挂单交易）。

### C1. 重写 `game-client/src/components/pages/TradePage.tsx`

参考 `main_集市.html`（195 chars/35 links）和 `main_小摊.html`（141 chars/18 links）：

**集市（挂单市场）**:
- 分类浏览：武器 / 防具 / 饰品 / 宠物 / 材料 / 道具
- 搜索物品名称
- 挂单（从背包选择物品，设置价格，立即上架）
- 下架我的挂单

**小摊（摆摊）**:
- 玩家开摊：设置摊位名称，列出2-8件物品
- 浏览附近摊位（同区域）

### C2. 新增 API（`services/api.ts`）

```typescript
export function fetchMarketItems(category: string, keyword?: string): Promise<MarketListRes>
export function sellOnMarket(itemId: string, price: number, quantity: number): Promise<void>
export function buyFromMarket(listingId: string): Promise<void>
export function fetchMyListings(): Promise<MarketListRes>
export function cancelMarketListing(listingId: string): Promise<void>
```

---

## 流 D — 前端：社交系统完善

**目标**: 完善婚介、好友、公会三个社交入口，参考 lunhui 的社交区设计。

### D1. 升级 `FateMapPage` → 加入婚介功能

`fate-map` 页现有缘分地图功能，新增「婚介」tab：
- 显示当前婚姻状态（未婚/已婚）
- 婚介推荐列表（AI 推荐缘分高的玩家）
- 结婚/离婚 功能
- 夫妻专属 buff 展示

### D2. 新建留言板组件

新建 `game-client/src/components/pages/MessageBoardPage.tsx`（新 PageId: `message-board`）：
- 参考 `teleport_留言.html`（145 chars/14 links）
- 全服留言板：玩家发布短消息（140字内）
- 区域留言板：仅本区域玩家可见

在 `types/index.ts` 的 `PageId` 中添加 `'message-board'`。

### D3. 升级 `GuildPage` 加入「组队大厅」入口

参考 `main_组队大厅.html`：
- 公告当前队伍招募信息
- 一键加入队伍
- 交友资料展示（对应 fate 系统的关系卡）

### D4. 新增 API（`services/api.ts`）

```typescript
export function fetchMatchmaking(): Promise<MatchmakingRes>
export function proposeMarriage(targetPlayerId: number): Promise<void>
export function acceptMarriage(proposalId: string): Promise<void>
export function divorce(): Promise<void>
export function fetchMessageBoard(zoneId?: string): Promise<BoardMessage[]>
export function postMessage(content: string, zoneId?: string): Promise<void>
```

---

## 流 E — 后端：拍卖行模块（全新模块）

**目标**: 创建 `auction-provide` + `auction-logic` 两个新 Maven 模块。

### E1. 新建 `provide/auction-provide/`

目录结构：
```
provide/auction-provide/
└── src/main/java/com/iohao/mmo/auction/
    ├── cmd/
    │   └── AuctionCmd.java      # cmd=90（在现有 cmd 编号后续）
    └── proto/
        ├── AuctionItemProto.java
        ├── AuctionListReq.java
        ├── AuctionListRes.java
        ├── PlaceBidReq.java
        ├── ListItemReq.java
        └── AuctionNotifyProto.java  # 被竞拍/成交推送
```

**AuctionCmd.java**:
```java
public interface AuctionCmd {
    int cmd = 90;
    int listAuctions = 1;     // 获取拍卖列表
    int placeBid = 2;         // 出价
    int buyNow = 3;           // 一口价购买
    int listItem = 4;         // 上架物品
    int cancelListing = 5;    // 取消上架
    int myBids = 6;           // 我的出价
    int mySales = 7;          // 我的出售
    int auctionEnd = 8;       // 拍卖结束通知（服务端推送）
}
```

### E2. 新建 `logic/auction-logic/`

目录结构：
```
logic/auction-logic/
└── src/main/java/com/iohao/mmo/auction/
    ├── AuctionLogicServer.java
    ├── action/
    │   └── AuctionAction.java
    ├── entity/
    │   ├── AuctionItem.java      # MongoDB Document
    │   └── AuctionBid.java
    ├── repository/
    │   └── AuctionRepository.java
    └── service/
        └── AuctionService.java   # 含定时结算逻辑
```

**AuctionItem.java** 关键字段：
```java
@Document("auction_items")
public class AuctionItem {
    String id;
    long sellerId;
    String sellerName;
    String itemId;
    String itemName;
    String itemQuality;
    long startPrice;
    Long buyNowPrice;       // null 表示无一口价
    long currentBid;
    long highBidderId;
    int bidCount;
    LocalDateTime endTime;
    AuctionStatus status;   // ACTIVE / SOLD / CANCELLED / EXPIRED
}
```

**定时结算**: 使用 Spring `@Scheduled` 每分钟扫描到期拍卖，结算成交，通过 `BroadcastContext` 推送成交通知。

### E3. 注册到 `one-application`

在 `one-application` 的 `OneApplication.java` 中注册 `AuctionLogicServer`，并在 `pom.xml` 中添加依赖。

### E4. 新建 Spring Boot REST Controller

在 `one-application` 的 REST 层新建 `AuctionController.java`，暴露以下接口（前端通过 `/api/auction/*` 调用）：

```java
GET  /api/auction/list?tab=active&page=0
POST /api/auction/bid        { auctionId, amount }
POST /api/auction/buy-now    { auctionId }
POST /api/auction/list-item  { itemId, startPrice, buyNowPrice, durationHours }
POST /api/auction/cancel     { auctionId }
GET  /api/auction/my-bids
GET  /api/auction/my-sales
```

---

## 流 F — 后端：区域/地图系统升级

**目标**: 将 `map-logic` 从自由坐标移动升级为支持「命名区域 + 方向导航 + 附近玩家」的区域系统。

### F1. 扩展 `provide/map-provide/`

新增 Proto 类：
```
ZoneInfoProto.java       # 区域信息
ZoneExitProto.java       # 出口定义
MoveZoneReq.java         # 移动到相邻区域请求
NearbyPlayerProto.java   # 附近玩家
NearbyPlayersRes.java    # 附近玩家列表响应
```

在 `MapCmd.java` 新增：
```java
int getZoneInfo = 3;       // 获取当前区域信息
int moveToZone = 4;        // 移动到相邻区域
int getNearbyPlayers = 5;  // 获取附近玩家
```

### F2. 新建区域配置数据（JSON）

在 `logic/map-logic/src/main/resources/` 新建 `zones.json`，定义书境通用地理结构：

```json
{
  "zones": [
    {
      "zoneId": "main_city",
      "nameTemplate": "{bookWorld}主城",
      "coordinates": [2, 2],
      "type": "trade_hub",
      "description": "交易买卖中心，安全区域",
      "exits": [
        { "direction": "西", "target": "social_district", "labelTemplate": "婚介代练(1,2)" },
        { "direction": "南", "target": "hunting_ground",  "labelTemplate": "猎场宝山(2,1)" }
      ],
      "activities": ["auction","shop","market","forge","pet_shop","enchant"]
    },
    {
      "zoneId": "social_district",
      "nameTemplate": "隔世小镇",
      "coordinates": [1, 2],
      "type": "social_hub",
      "exits": [
        { "direction": "东",  "target": "main_city",     "labelTemplate": "主城(2,2)" },
        { "direction": "北",  "target": "north_gate",    "labelTemplate": "小镇北门(1,3)" },
        { "direction": "南",  "target": "plaza",         "labelTemplate": "小镇广场(1,1)" }
      ],
      "activities": ["matchmaking","fishing","entertainment","message_board"]
    },
    {
      "zoneId": "hunting_ground",
      "nameTemplate": "猎场宝山",
      "coordinates": [2, 1],
      "type": "combat",
      "exits": [
        { "direction": "北", "target": "main_city",     "labelTemplate": "主城(2,2)" },
        { "direction": "东", "target": "pvp_arena",     "labelTemplate": "杀戮阶梯(3,1)" }
      ],
      "activities": ["hunting","pvp_chase","arena","treasure_mountain"]
    },
    {
      "zoneId": "pvp_arena",
      "nameTemplate": "杀戮阶梯",
      "coordinates": [3, 1],
      "type": "pvp",
      "exits": [
        { "direction": "西", "target": "hunting_ground", "labelTemplate": "猎场宝山(2,1)" }
      ],
      "activities": ["pvp_chase","arena","world_boss","team_battle"]
    }
  ]
}
```

### F3. 升级 `MapAction.java`

新增三个 Action 方法：

```java
@ActionMethod(MapCmd.getZoneInfo)
public ZoneInfoProto getZoneInfo(FlowContext flowContext)

@ActionMethod(MapCmd.moveToZone)  
public ZoneInfoProto moveToZone(MoveZoneReq req, MyFlowContext flowContext)

@ActionMethod(MapCmd.getNearbyPlayers)
public NearbyPlayersRes getNearbyPlayers(FlowContext flowContext)
```

`moveToZone` 需验证目标区域是当前区域的合法出口之一；移动成功后广播给当前区域玩家（xx 离开）和目标区域玩家（xx 进入）。

### F4. 新建 Spring Boot REST 接口

```java
GET  /api/zone/current          # 获取当前区域
POST /api/zone/move             { zoneId }
GET  /api/zone/nearby-players   # 四周玩家
```

---

## 流 G — 后端：经济系统完善（集市/小摊/代练）

**目标**: 升级 `trade-logic` 为支持玩家挂单的「集市」。

### G1. 扩展 `provide/trade-provide/`

新增 Proto 和 Cmd：
```java
// TradeCmd.java 新增
int listOnMarket = 5;      // 挂单到集市
int buyFromMarket = 6;     // 从集市购买
int myListings = 7;        // 我的挂单
int cancelListing = 8;     // 取消挂单
int searchMarket = 9;      // 搜索集市
```

### G2. 升级 `logic/trade-logic/`

新增 `MarketListing` MongoDB Document：
```java
@Document("market_listings")
public class MarketListing {
    String id;
    long sellerId;
    String sellerName;
    String itemId;
    String itemName;
    String itemCategory;    // weapon/armor/accessory/pet/material/misc
    long unitPrice;
    int quantity;
    int sold;
    LocalDateTime createdAt;
    ListingStatus status;   // ACTIVE / SOLD_OUT / CANCELLED
}
```

### G3. 新建 REST 接口

```java
GET  /api/market/list?category=weapon&keyword=&page=0
POST /api/market/sell       { itemId, price, quantity }
POST /api/market/buy        { listingId, quantity }
GET  /api/market/my-listings
POST /api/market/cancel     { listingId }
```

### G4. 升级在线领奖（event-logic）

在 `event-logic` 中扩展每日签到为完整「在线领奖」：
- 每日登录奖励（当前签到的扩展）
- 累计在线时长奖励（每30分钟累计）
- 周签满奖励
- 连续签到成就奖励

新增 REST 接口：
```java
GET  /api/event/checkin-status   # 已有，扩展返回字段
POST /api/event/checkin          # 已有
GET  /api/event/online-rewards   # 新增：在线时长奖励状态
POST /api/event/claim-online     # 新增：领取在线时长奖励
```

---

## 流 H — 前端：活动中心 + 传送体系整合

**目标**: 重新设计 ActivityPage，整合 lunhui 的「传送菜单」（梦中人）导航体系，并完善活动相关页面。

### H1. 重写 `game-client/src/components/pages/ActivityPage.tsx`

参考 `teleport_活动.html`（109 chars/10 links）和 `teleport_在线领奖.html`（224 chars/12 links）：

**活动中心分 Tab**:
- 🎯 **当前活动**: 服务器正在进行的限时活动（节日/全民活动）
- 🎁 **在线领奖**: 每日签到 + 在线时长奖励
- 💎 **充值礼包**: 充值返奖活动列表
- 🏆 **排行榜**: 消费榜 / 战力榜 / 缘分榜

### H2. 升级 `WheelPage`（砸蛋/天降神宠）

参考 `main_【天降神宠】.html` 和 `main_砸蛋.html`（同一个页面，359 chars/17 links）：
- 砸蛋抽奖动画（Phaser 粒子效果）
- 消耗宝石/神宠券
- 10连抽保底机制
- 历史记录展示

### H3. 新增「传送菜单」全局组件

新建 `game-client/src/components/scene/TeleportMenu.tsx`：
- 梦中人 NPC 会话气泡（AI 故事包装）
- 4 个功能域卡片（功能/经济/战斗/社交）
- 可从任意页面通过 `navigateTo('scene')` + 传送参数触发

### H4. 升级 `MysticTomePage`（天命之途）

参考 `main_天命之途.html`（192 chars/16 links）：
- 与 `rebirth-logic` 绑定：天命之途 = 转生进度的可视化路径
- 每个路径节点对应一个书境里程碑
- 完成节点解锁专属称号/技能

### H5. 新增 API（`services/api.ts`）

```typescript
// 活动相关
export function fetchCurrentEvents(): Promise<GameEvent[]>
export function fetchOnlineRewards(): Promise<OnlineRewardStatus>
export function claimOnlineReward(rewardId: string): Promise<void>
export function fetchRankings(type: 'consume'|'combat'|'fate'): Promise<RankingRes>

// 砸蛋相关
export function rollGacha(gachaId: string, count: 1|10): Promise<GachaResult[]>
export function fetchGachaHistory(gachaId: string): Promise<GachaResult[]>

// 天命之途
export function fetchDestinyPath(): Promise<DestinyPathRes>
export function claimDestinyNode(nodeId: string): Promise<void>
```

---

## 三、数据库变更清单

| 新增集合 | 所属模块 | 用途 |
|---|---|---|
| `auction_items` | auction-logic | 拍卖行物品 |
| `auction_bids` | auction-logic | 竞拍记录 |
| `market_listings` | trade-logic | 集市挂单 |
| `zone_players` | map-logic | 玩家当前区域（可用 Redis 替代） |
| `message_board` | 新增 message-logic 或 chat-logic 扩展 | 留言板 |
| `marriage_records` | fate-logic 扩展 | 婚姻状态 |
| `online_reward_progress` | event-logic 扩展 | 在线时长奖励进度 |
| `destiny_path_progress` | rebirth-logic 扩展 | 天命之途进度 |

---

## 四、新增 PageId 清单

在 `game-client/src/types/index.ts` 的 `PageId` union 中追加：

```typescript
| 'auction'       // 拍卖行
| 'market'        // 集市（玩家挂单）
| 'forge'         // 神匠（武器打造）
| 'housing'       // 家产/房屋
| 'message-board' // 留言板
| 'stall'         // 小摊
| 'destiny-path'  // 天命之途（升级 mystic-tome 或新增）
| 'teleport'      // 传送菜单（可作为覆盖层，不一定需要独立 PageId）
```

---

## 五、各流优先级与依赖关系

```
优先级 P0（基础，其他流依赖）:
  流 F（后端区域系统）→ 其他所有流的"地图入口"依赖它
  流 A（前端 ScenePage）→ 游戏体验的核心枢纽

优先级 P1（核心留存）:
  流 E（后端拍卖行）+ 流 B（前端拍卖行）← 必须同时完成
  流 G（后端集市）   + 流 C（前端集市）  ← 必须同时完成

优先级 P2（社交病毒）:
  流 D（前端社交完善）← 依赖 fate-logic 已有 API
  流 H（活动中心）   ← 独立，可并行

流之间的数据依赖:
  流 B/C 的"上架物品"功能依赖背包（bag-logic）的物品列表 API 已存在
  流 D 的婚介依赖 fate-logic 的 fateScore 数据已存在
  流 E 的拍卖结算需要调用 bag-logic 和 level-logic（经验/金币）
```

---

## 六、不改动的部分（保持差异化优势）

以下功能是现有项目超越 lunhui 的核心，**不动**：

1. **AI 对话系统** (`story-logic`) — 保持现有设计，仅增加书境区域 NPC 的身份多样性
2. **AI 立绘生成** (`HomePage` 的立绘系统) — 保持现有设计
3. **轮回转生系统** (`rebirth-logic`) — 保持现有设计，天命之途作为可视化层叠加
4. **共探书境** (`coexplore-logic`) — 保持现有设计
5. **记忆馆** (`memory-logic`) — 保持现有设计
6. **缘分系统** (`fate-logic`) — 保持现有设计，婚介是新增功能层

---

## 七、各 Agent 执行指引

### Agent 执行流 A（前端 ScenePage）
- 工作目录：`game-client/src/`
- 主要修改文件：
  - `components/pages/ScenePage.tsx`（完整重写）
  - `types/index.ts`（新增 Zone 相关类型 + PageId）
  - `services/api.ts`（新增 zone/nearby 相关 API 函数）
  - 新建 `components/scene/TeleportPanel.tsx`
  - 新建 `components/scene/NearbyPlayersPanel.tsx`
- 不需要修改后端

### Agent 执行流 B（前端拍卖行）
- 工作目录：`game-client/src/`
- 主要修改文件：
  - 新建 `components/pages/AuctionPage.tsx`
  - 新建 `components/pages/AuctionPage.module.css`
  - `types/index.ts`（新增 AuctionItem 等类型 + 'auction' PageId）
  - `services/api.ts`（新增 auction 相关 API 函数）
  - `App.tsx`（注册 AuctionPage 到页面路由）

### Agent 执行流 C（前端集市）
- 工作目录：`game-client/src/`
- 主要修改文件：
  - `components/pages/TradePage.tsx`（重写为集市）
  - `services/api.ts`（新增 market 相关 API 函数）
  - `types/index.ts`（新增 MarketListing 等类型 + 'market' PageId）

### Agent 执行流 D（前端社交）
- 工作目录：`game-client/src/`
- 主要修改文件：
  - `components/pages/FateMapPage.tsx`（新增婚介 Tab）
  - 新建 `components/pages/MessageBoardPage.tsx`
  - `types/index.ts`（新增 'message-board' PageId 及相关类型）
  - `services/api.ts`（新增 matchmaking/marriage/board API）
  - `App.tsx`（注册 MessageBoardPage）

### Agent 执行流 E（后端拍卖行）
- 工作目录：`C:\deye-6.4\agent-mmo\`
- 主要工作：
  1. 在 `provide/` 下创建 `auction-provide/` Maven 模块（含 pom.xml）
  2. 在 `logic/` 下创建 `auction-logic/` Maven 模块（含 pom.xml）
  3. 修改根 `pom.xml`，将两个新模块加入 `<modules>` 列表
  4. 修改 `one-application/pom.xml`，添加 `auction-logic` 依赖
  5. 修改 `one-application/.../OneApplication.java`，注册 AuctionLogicServer
  6. 在 `one-application` REST 层新建 `AuctionController.java`

### Agent 执行流 F（后端区域系统）
- 工作目录：`C:\deye-6.4\agent-mmo\`
- 主要工作：
  1. 修改 `provide/map-provide/` — 新增 Zone 相关 Proto 类和 Cmd 常量
  2. 修改 `logic/map-logic/` — 新增 Zone 逻辑，新建 zones.json 配置
  3. 在 `one-application` REST 层新建 `ZoneController.java`

### Agent 执行流 G（后端集市/事件）
- 工作目录：`C:\deye-6.4\agent-mmo\`
- 主要工作：
  1. 修改 `provide/trade-provide/` — 新增集市相关 Proto 和 Cmd
  2. 修改 `logic/trade-logic/` — 新增 MarketListing 实体和 Action
  3. 在 `one-application` REST 层新建/修改 `TradeController.java`、`EventController.java`（扩展在线领奖）

### Agent 执行流 H（前端活动/传送）
- 工作目录：`game-client/src/`
- 主要修改文件：
  - `components/pages/ActivityPage.tsx`（重写）
  - `components/pages/WheelPage.tsx`（升级砸蛋动画）
  - `components/pages/MysticTomePage.tsx`（天命之途升级）
  - 新建 `components/scene/TeleportMenu.tsx`
  - `services/api.ts`（新增活动/抽奖/天命API）
  - `types/index.ts`（新增相关类型）

---

## 八、关键约定

1. **新后端模块 cmd 编号分配**（避免冲突，现有模块 cmd 范围需先确认）：
   - `AuctionCmd.cmd = 90`
   - 区域扩展复用 `MapCmd.cmd`（新增方法号 3/4/5）

2. **书境适配规则**: ScenePage 显示的区域名称必须使用 `ZoneInfo.nameTemplate` + 当前 `currentBookWorld.title` 动态组合，确保不同书境有不同的区域名称。

3. **API 路径约定**: 所有新增 REST 接口前缀为 `/api/{模块名}/`，与现有接口保持一致风格。

4. **前端类型约定**: 新增的 `PageId` 必须先在 `types/index.ts` 中声明，再在 `App.tsx` 的页面注册中添加，否则 TypeScript 编译会报错。

5. **MongoDB 集合命名**: 使用 `snake_case`，与现有集合风格保持一致。

6. **不要修改现有 story/explore/coexplore/rebirth/memory/fate 相关逻辑**。

---

*文档结束 — 各 Agent 按所分配流独立执行，完成后合并。*
