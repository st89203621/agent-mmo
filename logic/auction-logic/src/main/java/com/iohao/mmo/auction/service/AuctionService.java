package com.iohao.mmo.auction.service;

import com.iohao.mmo.auction.entity.AuctionBid;
import com.iohao.mmo.auction.entity.AuctionItem;
import com.iohao.mmo.auction.entity.AuctionNotice;
import com.iohao.mmo.auction.proto.AuctionItemProto;
import com.iohao.mmo.auction.proto.AuctionListRes;
import com.iohao.mmo.auction.repository.AuctionBidRepository;
import com.iohao.mmo.auction.repository.AuctionItemRepository;
import com.iohao.mmo.auction.repository.AuctionNoticeRepository;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Slf4j
@Service
public class AuctionService {

    @Resource AuctionItemRepository    auctionRepo;
    @Resource AuctionBidRepository     bidRepo;
    @Resource AuctionNoticeRepository  noticeRepo;

    public AuctionListRes listAuctions(String tab, long requesterId) {
        List<AuctionItem> items = switch (tab) {
            case "mybids"  -> auctionRepo.findByHighBidderIdAndStatusOrderByCreateTimeDesc(requesterId, "ACTIVE");
            case "mysales" -> auctionRepo.findBySellerIdAndStatusOrderByCreateTimeDesc(requesterId, "ACTIVE");
            case "ended"   -> auctionRepo.findByStatusOrderByCreateTimeDesc("SOLD");
            default        -> auctionRepo.findByStatusOrderByCreateTimeDesc("ACTIVE");
        };
        List<AuctionItemProto> protos = items.stream().map(i -> toProto(i, requesterId)).toList();
        AuctionListRes res = new AuctionListRes();
        res.items = protos;
        res.total = protos.size();
        return res;
    }

    public AuctionItem placeBid(String auctionId, long bidderId, String bidderName, long amount) {
        AuctionItem item = auctionRepo.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("拍卖不存在"));
        if (!"ACTIVE".equals(item.getStatus())) throw new RuntimeException("拍卖已结束");
        if (item.getEndTime().isBefore(LocalDateTime.now())) throw new RuntimeException("拍卖已到期");
        long minBid = item.getCurrentBid() + Math.max(1, item.getCurrentBid() / 20);
        if (amount < minBid) throw new RuntimeException("出价低于最低加价：" + minBid);
        if (bidderId == item.getSellerId()) throw new RuntimeException("不能竞拍自己的物品");

        long prevHighBidderId = item.getHighBidderId();

        item.setCurrentBid(amount);
        item.setHighBidderId(bidderId);
        item.setHighBidderName(bidderName);
        item.setBidCount(item.getBidCount() + 1);
        auctionRepo.save(item);

        if (prevHighBidderId > 0 && prevHighBidderId != bidderId) {
            noticeRepo.save(buildNotice(prevHighBidderId, "BID_OUTBID", auctionId, item.getItemName(), amount));
        }

        AuctionBid bid = new AuctionBid();
        bid.setAuctionId(auctionId);
        bid.setBidderId(bidderId);
        bid.setBidderName(bidderName);
        bid.setAmount(amount);
        bid.setBidTime(LocalDateTime.now());
        bidRepo.save(bid);
        return item;
    }

    public AuctionItem buyNow(String auctionId, long buyerId) {
        AuctionItem item = auctionRepo.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("拍卖不存在"));
        if (!"ACTIVE".equals(item.getStatus())) throw new RuntimeException("拍卖已结束");
        if (item.getBuyNowPrice() <= 0) throw new RuntimeException("该拍卖无一口价");
        if (buyerId == item.getSellerId()) throw new RuntimeException("不能购买自己的物品");

        item.setStatus("SOLD");
        item.setHighBidderId(buyerId);
        item.setCurrentBid(item.getBuyNowPrice());
        auctionRepo.save(item);
        return item;
    }

    public AuctionItem listItem(long sellerId, String sellerName,
                                String itemId, String itemName, String itemQuality,
                                long startPrice, long buyNowPrice, int durationHours) {
        AuctionItem item = new AuctionItem();
        item.setSellerId(sellerId);
        item.setSellerName(sellerName);
        item.setItemId(itemId);
        item.setItemName(itemName);
        item.setItemQuality(itemQuality);
        item.setStartPrice(startPrice);
        item.setCurrentBid(startPrice);
        item.setBuyNowPrice(buyNowPrice);
        item.setBidCount(0);
        item.setStatus("ACTIVE");
        item.setCreateTime(LocalDateTime.now());
        item.setEndTime(LocalDateTime.now().plusHours(durationHours));
        return auctionRepo.save(item);
    }

    public void cancelListing(String auctionId, long sellerId) {
        AuctionItem item = auctionRepo.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("拍卖不存在"));
        if (item.getSellerId() != sellerId) throw new RuntimeException("无权操作");
        if (item.getBidCount() > 0) throw new RuntimeException("已有出价，无法撤回");
        item.setStatus("CANCELLED");
        auctionRepo.save(item);
    }

    /** 每分钟检查到期拍卖并结算 */
    @Scheduled(fixedRate = 60_000)
    public void settleExpired() {
        List<AuctionItem> expired = auctionRepo.findByStatusAndEndTimeBefore("ACTIVE", LocalDateTime.now());
        int sold = 0, exp = 0;
        for (AuctionItem item : expired) {
            if (item.getBidCount() > 0) {
                item.setStatus("SOLD");
                long finalAmount = item.getCurrentBid();
                long sellerReceives = (long) (finalAmount * 0.95);
                noticeRepo.save(buildNotice(item.getHighBidderId(), "WON_AS_BUYER",
                        item.getId(), item.getItemName(), finalAmount));
                noticeRepo.save(buildNotice(item.getSellerId(), "SOLD_AS_SELLER",
                        item.getId(), item.getItemName(), sellerReceives));
                sold++;
                log.info("拍卖结算：{} 由 {} 以 {} 金币成交（卖家到手 {}）",
                        item.getItemName(), item.getHighBidderName(), finalAmount, sellerReceives);
            } else {
                item.setStatus("EXPIRED");
                noticeRepo.save(buildNotice(item.getSellerId(), "EXPIRED",
                        item.getId(), item.getItemName(), 0));
                exp++;
            }
            auctionRepo.save(item);
        }
        if (sold + exp > 0) {
            log.info("拍卖结算完成：成交 {} 件，流标 {} 件", sold, exp);
        }
    }

    private AuctionNotice buildNotice(long playerId, String type, String auctionId, String itemName, long amount) {
        AuctionNotice n = new AuctionNotice();
        n.setPlayerId(playerId);
        n.setType(type);
        n.setAuctionId(auctionId);
        n.setItemName(itemName);
        n.setAmount(amount);
        n.setCreatedAt(Instant.now());
        n.setRead(false);
        return n;
    }

    private AuctionItemProto toProto(AuctionItem item, long requesterId) {
        AuctionItemProto p = new AuctionItemProto();
        p.auctionId   = item.getId();
        p.itemId      = item.getItemId();
        p.itemName    = item.getItemName();
        p.itemQuality = item.getItemQuality() != null ? item.getItemQuality() : "white";
        p.sellerId    = item.getSellerId();
        p.sellerName  = item.getSellerName();
        p.currentBid  = item.getCurrentBid();
        p.buyNowPrice = item.getBuyNowPrice();
        p.bidCount    = item.getBidCount();
        p.status      = item.getStatus();
        p.endTime     = item.getEndTime().toInstant(ZoneOffset.UTC).toEpochMilli();
        p.myBid       = item.getHighBidderId() == requesterId ? item.getCurrentBid() : 0;
        return p;
    }
}
