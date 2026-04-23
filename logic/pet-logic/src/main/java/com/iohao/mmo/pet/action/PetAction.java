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
package com.iohao.mmo.pet.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.mmo.common.config.GameCode;
import com.iohao.mmo.pet.cmd.PetCmd;
import com.iohao.mmo.pet.entity.Pet;
import com.iohao.mmo.pet.entity.PetSkillTemplate;
import com.iohao.mmo.pet.entity.PetTemplate;
import com.iohao.mmo.pet.mapper.PetMapper;
import com.iohao.mmo.pet.proto.PetMessage;
import com.iohao.mmo.pet.proto.PetSkillTemplateMessage;
import com.iohao.mmo.pet.proto.PetTemplateMessage;
import com.iohao.mmo.pet.proto.UpdatePetPropertyMessage;
import com.iohao.mmo.pet.proto.GeneratePetImageRequest;
import com.iohao.mmo.pet.proto.GeneratePetImageResponse;
import com.iohao.mmo.pet.proto.CreatePetMessage;
import com.iohao.mmo.pet.proto.UpdatePetImageMessage;
import com.iohao.mmo.pet.proto.internal.EnhancePetSkillMessage;
import com.iohao.mmo.pet.service.PetService;
import com.iohao.mmo.pet.util.PetAiImageGenerator;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;

/**
 * 宠物
 *
 * @author 渔民小镇
 * @date 2023-08-29
 */
@Slf4j
@Component
@ActionController(PetCmd.cmd)
public class PetAction {

    @Resource
    PetService petService;

    @Resource
    PetAiImageGenerator aiImageGenerator;

    /**
     * 宠物宝宝模板列表
     *
     * @return 宠物宝宝模板列表
     */
    @ActionMethod(PetCmd.listPetTemplate)
    public List<PetTemplateMessage> listPetTemplate() {
        Collection<PetTemplate> petTemplates = petService.listPetTemplates();
        return PetMapper.ME.convertPetTemplates(petTemplates);
    }

    /**
     * 宠物宝宝列表
     *
     * @param flowContext flowContext
     * @return 宠物宝宝列表
     */
    @ActionMethod(PetCmd.listPet)
    public List<PetMessage> listPet(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        Collection<Pet> pets = petService.listPet(userId);
        return PetMapper.ME.convertPets(pets);
    }

    @ActionMethod(PetCmd.boomEgg)
    public void internalBoomEgg(FlowContext flowContext) {
        petService.randomPet(flowContext);
    }

    /**
     * 更新宝宝属性
     *
     * @param petProperty 潜力属性
     * @param flowContext flowContext
     * @return pet
     */
    @ActionMethod(PetCmd.updatePetProperty)
    public PetMessage updatePetProperty(UpdatePetPropertyMessage petProperty, FlowContext flowContext) {
        Pet pet = this.petService.updatePetProperty(petProperty, flowContext);
        GameCode.petNotExist.assertNonNull(pet);
        
        return PetMapper.ME.convert(pet);
    }

    /**
     * 宝宝打技能
     *
     * @param petSkillMessage 宝宝技能
     * @param flowContext     flowContext
     * @return pet
     */
    @ActionMethod(PetCmd.enhancePetSkill)
    public PetMessage enhancePetSkill(EnhancePetSkillMessage petSkillMessage, FlowContext flowContext) {

        String skill = petSkillMessage.skill;
        PetSkillTemplate petSkillTemplate = this.petService.getPetSkillTemplate(skill);
        GameCode.petSkillNotExist.assertNonNull(petSkillTemplate);

        Pet pet = this.petService.enhancePetSkill(petSkillMessage, flowContext);

        GameCode.petNotExist.assertNonNull(pet);

        return PetMapper.ME.convert(pet);
    }

    /**
     * 宝宝技能模板列表
     *
     * @return 宝宝技能模板列表
     */
    @ActionMethod(PetCmd.listPetSkillTemplate)
    public List<PetSkillTemplateMessage> listPetSkillTemplate() {
        List<PetSkillTemplate> petSkillTemplates = this.petService.listPetSkillTemplate();
        return PetMapper.ME.convertPetSkillTemplates(petSkillTemplates);
    }

    /**
     * 删除宝宝
     *
     * @param petId       宝宝 id
     * @param flowContext flowContext
     * @return true
     */
    @ActionMethod(PetCmd.deletePet)
    public boolean deletePet(String petId, FlowContext flowContext) {
        this.petService.deletePet(petId, flowContext);
        return true;
    }
    
    /**
     * AI生成宠物图片
     *
     * @param request 生成图片请求
     * @param flowContext flowContext
     * @return 生成的图片数据
     */
    @ActionMethod(PetCmd.generatePetImage)
    public GeneratePetImageResponse generatePetImage(GeneratePetImageRequest request, FlowContext flowContext) {
        long userId = flowContext.getUserId();
        log.info("收到AI生成宠物图片请求: userId={}, request={}", userId, request);
        
        GeneratePetImageResponse response = new GeneratePetImageResponse();
        
        try {
            // 生成提示词
            String prompt;
            if (request.customPrompt != null && !request.customPrompt.isEmpty()) {
                // 使用自定义提示词
                prompt = request.customPrompt;
            } else {
                // 根据宠物属性生成提示词
                prompt = aiImageGenerator.generatePromptForPet(
                    request.petType, 
                    request.element, 
                    request.style
                );
            }
            
            log.info("用户 {} 生成提示词: {}", userId, prompt);
            response.prompt = prompt;
            
            // 调用AI生成图片
            List<String> imageDataList = aiImageGenerator.generatePetImage(prompt);
            response.imageDataList = imageDataList;
            response.success = true;
            
            log.info("用户 {} 成功生成 {} 张宠物图片", userId, imageDataList.size());
            
        } catch (Exception e) {
            log.error("用户 {} 生成宠物图片失败", userId, e);
            response.success = false;
            response.errorMessage = "生成图片失败: " + e.getMessage();
        }

        return response;
    }

    /**
     * 创建宠物（带形象）
     */
    @ActionMethod(PetCmd.createPet)
    public PetMessage createPet(CreatePetMessage createPetMessage, FlowContext flowContext) {
        Pet pet = petService.createPet(createPetMessage, flowContext);
        GameCode.petNotExist.assertNonNull(pet);
        return PetMapper.ME.convert(pet);
    }

    /**
     * 更新宠物形象
     */
    @ActionMethod(PetCmd.updatePetImage)
    public PetMessage updatePetImage(UpdatePetImageMessage updatePetImageMessage, FlowContext flowContext) {
        Pet pet = petService.updatePetImage(updatePetImageMessage, flowContext);
        GameCode.petNotExist.assertNonNull(pet);
        return PetMapper.ME.convert(pet);
    }
}