package com.iohao.mmo.bag.service;

import com.iohao.mmo.bag.entity.Bag;
import com.iohao.mmo.bag.repository.BagRepository;
import com.mongodb.client.result.UpdateResult;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.UpdateDefinition;
import java.util.Map;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class ServerEconomyServiceTest {
    @Test
    public void rewardAmountsAndItemPathsAreValidated() {
        assertThrows(IllegalArgumentException.class, () -> new EconomyGrant("kill-1", -1, 0, Map.of()));
        assertThrows(IllegalArgumentException.class, () -> new EconomyGrant("kill-1", 0, 0, Map.of("x.y", 1)));
        assertThrows(IllegalArgumentException.class, () -> new EconomyGrant("kill-1", 0, 1, Map.of()));
        assertEquals(3, new EconomyGrant("kill-1", 20, 0, Map.of("material_002", 3)).items().get("material_002"));
    }

    @Test
    public void retryChecksReceiptsInSameAtomicUpdateAsGoldAndItems() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        BagRepository repository = mock(BagRepository.class);
        Bag bag = new Bag(); bag.setId(9);
        when(repository.findById(9L)).thenReturn(Optional.of(bag));
        when(mongo.updateFirst(any(Query.class), any(UpdateDefinition.class), eq(Document.class), eq("player_currency")))
                .thenReturn(UpdateResult.acknowledged(0, 0L, null));
        when(mongo.updateFirst(any(Query.class), any(UpdateDefinition.class), eq(Bag.class)))
                .thenReturn(UpdateResult.acknowledged(0, 0L, null));
        BagService service = new BagService(mongo, repository);
        EconomyGrantResult result = service.grant(9, new EconomyGrant("kill-1", 50, 0, Map.of("material_002", 2)));
        assertFalse(result.granted());
        ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<UpdateDefinition> update = ArgumentCaptor.forClass(UpdateDefinition.class);
        verify(mongo).updateFirst(query.capture(), update.capture(), eq(Bag.class));
        assertEquals("kill-1", ((Document) query.getValue().getQueryObject().get("rewardReceipts")).get("$ne"));
        Document fields = update.getValue().getUpdateObject();
        assertEquals(2, ((Document) fields.get("$inc")).get("itemMap.material_002.quantity"));
        assertEquals("kill-1", ((Document) fields.get("$addToSet")).get("rewardReceipts"));
        verify(mongo, never()).save(any(Bag.class));
    }

    @Test
    public void repeatedSpendReturnsSuccessWithoutChargingAgain() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        when(mongo.exists(any(Query.class), eq("player_currency"))).thenReturn(true);
        BagService service = new BagService(mongo, mock(BagRepository.class));
        assertTrue(service.spendGold(9, 1000, "donation-1"));
        verify(mongo, never()).updateFirst(any(Query.class), any(UpdateDefinition.class), eq(Document.class), eq("player_currency"));
    }
}
