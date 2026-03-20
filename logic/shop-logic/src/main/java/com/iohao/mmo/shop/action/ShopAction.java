package com.iohao.mmo.shop.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.shop.cmd.ShopCmd;
import com.iohao.mmo.shop.entity.PlayerCurrency;
import com.iohao.mmo.shop.entity.PurchaseHistory;
import com.iohao.mmo.shop.entity.ShopItem;
import com.iohao.mmo.shop.mapper.ShopMapper;
import com.iohao.mmo.shop.proto.*;
import com.iohao.mmo.shop.service.ShopService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import jakarta.annotation.Resource;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@ActionController(ShopCmd.cmd)
public class ShopAction {

    @Resource
    ShopService shopService;

    @ActionMethod(ShopCmd.listItems)
    public List<ShopItemMessage> listItems(String category) {
        List<ShopItem> items = shopService.listItems(category);
        return ShopMapper.ME.convertItems(items);
    }

    @ActionMethod(ShopCmd.getItemInfo)
    public ShopItemMessage getItemInfo(String itemId) {
        ShopItem item = shopService.getItem(itemId);
        return item != null ? ShopMapper.ME.convert(item) : null;
    }

    @ActionMethod(ShopCmd.purchaseItem)
    public PurchaseResponse purchaseItem(PurchaseRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        
        Map<String, Object> result = shopService.purchaseItem(userId, request.itemId, request.quantity);
        
        PurchaseResponse response = new PurchaseResponse();
        response.success = (boolean) result.get("success");
        response.message = (String) result.get("message");
        
        if (response.success) {
            response.remainingGold = (int) result.get("remainingGold");
            response.remainingDiamond = (int) result.get("remainingDiamond");
            response.remainingStock = (int) result.get("remainingStock");
        }
        
        return response;
    }

    @ActionMethod(ShopCmd.getPurchaseHistory)
    public List<PurchaseHistoryMessage> getPurchaseHistory(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        List<PurchaseHistory> histories = shopService.getPurchaseHistory(userId);
        return ShopMapper.ME.convertHistories(histories);
    }

    @ActionMethod(ShopCmd.getPlayerCurrency)
    public PlayerCurrencyMessage getPlayerCurrency(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        PlayerCurrency currency = shopService.getPlayerCurrency(userId);
        return ShopMapper.ME.convert(currency);
    }
}

