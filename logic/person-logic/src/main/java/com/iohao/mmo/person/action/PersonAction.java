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
package com.iohao.mmo.person.action;

import com.iohao.game.action.skeleton.annotation.ActionController;
import com.iohao.game.action.skeleton.annotation.ActionMethod;
import com.iohao.game.action.skeleton.core.CmdInfo;
import com.iohao.game.action.skeleton.core.flow.FlowContext;
import com.iohao.game.action.skeleton.protocol.ResponseMessage;
import com.iohao.mmo.level.cmd.LevelCmd;
import com.iohao.mmo.level.proto.LevelMessage;
import com.iohao.mmo.person.cmd.PersonCmd;
import com.iohao.mmo.person.entity.Person;
import com.iohao.mmo.person.mapper.PersonMapper;
import com.iohao.mmo.person.proto.PersonMessage;
import com.iohao.mmo.person.service.PersonService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 人物相关 action
 *
 * @author 渔民小镇
 * @date 2023-07-23
 */
@Slf4j
@Component
@ActionController(PersonCmd.cmd)
public class PersonAction {

    @Resource
    PersonService personService;

    /**
     * 初始化角色信息
     */
    @ActionMethod(PersonCmd.initPerson)
    public void initPerson(FlowContext flowContext) {
        long userId = flowContext.getUserId();
        personService.initPerson(userId);
        log.info("角色初始化完成: userId={}", userId);
    }

    /**
     * 获取角色信息
     */
    @ActionMethod(PersonCmd.getPerson)
    public PersonMessage getPerson(FlowContext flowContext) {
        long userId = flowContext.getUserId();

        // 确保角色已初始化
        personService.initPerson(userId);

        Person person = personService.getPersonById(userId);
        PersonMessage personMessage = PersonMapper.ME.convert(person);

        // 获取等级信息
        CmdInfo levelCmd = LevelCmd.of(LevelCmd.ofLevel);
        ResponseMessage levelResponse = flowContext.invokeModuleMessage(levelCmd);
        personMessage.level = levelResponse.getData(LevelMessage.class);

        return personMessage;
    }
}
