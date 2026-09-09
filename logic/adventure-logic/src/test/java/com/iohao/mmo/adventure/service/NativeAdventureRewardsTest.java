package com.iohao.mmo.adventure.service;

import com.iohao.mmo.adventure.entity.NativeAdventureProgress;
import com.iohao.mmo.adventure.entity.NativeRewardGrant;
import com.iohao.mmo.bag.service.EconomyGrant;
import com.iohao.mmo.bag.service.ServerEconomyService;
import com.iohao.mmo.level.entity.Level;
import com.iohao.mmo.level.service.LevelService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NativeAdventureRewardsTest {
    @Test
    void interruptedGrantStaysInOutboxAndRetriesUsingSameEconomyReceipt() {
        MongoTemplate mongo=mock(MongoTemplate.class);
        ServerEconomyService economy=mock(ServerEconomyService.class);
        LevelService levels=mock(LevelService.class);
        NativeAdventureRewards rewards=new NativeAdventureRewards(mongo,economy,levels);
        NativeAdventureProgress progress=new NativeAdventureProgress(); progress.userId=7;
        NativeRewardGrant grant=new NativeRewardGrant(); grant.sequence=4; grant.gold=60; grant.experience=25; grant.ore=2;
        progress.pendingRewards.add(grant);
        when(economy.grant(eq(7L),any())).thenThrow(new IllegalStateException("database unavailable")).thenReturn(null);
        assertThrows(IllegalStateException.class,()->rewards.drain(progress));
        assertEquals(1,progress.pendingRewards.size());
        assertEquals(1,rewards.drain(progress).size());
        assertTrue(progress.pendingRewards.isEmpty());
        ArgumentCaptor<EconomyGrant> request=ArgumentCaptor.forClass(EconomyGrant.class);
        verify(economy,times(2)).grant(eq(7L),request.capture());
        assertEquals(request.getAllValues().getFirst().sourceId(),request.getAllValues().getLast().sourceId());
        assertEquals("native-adventure:7:4",request.getValue().sourceId());
        assertEquals(2,request.getValue().items().get("material_002"));
    }

    @Test
    void ExperienceAndReceiptAreUpdatedAtomicallyBeforeOutboxClears() {
        MongoTemplate mongo=mock(MongoTemplate.class);
        ServerEconomyService economy=mock(ServerEconomyService.class);
        LevelService levels=mock(LevelService.class);
        NativeAdventureRewards rewards=new NativeAdventureRewards(mongo,economy,levels);
        NativeRewardGrant grant=new NativeRewardGrant();grant.sequence=12;grant.experience=160;
        rewards.apply(9,grant);
        ArgumentCaptor<Query> query=ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<Update> update=ArgumentCaptor.forClass(Update.class);
        verify(mongo).updateFirst(query.capture(),update.capture(),eq(Level.class));
        String filter=query.getValue().getQueryObject().toJson();
        assertTrue(filter.contains("nativeAdventureRewardSequence"));
        assertTrue(filter.contains("$lt"));
        assertEquals(160,update.getValue().getUpdateObject().get("$inc",org.bson.Document.class).get("exp"));
        assertEquals(12L,update.getValue().getUpdateObject().get("$set",org.bson.Document.class).get("nativeAdventureRewardSequence"));
        verify(levels).addExpWithAutoLevelUp(9,0);
    }
}
