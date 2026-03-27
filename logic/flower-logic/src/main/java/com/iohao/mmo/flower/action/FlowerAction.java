package com.iohao.mmo.flower.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.flower.cmd.FlowerCmd;
import com.iohao.mmo.flower.entity.EternalFlower;
import com.iohao.mmo.flower.proto.FlowerMessage;
import com.iohao.mmo.flower.proto.WaterFlowerRequest;
import com.iohao.mmo.flower.service.FlowerService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ActionController(FlowerCmd.cmd)
public class FlowerAction {

    @Resource
    FlowerService flowerService;

    @ActionMethod(FlowerCmd.getFlower)
    public FlowerMessage getFlower(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        return toMessage(flowerService.getOrCreate(userId));
    }

    @ActionMethod(FlowerCmd.waterFlower)
    public FlowerMessage waterFlower(WaterFlowerRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        EternalFlower flower = flowerService.water(userId, request.fateAmount, request.trustAmount);
        return toMessage(flower);
    }

    @ActionMethod(FlowerCmd.getFlowerHistory)
    public FlowerMessage getFlowerHistory(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        return toMessage(flowerService.getOrCreate(userId));
    }

    private FlowerMessage toMessage(EternalFlower flower) {
        FlowerMessage msg = new FlowerMessage();
        msg.playerId = flower.getPlayerId();
        msg.flowerName = flower.getFlowerName();
        msg.stage = flower.getStage();
        msg.color = flower.getColor();
        msg.totalFateWatered = flower.getTotalFateWatered();
        msg.totalTrustInfused = flower.getTotalTrustInfused();
        msg.flowerVerse = flower.getFlowerVerse() != null ? flower.getFlowerVerse() : "";
        msg.worldCount = flower.getWorldCount();
        msg.bloomed = flower.isBloomed();
        return msg;
    }
}
