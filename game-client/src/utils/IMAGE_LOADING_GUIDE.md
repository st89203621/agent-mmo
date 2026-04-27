# 响应式图片加载指南

## 概述

这个系统自动根据设备屏幕大小和容器尺寸选择合适的图片大小，以降低带宽压力。

### 预定义的图片尺寸规格

| 名称 | 尺寸 | 用途 |
|------|------|------|
| thumbnail | 256×256 | 列表、头像、缩略图 |
| small | 512×512 | 卡片组件 |
| medium | 768×768 | 对话框、中等内容 |
| large | 1024×1024 | 全屏背景、最高质量 |

## 快速使用

### 1. 场景预设（最简单）

```tsx
import { useRef } from 'react';
import { useGenerateResponsiveImage } from '@/hooks/useResponsiveImage';
import { generateSceneImage } from '@/services/api';

export function MyComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { imageUrl, loading } = useGenerateResponsiveImage(
    (width, height) => generateSceneImage('npc_id', 0, undefined, 'scene hint', width, height),
    containerRef,
    { scenario: 'dialog' } // 'thumbnail' | 'card' | 'dialog' | 'fullscreen'
  );

  return (
    <div ref={containerRef}>
      {loading && <p>生成中...</p>}
      {imageUrl && <img src={imageUrl} alt="scene" />}
    </div>
  );
}
```

### 2. 自定义尺寸

```tsx
const { imageUrl } = useGenerateResponsiveImage(
  (width, height) => generateSceneImage(...),
  containerRef,
  { customWidth: 300, customHeight: 200 }
);
```

### 3. 响应式调整（监听容器大小变化）

```tsx
const { imageUrl } = useGenerateResponsiveImage(
  (width, height) => generateSceneImage(...),
  containerRef,
  { autoResize: true } // 容器变化时自动重新生成
);
```

## 工具函数详解

### getOptimalImageSize(containerWidth, containerHeight, pixelDensity?)

根据容器和设备像素密度计算最优尺寸。
- 移动设备（DPR=2）容器200×200 → 选择 512×512
- 桌面设备（DPR=1）容器800×600 → 选择 1024×1024

```tsx
import { getOptimalImageSize } from '@/utils/responsiveImageLoader';

const size = getOptimalImageSize(400, 300);
console.log(size); // { width: 512, height: 512, label: 'small' }
```

### 场景快捷方式

```tsx
import {
  getThumbnailSize,    // 256×256
  getMediumSize,       // 768×768
  getFullSize,         // 1024×1024
} from '@/utils/responsiveImageLoader';
```

### cachedGenerateImage

避免同一尺寸的重复请求（5分钟缓存）。

```tsx
import { cachedGenerateImage } from '@/utils/responsiveImageLoader';

const result = await cachedGenerateImage(
  () => generateSceneImage('npc_1', 0, undefined, 'hint', 512, 512),
  'npc_1_hint_512x512'
);
```

## 后端 API 变化

### generateSceneImage 端点

**请求体**：
```json
{
  "npcId": "npc_id",
  "worldIndex": 1,
  "artStyle": "某种画风",
  "sceneHint": "场景描述",
  "width": 512,      // 新增
  "height": 512      // 新增
}
```

**响应**：
```json
{
  "code": 0,
  "data": {
    "imageId": "uuid",
    "imageUrl": "/api/story/scene-image/uuid"
  }
}
```

## 性能优化建议

1. **列表场景** - 使用缩略图（256×256）减少 93.75% 的数据量
2. **卡片组件** - 使用 small（512×512）平衡质量和大小
3. **对话框** - 使用 medium（768×768）
4. **全屏背景** - 使用 large（1024×1024）

## 带宽节省示例

| 场景 | 尺寸 | 文件大小估计 | 节省 |
|------|------|------------|------|
| 全分辨率 | 1024×1024 | ~400KB | 基准 |
| 对话框 | 768×768 | ~225KB | ↓ 44% |
| 卡片 | 512×512 | ~100KB | ↓ 75% |
| 缩略图 | 256×256 | ~25KB | ↓ 94% |

## 实现细节

### 缓存键包含尺寸
后端会为不同尺寸生成并缓存不同的图片：
```
缓存键: "512x512_npc_1_worldIndex_artStyle"
缓存键: "1024x1024_npc_1_worldIndex_artStyle"
```

这样不同设备会自动获得对应的预生成图片。

### 智能选择算法

系统选择第一个满足以下条件的尺寸：
```
尺寸 >= (容器宽度 × 设备像素密度)
```

例如：
- iPhone（w=390, DPR=2）需要 780px → 选择 1024×1024
- iPad（w=800, DPR=2）需要 1600px → 仍选择 1024×1024（最大）
- 桌面（w=1200, DPR=1）需要 1200px → 选择 1024×1024

## 扩展到其他页面

### 示例：为 ScenePage 添加背景

```tsx
import { useRef } from 'react';
import { useGenerateResponsiveImage } from '@/hooks/useResponsiveImage';
import { generateSceneImage } from '@/services/api';

export function ScenePage() {
  const bgRef = useRef<HTMLDivElement>(null);
  const { imageUrl } = useGenerateResponsiveImage(
    (w, h) => generateSceneImage(npcId, worldIndex, artStyle, sceneHint, w, h),
    bgRef,
    { scenario: 'fullscreen' }
  );

  return (
    <div ref={bgRef} style={{ backgroundImage: `url(${imageUrl})` }}>
      {/* 内容 */}
    </div>
  );
}
```

## 常见问题

**Q: 为什么我的图片比之前清晰度降低了？**
A: 这是正常的。系统根据你的设备自动选择最优尺寸。如果需要更高质量，可以使用 `{ scenario: 'fullscreen' }`。

**Q: 缓存多久会过期？**
A: 智能缓存 5 分钟后自动清除，但数据库缓存永久有效。

**Q: 可以手动指定尺寸吗？**
A: 可以，使用 `customWidth` 和 `customHeight` 参数。

**Q: 网络不好时会发生什么？**
A: 组件会显示加载状态，10 秒超时后触发错误处理。
