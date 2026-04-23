package com.iohao.mmo.auction.repository;

import com.iohao.mmo.auction.entity.AuctionItem;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AuctionItemRepository extends MongoRepository<AuctionItem, String> {
    List<AuctionItem> findByStatusOrderByCreateTimeDesc(String status);
    List<AuctionItem> findBySellerIdAndStatusOrderByCreateTimeDesc(long sellerId, String status);
    List<AuctionItem> findByHighBidderIdAndStatusOrderByCreateTimeDesc(long bidderId, String status);
    List<AuctionItem> findByStatusAndEndTimeBefore(String status, LocalDateTime time);
}
