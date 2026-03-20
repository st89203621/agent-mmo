# 活动系统设计文档

## 概述

活动系统为游戏提供了丰富多样的限时活动,包括天降神宠、世界BOSS、限时秘境、幸运转盘等多种玩法,提升玩家参与度和游戏趣味性。

## 活动类型

### 1. 天降神宠 (Divine Pet Drop)

**玩法说明:**
- 活动期间,地图上会随机掉落宠物蛋
- 玩家点击宠物蛋即可砸开,获得宠物
- 宠物蛋有不同品质,品质越高资质加成越高
- 宠物蛋有存活时间限制,过期自动消失

**品质等级:**
- 普通(白色): +0% 资质
- 优秀(绿色): +10% 资质
- 稀有(蓝色): +25% 资质
- 史诗(紫色): +50% 资质
- 传说(橙色): +100% 资质
- 神话(红色): +200% 资质

**特色:**
- 天降动画效果,从天而降
- 不同品质有不同颜色和发光效果
- 砸蛋有震动、爆炸等炫酷特效
- 先到先得,增加竞争性

### 2. 世界BOSS (World Boss)

**玩法说明:**
- 定时刷新强大的世界BOSS
- 全服玩家共同挑战
- 根据伤害排行发放奖励
- 最后一击玩家获得额外奖励

**BOSS配置:**
- 炎魔领主: Lv.100, 1000万HP
- 冰霜巨龙: Lv.120, 1500万HP
- 虚空领主: Lv.150, 3000万HP

**奖励机制:**
- 第1名: 神话装备 + 5000钻石 + 专属称号
- 第2-3名: 传说装备 + 3000钻石
- 第4-10名: 史诗装备 + 1000钻石
- 第11-50名: 稀有装备 + 500钻石
- 第51-100名: 金币 + 100钻石

**特色:**
- 实时伤害排行榜
- BOSS血量全服共享
- 多种技能和弱点元素
- 击杀后全服公告

### 3. 限时秘境 (Timed Realm)

**玩法说明:**
- 特定时间段开放的高难度副本
- 多层挑战,层数越高奖励越好
- 有时间限制,需要快速通关
- 每日进入次数限制

**秘境类型:**
- 试炼之塔: 100层,每天18-22点开放
- 深渊副本: 50层,周末全天开放

**难度等级:**
- 简单: 1.0倍奖励
- 普通: 1.5倍奖励
- 困难: 2.0倍奖励
- 噩梦: 3.0倍奖励
- 地狱: 5.0倍奖励

**特色:**
- 限时开放增加稀缺性
- 高难度高收益
- 层数记录和排行榜
- 通关奖励丰厚

### 4. 幸运转盘 (Lucky Wheel)

**玩法说明:**
- 消耗钻石转动转盘抽奖
- 单抽100钻石,十连900钻石
- 每日1次免费抽奖
- 10抽保底机制

**奖品池:**
- 神话宠物/装备 (0.1%)
- 传说宠物/装备 (0.5%)
- 史诗道具/称号 (2%)
- 稀有道具 (8%)
- 钻石/金币/经验 (89.4%)

**特色:**
- 炫酷的转盘动画
- 保底机制保证体验
- 大奖全服公告
- 每日免费机会

## 技术实现

### 后端架构

```
event-logic/
├── entity/           # 实体类
│   ├── GameEvent.java              # 活动基础实体
│   ├── DivinePetEgg.java          # 宠物蛋实体
│   ├── WorldBossEvent.java        # 世界BOSS实体
│   ├── TimedRealmEvent.java       # 限时秘境实体
│   ├── LuckyWheelEvent.java       # 幸运转盘实体
│   └── PlayerEventProgress.java   # 玩家进度实体
├── repository/       # 数据访问层
├── service/          # 业务逻辑层
│   ├── DivinePetEventService.java
│   ├── WorldBossEventService.java
│   └── LuckyWheelEventService.java
└── action/           # 控制器层
    └── EventAction.java
```

### 前端架构

```
my-phaser-game/src/
├── config/
│   └── EventConfig.js        # 活动配置
├── managers/
│   └── EventManager.js       # 活动管理器
├── ui/
│   └── EventUI.js           # 活动UI
└── scenes/
    └── DivinePetEventScene.js # 天降神宠场景
```

## API接口

### 天降神宠

```javascript
// 获取宠物蛋列表
eventManager.getPetEggs(eventId)

// 砸宠物蛋
eventManager.smashPetEgg(eggId)
```

### 世界BOSS

```javascript
// 挑战BOSS
eventManager.challengeWorldBoss(bossId, damage, userName)

// 获取排行榜
eventManager.getBossRanking(bossId)
```

### 幸运转盘

```javascript
// 单抽
eventManager.spinWheel(wheelId, useFree)

// 十连抽
eventManager.spinWheelTen(wheelId)

// 获取转盘配置
eventManager.getWheelConfig(wheelId)
```

## 事件系统

活动系统集成了完整的事件总线:

```javascript
// 天降神宠事件
Events.EVENT_PET_EGG_DROPPED    // 宠物蛋掉落
Events.EVENT_PET_EGG_SMASHED    // 宠物蛋被砸开
Events.EVENT_PET_EGG_EXPIRED    // 宠物蛋过期

// 世界BOSS事件
Events.EVENT_BOSS_SPAWNED       // BOSS刷新
Events.EVENT_BOSS_ATTACKED      // BOSS被攻击
Events.EVENT_BOSS_KILLED        // BOSS被击杀
Events.EVENT_BOSS_RANKING_UPDATED // 排行榜更新

// 幸运转盘事件
Events.EVENT_WHEEL_SPIN         // 转盘抽奖
Events.EVENT_WHEEL_JACKPOT      // 中大奖
Events.EVENT_WHEEL_GUARANTEE    // 保底触发
```

## 配置说明

### 天降神宠配置

```javascript
DIVINE_PET_DROP: {
    DROP_CONFIG: {
        spawnInterval: 30000,    // 刷新间隔30秒
        eggLifeTime: 300000,     // 蛋存活5分钟
        maxEggsOnMap: 20         // 地图最多20个蛋
    }
}
```

### 世界BOSS配置

```javascript
WORLD_BOSS: {
    SPAWN_SCHEDULE: [
        { hour: 12, minute: 0 },  // 中午12点
        { hour: 20, minute: 0 }   // 晚上8点
    ]
}
```

## 扩展性

系统设计支持轻松添加新活动类型:

1. 在`EventType`枚举中添加新类型
2. 创建对应的实体类
3. 实现Service业务逻辑
4. 在Action中添加接口
5. 前端添加UI和配置

## 未来规划

- [ ] 添加更多活动类型(签到、充值返利等)
- [ ] 活动预告和倒计时系统
- [ ] 活动成就和积分系统
- [ ] 跨服活动支持
- [ ] 活动数据统计和分析
- [ ] 活动自动化调度系统

