package com.iohao.mmo.auction.repository;

import com.iohao.mmo.auction.entity.AuctionNotice;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AuctionNoticeRepository extends MongoRepository<AuctionNotice, String> {
    List<AuctionNotice> findByPlayerIdOrderByCreatedAtDesc(long playerId);
}
