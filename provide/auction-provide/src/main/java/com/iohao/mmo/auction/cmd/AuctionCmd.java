package com.iohao.mmo.auction.cmd;

public interface AuctionCmd {
    int cmd = 90;
    int listAuctions   = 1;
    int placeBid       = 2;
    int buyNow         = 3;
    int listItem       = 4;
    int cancelListing  = 5;
    int myBids         = 6;
    int mySales        = 7;
    int auctionEnd     = 8; // 服务端推送：拍卖结束通知
}
