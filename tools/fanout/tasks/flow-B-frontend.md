# 任务：流 B 前端拍卖行扫尾（AuctionPage 完善）

你是这个 MMO 游戏前端的开发者。仓库根 `C:\deye-6.4\agent-mmo`，前端目录 `game-client/`。当前分支 `codex/gameclient`，**禁止任何 git 操作**。

## 项目背景

- 仓库根 `FUSION_DESIGN.md` 定义了 8 条工作流。你负责**流 B：AuctionPage 收尾**。
- AuctionPage.tsx 主体已经实现（4 个 Tab、出价、一口价、上架）。你只补 3 个具体缺口。
- 前端：React 18 + TS + Vite + Zustand + CSS Modules。
- `usePlayerStore` 提供 `gold`、`diamond`，但成交后未刷新。
- `services/api.ts` 已有 `fetchAuctionList / placeBid / buyNow / listItemOnAuction / cancelAuctionListing`。

## 你的具体任务

### B1. 上架时背包物品选择器
**文件**：`game-client/src/components/pages/AuctionPage.tsx`
当前"上架物品"表单缺少物品选择器。应：
- 调用 `fetchBagItems()`（已存在于 services/api.ts；如果叫别的名字请去 grep `bag` 或 `inventory` 找对的）
- 渲染可上架物品网格（图标 + 名称 + 数量 + 品质色边框）
- 点击选中后填入表单
- 有"刷新"按钮重新拉背包

如果背包 API 不存在或报错，降级为"输入物品 ID"的文本框。

### B2. 成交后实时刷新金币 / 钻石
**文件**：`game-client/src/components/pages/AuctionPage.tsx`
当前 `placeBid` / `buyNow` 调用成功后，`usePlayerStore` 里的 gold 没刷新。改：
- 在 `services/api.ts` FANOUT BLOCK 末尾追加 `fetchPlayerCurrency(): Promise<{ gold: number; diamond: number }>`（后端可能是 `/api/person/me` 或 `/api/wallet`，去 grep `gold` 找现有接口；用现有的，不要重复造）
- 如果有 `usePlayerStore` 的 setter（如 `setGold`、`setCurrency`），调用刷新
- 出价 / 一口价成功后调用一次刷新
- 上架成功后也刷新一次（手续费扣金币）

如果 playerStore 没有 setter，**在 playerStore.ts 中新增 setCurrency 方法**（不要破坏现有接口）。

### B3. 拍卖结束 / 被超出的提示
**文件**：`game-client/src/components/pages/AuctionPage.tsx`
- 列表里每条拍卖项的"剩余时间"用前端计时（每秒重新渲染倒计时）
- 当某条拍卖剩余时间归零，列表自动重拉（间隔轮询：每 30s 拉一次列表，但只在"出售中" Tab 激活时轮询）
- 自己出价被超出（在"我的竞拍" Tab 里）显示红色"已被超过" 标签

## 强制规则

1. **不要 commit / push / checkout / stash**。
2. **不要碰** logic/、provide/、one-application/ 的任何 Java 代码。
3. **不要碰其他前端页面**：TradePage、ScenePage、FateMapPage、GuildPage、MessageBoardPage、ActivityPage、WheelPage、MysticTomePage（其他 agent 在做）。
4. **不要修改 services/api.ts 已有函数**。新加的只追加到 FANOUT BLOCK：
   ```ts
   // === FANOUT BLOCK: flow-B ===
   // === FANOUT END: flow-B ===
   ```
5. **可以**修改 playerStore.ts（仅新增方法，不动现有），如果需要刷新货币。
6. **不要**修改 types/index.ts。
7. CSS 复用现有变量。
8. 不要 console.log、不要 any、不要 @ts-ignore。
9. 完成后跑 `npm run build` 在 game-client 目录验证。

## 验收

输出报告（200 字内）：
1. 改了哪些文件
2. npm run build 是否通过
3. 是否找到背包 API（找不到的话用了什么降级）
4. 仍未解决的问题
