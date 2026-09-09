package com.iohao.mmo.common.ai.image;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AiImageRequest {
    private String prompt;
    @Builder.Default
    private int width = 1024;
    @Builder.Default
    private int height = 1024;
    @Builder.Default
    private int count = 1;
    @Builder.Default
    private boolean watermark = false;
    /** 图生图：原图的 base64（不带 data: 前缀）；为空则文生图 */
    private String sourceImageBase64;
    /** 已通过 {@link AiImageProvider#prepareSource(byte[])} 预上传到 provider 的句柄；优先于 base64 */
    private String sourceImageRef;

    /** 步数覆盖；<=0 表示沿用 provider 配置默认值。 */
    @Builder.Default
    private int stepsOverride = 0;
    /** CFG 覆盖；<=0 表示沿用配置。 */
    @Builder.Default
    private double cfgOverride = 0.0;
    /** 种子覆盖；==0 表示随机，其它值固定使用。 */
    @Builder.Default
    private long seedOverride = 0L;
    /** 负向提示词覆盖；null 表示沿用配置。 */
    private String negativePromptOverride;
}
