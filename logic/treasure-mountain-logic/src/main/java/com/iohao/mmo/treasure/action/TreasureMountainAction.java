package com.iohao.mmo.treasure.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.treasure.cmd.TreasureMountainCmd;
import com.iohao.mmo.treasure.proto.TreasureMountainMessage;
import com.iohao.mmo.treasure.entity.MountainType;
import com.iohao.mmo.treasure.service.TreasureMountainService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

@Slf4j
@ActionController(TreasureMountainCmd.cmd)
public class TreasureMountainAction {
    @Resource
    TreasureMountainService treasureMountainService;

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
}
