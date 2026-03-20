# 装备附魔系统 (Enchant System)

## 系统概述

参考《轮回Online》的龙符附魔系统，为装备提供强大的属性加成。

## 核心机制

### 附魔等级
- **魔0**: 无附魔 (0% 加成)
- **魔1**: +55% 属性
- **魔2**: +110% 属性
- **魔3**: +165% 属性
- **魔4**: +220% 属性
- **魔5**: +275% 属性
- **魔6**: +330% 属性
- **魔7**: +385% 属性
- **魔8**: +440% 属性
- **魔9**: +495% 属性
- **魔10**: +550% 属性 (最高)

### 符文类型

#### 小型符文 🔷
- 消耗: 99玩币
- 成功率: 30%
- 附魔等级: 魔1-魔3
- 适合: 初期装备

#### 中型符文 🔶
- 消耗: 299玩币
- 成功率: 20%
- 附魔等级: 魔3-魔5
- 适合: 中期装备

#### 大型符文 💎
- 消耗: 599玩币
- 成功率: 15%
- 附魔等级: 魔5-魔7
- 适合: 高级装备

#### 超级符文 💠
- 消耗: 999玩币
- 成功率: 10%
- 附魔等级: 魔7-魔10
- 适合: 顶级装备

## 保底机制

### 8次保底
- 每附魔8次必出魔3以上
- 保底计数独立计算
- 成功后重置计数

### 保底规则
```java
if (guaranteeCount >= 8) {
    success = true;
    minLevel = 3;
    maxLevel = 10;
}
```

## 符文兑换

### 兑换比例
- 3个小型符文 + 100币 → 1个中型符文
- 3个中型符文 + 300币 → 1个大型符文
- 3个大型符文 + 500币 → 1个超级符文

### 兑换收益
- 低级符文可兑换高级符文
- 节省成本，提高成功率
- 灵活调整附魔策略

## 附魔流程

### 1. 选择装备
```javascript
enchantPanel.setEquip('equip_001');
```

### 2. 选择符文
```javascript
enchantPanel.selectRune('rune_super');
```

### 3. 开始附魔
```javascript
await enchantManager.enchantEquip('equip_001', 'rune_super');
```

### 4. 查看结果
- 成功: 装备等级提升，属性加成增加
- 失败: 保底计数+1，装备等级不变

## API接口

### 附魔装备
```java
@ActionMethod(EnchantCmd.enchantEquip)
public EnchantMessage enchantEquip(EnchantMessage message, FlowContext flowContext)
```

### 获取附魔信息
```java
@ActionMethod(EnchantCmd.getEnchantInfo)
public EnchantMessage getEnchantInfo(EnchantMessage message, FlowContext flowContext)
```

### 兑换符文
```java
@ActionMethod(EnchantCmd.exchangeRune)
public ExchangeResult exchangeRune(ExchangeMessage message, FlowContext flowContext)
```

## 前端使用

```javascript
import { enchantManager } from './managers/EnchantManager.js';
import { EnchantConfig } from './config/EnchantConfig.js';

// 附魔装备
const result = await enchantManager.enchantEquip('equip_001', 'rune_super');

// 获取附魔信息
const info = await enchantManager.getEnchantInfo('equip_001');

// 获取等级信息
const levelInfo = enchantManager.getEnchantLevelInfo(5);
console.log(levelInfo.bonus); // 275

// 获取符文信息
const runeInfo = enchantManager.getRuneInfo('rune_super');
console.log(runeInfo.successRate); // 0.1
```

## 数据库结构

### EquipEnchant 实体
```java
String id;                  // 附魔记录ID
String equipId;             // 装备ID
long userId;                // 玩家ID
int enchantLevel;           // 附魔等级 (0-10)
int totalAttributeBonus;    // 总属性加成百分比
int guaranteeCount;         // 保底计数 (0-7)
long lastEnchantTime;       // 最后附魔时间
```

### EnchantRune 实体
```java
String id;                  // 符文ID
String runeId;              // 符文类型ID
String runeName;            // 符文名称
int runeLevel;              // 符文等级
int minEnchantLevel;        // 最小附魔等级
int maxEnchantLevel;        // 最大附魔等级
double successRate;         // 成功率
int attributeBonus;         // 属性加成
```

## 特殊活动

### 限时活动
```
龙符给装备附魔啦!!
今日有1人在砸龙符每8次都能得到超级大龙符!
99玩币砸龙符魔10龙符就能给一件顶级无魔装备直接附上10级魔
(属性直接提升至555%)。

每砸8次砸一次超级大龙符,必出魔3以上。
低级龙符还可以兑换高级龙符。

【龙符换300-15000玩币】
还有很高机率出现7-8或8-9龙符，
可以给一件魔的装备附魔到魔8或魔9

活动截止: 2025-10-17 23:59:59
```

## 视觉效果

### 附魔动画
- 开始附魔: 装备发光效果
- 附魔成功: 爆炸光效 + 音效
- 附魔失败: 淡出效果

### 颜色标识
- 魔0: 白色
- 魔1-3: 绿色系
- 魔4-5: 蓝色系
- 魔6-7: 紫色系
- 魔8-9: 橙红色系
- 魔10: 红色 (最高)

## 经济平衡

### 成本计算
- 魔1-3: 约 330币 (99×3 + 保底)
- 魔4-5: 约 1500币
- 魔6-7: 约 4000币
- 魔8-10: 约 8000币+

### 收益分析
- 魔5装备: 属性提升275%，战力翻倍
- 魔10装备: 属性提升550%，顶级战力
- 投入产出比合理，鼓励玩家持续投入

