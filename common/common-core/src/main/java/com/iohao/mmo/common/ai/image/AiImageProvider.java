package com.iohao.mmo.common.ai.image;

public interface AiImageProvider {

    AiImageResult generate(AiImageRequest request) throws Exception;

    String providerName();

    /**
     * 预上传参考图，返回 provider-specific 句柄，可放进后续 {@link AiImageRequest#getSourceImageRef()} 复用。
     * 用于批量生成时避免对同一张图反复上传（ComfyUI 在繁忙时易触发 Connection reset）。
     * 默认实现返回 null，由 caller 走老路径（在 {@link #generate} 内每次现传 base64）。
     */
    default String prepareSource(byte[] sourceBytes) throws Exception {
        return null;
    }
}
