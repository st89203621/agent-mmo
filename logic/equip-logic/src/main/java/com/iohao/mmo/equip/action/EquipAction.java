package com.iohao.mmo.equip.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.common.config.GameCode;
import com.iohao.mmo.equip.cmd.EquipCmd;
import com.iohao.mmo.equip.entity.Equip;
import com.iohao.mmo.equip.mapper.EquipMapper;
import com.iohao.mmo.equip.proto.CreateEquipMessage;
import com.iohao.mmo.equip.proto.EquipMessage;
import com.iohao.mmo.equip.proto.EquipResetMessage;
import com.iohao.mmo.equip.proto.NewEquipMessage;
import com.iohao.mmo.equip.service.EquipService;
import com.iohao.mmo.equip.service.EquipTemplateService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * @author 唐斌
 * @date 2023-07-30
 * @description: 装备类
 */
@Slf4j
@Component
@ActionController(EquipCmd.cmd)
public class EquipAction {
    @Resource
    EquipService equipService;
    @Resource
    EquipTemplateService equipTemplateService;

    /**
     * 获取某人装备列表信息
     *
     * @param flowContext flowContext
     */
    @ActionMethod(EquipCmd.getEquipList)
    public List<EquipMessage> getEquipList(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        List<Equip> equipList = equipService.listByUser(userId);
        return EquipMapper.ME.convert(equipList);
    }

    /**
     * 获取装备信息
     *
     * @param equipId 装备id
     */
    @ActionMethod(EquipCmd.getEquip)
    public EquipMessage getEquip(String equipId) {
        Equip equip = equipService.findById(equipId);
        return EquipMapper.ME.convert(equip);
    }

    /**
     * 分配装备属性点
     *
     * @param equipMessage equipMessage 分配属性后的装备
     */
    @ActionMethod(EquipCmd.allotEquip)
    public void allotEquip(EquipMessage equipMessage) {
        equipService.allotEquip(EquipMapper.ME.convert(equipMessage));
    }

    /**
     * 重新随机总属性点（鉴定装备）
     *
     * @param equipResetMessage 重新随机装备总属性点参数对象
     */
    @ActionMethod(EquipCmd.resetEquip)
    public EquipMessage resetEquip(EquipResetMessage equipResetMessage) {
        GameCode.objNotFound.assertTrue(
                StringUtils.isNotBlank(equipResetMessage.id)
                        && StringUtils.isNotBlank(equipResetMessage.excellentRateString)
        );
        Equip equip = equipService.resetEquip(
                (equipResetMessage.id),
                new BigDecimal(equipResetMessage.excellentRateString)
        );
        return EquipMapper.ME.convert(equip);
    }

    /**
     * 批量删除装备
     *
     * @param idList 装备id列表
     */
    @ActionMethod(EquipCmd.delEquipBatch)
    public void delEquipBatch(List<String> idList) {
        equipService.delBatch(idList);
    }

    /**
     * 通过材料创建新的装备-内部调用
     *
     * @param createEquipMessage 创建新装备的入参
     * @param flowContext        flowContext
     */
    @ActionMethod(EquipCmd.createEquip)
    public NewEquipMessage internalCreateEquip(CreateEquipMessage createEquipMessage, FlowContext flowContext) {
        // 玩家
        long userId = flowContext.getUserId();

        Equip equip = equipTemplateService.randomEquip(
                createEquipMessage.itemTypeId,
                userId);

        /*
         * 将新装备信息给到调用方，
         * 装备模块并不关心调用方是谁，只要调用此 action，就生成新装备。
         */

        NewEquipMessage newEquipMessage = new NewEquipMessage();
        newEquipMessage.equipId = equip.getId();
        newEquipMessage.itemTypeId = equip.getItemTypeId();

        return newEquipMessage;
    }
}
