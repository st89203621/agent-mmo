# 任务：InventoryPage（背包页）补内容 + 视觉提升

仓库根 `C:\deye-6.4\agent-mmo`，前端 `game-client/`。当前分支 `codex/gameclient`。**禁止 git 写操作**。

## 背景

我（项目负责人）跑了真实浏览器实测，发现**背包页有 demo 感**：
- 顶部 4 个无标签 icon + 数字（红心 5 / 空白 1 / 空白 1 / 蓝色 1）
- 二级 Tab 字号过小：全部 / 装备 / 丹药 / 材料 / 宝宝 / 其他
- 大量空格子整齐排列（用 `null` 填充至 `minSlots = max(maxCount, 20)`）
- 整屏视觉密度不平衡

主页面文件：`game-client/src/components/pages/InventoryPage.tsx`

精确定位（已确认）：
- 二级 Tab 渲染：行 108-119，定义在行 11-18（6 个 Tab）
- 容量条：行 121-126（"容量 X/Y"）
- 空格子填充：行 89-91 `minSlots = Math.max(maxCount, 20)`
- 空格子渲染：行 134-146（对 `null` 项渲染空白按钮）

## 你的具体任务

### 1. 顶部 4 个 icon 加标签（如果存在）

Explore 报告说"代码中不存在顶部 4 个数字 icon" —— 但浏览器截图明显有（红心、空白、空白、蓝色）。

**第一步**：自己再读一遍 InventoryPage.tsx，把顶部所有 div 都看清楚。也读它的 module.css。可能这 4 个 icon 是**子组件**或**slot icon**（行 121 左右的容量栏附近）。

**如果找到了**：每个 icon 加文字标签（"血瓶/法瓶/经验丹/钥匙" 之类，按 itemTypeId 推断）。
**如果没找到**：截图里可能是 `BagItemIconBar` 或 quickSlot 之类组件。grep 整个 src/ 找 quickSlot / quickItems / quickBar / slotIcon，找到再加标签。

如果**确实**没找到（只有截图里有却找不到代码），跳过这一项，但在报告里写明"未定位到 4 icon 渲染源"。

### 2. 空格子优化（最重要）

当前逻辑：`minSlots = Math.max(maxCount, 20)` 永远至少显示 20 格。

**改进**：
```js
// 自适应：实际物品数 + 至多 4 个空槽（提示还可以装更多），上限 20
const minSlots = Math.min(20, maxCount + 4);
```

如果 `maxCount === 0`（背包完全空），用 EmptyState 替代整个网格：

```tsx
import EmptyState from '../common/EmptyState';

if (maxCount === 0) {
  return (
    <div className={styles.mockPage}>
      {/* 保留 appbar */}
      ...appbar...
      <EmptyState
        icon="囊"
        title="行囊空空"
        hint={<>江湖路远，先去打打怪积攒些物什。<br/>探索、副本、任务皆可获得。</>}
        action={<button onClick={() => navigateTo('scene')} type="button" style={{padding:'10px 24px',border:'1px solid var(--gold)',color:'var(--gold)',background:'transparent',fontFamily:'var(--font-serif)',fontSize:14,letterSpacing:3}}>去 主 城</button>}
      />
    </div>
  );
}
```

如果**部分有物品**，就用自适应 `minSlots`，少几个空格让整体不那么稀。

### 3. 二级 Tab 字号 / 间距

二级 Tab 当前字号偏小（一行 6 个 Tab 在 390 宽屏下挤）。打开对应的 CSS（应该在 LunhuiPages.module.css 或 InventoryPage.module.css），找 `.invTab` 或类似 class，把：
- font-size 提到 13-14px
- letter-spacing 收到 1px（不要超过 2px）
- padding 适度增加（min-height 32px）

不要破坏其他页面用的同名 class。如果是 LunhuiPages 共享的 class，改之前确认其他页面（FateMapPage / GuildPage 等）不会被破坏。

### 4. 容量条视觉

行 121-126 的"容量 X/Y"：
- 数字加 serif 字体 + 金色
- 进度条已存在的话，确认配色用 `--gold`

## 强制规则

1. **必须使用 EmptyState 组件**（`from '../common/EmptyState'`）作完全空背包态。
2. **禁止 git 操作**。
3. **不要碰**：TradePage、QuestPage、ScenePage（其他人在做或我在做）。
4. **不要改全局 variables.css**。
5. **完成后跑 `npm run build`** 在 game-client 目录验证。

## 审美基准

参考**创角页 CharCreatePage**：serif + 金色 + 卡片金边 + 充足留白。我们要的是**留白 / 节奏 / 重要信息突出**。

避免：堆按钮、过度密集、纯灰半透明文字。

## 验收报告（200 字内）

1. 改了哪些行
2. 顶部 4 icon 是否找到 / 怎么处理
3. 空格子自适应逻辑改成什么
4. EmptyState 用了几次
5. npm run build 是否通过
