package com.iohao.mmo.auction.repository;

import com.iohao.mmo.auction.entity.AuctionBid;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AuctionBidRepository extends MongoRepository<AuctionBid, String> {
    List<AuctionBid> findByAuctionIdOrderByBidTimeDesc(String auctionId);
    List<AuctionBid> findByBidderIdOrderByBidTimeDesc(long bidderId);
}
