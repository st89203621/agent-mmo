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


import com.iohao.mmo.common.snow.core.IdGenerator;
import com.iohao.mmo.common.snow.core.IdGeneratorException;
import com.iohao.mmo.common.snow.core.IdGeneratorOptions;
import com.iohao.mmo.common.snow.core.SnowWorker;

/**
 * 构建配置类，检查参数是否合法，根据参数构建算法生成器
 *
 * @author 渔民小镇
 * @date 2023-07-27
 */
public class DefaultIdGenerator implements IdGenerator {
    private static SnowWorker snowWorker;

    /**
     * 构造函数，检查参数是否都合法
     *
     * @throws IdGeneratorException
     */
    public DefaultIdGenerator(IdGeneratorOptions options) throws IdGeneratorException {
        // 1.BaseTime
        if (options.baseTime < 315504000000L || options.baseTime > System.currentTimeMillis()) {
            throw new IdGeneratorException("BaseTime error.");
        }

        // 2.WorkerIdBitLength
        if (options.workerIdBitLength <= 0) {
            throw new IdGeneratorException("WorkerIdBitLength error.(range:[1, 21])");
        }
        if (options.workerIdBitLength + options.seqBitLength + options.dataCenterIdBitLength > 22) {
            throw new IdGeneratorException("error：WorkerIdBitLength + SeqBitLength + DataCenterIdBitLength <= 22");
        }

        // 3.WorkerId
        int maxWorkerIdNumber = (1 << options.workerIdBitLength) - 1;
        if (maxWorkerIdNumber == 0) {
            maxWorkerIdNumber = 63;
        }

        if (options.workerId < 0 || options.workerId > maxWorkerIdNumber) {
            throw new IdGeneratorException("WorkerId error. (range:[0, " + (maxWorkerIdNumber > 0 ? maxWorkerIdNumber : 63) + "]");
        }

        // 4. DataCenterId
        int maxDataCenterId = (1 << options.dataCenterIdBitLength) - 1;
        if (options.dataCenterId < 0 || options.dataCenterId > maxDataCenterId) {
            throw new IdGeneratorException("DataCenterId error. (range:[0," + maxDataCenterId + "])");
        }

        // 5.SeqBitLength
        if (options.seqBitLength < 2 || options.seqBitLength > 21) {
            throw new IdGeneratorException("SeqBitLength error. (range:[2, 21])");
        }

        // 6.MaxSeqNumber
        int maxSeqNumber = (1 << options.seqBitLength) - 1;
        if (maxSeqNumber == 0) {
            maxSeqNumber = 63;
        }

        if (options.maxSeqNumber < 0 || options.maxSeqNumber > maxSeqNumber) {
            throw new IdGeneratorException("MaxSeqNumber error. (range:[1, " + maxSeqNumber + "]");
        }

        // 7.MinSeqNumber
        if (options.minSeqNumber < 5 || options.minSeqNumber > maxSeqNumber) {
            throw new IdGeneratorException("MinSeqNumber error. (range:[5, " + maxSeqNumber + "]");
        }

        // 判断是构建雪花漂移算法还是普通雪花算法
        if (options.method == 2) {
            snowWorker = new SnowWorkerM2(options);
        } else {
            snowWorker = new SnowWorkerM1(options);
        }

        if (options.method == 1) {
            try {
                Thread.sleep(500);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    public long next() {
        return snowWorker.next();
    }
}
