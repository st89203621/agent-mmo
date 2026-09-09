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
import com.iohao.mmo.common.snow.core.SnowWorker;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;

/**
 * 雪花漂移算法核心代码
 *
 * @author 渔民小镇
 * @date 2023-07-27
 */
@FieldDefaults(level = AccessLevel.PROTECTED)
public class SnowWorkerM1 implements SnowWorker {

    /**
     * 基础时间
     */
    final long baseTime;

    /**
     * 机器码
     */
    final short workerId;

    /**
     * 机器码位长
     */
    final byte workerIdBitLength;

    /**
     * 数据中心id
     */
    final short dataCenterId;

    /**
     * 数据中心id位长
     */
    final byte dataCenterIdBitLength;

    /**
     * 自增序列数位长
     */
    final byte seqBitLength;

    /**
     * 最大序列数（含）
     */
    final int maxSeqNumber;

    /**
     * 最小序列数（含）
     */
    final short minSeqNumber;

    /**
     * 最大漂移次数（含）
     */
    final int topOverCostCount;

    /**
     * 锁对象
     */
    final static byte[] SYNC_LOCK = new byte[0];

    /**
     * 时间戳位移位
     */
    final byte timestampShift;

    /**
     * 数据中心id位移
     */
    final byte dataCenterShift;

    /**
     * 当前能使用的序列数id
     */
    short currentSeqNumber;
    /**
     * 最后一次生成id的时间戳差值
     */
    long lastTimeTick = 0;
    /**
     * 回拨时间戳差值
     */
    long turnBackTimeTick = 0;
    /**
     * 回拨序数位索引
     */
    byte turnBackIndex = 0;
    /**
     * 超出当前毫秒序号最大长度标识
     */
    boolean overCost = false;
    int overCostCountInOneTerm = 0;
    int genCountInOneTerm = 0;
    /**
     * 序列数索引，用一个+1，【0,4】预留
     */
    int termIndex = 0;

    /**
     * 构造参数准备
     *
     * @param options
     */
    public SnowWorkerM1(IdGeneratorOptions options) {
        baseTime = options.baseTime != 0 ? options.baseTime : 1582136402000L;
        workerIdBitLength = options.workerIdBitLength == 0 ? 6 : options.workerIdBitLength;
        workerId = options.workerId;
        seqBitLength = options.seqBitLength == 0 ? 6 : options.seqBitLength;

        //校验DataCenterId，如果DataCenterIdBitLength为0，那么DataCenterId强制为0
        if (options.dataCenterIdBitLength == 0) {
            dataCenterId = 0;
        } else {
            dataCenterId = options.dataCenterId;
        }
        dataCenterIdBitLength = options.dataCenterIdBitLength;

        maxSeqNumber = options.maxSeqNumber <= 0 ? (1 << seqBitLength) - 1 : options.maxSeqNumber;
        minSeqNumber = options.minSeqNumber;
        topOverCostCount = options.topOverCostCount == 0 ? 2000 : options.topOverCostCount;
        //时间戳位移为 机器码位长 + 数据中心id位长 + 序数号位长
        timestampShift = (byte) (workerIdBitLength + dataCenterIdBitLength + seqBitLength);
        //数据中心id位移为 机器码位长 + 数据中心id位长 + 序数号位长
        dataCenterShift = (byte) (dataCenterIdBitLength + seqBitLength);
        currentSeqNumber = minSeqNumber;
    }

    private void endOverCostAction(long useTimeTick) {
        if (termIndex > 10000) {
            termIndex = 0;
        }
    }

    /**
     * 正常的获取下一个id，生成id核心代码
     *
     * @return 下一个id
     * @throws IdGeneratorException
     */
    private long nextNormalId() throws IdGeneratorException {
        long currentTimeTick = getCurrentTimeTick();

        //如果出现时间回拨
        if (currentTimeTick < lastTimeTick) {
            if (turnBackTimeTick < 1) {
                turnBackTimeTick = lastTimeTick - 1;
                turnBackIndex++;

                // 每毫秒序列数的前5位是预留位，0用于手工新值，1-4是时间回拨次序
                // 支持4次回拨次序（避免回拨重叠导致ID重复），可无限次回拨（次序循环使用）。
                if (turnBackIndex > 4) {
                    turnBackIndex = 1;
                }

            }

            return calcTurnBackId(turnBackTimeTick);
        }

        // 时间追平时，_TurnBackTimeTick清零
        if (turnBackTimeTick > 0) {
            turnBackTimeTick = 0;
        }

        if (currentTimeTick > lastTimeTick) {
            lastTimeTick = currentTimeTick;
            currentSeqNumber = minSeqNumber;

            return calcId(lastTimeTick);
        }

        //当前序列数
        if (currentSeqNumber > maxSeqNumber) {

            termIndex++;
            lastTimeTick++;
            currentSeqNumber = minSeqNumber;
            overCost = true;
            overCostCountInOneTerm = 1;
            genCountInOneTerm = 1;

            return calcId(lastTimeTick);
        }

        return calcId(lastTimeTick);
    }

    /**
     * 超出该毫秒内的支持的生成数，生成id
     *
     * @return long生产的id
     */
    private long nextOverCostId() {
        long currentTimeTick = getCurrentTimeTick();

        //如果出现时间回拨
        if (currentTimeTick > lastTimeTick) {
            endOverCostAction(currentTimeTick);

            lastTimeTick = currentTimeTick;
            currentSeqNumber = minSeqNumber;
            overCost = false;
            overCostCountInOneTerm = 0;
            genCountInOneTerm = 0;

            return calcId(lastTimeTick);
        }


        if (overCostCountInOneTerm >= topOverCostCount) {
            endOverCostAction(currentTimeTick);

            lastTimeTick = getNextTimeTick();
            currentSeqNumber = minSeqNumber;
            overCost = false;
            overCostCountInOneTerm = 0;
            genCountInOneTerm = 0;

            return calcId(lastTimeTick);
        }

        if (currentSeqNumber > maxSeqNumber) {
            lastTimeTick++;
            currentSeqNumber = minSeqNumber;
            overCost = true;
            overCostCountInOneTerm++;
            genCountInOneTerm++;

            return calcId(lastTimeTick);
        }

        genCountInOneTerm++;
        return calcId(lastTimeTick);
    }

    /**
     * 正常情况下，采用左位移拼接结果id
     *
     * @param useTimeTick 时间戳差值
     * @return 生成的id
     */
    private long calcId(long useTimeTick) {
        long result = shiftStitchingResult(useTimeTick);
        currentSeqNumber++;
        return result;
    }

    /**
     * 发生时间回拨的时候，采用左位移拼接结果id
     *
     * @param useTimeTick 时间戳差值
     * @return 生成的id
     */
    private long calcTurnBackId(long useTimeTick) {
        long result = shiftStitchingResult(useTimeTick);
        turnBackTimeTick--;
        return result;
    }

    /**
     * 左位移拼接返回的id
     *
     * @param useTimeTick 时间差值
     * @return 生成的id
     */
    protected long shiftStitchingResult(long useTimeTick) {
        /*
         * 采用BigInteger重构，但是并发量可能会低，需要测试
         * return BigInteger.valueOf(useTimeTick)
         * .shiftLeft(_TimestampShift).add(BigInteger.valueOf(DataCenterId))
         * .shiftLeft(_DataCenterShift).add(BigInteger.valueOf(WorkerId))
         * .shiftLeft(SeqBitLength).add(BigInteger.valueOf(_CurrentSeqNumber));
         */

        //时间差值，时间戳位移 = 数据中心id位长 + 机器码位长 + 序数位长
        return ((useTimeTick << timestampShift) +
                //数据中心id，数据中心id位移 = 机器码位长 + 序数位长
                ((long) dataCenterId << dataCenterShift) +
                //机器码数，机器码位移 = 序数位长
                ((long) workerId << seqBitLength) +
                (int) currentSeqNumber);
    }

    /**
     * 获取当前时间 - 系统时间差值
     *
     * @return 时间差值
     */
    protected long getCurrentTimeTick() {
        long millis = System.currentTimeMillis();
        return millis - baseTime;
    }

    /**
     * 获取下次时间差值
     *
     * @return 时间差值
     */
    protected long getNextTimeTick() {
        long tempTimeTicker = getCurrentTimeTick();
        while (tempTimeTicker <= lastTimeTick) {
            try {
                //发生回拨等待 10 毫秒
                Thread.sleep(10);
            } catch (InterruptedException e) {
                throw new IdGeneratorException("Error when time callback waits three millisecond");
            }
            tempTimeTicker = getCurrentTimeTick();
        }

        return tempTimeTicker;
    }

    /**
     * 真正执行的方法，判断是否超出当前生成序数的最大值，执行不同的方法
     *
     * @return 生成的id
     */
    @Override
    public long next() {
        synchronized (SYNC_LOCK) {
            return overCost ? nextOverCostId() : nextNormalId();
        }
    }
}

