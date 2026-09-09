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
package com.iohao.mmo.common.snow.core.impl;


import com.iohao.mmo.common.snow.core.IdGeneratorException;
import com.iohao.mmo.common.snow.core.IdGeneratorOptions;

/**
 * 传统雪花漂移算法核心代码
 *
 * @author 渔民小镇
 * @date 2023-07-27
 */
public class SnowWorkerM2 extends SnowWorkerM1 {

    //调用父类构造
    public SnowWorkerM2(IdGeneratorOptions options) {
        super(options);
    }

    @Override
    public long next() {
        synchronized (SYNC_LOCK) {
            long currentTimeTick = getCurrentTimeTick();

            //如果最后一次生成与当前时间相同
            if (lastTimeTick == currentTimeTick) {
                //如果当前使用到的序列号已经大于最大序列号，就是用预留的插
                if (currentSeqNumber++ > maxSeqNumber) {
                    currentSeqNumber = minSeqNumber;
                    currentTimeTick = getNextTimeTick();
                }
            } else {
                currentSeqNumber = minSeqNumber;
            }

            //如果发生了时间回拨
            if (currentTimeTick < lastTimeTick) {
                throw new IdGeneratorException("Time error for {0} milliseconds", lastTimeTick - currentTimeTick);
            }

            lastTimeTick = currentTimeTick;

            //位移并返回
            return shiftStitchingResult(currentTimeTick);
        }
    }
}
