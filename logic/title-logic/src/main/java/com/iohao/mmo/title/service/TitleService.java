package com.iohao.mmo.title.service;

import com.iohao.mmo.title.entity.PlayerTitle;
import com.iohao.mmo.title.entity.TitleTemplate;
import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@AllArgsConstructor
public class TitleService {
    final MongoTemplate mongoTemplate;

    @PostConstruct
    public void initTemplates() {
        if (mongoTemplate.count(new Query(), TitleTemplate.class) > 0) return;

        // 声望称号 - 加攻击和内力
        saveTpl("万人敬仰", "PRESTIGE", 90, "受万人敬仰，攻击大幅提升", 80, 0, 0, 50, 0, 0, 0);
        saveTpl("威震四方", "PRESTIGE", 100, "威名远播，攻击力惊人", 120, 0, 0, 80, 0, 0, 0);
        saveTpl("天下无敌", "PRESTIGE", 120, "攻击登峰造极", 200, 0, 0, 130, 0, 0, 0);
        saveTpl("初露锋芒", "PRESTIGE", 30, "崭露头角", 20, 0, 0, 12, 0, 0, 0);
        saveTpl("锋芒毕露", "PRESTIGE", 60, "攻击力不俗", 45, 0, 0, 30, 0, 0, 0);

        // 威望称号 - 加血量和防御
        saveTpl("豪情万丈", "POWER", 90, "气吞山河，防御坚如磐石", 0, 60, 500, 0, 0, 0, 0);
        saveTpl("固若金汤", "POWER", 100, "防御超群，血量惊人", 0, 100, 800, 0, 0, 0, 0);
        saveTpl("万夫莫开", "POWER", 120, "天下第一防御", 0, 160, 1200, 0, 0, 0, 0);
        saveTpl("铜皮铁骨", "POWER", 30, "初具防御之力", 0, 15, 100, 0, 0, 0, 0);
        saveTpl("金钟罩体", "POWER", 60, "防御可观", 0, 35, 280, 0, 0, 0, 0);

        // 荣誉称号 - 加附加攻防和敏捷
        saveTpl("横扫千军", "HONOR", 90, "附加属性全面提升", 0, 0, 0, 0, 50, 40, 30);
        saveTpl("纵横天下", "HONOR", 100, "附加攻防惊人，敏捷超群", 0, 0, 0, 0, 80, 65, 50);
        saveTpl("举世无双", "HONOR", 120, "附加属性登峰造极", 0, 0, 0, 0, 130, 100, 80);
        saveTpl("身手不凡", "HONOR", 30, "初具敏捷之力", 0, 0, 0, 0, 12, 10, 8);
        saveTpl("疾风迅雷", "HONOR", 60, "敏捷与附加属性可观", 0, 0, 0, 0, 28, 22, 18);
    }

    private void saveTpl(String name, String type, int level, String desc,
                         int atk, int def, int hp, int magicAtk,
                         int extraAtk, int extraDef, int agility) {
        TitleTemplate t = new TitleTemplate();
        t.setName(name);
        t.setTitleType(type);
        t.setRequiredLevel(level);
        t.setDescription(desc);
        t.setBonusAtk(atk);
        t.setBonusDef(def);
        t.setBonusHp(hp);
        t.setBonusMagicAtk(magicAtk);
        t.setBonusExtraAtk(extraAtk);
        t.setBonusExtraDef(extraDef);
        t.setBonusAgility(agility);
        mongoTemplate.save(t);
    }

    public List<TitleTemplate> getAllTemplates() {
        return mongoTemplate.findAll(TitleTemplate.class);
    }

    public PlayerTitle getPlayerTitle(long playerId) {
        PlayerTitle pt = mongoTemplate.findOne(
            Query.query(Criteria.where("playerId").is(playerId)), PlayerTitle.class);
        if (pt == null) {
            pt = new PlayerTitle();
            pt.setPlayerId(playerId);
            mongoTemplate.save(pt);
        }
        return pt;
    }

    public TitleTemplate getTemplate(String titleId) {
        return mongoTemplate.findById(titleId, TitleTemplate.class);
    }

    public void grantTitle(long playerId, String titleId) {
        PlayerTitle pt = getPlayerTitle(playerId);
        if (!pt.getOwnedTitleIds().contains(titleId)) {
            pt.getOwnedTitleIds().add(titleId);
            mongoTemplate.save(pt);
        }
    }

    public boolean equipTitle(long playerId, String titleId) {
        PlayerTitle pt = getPlayerTitle(playerId);
        if (!pt.getOwnedTitleIds().contains(titleId)) return false;
        pt.setEquippedTitleId(titleId);
        mongoTemplate.save(pt);
        return true;
    }

    public void unequipTitle(long playerId) {
        PlayerTitle pt = getPlayerTitle(playerId);
        pt.setEquippedTitleId(null);
        mongoTemplate.save(pt);
    }

    public TitleTemplate getEquippedTemplate(long playerId) {
        PlayerTitle pt = getPlayerTitle(playerId);
        if (pt.getEquippedTitleId() == null) return null;
        return getTemplate(pt.getEquippedTitleId());
    }
}
