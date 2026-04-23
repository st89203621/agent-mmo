package com.iohao.mmo.common.ai.image;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class AiImageResult {
    /** 每张图的原始 PNG 字节 */
    private List<byte[]> images;
    private int width;
    private int height;
}
