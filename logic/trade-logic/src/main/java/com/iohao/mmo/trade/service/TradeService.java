package com.iohao.mmo.trade.service;

import com.iohao.mmo.trade.entity.MarketListing;
import com.iohao.mmo.trade.entity.MarketListing.ListingStatus;
import com.iohao.mmo.trade.entity.TradeOrder;
import com.iohao.mmo.trade.repository.MarketListingRepository;
import com.iohao.mmo.trade.repository.TradeOrderRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class TradeService {

    @Resource
    TradeOrderRepository tradeOrderRepository;

    @Resource
    MarketListingRepository marketListingRepository;

    // ── 旧版撮合交易 ──────────────────────────────────

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

    // ── 集市挂单 ──────────────────────────────────────

    /** 查询集市挂单，支持品类/关键词过滤，按创建时间倒序分页 */
    public Page<MarketListing> listMarket(String category, String keyword, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        boolean hasCategory = category != null && !category.isBlank();
        boolean hasKeyword = keyword != null && !keyword.isBlank();
        if (hasCategory && hasKeyword) {
            return marketListingRepository.findByItemCategoryAndItemNameContainingIgnoreCaseAndStatus(
                    category, keyword, ListingStatus.ACTIVE, pageable);
        }
        if (hasCategory) {
            return marketListingRepository.findByItemCategoryAndStatus(category, ListingStatus.ACTIVE, pageable);
        }
        if (hasKeyword) {
            return marketListingRepository.findByItemNameContainingIgnoreCaseAndStatus(
                    keyword, ListingStatus.ACTIVE, pageable);
        }
        return marketListingRepository.findByStatus(ListingStatus.ACTIVE, pageable);
    }

    /** 按 ID 查询挂单（供调用方做购买前校验） */
    public MarketListing findListing(String listingId) {
        return marketListingRepository.findById(listingId).orElse(null);
    }

    /** 创建挂单；调用方负责背包扣减 */
    public MarketListing createListing(long sellerId, String sellerName, String itemId,
                                       String itemName, String itemCategory, String itemQuality,
                                       int quantity, long unitPrice) {
        MarketListing listing = new MarketListing();
        listing.setId(UUID.randomUUID().toString());
        listing.setSellerId(sellerId);
        listing.setSellerName(sellerName);
        listing.setItemId(itemId);
        listing.setItemName(itemName);
        listing.setItemCategory(itemCategory != null ? itemCategory : "misc");
        listing.setItemQuality(itemQuality != null ? itemQuality : "white");
        listing.setUnitPrice(unitPrice);
        listing.setQuantity(quantity);
        listing.setSold(0);
        listing.setCreatedAt(System.currentTimeMillis());
        listing.setStatus(ListingStatus.ACTIVE);
        return marketListingRepository.save(listing);
    }

    /**
     * 执行购买：更新 sold 计数，返回更新后的挂单。
     * 调用方负责扣买家金币、给卖家收款、将物品加入买家背包。
     *
     * @throws IllegalArgumentException 挂单不存在 / 已结束 / 自购 / 库存不足
     */
    public MarketListing executeBuy(long buyerId, String listingId, int wantQty) {
        MarketListing listing = marketListingRepository.findById(listingId)
                .orElseThrow(() -> new IllegalArgumentException("挂单不存在"));
        if (listing.getStatus() != ListingStatus.ACTIVE) throw new IllegalArgumentException("挂单已结束");
        if (listing.getSellerId() == buyerId) throw new IllegalArgumentException("不能购买自己的挂单");
        int remain = listing.getQuantity() - listing.getSold();
        if (remain <= 0) throw new IllegalArgumentException("库存不足");
        int bought = Math.min(wantQty, remain);
        listing.setSold(listing.getSold() + bought);
        if (listing.getSold() >= listing.getQuantity()) {
            listing.setStatus(ListingStatus.SOLD_OUT);
        }
        return marketListingRepository.save(listing);
    }

    /** 查询卖家的在售挂单 */
    public List<MarketListing> myListings(long sellerId) {
        return marketListingRepository.findBySellerIdAndStatus(sellerId, ListingStatus.ACTIVE);
    }

    /**
     * 撤回挂单；调用方负责将剩余物品退还背包。
     *
     * @throws IllegalArgumentException 挂单不存在 / 无权操作 / 已结束
     */
    public MarketListing cancelListing(long sellerId, String listingId) {
        MarketListing listing = marketListingRepository.findById(listingId)
                .orElseThrow(() -> new IllegalArgumentException("挂单不存在"));
        if (listing.getSellerId() != sellerId) throw new IllegalArgumentException("无权撤回此挂单");
        if (listing.getStatus() != ListingStatus.ACTIVE) throw new IllegalArgumentException("挂单已结束");
        listing.setStatus(ListingStatus.CANCELLED);
        return marketListingRepository.save(listing);
    }
}
