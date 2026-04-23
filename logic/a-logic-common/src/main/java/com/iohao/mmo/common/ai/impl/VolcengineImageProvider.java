package com.iohao.mmo.common.ai.impl;

import com.iohao.mmo.common.ai.AiProperties;
import com.iohao.mmo.common.ai.image.AiImageProvider;
import com.iohao.mmo.common.ai.image.AiImageRequest;
import com.iohao.mmo.common.ai.image.AiImageResult;
import com.volcengine.ark.runtime.model.images.generation.GenerateImagesRequest;
import com.volcengine.ark.runtime.model.images.generation.ImagesResponse;
import com.volcengine.ark.runtime.service.ArkService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@RequiredArgsConstructor
public class VolcengineImageProvider implements AiImageProvider {

    private final AiProperties.Image.Volcengine cfg;
    private final OkHttpClient downloader = new OkHttpClient.Builder()
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .build();

    @Override
    public AiImageResult generate(AiImageRequest request) throws Exception {
        var b = GenerateImagesRequest.builder()
                .model(cfg.getModel())
                .prompt(request.getPrompt())
                .watermark(request.isWatermark());

        String size = (request.getWidth() > 0 && request.getHeight() > 0)
                ? request.getWidth() + "x" + request.getHeight()
                : cfg.getSize();
        b.size(size);

        if (request.getSourceImageBase64() != null && !request.getSourceImageBase64().isBlank()) {
            b.image(List.of("data:image/png;base64," + request.getSourceImageBase64()));
        }

        ArkService ark = VolcengineArkHolder.get(cfg.getApiKey());
        ImagesResponse resp = ark.generateImages(b.build());
        if (resp == null || resp.getData() == null || resp.getData().isEmpty()) {
            return new AiImageResult(List.of(), request.getWidth(), request.getHeight());
        }

        List<byte[]> images = new ArrayList<>(resp.getData().size());
        for (var d : resp.getData()) {
            images.add(download(d.getUrl()));
        }
        return new AiImageResult(images, request.getWidth(), request.getHeight());
    }

    @Override
    public String providerName() {
        return "volcengine";
    }

    private byte[] download(String url) throws IOException {
        Request req = new Request.Builder().url(url).get().build();
        try (Response resp = downloader.newCall(req).execute()) {
            if (!resp.isSuccessful() || resp.body() == null) {
                throw new IOException("下载图片失败 HTTP " + resp.code() + " url=" + url);
            }
            return resp.body().bytes();
        }
    }
}
