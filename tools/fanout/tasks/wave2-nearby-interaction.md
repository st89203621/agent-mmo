# 任务：附近玩家交互（流 A 收尾）

仓库根 `C:\deye-6.4\agent-mmo`，前端 `game-client/`。当前分支 `codex/gameclient`。**禁止 git 写操作**。

## 背景

ScenePage 已经显示"附近玩家"列表（基于 `/zone/nearby-players` 拿真实 name/level/portrait），但点击玩家**没有任何交互**。这是 lunhui 风格游戏的核心社交触点。

## 你的具体任务

### A1. 玩家资料卡组件
**文件**：新建 `game-client/src/components/scene/NearbyPlayerCard.tsx` + `.module.css`

弹窗样式（覆盖层 + 卡片），展示：
- 头像（用 portraitUrl）
- 名字 + 等级
- 当前所在区域名
- 操作按钮（横排）：[查看详情] [加好友] [发邮件] [挑战] [交易]

ESC / 点击空白关闭。复用 CSS 变量（`--ink`, `--paper`, `--gold`, `--quality-*`）。

### A2. 行为联通
- **查看详情**：`navigateTo('character', { playerId })`（已有 character 页面，不要重写）
- **加好友**：调用 `addFriend(playerId)`（在 services/api.ts FANOUT BLOCK 追加；后端 `/api/friend/add` 可能没实现，**try/catch 容错** + toast）
- **发邮件**：`navigateTo('mail', { to: playerId })`
- **挑战**：调用 `requestPvP(playerId)` —— 同样 try/catch 容错
- **交易**：`navigateTo('trade', { peerId: playerId })`

API（services/api.ts FANOUT BLOCK 末尾追加）：
```ts
// === FANOUT BLOCK: wave2-nearby ===
export async function addFriend(playerId: number): Promise<void>     // POST /api/friend/add
export async function requestPvP(playerId: number): Promise<void>    // POST /api/pvp/challenge
// === FANOUT END: wave2-nearby ===
```

### A3. ScenePage 接入
**文件**：`game-client/src/components/pages/ScenePage.tsx`
- 找到附近玩家列表渲染处
- 给每个玩家项加 `onClick={() => setSelectedPlayer(player)}`
- 加 state `const [selectedPlayer, setSelectedPlayer] = useState<NearbyPlayer | null>(null)`
- 在组件底部条件渲染 `<NearbyPlayerCard player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />`

## 强制规则

1. **禁止 git 写操作**。
2. 不要碰 logic/、provide/、one-application/ 的 Java 代码。
3. 不要碰 AuctionPage、TradePage、FateMapPage、GuildPage、MessageBoardPage、ActivityPage、WheelPage、MysticTomePage、CharacterPage、ChatPage（其他人的领地）。
4. **可以**改 ScenePage（这次主要工作）。
5. **新建** components/scene/NearbyPlayerCard.{tsx,module.css}。
6. services/api.ts 只追加 FANOUT BLOCK，不动现有。
7. types/index.ts 不要动。
8. 不要 console.log、不要 any、不要 @ts-ignore。
9. 完成后 `npm run build` 验证。

## 验收报告（200 字内）

1. 改/新建的文件
2. npm run build 是否通过
3. 后端缺失的接口（addFriend/requestPvP）的应对方案
4. 仍未解决的问题
