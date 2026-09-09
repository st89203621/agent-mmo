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
package com.iohao.mmo.common.snow.core;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

/**
 * @author 渔民小镇
 * @date 2023-07-27
 */
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class IdGeneratorOptions {

    /**
     * 雪花计算方法
     * <pre>
     *     （1-漂移算法|2-传统算法），默认1
     * </pre>
     */
    public short method = 1;

    /**
     * 基础时间（ms单位）
     * <pre>
     *     不能超过当前系统时间，默认为2023-01-01 00:00:00
     * </pre>
     */
    public long baseTime = 1672502400000L;

    /**
     * 机器码
     * <pre>
     *     该实例机器码，必须唯一，必须由外部设定，最大值 2^WorkerIdBitLength-1
     * </pre>
     */
    public short workerId = 0;

    /**
     * 机器码位长
     * <pre>
     *     决定项目集群能使用id最大机器数， 默认值6，取值范围 [1, 15]（要求：序列数位长+机器码位长不超过22）
     * </pre>
     */
    public byte workerIdBitLength = 1;

    /**
     * 数据中心id
     * <pre>
     *     该实例集群机器码，必须唯一，必须由外部设定，最大值 2^DataCenterIdBitLength-1
     * </pre>
     */
    public short dataCenterId = 0;

    /**
     * 数据中心id位长
     * <pre>
     *     决定项目集群能使用id最大机器数， 默认值0（取值范围[0,6],也就是说最多支持集群配置 2 ^ 6 = 64 个数据中心）
     * </pre>
     */
    public byte dataCenterIdBitLength = 0;

    /**
     * 序列数位长
     * <pre>
     *     决定一毫秒能生成的最大id数，如果超过会阻塞，默认值6，取值范围 [3, 21]（要求：序列数位长+机器码位长不超过22）
     * </pre>
     */
    public byte seqBitLength = 6;

    /**
     * 最大序列数（含）
     * <pre>
     *     设置范围 [MinSeqNumber, 2^SeqBitLength-1]，默认值0，表示最大序列数取最大值（2^SeqBitLength-1]）
     * </pre>
     */
    public short maxSeqNumber = 0;

    /**
     * 最小序列数（含）
     * <pre>
     *     默认值5，取值范围 [5, MaxSeqNumber]，每毫秒的前5个序列数对应编号是0-4是保留位，
     *     其中1-4是时间回拨相应预留位，0是手工新值预留位
     * </pre>
     */
    public short minSeqNumber = 5;

    /**
     * 最大漂移次数（含）
     * <pre>
     *     默认2000，推荐范围500-10000（与计算能力有关）
     * </pre>
     */
    public short topOverCostCount = 2000;
}
