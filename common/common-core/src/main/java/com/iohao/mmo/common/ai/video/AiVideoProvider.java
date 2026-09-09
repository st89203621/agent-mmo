package com.iohao.mmo.common.ai.video;

public interface AiVideoProvider {

    AiVideoResult generate(AiVideoRequest request) throws Exception;

    String providerName();

    /**
     * 预上传参考图，返回 provider-specific 句柄，可放进后续 {@link AiVideoRequest#getSourceImageRef()} 复用。
     * 默认实现返回 null，由 caller 走老路径（在 {@link #generate} 内每次现传 base64）。
     */
    default String prepareSource(byte[] sourceBytes) throws Exception {
        return null;
    }
}
