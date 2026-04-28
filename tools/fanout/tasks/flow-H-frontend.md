# 任务：流 H 前端扫尾（活动/砸蛋/传送菜单）

你是这个 MMO 游戏前端的开发者。仓库根 `C:\deye-6.4\agent-mmo`，前端目录 `game-client/`。当前分支 `codex/gameclient`，**禁止任何 git 操作**（不要 add/commit/push/checkout）。

## 项目背景（必读）

- 仓库根有 `FUSION_DESIGN.md`（七世轮回 × 气盖山河融合设计），定义了 8 条工作流。你负责**流 H：前端活动/传送扫尾**。
- 大部分流已经实现，你只补关键缺口，**不要重写已存在的页面**。
- 前端技术栈：React 18 + TS + Vite + Zustand + CSS Modules（详见 `CLAUDE.md`）。
- 状态管理：`src/store/gameStore.ts` 提供 `navigateTo(pageId)`，`src/store/playerStore.ts` 持久化玩家数据，`src/store/toastStore.ts` 全局通知。
- 公共组件：`src/components/common/` 下的 `PageShell`、`Toast`、`ConfirmDialog`、`fusion`（BarRow/BarBlock）等已存在，请复用。

## 你的具体任务（按优先级）

### H1. 新建 TeleportMenu 组件（最重要）
**文件**：`game-client/src/components/scene/TeleportMenu.tsx`（新建）+ 同目录 `.module.css`
**功能**：仿 lunhui 的"梦中人"传送菜单。4 个分组卡片：
- **功能区**：充值礼包、在线领奖、探险（指向 activity / activity / dungeon）
- **经济区**：商城、集市、小摊、拍卖、神匠（指向 shop / market / stall / auction / forge）
- **战斗区**：竞技场、世界 Boss、副本（指向 arena / world-boss / dungeon）
- **社交区**：婚介、留言板、组队、钓鱼（指向 matchmaking / message-board / guild / fishing）

每个目标点击 `useGameStore.getState().navigateTo(pageId)`。组件作为悬浮覆盖层，需要 `onClose` 回调。在 `ScenePage.tsx` 添加一个"传送"按钮触发本组件（如果已经有传送入口请直接复用，不要重复加按钮）。

### H2. WheelPage 接入真实砸蛋 API
**文件**：`game-client/src/components/pages/WheelPage.tsx`
读 `services/api.ts`，看是否已经有 `rollGacha` 函数。若没有，**在 services/api.ts 末尾的 FANOUT BLOCK 中追加**（见下方规则）：
```ts
export interface GachaResult { itemId: string; itemName: string; quality: 'white'|'green'|'blue'|'purple'|'orange'; quantity: number; }
export async function rollGacha(gachaId: string, count: 1|10): Promise<GachaResult[]>
export async function fetchGachaHistory(gachaId: string): Promise<GachaResult[]>
```
然后让 WheelPage 调用 `rollGacha`，砸蛋按钮 disable 时机正确，结果用 toast 提示。10 连保底动画保留，但数据驱动改成真 API。

后端 `/api/gacha/*` 不一定已实现，前端**容错处理**：捕获 fetch 异常 → toast 提示"系统繁忙，请稍后再试"+ 不展示假数据。

### H3. ActivityPage 在线领奖区
**文件**：`game-client/src/components/pages/ActivityPage.tsx`
当前已经接了签到（fetchCheckinStatus / doCheckin）。补充：
- 调用 `fetchOnlineRewards()`（在 services/api.ts FANOUT BLOCK 中追加；后端如果没有就 try/catch 容错）
- 渲染"累计在线时长奖励"列表（30min/1h/2h/4h 阶梯）
- 已领取 / 未领取 / 未达到 三种状态视觉区分

### H4. destiny-path 路由整顿
检查 `App.tsx` 中 `destiny-path` 的指向：如果指向 `ActivityPage`，改成指向 `MysticTomePage`（天命之途已存在）。

## 强制规则

### 禁忌
1. **不要 commit / push / checkout / stash**。任何 git 写操作都不许做。
2. **不要修改 `App.tsx` 的 PAGE_MAP 已有条目**（H4 那个改向除外）。
3. **不要修改 `services/api.ts` 已有函数**。新增的 API 函数只在文件末尾的 FANOUT BLOCK 内追加。
4. **不要碰** logic/、provide/、one-application/ 的任何 Java 代码（这是别的 agent 的领地）。
5. **不要碰** game-client/src/components/pages/AuctionPage.tsx、TradePage.tsx、MessageBoardPage.tsx、FateMapPage.tsx、GuildPage.tsx（其他 agent 在做）。

### FANOUT BLOCK 规则
在 `services/api.ts` 和 `types/index.ts` 末尾按以下格式追加（如已存在 BLOCK 标记，在内部追加）：
```ts
// === FANOUT BLOCK: flow-H ===
// （在这里追加你新加的类型/函数）
// === FANOUT END: flow-H ===
```

### 编码
- 所有新文件 UTF-8 无 BOM。
- TypeScript 严格模式（无 any、无 @ts-ignore）。
- CSS 用 module + 已有 CSS 变量（参见 `src/styles/variables.css`：`--ink`、`--paper`、`--gold`、`--quality-*`）。
- 不要 console.log 残留。
- 不要硬编码任何账号、URL、API key。

### 验收
完成后，输出一段简短报告（200 字内）：
1. 改了哪些文件（带路径）
2. 新建了哪些文件
3. 是否调用 `npm run build` 验证（**调用一下**，确认 TypeScript 编译通过）
4. 仍未解决的问题（若有）

如果 npm run build 报错，自己修；修不动就把错误粘在报告里。
