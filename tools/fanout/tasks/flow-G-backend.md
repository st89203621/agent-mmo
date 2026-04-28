# 任务：流 G 后端集市补全（trade-logic）

你是这个 MMO 游戏后端的开发者。仓库根 `C:\deye-6.4\agent-mmo`。当前分支 `codex/gameclient`，**禁止任何 git 操作**（不要 add/commit/push/checkout/stash）。

## 项目背景（必读）

- 仓库根 `FUSION_DESIGN.md` 定义了 8 条工作流。你负责**流 G：trade-logic 集市补全**。
- 后端：Java 21 + Spring Boot 3.2.3 + ioGame 21.25 + MongoDB + Redis + MapStruct + Lombok + FastJSON2。
- 业务模块成对：`logic/{name}-logic/` + `provide/{name}-provide/`。
- REST API 全部统一在 `one-application/src/main/java/com/iohao/mmo/api/GameApiController.java`（约 4994 行，已有 `// ── 集市 ──` 等分组注释）—— **不要拆出新 Controller**，按现有风格在原文件追加。
- 前端 `services/api.ts` 已经写好了 5 个集市 API 调用（fetchMarketItems / sellOnMarket / buyFromMarket / fetchMyMarketListings / cancelMarketListing），后端 `/api/market/*` 也已经暴露在 GameApiController（行号约 4842-4934），但**实际逻辑还在 TradeService 里没接通**。

## 你的具体任务

### G1. 新建 MarketListing entity
**文件**：`logic/trade-logic/src/main/java/com/iohao/mmo/trade/entity/MarketListing.java`

```java
@Document("market_listings")
public class MarketListing {
    @Id String id;
    long sellerId;
    String sellerName;
    String itemId;
    String itemName;
    String itemCategory;        // weapon/armor/accessory/pet/material/misc
    String itemQuality;         // white/green/blue/purple/orange
    long unitPrice;
    int quantity;
    int sold;
    LocalDateTime createdAt;
    ListingStatus status;       // ACTIVE / SOLD_OUT / CANCELLED
}

public enum ListingStatus { ACTIVE, SOLD_OUT, CANCELLED }
```

加上 Lombok `@Data` 注解，必要的索引（sellerId、status、itemCategory）。

### G2. 新建 MarketListingRepository
**文件**：`logic/trade-logic/src/main/java/com/iohao/mmo/trade/repository/MarketListingRepository.java`

继承 `MongoRepository<MarketListing, String>`，加方法：
```java
List<MarketListing> findByStatusOrderByCreatedAtDesc(ListingStatus status, Pageable pageable);
List<MarketListing> findByItemCategoryAndStatus(String category, ListingStatus status, Pageable pageable);
List<MarketListing> findByItemNameContainingAndStatus(String keyword, ListingStatus status, Pageable pageable);
List<MarketListing> findBySellerIdAndStatus(long sellerId, ListingStatus status);
```

### G3. 扩展 TradeService
**文件**：`logic/trade-logic/src/main/java/com/iohao/mmo/trade/service/TradeService.java`

新增方法：
```java
List<MarketListing> listMarket(String category, String keyword, int page, int size);
String createListing(long sellerId, String itemId, int quantity, long unitPrice);   // 返回 listingId；要从背包扣物品
void buyFromMarket(long buyerId, String listingId, int quantity);                   // 扣金币、扣 sold、加买家背包；售罄改状态
List<MarketListing> myListings(long sellerId);
void cancelListing(long sellerId, String listingId);                                // 退还物品到背包
```

集成点：
- 物品扣减/返还需调用 `bag-logic`（`BagService` 或 `BagAction`），如果项目里实际用的是不同类名，按现有命名走
- 金币扣减：调用 `level-logic` 里管钱的服务（如 `PlayerCurrencyService`）
- 卖家收款：扣手续费 5%，剩余金币入卖家账户

如果 bag-logic 或 level-logic 的接口签名不对，**不要硬塞**——把缺口写到最后报告里，留 TODO 注释，但代码必须能编译。

### G4. 接通 GameApiController 的 /api/market/* 5 个端点
**文件**：`one-application/src/main/java/com/iohao/mmo/api/GameApiController.java`

5 个端点目前的实现可能是占位（返回空列表或 throw）。你需要：
1. 注入 `TradeService`（用 `@Resource` 或 `@Autowired`，按文件已有风格）
2. 在已有的 `/market/list`、`/market/sell`、`/market/buy`、`/market/my-listings`、`/market/cancel` 中调用 TradeService 对应方法
3. 错误处理：用 ResponseEntity 返回 4xx + 错误消息，不要抛裸异常

请求/响应 DTO：参考前端 `services/api.ts` 中 fetchMarketItems / sellOnMarket / buyFromMarket / fetchMyMarketListings / cancelMarketListing 的入参出参，**字段必须对得上**：
```
GET  /api/market/list?category=weapon&keyword=&page=0   -> { listings: MarketListingDto[], total: number }
POST /api/market/sell  body: { itemId, quantity, unitPrice }   -> { listingId }
POST /api/market/buy   body: { listingId, quantity }           -> { ok: true }
GET  /api/market/my-listings                                   -> { listings: MarketListingDto[] }
POST /api/market/cancel  body: { listingId }                   -> { ok: true }
```

### G5. （可选 / 时间富裕再做）在线领奖
如果上面都做完了还有时间：在 `event-logic` 中扩展在线时长奖励：
- 新建 `OnlineRewardProgress` entity（playerId、累计在线分钟、已领取阶梯）
- 在 GameApiController 增加 `GET /api/event/online-rewards`、`POST /api/event/claim-online`
- 阶梯固定 30min / 1h / 2h / 4h

**做不完不要紧，重点是 G1~G4。**

## 强制规则

1. **不要 commit / push / checkout / stash**。
2. **不要碰前端代码**（game-client/）。
3. **不要修改其他 logic/ 模块**（除了在 TradeService 里**调用**别的服务，但不要改别的服务的源码）。
4. **不要新建 Controller**（必须用 GameApiController）。
5. **不要硬编码 API key、URL、账号**。
6. 所有 Java 文件 UTF-8。
7. 用 Lombok 减少样板代码（`@Data`、`@Slf4j`、`@RequiredArgsConstructor`）。
8. 完成后调用 `mvn compile -pl logic/trade-logic,one-application -am -DskipTests` 验证（5-10 分钟），编译报错就修。

## 验收

输出报告（300 字内）：
1. 新建文件列表
2. 修改文件列表（带行号范围）
3. mvn compile 是否通过
4. 仍未解决的问题（如缺接口的 TODO）
