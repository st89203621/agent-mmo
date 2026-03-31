package com.iohao.mmo.coexplore.action;

import com.alibaba.fastjson2.JSON;
import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.coexplore.cmd.CoexploreCmd;
import com.iohao.mmo.coexplore.entity.CoexploreSession;
import com.iohao.mmo.coexplore.proto.CoexploreSessionMessage;
import com.iohao.mmo.coexplore.service.CoexploreService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ActionController(CoexploreCmd.cmd)
public class CoexploreAction {

    @Resource
    CoexploreService coexploreService;

    @ActionMethod(CoexploreCmd.createSession)
    public CoexploreSessionMessage createSession(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        CoexploreSession session = coexploreService.createSession(userId, "");
        return toMessage(session);
    }

    @ActionMethod(CoexploreCmd.joinSession)
    public CoexploreSessionMessage joinSession(String sessionId, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        CoexploreSession session = coexploreService.joinSession(sessionId, userId, "");
        if (session == null) return new CoexploreSessionMessage();
        return toMessage(session);
    }

    @ActionMethod(CoexploreCmd.getSession)
    public CoexploreSessionMessage getSession(String sessionId, FlowContext flowContext) {
        CoexploreSession session = coexploreService.getSession(sessionId);
        if (session == null) return new CoexploreSessionMessage();
        return toMessage(session);
    }

    private CoexploreSessionMessage toMessage(CoexploreSession session) {
        CoexploreSessionMessage msg = new CoexploreSessionMessage();
        msg.sessionId = session.getId();
        msg.hostId = session.getHostId();
        msg.hostName = session.getHostName() != null ? session.getHostName() : "";
        msg.guestId = session.getGuestId();
        msg.guestName = session.getGuestName() != null ? session.getGuestName() : "";
        msg.status = session.getStatus();
        msg.currentRound = session.getCurrentRound();
        msg.currentPhase = session.getStatus() != null ? session.getStatus() : "";
        msg.hostFateValue = session.getHostFateValue();
        msg.guestFateValue = session.getGuestFateValue();
        msg.eventsJson = JSON.toJSONString(session.getRounds());
        return msg;
    }
}
