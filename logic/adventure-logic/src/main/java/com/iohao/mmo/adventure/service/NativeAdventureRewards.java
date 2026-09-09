package com.iohao.mmo.adventure.service;

import com.iohao.mmo.adventure.entity.NativeAdventureProgress;
import com.iohao.mmo.adventure.entity.NativeRewardGrant;
import com.iohao.mmo.adventure.proto.NativeRewardItem;
import com.iohao.mmo.adventure.proto.NativeRewardMessage;
import com.iohao.mmo.bag.service.EconomyGrant;
import com.iohao.mmo.bag.service.ServerEconomyService;
import com.iohao.mmo.equip.entity.ElseEquipProperty;
import com.iohao.mmo.equip.entity.Equip;
import com.iohao.mmo.equip.entity.FixedEquipProperty;
import com.iohao.mmo.level.entity.Level;
import com.iohao.mmo.level.service.LevelService;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NativeAdventureRewards {
    private static final String RECEIPT = "nativeAdventureRewardSequence";
    private final MongoTemplate mongo;
    private final ServerEconomyService economy;
    private final LevelService levels;

    // The ordered outbox is saved with journey progress before any economic mutation.
    public List<NativeRewardMessage> drain(NativeAdventureProgress progress) {
        List<NativeRewardMessage> result = new ArrayList<>();
        while (!progress.pendingRewards.isEmpty()) {
            NativeRewardGrant reward = progress.pendingRewards.getFirst();
            apply(progress.userId, reward);
            result.add(message(progress.userId, reward));
            progress.pendingRewards.removeFirst();
            mongo.save(progress);
        }
        return result;
    }

    void apply(long userId, NativeRewardGrant reward) {
        if (reward.equipment) grantEquip(userId, reward);
        java.util.Map<String,Integer> items = new java.util.HashMap<>();
        if (reward.ore > 0) items.put("material_002", reward.ore);
        if (reward.essence > 0) items.put("material_003", reward.essence);
        if (reward.goldenBeans > 0) items.put("golden_bean", reward.goldenBeans);
        if (reward.equipment) items.put(equipId(userId, reward), 1);
        economy.grant(userId, new EconomyGrant("native-adventure:" + userId + ":" + reward.sequence, reward.gold, 0, items));
        levels.ofLevel(userId);
        mongo.updateFirst(receiptQuery("_id", userId, reward.sequence),
                new Update().inc("exp", reward.experience).set(RECEIPT, reward.sequence), Level.class);
        levels.addExpWithAutoLevelUp(userId, 0);
    }

    private static Query receiptQuery(String key, long userId, long sequence) {
        return Query.query(new Criteria().andOperator(Criteria.where(key).is(userId),
                new Criteria().orOperator(Criteria.where(RECEIPT).exists(false), Criteria.where(RECEIPT).lt(sequence))));
    }

    private void grantEquip(long userId, NativeRewardGrant reward) {
        int level = Math.max(1, reward.equipmentLevel);
        int quality = Math.max(1, reward.equipmentQuality);
        FixedEquipProperty fixed = FixedEquipProperty.builder()
                .hp(reward.equipmentSlot == 1 ? 30 + level * 8 : 0)
                .physicsAttack(reward.equipmentSlot == 2 ? (18 + level * 4) * quality : 0)
                .physicsDefense(reward.equipmentSlot == 1 ? (8 + level * 2) * quality : 0).build();
        Equip equip = Equip.builder().id(equipId(userId, reward)).userId(userId)
                .itemTypeId(equipType(reward)).position(reward.equipmentSlot).level(level)
                .grade(1).quality(quality).attrTotal(20 + level * 4).undistributedAttr(20 + level * 4)
                .totalAttrMin(20 + level * 4).totalAttrMax(40 + level * 6)
                .fixedEquipProperty(fixed).fixedEquipPropertyMin(fixed).fixedEquipPropertyMax(fixed)
                .elseEquipProperty(ElseEquipProperty.resetElseEquipProperty()).build();
        Document doc = new Document();
        mongo.getConverter().write(equip, doc);
        Update insert = new Update();
        doc.forEach((key, value) -> { if (!"_id".equals(key)) insert.setOnInsert(key, value); });
        mongo.upsert(Query.query(Criteria.where("_id").is(equip.getId())), insert, Equip.class);
    }

    static String equipId(long userId, NativeRewardGrant reward) { return "native_drop_" + userId + "_" + reward.sequence; }
    private static String equipType(NativeRewardGrant reward) { return reward.equipmentSlot == 1 ? "armor_005" : "weapon_006"; }

    static NativeRewardMessage message(long userId, NativeRewardGrant reward) {
        NativeRewardMessage message = new NativeRewardMessage();
        message.id = "native_" + userId + "_" + reward.sequence;
        message.gold = reward.gold;
        message.experience = reward.experience;
        addItem(message, "material_002", "精炼矿石", reward.ore, false);
        addItem(message, "material_003", "灵魂碎片", reward.essence, true);
        addItem(message, "golden_bean", "金豆子", reward.goldenBeans, true);
        if (reward.equipment) {
            message.equipmentId = equipId(userId, reward);
            addItem(message, equipType(reward), reward.equipmentSlot == 1 ? "旅途轻甲" : "花径长剑", 1, reward.equipmentQuality > 1);
        }
        return message;
    }

    private static void addItem(NativeRewardMessage reward, String type, String name, int quantity, boolean important) {
        if (quantity <= 0) return;
        NativeRewardItem item = new NativeRewardItem();
        item.itemTypeId = type; item.name = name; item.quantity = quantity; item.important = important;
        reward.items.add(item);
    }
}
