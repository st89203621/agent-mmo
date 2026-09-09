package com.iohao.mmo.common.ai.video;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AiVideoResult {
    /** 输出视频/动画的原始字节 */
    private byte[] data;
    /** 文件扩展名（如 "webp"、"mp4"） */
    private String ext;
    /** 帧数 */
    private int frames;
}
