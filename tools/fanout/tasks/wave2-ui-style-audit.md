# 任务：UI 风格统一审查与修补

仓库根 `C:\deye-6.4\agent-mmo`，前端 `game-client/`。当前分支 `codex/gameclient`。**禁止 git 写操作**。

## 背景

项目有两套页面：
- **lunhui/ 子目录**：传统 MMO 风格页面（CharSelectPage、ChatPage、TeleportPage、MatchmakingPage 等）使用 `LunhuiPages.module.css`
- **主体 components/pages/**：仙侠风暖金色调（HomePage、AuctionPage、TradePage、FateMapPage 等）

体检报告指出："**lunhui/ 子目录页面与新页面 (AuctionPage/TradePage/MessageBoardPage) 复用 LunhuiPages.module.css，但页头样式不完全一致（AppBar 背景色差异）**"。

## 你的具体任务

### S1. 审计 AppBar 样式
**操作**：
- 列出所有用到"AppBar / 顶栏 / 导航栏"的页面（grep `appBar|topBar|pageHeader|titleBar` 或类似）
- 统计哪些用了 `LunhuiPages.module.css`、哪些用了 `page.module.css`、哪些用了 own 自己的 module.css
- 找出**视觉不一致**点（背景色、字号、间距、阴影、返回按钮位置）

### S2. 修补不一致
**目标**：所有页面顶部"应用条"使用相同视觉规范（背景、高度、字号、按钮）。

操作（**只改 CSS，不改 TSX 结构**）：
- 在 `src/styles/page.module.css` 或 `LunhuiPages.module.css` 中，找出"应用条"的多个 class，统一颜色和高度
- 引用 CSS 变量（`--ink`, `--paper`, `--gold` 等），不要新增硬编码颜色
- 至少统一以下视觉点：
  - 顶栏背景色 / 高度
  - 标题字号 / 字色
  - 返回按钮（位置 / 图标 / 颜色）
  - 二级 Tab 切换条样式

### S3. CSS 变量补全
**文件**：`src/styles/variables.css`（如果改动需要新增变量）

如果发现某些重复值（如多处 `padding: 12px 16px`），可以提取成变量。但**只在确实重复 3+ 次时才提**，避免过度抽象。

### S4. 不动的部分

明确**不要改**：
- 任何业务逻辑（hooks/services/store）
- 任何 TSX 组件结构（除非是为了对齐 CSS class 名）
- 主页 HomePage（大概率风格已经是基准）
- StoryPage（剧情页面，特殊布局）
- BattlePage（战斗页面，特殊布局）

## 强制规则

1. **禁止 git 写操作**。
2. 不要碰 logic/、provide/、one-application/。
3. 不要碰任何 .ts / .tsx 业务逻辑（除非是 className 名变更）。
4. CSS 改动尽量集中在 src/styles/、LunhuiPages.module.css。
5. 完成后 `npm run build` 验证。

## 输出方式

**不要做"大重构"**，做"对齐式微调"。

报告要包含：
1. 审计发现的不一致点（清单）
2. 修补的 class / 文件
3. 仍未对齐的部分（可选改进点）

字数 400 字以内。
