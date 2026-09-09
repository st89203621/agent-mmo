package com.iohao.mmo.treasure.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.treasure.cmd.TreasureMountainCmd;
import com.iohao.mmo.treasure.proto.TreasureMountainMessage;
import com.iohao.mmo.treasure.entity.MountainType;
import com.iohao.mmo.treasure.service.TreasureMountainService;
import com.iohao.mmo.treasure.service.NativeMountainService;
import com.iohao.mmo.treasure.proto.NativeMountainState;
import com.iohao.mmo.treasure.proto.NativeMountainRequest;
import com.iohao.mmo.person.cmd.PersonCmd;
import com.iohao.mmo.person.proto.PersonMessage;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@ActionController(TreasureMountainCmd.cmd)
public class TreasureMountainAction {
    @Resource
    TreasureMountainService treasureMountainService;
    @Resource
    NativeMountainService nativeMountainService;

    @ActionMethod(TreasureMountainCmd.listMountains)
    public List<TreasureMountainMessage> listMountains(FlowContext flowContext) {
        return treasureMountainService.listMountains().stream().map(m -> {
            TreasureMountainMessage msg = new TreasureMountainMessage();
            msg.type = (String) m.get("mountainType");
            msg.name = (String) m.get("name");
            msg.requiredLevel = (int) m.get("requiredGuildLevel");
            msg.maxDigTimes = (int) m.get("maxDigTimes");
            msg.active = true;
            return msg;
        }).toList();
    }

    @ActionMethod(TreasureMountainCmd.dig)
    public void dig(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        log.info("宝山挖掘请求: userId={}", userId);
    }

    @ActionMethod(TreasureMountainCmd.nativeState)
    public NativeMountainState nativeState(FlowContext flowContext) {
        return nativeMountainService.state(flowContext.getUserId());
    }

    @ActionMethod(TreasureMountainCmd.nativeAct)
    public NativeMountainState nativeAct(NativeMountainRequest request, FlowContext flowContext) {
        PersonMessage person = flowContext.invokeModuleMessage(PersonCmd.of(PersonCmd.getPerson)).getData(PersonMessage.class);
        return nativeMountainService.act(flowContext.getUserId(), person.basicProperty.hp, person.basicProperty.physicsAttack, request);
    }
}
