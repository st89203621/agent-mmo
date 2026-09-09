package com.iohao.mmo.trade.repository;

import com.iohao.mmo.trade.entity.TradeOrder;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TradeOrderRepository extends MongoRepository<TradeOrder, String> {
    List<TradeOrder> findByStatus(String status);
    List<TradeOrder> findBySellerId(long sellerId);
    List<TradeOrder> findBySellerIdOrBuyerId(long sellerId, long buyerId);
}
