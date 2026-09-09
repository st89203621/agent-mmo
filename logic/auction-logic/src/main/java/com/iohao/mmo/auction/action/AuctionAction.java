package com.iohao.mmo.auction.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.mmo.auction.cmd.AuctionCmd;
import com.iohao.mmo.auction.entity.AuctionItem;
import com.iohao.mmo.auction.proto.*;
import com.iohao.mmo.auction.service.AuctionService;
import com.iohao.mmo.common.core.flow.MyFlowContext;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ActionController(AuctionCmd.cmd)
public class AuctionAction {

    @Resource AuctionService auctionService;

    @ActionMethod(AuctionCmd.listAuctions)
    public AuctionListRes listAuctions(AuctionListReq req, MyFlowContext ctx) {
        return auctionService.listAuctions(req.tab, ctx.getUserId());
    }

    @ActionMethod(AuctionCmd.placeBid)
    public AuctionItemProto placeBid(PlaceBidReq req, MyFlowContext ctx) {
        AuctionItem item = auctionService.placeBid(req.auctionId, ctx.getUserId(), ctx.getUserId() + "", req.amount);
        // 简化：sellerName 由 service 层处理；这里返回更新后的物品
        AuctionItemProto proto = new AuctionItemProto();
        proto.auctionId  = item.getId();
        proto.currentBid = item.getCurrentBid();
        proto.bidCount   = item.getBidCount();
        return proto;
    }

    @ActionMethod(AuctionCmd.buyNow)
    public AuctionItemProto buyNow(PlaceBidReq req, MyFlowContext ctx) {
        AuctionItem item = auctionService.buyNow(req.auctionId, ctx.getUserId());
        AuctionItemProto proto = new AuctionItemProto();
        proto.auctionId = item.getId();
        proto.status    = item.getStatus();
        return proto;
    }

    @ActionMethod(AuctionCmd.listItem)
    public AuctionItemProto listItem(ListItemReq req, MyFlowContext ctx) {
        long uid = ctx.getUserId();
        AuctionItem item = auctionService.listItem(
                uid, String.valueOf(uid),
                req.itemId, req.itemId, "white",
                req.startPrice, req.buyNowPrice, req.durationHours);
        AuctionItemProto proto = new AuctionItemProto();
        proto.auctionId = item.getId();
        proto.status    = "ACTIVE";
        return proto;
    }

    @ActionMethod(AuctionCmd.cancelListing)
    public void cancelListing(PlaceBidReq req, MyFlowContext ctx) {
        auctionService.cancelListing(req.auctionId, ctx.getUserId());
    }

    @ActionMethod(AuctionCmd.myBids)
    public AuctionListRes myBids(MyFlowContext ctx) {
        return auctionService.listAuctions("mybids", ctx.getUserId());
    }

    @ActionMethod(AuctionCmd.mySales)
    public AuctionListRes mySales(MyFlowContext ctx) {
        return auctionService.listAuctions("mysales", ctx.getUserId());
    }
}
