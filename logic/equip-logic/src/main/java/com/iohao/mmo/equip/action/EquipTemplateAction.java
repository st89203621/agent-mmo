package com.iohao.mmo.equip.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.action.skeleton.protocol.wrapper.StringValue;
import com.iohao.mmo.equip.cmd.EquipCmd;
import com.iohao.mmo.equip.entity.EquipTemplate;
import com.iohao.mmo.equip.mapper.EquipMapper;
import com.iohao.mmo.equip.mapper.EquipTemplateMapper;
import com.iohao.mmo.equip.proto.EquipMessage;
import com.iohao.mmo.equip.proto.EquipTemplateMessage;
import com.iohao.mmo.equip.service.EquipTemplateService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.util.List;

/**
 * @author 唐斌
 * @date 2023-07-30
 * @description: 装备属性类
 */
@Slf4j
@Component
@ActionController(EquipCmd.cmd)
public class EquipTemplateAction {

    @Resource
    EquipTemplateService equipTemplateService;

    /**
     * 获取装备库信息
     *
     * @param stringValue 装备库itemTypeId
     */
    @ActionMethod(EquipCmd.getEquipTemplate)
    public EquipTemplateMessage getEquipTemplate(StringValue stringValue) {
        // 初始化装备数据，暂时放这
        EquipTemplate equipTemplate = equipTemplateService.findById(stringValue.value);
        return EquipTemplateMapper.ME.convert(equipTemplate);
    }

    /**
     * 根据装备库列表随机出新的装备，
     *
     * @param flowContext flowContext
     * @param itemTypeIds 装备库itemTypeIds
     */
    @ActionMethod(EquipCmd.randomEquip)
    public List<EquipMessage> randomEquip(FlowContext flowContext, List<String> itemTypeIds) {
        long userId = flowContext.getUserId();
        List<EquipMessage> equipMessageList = equipTemplateService.randomEquipBatch(itemTypeIds,userId)
                .stream()
                .map(EquipMapper.ME::convert)
                .toList();;
        return equipMessageList;
    }
}
