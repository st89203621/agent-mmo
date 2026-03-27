package com.iohao.mmo.trade.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.trade.cmd.TradeCmd;
import com.iohao.mmo.trade.entity.TradeOrder;
import com.iohao.mmo.trade.proto.CreateTradeRequest;
import com.iohao.mmo.trade.proto.TradeMessage;
import com.iohao.mmo.trade.service.TradeService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@ActionController(TradeCmd.cmd)
public class TradeAction {

    @Resource
    TradeService tradeService;

    @ActionMethod(TradeCmd.listTrades)
    public List<TradeMessage> listTrades(FlowContext flowContext) {
        List<TradeOrder> orders = tradeService.listOpenTrades();
        List<TradeMessage> result = new ArrayList<>();
        for (TradeOrder o : orders) {
            result.add(toMessage(o));
        }
        return result;
    }

    @ActionMethod(TradeCmd.createTrade)
    public TradeMessage createTrade(CreateTradeRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        TradeOrder order = tradeService.createTrade(userId, "", request.itemId, "",
                request.quantity, request.price, request.currency);
        return toMessage(order);
    }

    @ActionMethod(TradeCmd.acceptTrade)
    public TradeMessage acceptTrade(String tradeId, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        TradeOrder order = tradeService.acceptTrade(tradeId, userId);
        if (order == null) return new TradeMessage();
        return toMessage(order);
    }

    @ActionMethod(TradeCmd.cancelTrade)
    public TradeMessage cancelTrade(String tradeId, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        TradeOrder order = tradeService.cancelTrade(tradeId, userId);
        if (order == null) return new TradeMessage();
        return toMessage(order);
    }

    @ActionMethod(TradeCmd.getMyTrades)
    public List<TradeMessage> getMyTrades(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        List<TradeOrder> orders = tradeService.getMyTrades(userId);
        List<TradeMessage> result = new ArrayList<>();
        for (TradeOrder o : orders) {
            result.add(toMessage(o));
        }
        return result;
    }

    private TradeMessage toMessage(TradeOrder order) {
        TradeMessage msg = new TradeMessage();
        msg.tradeId = order.getId();
        msg.sellerId = order.getSellerId();
        msg.sellerName = order.getSellerName() != null ? order.getSellerName() : "";
        msg.itemId = order.getItemId();
        msg.itemName = order.getItemName() != null ? order.getItemName() : "";
        msg.quantity = order.getQuantity();
        msg.price = order.getPrice();
        msg.currency = order.getCurrency() != null ? order.getCurrency() : "gold";
        msg.createTime = order.getCreateTime();
        msg.status = order.getStatus();
        return msg;
    }
}
