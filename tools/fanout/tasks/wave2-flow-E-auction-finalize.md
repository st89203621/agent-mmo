# 任务：拍卖行收尾（流 E 定时结算 + 成交通知）

仓库根 `C:\deye-6.4\agent-mmo`。当前分支 `codex/gameclient`。**禁止 git 写操作**。

## 背景

拍卖行（auction-logic）已经实现 95%，但有两个核心缺口：
1. **定时结算未确认**：AuctionService 写了结算逻辑但没接 `@Scheduled`，到期拍卖不会自动结算
2. **无成交推送**：买家成交后/卖家被超价后没有任何通知机制

## 你的具体任务

### E1. 定时结算
**文件**：`logic/auction-logic/src/main/java/com/iohao/mmo/auction/service/AuctionService.java`

确认/补充：
- 类上加 `@EnableScheduling`（如果 OneApplication 没有就让 OneApplication 启用）
- 加方法 `@Scheduled(fixedRate = 60_000) public void settleExpired()`，每分钟扫描到期的 ACTIVE 拍卖：
  - 有最高出价者：物品转给买家（用 `BagService.incrementItem` 风格调用，参考 trade-logic 的集市怎么调），金币转给卖家（扣 5% 手续费），状态改 SOLD
  - 无出价：物品退还卖家，状态改 EXPIRED
- 用 `@Slf4j` 记录每次扫描结果

如果 OneApplication 主类没启用 `@EnableScheduling`，去 `one-application/.../OneApplication.java` 加一行 `@EnableScheduling`（这个是必须的）。

### E2. 成交通知（轻量版）
**文件**：新建 `logic/auction-logic/src/main/java/com/iohao/mmo/auction/entity/AuctionNotice.java`

```java
@Document("auction_notices")
public class AuctionNotice {
    @Id String id;
    long playerId;
    String type;       // BID_OUTBID / SOLD_AS_SELLER / WON_AS_BUYER / EXPIRED
    String auctionId;
    String itemName;
    long amount;       // 成交金额或最终竞拍金额
    Instant createdAt;
    boolean read;
}
```

加 `AuctionNoticeRepository` 接口（路径必须在 `**.repository` 包下）。

在 settleExpired 里产生通知（成交时给买家+卖家各一条；流标时给卖家）。
在 placeBid 里：如果有人被超过，给前任最高出价者一条 BID_OUTBID 通知。

**新增 REST 端点**（在 `GameApiController.java` 的 `// ── 拍卖 ──` 区段末尾）：

```
GET  /api/auction/notices              -> { notices: [...] }
POST /api/auction/notices/read         body { ids: [...] } -> { ok: true }
```

每个端点不超过 30 行实现。

### E3. 推送（不做 WebSocket，简化为前端轮询）
不要做 WebSocket 推送。在前端拍卖页轮询 `/api/auction/notices` 即可（前端已经有轮询机制）。

## 强制规则

1. **禁止 git 写操作**。
2. 不要碰前端代码。
3. 不要碰其他 logic 模块（除 OneApplication 加 `@EnableScheduling`）。
4. 不要新建 Controller，全部塞 GameApiController（参照已有 `/auction/*` 部分）。
5. 完成后跑 `mvn compile -pl logic/auction-logic,one-application -am -DskipTests`，编译错就修。
6. JAVA_HOME 可能没设；如果跑不动 mvn，把命令报告里写出，由人工验证。

## 验收报告（300 字内）

1. 新建/修改文件清单
2. mvn compile 是否通过
3. settleExpired 频率与边界处理（无出价、并发出价等）
4. 仍未解决的 TODO
