package com.iohao.mmo.title.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.title.cmd.TitleCmd;
import com.iohao.mmo.title.entity.PlayerTitle;
import com.iohao.mmo.title.entity.TitleTemplate;
import com.iohao.mmo.title.proto.TitleMessage;
import com.iohao.mmo.title.service.TitleService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@ActionController(TitleCmd.cmd)
public class TitleAction {

    @Resource
    TitleService titleService;

    @ActionMethod(TitleCmd.listTitles)
    public List<TitleMessage> listTitles(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        PlayerTitle pt = titleService.getPlayerTitle(userId);
        return pt.getOwnedTitleIds().stream().map(id -> {
            TitleTemplate t = titleService.getTemplate(id);
            return toMessage(t, id.equals(pt.getEquippedTitleId()));
        }).toList();
    }

    @ActionMethod(TitleCmd.listAvailable)
    public List<TitleMessage> listAvailable(FlowContext flowContext) {
        PlayerTitle owned = titleService.getPlayerTitle(flowContext.getUserId());
        return titleService.getAllTemplates().stream()
                .map(t -> toMessage(t, owned.getEquippedTitleId() != null && owned.getEquippedTitleId().equals(t.getId()))).toList();
    }

    @ActionMethod(TitleCmd.claimTitle)
    public TitleMessage claimTitle(String titleId, FlowContext flowContext) {
        requireTitleId(titleId);
        titleService.claimTitle(flowContext.getUserId(), titleId);
        return current(flowContext);
    }

    @ActionMethod(TitleCmd.equipTitle)
    public TitleMessage equipTitle(String titleId, FlowContext flowContext) {
        requireTitleId(titleId);
        if (!titleService.equipTitle(flowContext.getUserId(), titleId)) {
            throw new IllegalArgumentException("请先领取这个称号");
        }
        return current(flowContext);
    }

    @ActionMethod(TitleCmd.unequipTitle)
    public TitleMessage unequipTitle(FlowContext flowContext) {
        titleService.unequipTitle(flowContext.getUserId());
        return current(flowContext);
    }

    @ActionMethod(TitleCmd.getEquipped)
    public TitleMessage getEquipped(FlowContext flowContext) {
        return current(flowContext);
    }

    private TitleMessage current(FlowContext flowContext) {
        PlayerTitle pt = titleService.getPlayerTitle(flowContext.getUserId());
        String id = pt.getEquippedTitleId();
        return toMessage(id == null ? null : titleService.getTemplate(id), true);
    }

    private static void requireTitleId(String titleId) {
        if (titleId == null || titleId.isBlank()) {
            throw new IllegalArgumentException("称号编号不能为空");
        }
    }

    private TitleMessage toMessage(TitleTemplate t, boolean equipped) {
        if (t == null) return new TitleMessage();
        TitleMessage m = new TitleMessage();
        m.titleId = t.getId();
        m.name = t.getName();
        m.titleType = t.getTitleType();
        m.requiredLevel = t.getRequiredLevel();
        m.description = t.getDescription();
        m.equipped = equipped;
        m.bonusJson = String.format(
            "{\"atk\":%d,\"def\":%d,\"hp\":%d,\"magicAtk\":%d,\"extraAtk\":%d,\"extraDef\":%d,\"agility\":%d}",
            t.getBonusAtk(), t.getBonusDef(), t.getBonusHp(), t.getBonusMagicAtk(),
            t.getBonusExtraAtk(), t.getBonusExtraDef(), t.getBonusAgility()
        );
        return m;
    }
}
