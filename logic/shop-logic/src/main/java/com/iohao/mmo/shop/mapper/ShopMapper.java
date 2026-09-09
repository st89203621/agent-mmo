package com.iohao.mmo.shop.mapper;

import com.iohao.mmo.shop.entity.PurchaseHistory;
import com.iohao.mmo.shop.entity.ShopItem;
import com.iohao.mmo.shop.entity.PlayerCurrency;
import com.iohao.mmo.shop.proto.*;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper
public interface ShopMapper {
    ShopMapper ME = Mappers.getMapper(ShopMapper.class);

    ShopItemMessage convert(ShopItem item);

    List<ShopItemMessage> convertItems(List<ShopItem> items);

    PurchaseHistoryMessage convert(PurchaseHistory history);

    List<PurchaseHistoryMessage> convertHistories(List<PurchaseHistory> histories);

    PlayerCurrencyMessage convert(PlayerCurrency currency);

    EffectMessage convert(ShopItem.Effect effect);
}

