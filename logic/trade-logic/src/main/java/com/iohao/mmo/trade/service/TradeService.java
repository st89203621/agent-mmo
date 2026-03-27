package com.iohao.mmo.trade.service;

import com.iohao.mmo.trade.entity.TradeOrder;
import com.iohao.mmo.trade.repository.TradeOrderRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class TradeService {

    @Resource
    TradeOrderRepository tradeOrderRepository;

    public List<TradeOrder> listOpenTrades() {
        return tradeOrderRepository.findByStatus("OPEN");
    }

    public TradeOrder createTrade(long sellerId, String sellerName, String itemId, String itemName,
                                  int quantity, int price, String currency) {
        TradeOrder order = new TradeOrder();
        order.setId(UUID.randomUUID().toString());
        order.setSellerId(sellerId);
        order.setSellerName(sellerName);
        order.setItemId(itemId);
        order.setItemName(itemName);
        order.setQuantity(quantity);
        order.setPrice(price);
        order.setCurrency(currency != null ? currency : "gold");
        order.setCreateTime(System.currentTimeMillis());
        order.setStatus("OPEN");
        order.setFateReward(Math.max(1, price / 100));
        return tradeOrderRepository.save(order);
    }

    public TradeOrder acceptTrade(String tradeId, long buyerId) {
        TradeOrder order = tradeOrderRepository.findById(tradeId).orElse(null);
        if (order == null || !"OPEN".equals(order.getStatus())) return null;
        if (order.getSellerId() == buyerId) return null;

        order.setBuyerId(buyerId);
        order.setStatus("SOLD");
        order.setCompleteTime(System.currentTimeMillis());
        log.info("交易完成 {} -> {}, 物品={}, 缘值奖励={}", order.getSellerId(), buyerId, order.getItemName(), order.getFateReward());
        return tradeOrderRepository.save(order);
    }

    public TradeOrder cancelTrade(String tradeId, long sellerId) {
        TradeOrder order = tradeOrderRepository.findById(tradeId).orElse(null);
        if (order == null || order.getSellerId() != sellerId || !"OPEN".equals(order.getStatus())) return null;

        order.setStatus("CANCELLED");
        return tradeOrderRepository.save(order);
    }

    public List<TradeOrder> getMyTrades(long playerId) {
        return tradeOrderRepository.findBySellerIdOrBuyerId(playerId, playerId);
    }
}
