package com.iohao.mmo.shop.service;

import com.iohao.mmo.shop.entity.PlayerCurrency;
import com.iohao.mmo.shop.entity.PurchaseHistory;
import com.iohao.mmo.shop.entity.ShopItem;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ShopService {
    private final MongoTemplate mongoTemplate;
    private final Map<String, ShopItem> shopItems = new ConcurrentHashMap<>();

    public ShopService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @PostConstruct
    public void init() {
        initShopItems();
    }

    private void initShopItems() {
        // ── 热销 ──
        addItem("hot_001", "新手礼包", "🎁", "包含大量新手资源", 99, "diamond", "hot", "rare", true, 999,
                Arrays.asList("金币x10000", "经验药水x5", "复活石x3"), null, null, 0, -1);
        addItem("hot_002", "超级经验药水", "⚗️", "立即获得50000经验值", 299, "diamond", "hot", "epic", true, 999,
                null, null, createEffect("exp", 50000), 0, -1);
        addItem("hot_003", "传说宝箱", "📦", "必出传说品质装备", 999, "diamond", "hot", "legendary", true, 10,
                Arrays.asList("传说武器x1", "传说防具x1"), null, null, 0, -1);
        addItem("hot_004", "月卡", "🎫", "30天每日领取200钻石", 588, "diamond", "hot", "epic", true, 1,
                null, null, null, 30, -1);

        // ── 武器（position=1） ──
        addItem("weapon_001", "烈焰之剑", "🗡️", "附带火焰伤害的强力武器", 5000, "gold", "equipment", "epic", false, 99,
                null, Map.of("物攻", 150, "火焰伤害", 50, "暴击率", 10), null, 0, 1);
        addItem("weapon_002", "冰霜法杖", "🪄", "冰系魔法武器", 4500, "gold", "equipment", "epic", false, 99,
                null, Map.of("法攻", 180, "冰冻几率", 15), null, 0, 1);
        addItem("weapon_003", "雷霆之锤", "🔨", "雷电属性重型武器", 6000, "gold", "equipment", "legendary", false, 50,
                null, Map.of("物攻", 200, "雷电伤害", 80, "眩晕几率", 20), null, 0, 1);
        addItem("weapon_004", "影月弯刀", "🌙", "月光加持的敏捷武器", 3800, "gold", "equipment", "rare", false, 99,
                null, Map.of("物攻", 120, "速度", 40, "暴击率", 15), null, 0, 1);
        addItem("weapon_005", "炼狱魔杖", "🔥", "灼热的暗黑魔杖", 8000, "gold", "equipment", "legendary", false, 30,
                null, Map.of("法攻", 250, "暗影伤害", 100, "法力回复", 30), null, 0, 1);
        addItem("weapon_006", "翠竹长剑", "🎋", "轻灵飘逸的入门武器", 1200, "gold", "equipment", "common", false, 999,
                null, Map.of("物攻", 60, "速度", 20), null, 0, 1);
        addItem("weapon_007", "玄铁重剑", "⚔️", "无坚不摧的铁剑", 2500, "gold", "equipment", "uncommon", false, 999,
                null, Map.of("物攻", 100, "物防", 15), null, 0, 1);

        // ── 护甲（position=2） ──
        addItem("armor_001", "龙鳞铠甲", "🛡️", "龙鳞打造的坚固铠甲", 4000, "gold", "equipment", "epic", false, 99,
                null, Map.of("物防", 120, "生命", 500), null, 0, 2);
        addItem("armor_002", "魔法长袍", "👘", "增强魔法防御的长袍", 3500, "gold", "equipment", "rare", false, 99,
                null, Map.of("法防", 100, "法力", 300), null, 0, 2);
        addItem("armor_003", "暗影皮甲", "🦇", "轻便且灵活的皮甲", 2800, "gold", "equipment", "rare", false, 99,
                null, Map.of("物防", 80, "速度", 35, "闪避", 10), null, 0, 2);
        addItem("armor_004", "圣光战铠", "✨", "神圣力量祝福的铠甲", 7000, "gold", "equipment", "legendary", false, 30,
                null, Map.of("物防", 180, "法防", 100, "生命", 800), null, 0, 2);
        addItem("armor_005", "布衣", "👕", "朴素的入门护甲", 800, "gold", "equipment", "common", false, 999,
                null, Map.of("物防", 30, "生命", 100), null, 0, 2);
        addItem("armor_006", "铁甲", "🪖", "标准的铁制护甲", 1800, "gold", "equipment", "uncommon", false, 999,
                null, Map.of("物防", 60, "法防", 20, "生命", 250), null, 0, 2);

        // ── 饰品（position=3） ──
        addItem("accessory_001", "龙心项链", "📿", "蕴含龙族力量的项链", 3500, "gold", "equipment", "epic", false, 99,
                null, Map.of("生命", 300, "物攻", 50, "法攻", 50), null, 0, 3);
        addItem("accessory_002", "幽灵戒指", "💍", "增强暗影之力", 3000, "gold", "equipment", "rare", false, 99,
                null, Map.of("暴击率", 20, "法攻", 80), null, 0, 3);
        addItem("accessory_003", "疾风耳坠", "💎", "提升行动速度", 2500, "gold", "equipment", "rare", false, 99,
                null, Map.of("速度", 60, "闪避", 15), null, 0, 3);
        addItem("accessory_004", "不灭灵珠", "🔮", "传说中的护身灵珠", 9000, "gold", "equipment", "legendary", false, 20,
                null, Map.of("生命", 600, "物防", 80, "法防", 80, "治愈", 50), null, 0, 3);
        addItem("accessory_005", "铜质护符", "🪬", "入门级护身符", 600, "gold", "equipment", "common", false, 999,
                null, Map.of("生命", 80, "法防", 10), null, 0, 3);

        // ── 消耗品 ──
        addItem("consumable_001", "生命药水", "❤️", "恢复500点生命值", 50, "gold", "consumable", "common", false, 999,
                null, null, createEffect("heal", 500), 0, -1);
        addItem("consumable_002", "魔法药水", "💙", "恢复300点魔法值", 40, "gold", "consumable", "common", false, 999,
                null, null, createEffect("mana", 300), 0, -1);
        addItem("consumable_003", "经验药水", "⚗️", "获得1000经验值", 100, "gold", "consumable", "uncommon", false, 999,
                null, null, createEffect("exp", 1000), 0, -1);
        addItem("consumable_004", "大生命药水", "❤️‍🔥", "恢复2000点生命值", 200, "gold", "consumable", "rare", false, 999,
                null, null, createEffect("heal", 2000), 0, -1);
        addItem("consumable_005", "高级经验药水", "🧪", "获得5000经验值", 400, "gold", "consumable", "rare", false, 999,
                null, null, createEffect("exp", 5000), 0, -1);
        addItem("consumable_006", "复活石", "💠", "战斗中复活一次", 150, "gold", "consumable", "uncommon", false, 999,
                null, null, createEffect("revive", 1), 0, -1);

        // ── 材料 ──
        addItem("material_001", "附魔石", "🪨", "附魔装备所需的基础材料", 300, "gold", "material", "uncommon", false, 999,
                null, null, null, 0, -1);
        addItem("material_002", "精炼矿石", "⛏️", "装备升级强化材料", 500, "gold", "material", "rare", false, 999,
                null, null, null, 0, -1);
        addItem("material_003", "灵魂碎片", "🌀", "高级附魔必需品", 800, "gold", "material", "epic", false, 200,
                null, null, null, 0, -1);
        addItem("material_004", "鬼炉精华", "🔥", "鬼炉升级的稀有材料", 1500, "gold", "material", "legendary", false, 50,
                null, null, null, 0, -1);

        // ── 特殊 ──
        addItem("special_001", "宠物蛋", "🥚", "孵化随机宠物", 500, "diamond", "special", "epic", false, 20,
                Arrays.asList("随机宠物x1"), null, null, 0, -1);
        addItem("special_002", "传送卷轴", "📜", "传送到任意地点", 50, "diamond", "special", "uncommon", false, 99,
                null, null, createEffect("teleport", 1), 0, -1);
        addItem("special_003", "双倍经验卡", "🎴", "1小时双倍经验", 200, "diamond", "special", "rare", false, 50,
                null, null, null, 60, -1);
        addItem("special_004", "洗点丹", "💊", "重置装备分配属性", 100, "diamond", "special", "rare", false, 99,
                null, null, createEffect("reset_attr", 1), 0, -1);

        log.info("商城商品初始化完成，共 {} 件商品", shopItems.size());
    }

    private void addItem(String id, String name, String icon, String desc, int price, String currency,
                         String category, String quality, boolean isHot, int stock, List<String> contents,
                         Map<String, Integer> attributes, ShopItem.Effect effect, int duration, int equipPosition) {
        ShopItem item = new ShopItem();
        item.setId(id);
        item.setName(name);
        item.setIcon(icon);
        item.setDescription(desc);
        item.setPrice(price);
        item.setCurrency(currency);
        item.setCategory(category);
        item.setQuality(quality);
        item.setHot(isHot);
        item.setStock(stock);
        item.setContents(contents);
        item.setAttributes(attributes);
        item.setEffect(effect);
        item.setDuration(duration);
        item.setEquipPosition(equipPosition);
        shopItems.put(id, item);
    }

    private ShopItem.Effect createEffect(String type, int value) {
        ShopItem.Effect effect = new ShopItem.Effect();
        effect.setType(type);
        effect.setValue(value);
        return effect;
    }

    public List<ShopItem> listItems(String category) {
        if (category == null || category.isEmpty()) {
            return new ArrayList<>(shopItems.values());
        }
        if ("hot".equals(category)) {
            return shopItems.values().stream()
                    .filter(ShopItem::isHot)
                    .toList();
        }
        return shopItems.values().stream()
                .filter(item -> category.equals(item.getCategory()))
                .collect(Collectors.toList());
    }

    public ShopItem getItem(String itemId) {
        return shopItems.get(itemId);
    }

    public PlayerCurrency getPlayerCurrency(long userId) {
        PlayerCurrency currency = mongoTemplate.findOne(
                Query.query(Criteria.where("userId").is(userId)), PlayerCurrency.class);
        if (currency == null) {
            currency = new PlayerCurrency(userId);
            mongoTemplate.save(currency);
        }
        return currency;
    }

    public void saveCurrency(PlayerCurrency currency) {
        mongoTemplate.save(currency);
    }

    public void addCurrency(long userId, int gold, int diamond) {
        PlayerCurrency currency = getPlayerCurrency(userId);
        if (gold > 0) currency.setGold(currency.getGold() + gold);
        if (diamond > 0) currency.setDiamond(currency.getDiamond() + diamond);
        mongoTemplate.save(currency);
    }

    public Map<String, Object> purchaseItem(long userId, String itemId, int quantity) {
        Map<String, Object> result = new HashMap<>();

        ShopItem item = shopItems.get(itemId);
        if (item == null) {
            result.put("success", false);
            result.put("message", "商品不存在");
            return result;
        }

        if (item.getStock() < quantity) {
            result.put("success", false);
            result.put("message", "库存不足");
            return result;
        }

        int totalPrice = item.getPrice() * quantity;
        PlayerCurrency currency = getPlayerCurrency(userId);

        if (!currency.hasEnough(item.getCurrency(), totalPrice)) {
            result.put("success", false);
            result.put("message", "gold".equals(item.getCurrency()) ? "金币不足" : "钻石不足");
            return result;
        }

        currency.deduct(item.getCurrency(), totalPrice);
        mongoTemplate.save(currency);
        item.setStock(item.getStock() - quantity);

        PurchaseHistory history = new PurchaseHistory();
        history.setUserId(userId);
        history.setItemId(itemId);
        history.setItemName(item.getName());
        history.setQuantity(quantity);
        history.setPrice(totalPrice);
        history.setCurrency(item.getCurrency());
        history.setTimestamp(System.currentTimeMillis());
        mongoTemplate.save(history);

        result.put("success", true);
        result.put("message", "购买成功");
        result.put("remainingGold", currency.getGold());
        result.put("remainingDiamond", currency.getDiamond());
        result.put("remainingStock", item.getStock());

        log.info("玩家 {} 购买了 {} x{}", userId, item.getName(), quantity);
        return result;
    }

    public List<PurchaseHistory> getPurchaseHistory(long userId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("userId").is(userId)), PurchaseHistory.class);
    }

    /** 获取所有装备类商品（用于随机掉落） */
    public List<ShopItem> listEquipItems() {
        return shopItems.values().stream()
                .filter(item -> item.getEquipPosition() > 0)
                .collect(Collectors.toList());
    }

    /** 按品质筛选装备 */
    public List<ShopItem> listEquipItemsByMaxQuality(String maxQuality) {
        List<String> qualityOrder = List.of("common", "uncommon", "rare", "epic", "legendary");
        int maxIdx = qualityOrder.indexOf(maxQuality);
        if (maxIdx < 0) maxIdx = qualityOrder.size() - 1;
        int finalMaxIdx = maxIdx;
        return shopItems.values().stream()
                .filter(item -> item.getEquipPosition() > 0)
                .filter(item -> qualityOrder.indexOf(item.getQuality()) <= finalMaxIdx)
                .collect(Collectors.toList());
    }
}
