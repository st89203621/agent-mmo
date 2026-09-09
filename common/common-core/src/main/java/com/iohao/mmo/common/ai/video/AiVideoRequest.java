package com.iohao.mmo.common.ai.video;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AiVideoRequest {
    private String prompt;
    /** 已通过 {@link AiVideoProvider#prepareSource(byte[])} 预上传到 provider 的句柄；优先于 base64 */
    private String sourceImageRef;
    /** 原图的 base64（不带 data: 前缀）；为空则纯文生视频 */
    private String sourceImageBase64;
    @Builder.Default
    private int width = 768;
    @Builder.Default
    private int height = 512;
    @Builder.Default
    private int frames = 97;
    /** 步数覆盖；<=0 表示沿用 provider 配置默认值。 */
    @Builder.Default
    private int stepsOverride = 0;
    /** 种子覆盖；==0 表示随机，其它值固定使用。 */
    @Builder.Default
    private long seedOverride = 0L;
    /** 负向提示词覆盖；null 表示沿用配置。 */
    private String negativePromptOverride;
    /** 视频模型：ltxv / wan */
    @Builder.Default
    private String videoModel = "wan";
}
