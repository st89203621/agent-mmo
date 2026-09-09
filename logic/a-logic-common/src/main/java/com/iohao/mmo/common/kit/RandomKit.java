package com.iohao.mmo.common.kit;

import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.Random;
import java.util.concurrent.ThreadLocalRandom;

/**
 * @author 唐斌
 * @ClassName RandomKit
 * @description: 随机概率工具
 *  常见四种概率算法：
 *      1.常规做法，直接配置概率，程序直接判定
 *      2.在1的基础上，加个保底次数，当连续不发生的次数高于保底时，强制发生
 *      3.设置基础概率，事件不发生概率翻倍
 *      4.设置数组，将事件发生概率变成数组元素
 * @date 2023年07月26日
 * @version: 1.0
 */
@Component
public class RandomKit {

    private static final ThreadLocalRandom RANDOM = ThreadLocalRandom.current();

    /**
     * 通过概率随机返回本次是否命中
     *
     * @param chance 命中概率 0.000000 - 1.000000
     * @return boolean 是否命中
     */
    public static boolean isLuck(BigDecimal chance) {
        int chanceInt = chance.multiply(new BigDecimal("1000000")).intValue();
        int randomNum = RANDOM.nextInt(1000000);
        return randomNum <= chanceInt;
    }

    /**
     * 在范围内随机一个值（小数）
     *
     * @param rangeMin 限定范围的下限
     * @param rangeMax 限定范围的上限
     * @return boolean
     */
    public static BigDecimal randomFromArr(BigDecimal rangeMin,BigDecimal rangeMax) {
        Random random = new Random();
        return rangeMin.add(
                        rangeMax.subtract(rangeMin)
                                .multiply(BigDecimal.valueOf(random.nextDouble()))
                );
    }

    /**
     * 在范围内随机一个值（整数）
     *
     * @param randomMin 限定范围的最小值(int)
     * @param randomMax 限定范围的最大值(int)
     * @return boolean
     */
    public static int randomFromInt(int randomMin,int randomMax) {
        return randomFromArr(BigDecimal.valueOf(randomMin),
                BigDecimal.valueOf(randomMax))
                .intValue();

    }
}
