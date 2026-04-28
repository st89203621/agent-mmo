# 任务：流 D 前端社交扫尾（婚介/组队/留言板）

你是这个 MMO 游戏前端的开发者。仓库根 `C:\deye-6.4\agent-mmo`，前端目录 `game-client/`。当前分支 `codex/gameclient`，**禁止任何 git 操作**。

## 项目背景

- 仓库根 `FUSION_DESIGN.md` 定义了 8 条工作流。你负责**流 D：前端社交扫尾**。
- 前端：React 18 + TS + Vite + Zustand + CSS Modules。
- 状态：`src/store/gameStore.ts`（navigateTo）、`src/store/playerStore.ts`（玩家数据）、`src/store/toastStore.ts`（toast）。
- 大部分流已实现，你只补关键缺口。

## 你的具体任务

### D1. FateMapPage 加婚介 Tab
**文件**：`game-client/src/components/pages/FateMapPage.tsx`
当前只有缘分地图，加一个 Tab 切换：
- Tab 1：缘分地图（保留现有）
- Tab 2：婚介

婚介内容：
- 顶部：当前婚姻状态卡片（未婚 / 已婚 + 配偶名 + 结婚天数）
- 中部：AI 推荐列表（缘分值高的玩家），每个卡片显示头像、名字、缘分值、推荐理由、[查看详情] [求婚] 按钮
- 底部：进行中的求婚（收到的 + 发出的）

API（在 services/api.ts FANOUT BLOCK 末尾追加）：
```ts
export interface MarriageState { married: boolean; spouseId?: number; spouseName?: string; marriedSince?: number; }
export interface MatchmakingItem { playerId: number; name: string; level: number; fateScore: number; reason: string; portrait?: string; }
export interface MarriageProposal { proposalId: string; fromId: number; fromName: string; toId: number; toName: string; createdAt: number; }
export async function fetchMarriageState(): Promise<MarriageState>
export async function fetchMatchmaking(): Promise<{ candidates: MatchmakingItem[] }>
export async function proposeMarriage(targetPlayerId: number): Promise<{ proposalId: string }>
export async function acceptMarriage(proposalId: string): Promise<void>
export async function rejectMarriage(proposalId: string): Promise<void>
export async function divorce(): Promise<void>
export async function fetchProposals(): Promise<{ incoming: MarriageProposal[]; outgoing: MarriageProposal[] }>
```
后端可能没实现，**全部 try/catch 容错** + toast 提示"系统繁忙"。

### D2. GuildPage 加组队大厅入口
**文件**：`game-client/src/components/pages/GuildPage.tsx`
不重写原有 Guild 功能。在页面顶部加一个二级 Tab："公会" / "组队大厅"。
组队大厅内容：
- 招募中的队伍列表（队长名、队伍目标、人数 X/5、所需职业 / 战力）
- [创建队伍] 按钮
- [加入队伍] 按钮（点击后调用 API）

API（追加到 services/api.ts FANOUT BLOCK）：
```ts
export interface PartyRecruitment { partyId: string; leaderId: number; leaderName: string; goal: string; current: number; max: number; minLevel: number; }
export async function fetchPartyList(): Promise<{ parties: PartyRecruitment[] }>
export async function createParty(goal: string, max: number, minLevel: number): Promise<{ partyId: string }>
export async function joinParty(partyId: string): Promise<void>
export async function leaveParty(): Promise<void>
```

### D3. MessageBoardPage 区域动态绑定
**文件**：`game-client/src/components/pages/MessageBoardPage.tsx`
当前**硬编码** `zoneId = 'main_city'`。改为：
- 调用 `fetchCurrentZone()`（已存在于 services/api.ts）拿到当前 zoneId
- 区域留言板用真实 zoneId
- 全服留言板保持 zoneId=null

如果 fetchCurrentZone 失败，降级为"暂无区域信息"提示，不展示区域留言板 Tab。

## 强制规则

1. **不要 commit / push / checkout / stash**。
2. **不要碰** logic/、provide/、one-application/ 的任何 Java 代码。
3. **不要碰其他前端页面**：AuctionPage、TradePage、ScenePage、ActivityPage、WheelPage、MysticTomePage（其他 agent 在做）。
4. **不要修改 services/api.ts 已有函数**。新加的只追加到 FANOUT BLOCK：
   ```ts
   // === FANOUT BLOCK: flow-D ===
   //（追加新类型 / 函数）
   // === FANOUT END: flow-D ===
   ```
5. **不要修改 types/index.ts 已有类型**。如果有需要新增的类型，写在 services/api.ts 的 FANOUT BLOCK 里就好（避免 types/index.ts 冲突）。
6. CSS 复用现有变量（`--ink`、`--paper`、`--gold`、`--quality-*`）。
7. 不要 console.log。
8. 不要 any、@ts-ignore。
9. 完成后跑 `npm run build` 验证（在 game-client 目录），TypeScript 必须通过。

## 验收

输出报告（200 字内）：
1. 改了哪些文件
2. npm run build 是否通过
3. 仍未解决的问题
