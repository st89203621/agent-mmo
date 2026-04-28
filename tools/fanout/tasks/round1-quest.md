# 任务：QuestPage（任务页）补内容 + 视觉提升

仓库根 `C:\deye-6.4\agent-mmo`，前端 `game-client/`。当前分支 `codex/gameclient`。**禁止 git 写操作**。

## 背景

我（项目负责人）跑了真实浏览器实测，发现**任务页是当前最空洞的页面之一**：
- 顶部 4 Tab + "今日 0/3 - 0%" 进度条
- **整屏只有装饰背景图，零任务卡片**
- 即使任务为空，也只显示一行小字"此分类暂无任务"

主页面文件：`game-client/src/components/pages/QuestPage.tsx`
任务列表渲染：行 252-259（已确认）
- 加载中：行 254 `'任务载入中...'`
- 空态：行 256 `'此分类暂无任务'`
- 渲染：行 258 `filtered.map(renderCard)`

## 你的具体任务

### 1. 用新建的 EmptyState 组件替代裸文字

**已存在**：`game-client/src/components/common/EmptyState.tsx`（我刚刚建的）

接口：
```tsx
interface Props {
  icon?: string;       // 单字或 emoji，默认 ✦
  title: string;       // serif 金色大标题
  hint?: ReactNode;    // 米色描述（可换行 <br/>）
  action?: ReactNode;  // 可选 CTA 按钮
  compact?: boolean;   // 紧凑版（更短的 padding）
}
```

它会渲染：
- 大金色标题（serif 仙侠风）
- 米色描述
- 居中布局 + 充足留白

### 2. 改 QuestPage 的两处空态

**a. 加载中**（行 252-254 附近）：
```tsx
if (loading) return <EmptyState icon="◷" title="任务载入中" hint="正在调阅功过簿…" />;
```

**b. 空任务列表**（行 256 附近）：
```tsx
<EmptyState
  icon="✦"
  title="尚无任务"
  hint={
    <>
      {tab === 'achievement'
        ? '尚未达成此类成就，去江湖中走一遭吧。'
        : tab === 'main' ? '主线任务暂歇，去主城与 NPC 攀谈，新缘起或在前方。'
        : '此分类暂无委托。'}
    </>
  }
  action={
    <button onClick={() => navigateTo('scene')} type="button" style={{...}}>去 主 城 走 走</button>
  }
/>
```

action 按钮的样式：参考 `lunhui/LunhuiPages.module.css` 中 `.marketMineBtn` 或 `.aucPrimaryBtn`（已有暖金 + serif 风格），如果都不合适就内联用：
```ts
{ padding: '10px 24px', borderRadius: 4, border: '1px solid var(--gold)', color: 'var(--gold)', background: 'transparent', fontFamily: 'var(--font-serif)', fontSize: 14, letterSpacing: 3 }
```

action 是**可选**的，根据 tab 类型决定要不要给（成就 tab 不需要 CTA）。

### 3. 检查"今日 0/3 - 0%" 区视觉

`QuestPage.tsx` 行 237-250 渲染 daily 完成度区。看一眼：
- 字号是否过小？标签是否清晰？
- 进度条颜色是否暖金？
- 如果 daily 任务为空，这一区也应该折叠或换 EmptyState compact 模式

如果觉得视觉不平衡（比如进度条在大屏看着孤单），可以**轻量改进 CSS**（给容器加 padding / 标题 serif 字体）。**不要重写整个区块**。

## 强制规则

1. **必须使用新建的 EmptyState 组件**（`from '../common/EmptyState'`）。不要自己再写一套空态裸文字。
2. **禁止 git 操作**。
3. **不要碰**：TradePage、InventoryPage、ScenePage（其他人在做或我在做）。
4. **不要改全局 CSS 变量**，要用就用现有的 `--gold`, `--ink`, `--text-dim`, `--font-serif`。
5. **完成后跑 `npm run build`** 在 game-client 目录验证。

## 审美基准

参考**创角页 CharCreatePage**：serif 中文 + 金色 active + 卡片金边 + 充足留白。我们要的是**仙侠味、有呼吸感、文字有节奏**，**不是堆元素的繁忙**。

CTA 按钮的措辞：仙侠化（"去主城走走"、"接 任 务"），不要"立即获取""加入活动"这种现代电商风。

## 验收报告（200 字内）

1. 改了哪些行
2. EmptyState 用了几次
3. npm run build 是否通过
4. 还有什么没解决（不强求都解决）
