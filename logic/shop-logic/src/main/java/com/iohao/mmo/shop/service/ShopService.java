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
        addItem("hot_001", "新手礼包", "🎁", "包含大量新手资源", 99, "diamond", "hot", "rare", true, 999, 
                Arrays.asList("金币x10000", "经验药水x5", "复活石x3"), null, null, 0);
        
        addItem("hot_002", "超级经验药水", "⚗️", "立即获得50000经验值", 299, "diamond", "hot", "epic", true, 999, 
                null, null, createEffect("exp", 50000), 0);
        
        addItem("hot_003", "传说宝箱", "📦", "必出传说品质装备", 999, "diamond", "hot", "legendary", true, 10, 
                Arrays.asList("传说武器x1", "传说防具x1"), null, null, 0);
        
        addItem("hot_004", "月卡", "🎫", "30天每日领取200钻石", 588, "diamond", "hot", "epic", true, 1, 
                null, null, null, 30);
        
        addItem("hot_005", "复活石礼包", "💎", "10个复活石超值礼包", 199, "diamond", "hot", "rare", true, 999, 
                Arrays.asList("复活石x10"), null, null, 0);

        addItem("weapon_001", "烈焰之剑", "🗡️", "附带火焰伤害的强力武器", 5000, "gold", "weapon", "epic", false, 5, 
                null, Map.of("攻击力", 150, "火焰伤害", 50, "暴击率", 10), null, 0);
        
        addItem("weapon_002", "冰霜法杖", "🪄", "冰系魔法武器", 4500, "gold", "weapon", "epic", false, 5, 
                null, Map.of("魔法攻击", 180, "冰冻几率", 15), null, 0);
        
        addItem("weapon_003", "雷霆之锤", "🔨", "雷电属性重型武器", 6000, "gold", "weapon", "legendary", false, 3, 
                null, Map.of("攻击力", 200, "雷电伤害", 80, "眩晕几率", 20), null, 0);

        addItem("armor_001", "龙鳞铠甲", "🛡️", "龙鳞打造的坚固铠甲", 4000, "gold", "armor", "epic", false, 5, 
                null, Map.of("防御力", 120, "生命值", 500), null, 0);
        
        addItem("armor_002", "魔法长袍", "👘", "增强魔法防御的长袍", 3500, "gold", "armor", "rare", false, 10, 
                null, Map.of("魔法防御", 100, "魔法值", 300), null, 0);

        addItem("consumable_001", "生命药水", "❤️", "恢复500点生命值", 50, "gold", "consumable", "common", false, 999, 
                null, null, createEffect("heal", 500), 0);
        
        addItem("consumable_002", "魔法药水", "💙", "恢复300点魔法值", 40, "gold", "consumable", "common", false, 999, 
                null, null, createEffect("mana", 300), 0);
        
        addItem("consumable_003", "经验药水", "⚗️", "获得1000经验值", 100, "gold", "consumable", "uncommon", false, 999, 
                null, null, createEffect("exp", 1000), 0);

        addItem("special_001", "宠物蛋", "🥚", "孵化随机宠物", 500, "diamond", "special", "epic", false, 20, 
                Arrays.asList("随机宠物x1"), null, null, 0);
        
        addItem("special_002", "传送卷轴", "📜", "传送到任意地点", 50, "diamond", "special", "uncommon", false, 99, 
                null, null, createEffect("teleport", 1), 0);
        
        addItem("special_003", "双倍经验卡", "🎴", "1小时双倍经验", 200, "diamond", "special", "rare", false, 50, 
                null, null, null, 60);

        log.info("商城商品初始化完成，共 {} 件商品", shopItems.size());
    }

    private void addItem(String id, String name, String icon, String desc, int price, String currency, 
                        String category, String quality, boolean isHot, int stock, List<String> contents,
                        Map<String, Integer> attributes, ShopItem.Effect effect, int duration) {
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

    /** 保存货币变更到数据库 */
    public void saveCurrency(PlayerCurrency currency) {
        mongoTemplate.save(currency);
    }

    /** 增加货币（签到、成就等奖励） */
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
}

