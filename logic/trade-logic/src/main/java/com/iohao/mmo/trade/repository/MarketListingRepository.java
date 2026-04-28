package com.iohao.mmo.trade.repository;

import com.iohao.mmo.trade.entity.MarketListing;
import com.iohao.mmo.trade.entity.MarketListing.ListingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MarketListingRepository extends MongoRepository<MarketListing, String> {

    Page<MarketListing> findByStatus(ListingStatus status, Pageable pageable);

    Page<MarketListing> findByItemCategoryAndStatus(String category, ListingStatus status, Pageable pageable);

    Page<MarketListing> findByItemNameContainingIgnoreCaseAndStatus(String keyword, ListingStatus status, Pageable pageable);

    Page<MarketListing> findByItemCategoryAndItemNameContainingIgnoreCaseAndStatus(
            String category, String keyword, ListingStatus status, Pageable pageable);

    List<MarketListing> findBySellerIdAndStatus(long sellerId, ListingStatus status);
}
