package com.iohao.mmo.title.service;

import com.iohao.mmo.title.entity.PlayerTitle;
import com.iohao.mmo.title.entity.TitleTemplate;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class TitleServiceTest {
    @Test
    void equipRequiresOwnedTitleAndRequiredLevel() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        TitleService service = new TitleService(mongo);
        TitleTemplate template = template("title-1", 30);
        PlayerTitle player = new PlayerTitle();
        player.setPlayerId(7);
        player.getOwnedTitleIds().add(template.getId());
        when(mongo.findById(template.getId(), TitleTemplate.class)).thenReturn(template);
        when(mongo.findOne(any(), eq(PlayerTitle.class))).thenReturn(player);

        Document level = new Document("level", 29);
        when(mongo.findById(7L, Document.class, "level")).thenReturn(level);
        assertThrows(IllegalArgumentException.class, () -> service.equipTitle(7, template.getId()));
        assertNull(player.getEquippedTitleId());
        verify(mongo, never()).save(player);

        when(mongo.findById(7L, Document.class, "level")).thenReturn(new Document("level", 30));
        assertTrue(service.equipTitle(7, template.getId()));
        assertEquals(template.getId(), player.getEquippedTitleId());
        verify(mongo).save(player);
    }

    @Test
    void unknownOrUnownedTitleCannotBeEquippedAndUnequipClearsState() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        TitleService service = new TitleService(mongo);
        PlayerTitle player = new PlayerTitle();
        player.setPlayerId(8);
        when(mongo.findOne(any(), eq(PlayerTitle.class))).thenReturn(player);
        assertFalse(service.equipTitle(8, "missing"));

        TitleTemplate template = template("owned", 1);
        when(mongo.findById(template.getId(), TitleTemplate.class)).thenReturn(template);
        assertFalse(service.equipTitle(8, template.getId()));

        player.setEquippedTitleId(template.getId());
        when(mongo.save(player)).thenReturn(player);
        service.unequipTitle(8);
        assertNull(player.getEquippedTitleId());
        verify(mongo).save(player);
    }

    private static TitleTemplate template(String id, int requiredLevel) {
        TitleTemplate template = new TitleTemplate();
        template.setId(id);
        template.setName("测试称号");
        template.setRequiredLevel(requiredLevel);
        return template;
    }
}
