package com.iohao.mmo.common.ai.image;

public interface AiImageProvider {

    AiImageResult generate(AiImageRequest request) throws Exception;

    String providerName();
}
