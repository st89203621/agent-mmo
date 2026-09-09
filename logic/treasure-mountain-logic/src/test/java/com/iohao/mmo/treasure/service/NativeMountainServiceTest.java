package com.iohao.mmo.treasure.service;

import com.iohao.mmo.bag.service.ServerEconomyService;
import com.iohao.mmo.guild.service.NativeGuildAccess;
import com.iohao.mmo.treasure.entity.MountainSession;
import com.iohao.mmo.treasure.proto.NativeMountainRequest;
import com.iohao.mmo.treasure.proto.NativeMountainState;
import com.iohao.mmo.treasure.repository.MountainSessionRepository;
import org.junit.Test;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class NativeMountainServiceTest {
    @Test
    public void claimRequiresCompletedOwnedRunAndCannotRepeatReward() {
        Map<String, MountainSession> records = new HashMap<>();
        NativeMountainService service = service(records);
        NativeMountainState entered = service.act(7, 100, 30, request("ENTER", 4, null));
        String run = entered.run.sessionId;
        assertFalse(service.act(7, 100, 30, request("CLAIM", 4, "forged")).success);
        assertFalse(service.act(7, 100, 30, request("CLAIM", 4, run)).success);
        verifyNoInteractions(service.economy);
        records.values().iterator().next().setNativeStatus("COMPLETED");
        assertTrue(service.act(7, 100, 30, request("CLAIM", 4, run)).run.claimed);
        assertTrue(service.act(7, 100, 30, request("CLAIM", 4, run)).run.claimed);
        verify(service.economy, times(1)).grant(eq(7L), argThat(grant -> grant.gold() == 2400
                && grant.items().get("golden_bean") == 1 && grant.sourceId().contains("mountain:7:")));
        assertFalse(service.act(7, 100, 30, request("ENTER", 4, null)).success);
        assertTrue(service.act(7, 100, 30, request("ENTER", 0, null)).success);
    }

    @Test
    public void reconnectResumesRunAndOtherUserCannotClaimIt() {
        Map<String, MountainSession> records = new HashMap<>();
        NativeMountainService service = service(records);
        String run = service.act(7, 100, 30, request("ENTER", 0, null)).run.sessionId;
        assertEquals(run, service.state(7).run.sessionId);
        assertEquals(run, service.act(7, 100, 30, request("ENTER", 3, null)).run.sessionId);
        assertFalse(service.act(8, 100, 30, request("CLAIM", 0, run)).success);
        verifyNoInteractions(service.economy);
    }

    private NativeMountainService service(Map<String, MountainSession> records) {
        NativeMountainService service = new NativeMountainService();
        service.repository = mock(MountainSessionRepository.class);
        service.economy = mock(ServerEconomyService.class);
        service.guildAccess = mock(NativeGuildAccess.class);
        when(service.repository.findById(anyString())).thenAnswer(call -> Optional.ofNullable(records.get(call.getArgument(0))));
        when(service.repository.save(any())).thenAnswer(call -> {
            MountainSession session = call.getArgument(0); records.put(session.getId(), session); return session;
        });
        return service;
    }

    private NativeMountainRequest request(String operation, int mountain, String sessionId) {
        NativeMountainRequest request = new NativeMountainRequest();
        request.operation = operation; request.mountain = mountain; request.sessionId = sessionId; return request;
    }
}
