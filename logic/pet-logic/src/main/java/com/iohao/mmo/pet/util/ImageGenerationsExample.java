package com.iohao.mmo.pet.util;

import com.volcengine.ark.runtime.model.images.generation.GenerateImagesRequest;
import com.volcengine.ark.runtime.model.images.generation.ImagesResponse;
import com.volcengine.ark.runtime.service.ArkService;
import okhttp3.ConnectionPool;
import okhttp3.Dispatcher;

import java.util.concurrent.TimeUnit;

public class ImageGenerationsExample {
    public static void main(String[] args) {
        ConnectionPool connectionPool = new ConnectionPool(5, 1, TimeUnit.SECONDS);
        Dispatcher dispatcher = new Dispatcher();
        ArkService service = ArkService.builder().dispatcher(dispatcher).connectionPool(connectionPool).apiKey("3e2f9349-8892-4a67-ae9c-7e8fbd75f071").build();

        GenerateImagesRequest generateRequest = GenerateImagesRequest.builder().model("doubao-seedream-4-0-250828").prompt("一只可爱的卡通猫，全身像，完整主体，不要裁剪任何部分，纯黑色背景，背景必须是纯黑色(RGB 0,0,0)，主体居中，高清，清晰边缘").watermark(false).build();

        ImagesResponse imagesResponse = service.generateImages(generateRequest);
        System.out.println(imagesResponse.getData().get(0).getUrl());

        service.shutdownExecutor();
    }
}