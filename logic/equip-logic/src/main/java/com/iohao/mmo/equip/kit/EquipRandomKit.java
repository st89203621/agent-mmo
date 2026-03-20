package com.iohao.mmo.equip.kit;

import com.iohao.mmo.common.kit.RandomKit;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * @author 唐斌
 * @ClassName EquipRandomKit
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
public class EquipRandomKit {

    /** 极品率 0.0000-1.0000*/
    public static BigDecimal excellentRate = BigDecimal.valueOf(0.1000);
    /** 极品范围占比*/
    public static BigDecimal excellentProp = BigDecimal.valueOf(0.2000);

    /**
     * 根据是否极品，在范围内随机一个值
     *
     * @param randomMin 限定范围的最小值(int)
     * @param randomMax 限定范围的最大值(int)
     * @param excellentFlag 增加的极品率
     * @return boolean
     */
    public static int randomFromExcellent(int randomMin,int randomMax,boolean excellentFlag) {
        //普品-极品分界值（属于普品）
        BigDecimal boundaryValue =
                BigDecimal.valueOf(randomMin).add(
                        (BigDecimal.valueOf(randomMax).subtract(BigDecimal.valueOf(randomMin)))
                                .multiply(BigDecimal.ONE.subtract(excellentProp))
                                .setScale(0, RoundingMode.HALF_UP)
                );
        BigDecimal rangeMin = BigDecimal.valueOf(randomMin);
        BigDecimal rangeMax = BigDecimal.valueOf(randomMax);
        if(excellentFlag){
            if(boundaryValue.compareTo(rangeMax)<0){
                rangeMin = boundaryValue.add(BigDecimal.ONE);
            }else {
                rangeMin = rangeMax;
            }
        }else {
            if(boundaryValue.compareTo(rangeMin)>0){
                rangeMax = boundaryValue;
            }else {
                rangeMax = rangeMin;
            }
        }
        return RandomKit.randomFromArr(rangeMin,rangeMax).intValue();

    }


    /**
     * 本次是否生成极品
     * @param addExcellentRate 极品率 0.0000-1.0000
     *
     * @return boolean
     */
    public static boolean isExcellent(BigDecimal addExcellentRate) {
        return RandomKit.isLuck(excellentRate.add(addExcellentRate));
    }
}
