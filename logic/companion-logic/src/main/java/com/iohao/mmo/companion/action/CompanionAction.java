/*
 * ioGame
 * Copyright (C) 2021 - 2023  渔民小镇 （262610965@qq.com、luoyizhu@gmail.com） . All Rights Reserved.
 * # iohao.com . 渔民小镇
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package com.iohao.mmo.companion.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.companion.cmd.CompanionCmd;
import com.iohao.mmo.companion.entity.CompanionBag;
import com.iohao.mmo.companion.entity.SpiritCompanion;
import com.iohao.mmo.companion.mapper.CompanionMapper;
import com.iohao.mmo.companion.proto.CompanionMessage;
import com.iohao.mmo.companion.proto.RecruitCompanionRequest;
import com.iohao.mmo.companion.proto.SetTeamRequest;
import com.iohao.mmo.companion.proto.UpdateAvatarRequest;
import com.iohao.mmo.companion.service.CompanionService;
import com.iohao.mmo.companion.service.CompanionTemplate;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 灵侣系统
 *
 * @author 渔民小镇
 * @date 2025-10-15
 */
@Slf4j
@Component
@ActionController(CompanionCmd.cmd)
public class CompanionAction {
    
    @Resource
    CompanionService companionService;
    
    @ActionMethod(CompanionCmd.listCompanion)
    public List<CompanionMessage> listCompanion(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        List<SpiritCompanion> companions = companionService.listCompanions(userId);
        return CompanionMapper.ME.convertList(companions);
    }
    
    @ActionMethod(CompanionCmd.recruitCompanion)
    public CompanionMessage recruitCompanion(RecruitCompanionRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        String companionId = request.companionId;
        
        CompanionBag bag = companionService.ofCompanionBag(userId);
        
        if (bag.hasCompanion(companionId)) {
            throw new RuntimeException("已拥有该灵侣");
        }
        
        CompanionTemplate template = CompanionTemplate.getTemplate(companionId);
        if (template == null) {
            throw new RuntimeException("灵侣模板不存在");
        }
        
        SpiritCompanion companion = companionService.createCompanion(companionId, template);
        bag.addCompanion(companion);
        companionService.save(bag);
        
        log.info("用户 {} 招募灵侣 {}", userId, companionId);
        return CompanionMapper.ME.convert(companion);
    }
    
    @ActionMethod(CompanionCmd.setTeam)
    public void setTeam(SetTeamRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        CompanionBag bag = companionService.ofCompanionBag(userId);
        
        if (request.team.size() > 3) {
            throw new RuntimeException("队伍最多3个灵侣");
        }
        
        bag.setTeam(request.team);
        companionService.save(bag);
        
        log.info("用户 {} 设置队伍 {}", userId, request.team);
    }
    
    @ActionMethod(CompanionCmd.updateAvatar)
    public CompanionMessage updateAvatar(UpdateAvatarRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        log.info("收到更新形象请求 - 用户: {}, 灵侣ID: {}, 风格: {}", userId, request.companionId, request.avatarStyle);

        String companionId = request.companionId;

        if (CompanionTemplate.getTemplate(companionId) == null) {
            log.warn("收到无效的companionId: {}, 尝试修复", companionId);
            String fixedId = companionService.guessCompanionIdByOldId(companionId);
            if (fixedId != null) {
                log.info("修复companionId: {} -> {}", companionId, fixedId);
                companionId = fixedId;
            } else {
                log.error("无法修复companionId: {}", companionId);
                throw new RuntimeException("灵侣模板不存在: " + request.companionId);
            }
        }

        CompanionBag bag = companionService.ofCompanionBag(userId);

        SpiritCompanion companion = bag.getCompanion(companionId);
        if (companion == null) {
            log.info("灵侣不存在，尝试自动招募 - companionId: {}", companionId);
            CompanionTemplate template = CompanionTemplate.getTemplate(companionId);
            if (template == null) {
                log.error("灵侣模板不存在 - companionId: {}", companionId);
                throw new RuntimeException("灵侣模板不存在: " + companionId);
            }

            companion = companionService.createCompanion(companionId, template);
            bag.addCompanion(companion);
            log.info("用户 {} 自动招募灵侣 {}", userId, companionId);
        }

        companion.setAvatarUrl(request.avatarUrl);
        companion.setAvatarStyle(request.avatarStyle);
        companion.setAvatarEquipped(true);

        companionService.save(bag);

        log.info("用户 {} 更新灵侣 {} 形象成功", userId, companionId);
        return CompanionMapper.ME.convert(companion);
    }
}

