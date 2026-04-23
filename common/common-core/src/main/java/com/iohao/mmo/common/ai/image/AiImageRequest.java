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
}
