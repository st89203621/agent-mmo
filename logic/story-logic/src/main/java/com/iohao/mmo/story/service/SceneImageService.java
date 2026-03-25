package com.iohao.mmo.story.service;

import com.iohao.mmo.story.entity.SceneImage;
import com.iohao.mmo.story.repository.SceneImageRepository;
import com.volcengine.ark.runtime.model.images.generation.GenerateImagesRequest;
import com.volcengine.ark.runtime.model.images.generation.ImagesResponse;
import com.volcengine.ark.runtime.service.ArkService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * 场景图片服务 - 调用火山引擎生成场景图，图片二进制存入 MongoDB
 */
@Slf4j
@Service
public class SceneImageService {

    private final SceneImageRepository sceneImageRepository;

    @Value("${volcengine.image-api-key:}")
    private String imageApiKey;

    @Value("${volcengine.chat-api-key:3e2f9349-8892-4a67-ae9c-7e8fbd75f071}")
    private String chatApiKey;

    @Value("${volcengine.model:doubao-seedream-4-0-250828}")
    private String model;

    private ArkService arkService;
    private OkHttpClient httpClient;

    public SceneImageService(SceneImageRepository sceneImageRepository) {
        this.sceneImageRepository = sceneImageRepository;
    }

    @PostConstruct
    public void init() {
        // 图片生成优先使用独立的image-api-key，未配置时回退到chat-api-key
        String effectiveKey = (imageApiKey != null && !imageApiKey.isBlank()) ? imageApiKey : chatApiKey;
        ConnectionPool pool = new ConnectionPool(5, 1, TimeUnit.SECONDS);
        this.arkService = ArkService.builder()
                .dispatcher(new Dispatcher())
                .connectionPool(pool)
                .apiKey(effectiveKey)
                .build();
        this.httpClient = new OkHttpClient.Builder()
                .connectionPool(pool)
                .connectTimeout(60, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .build();
        log.info("SceneImageService 初始化完成, model={}, apiKey={}",
                model, (imageApiKey != null && !imageApiKey.isBlank()) ? "独立图片账号" : "与对话共用");
    }

    /**
     * 获取或生成场景图片
     */
    public Optional<SceneImage> getOrGenerate(String cacheKey, String prompt) {
        // 查缓存
        List<SceneImage> cached = sceneImageRepository.findByCacheKey(cacheKey);
        if (!cached.isEmpty()) {
            SceneImage existing = cached.get(0);
            // 校验缓存有效性：imageData 必须非空
            if (existing.getImageData() != null && existing.getImageData().length > 0) {
                return Optional.of(existing);
            }
            // 无效缓存，清除后重新生成
            log.info("清除无效缓存: cacheKey={}", cacheKey);
            cached.forEach(si -> sceneImageRepository.deleteById(si.getId()));
        }

        // 调用文生图
        try {
            byte[] imageBytes = generateAndDownload(prompt);
            if (imageBytes == null || imageBytes.length == 0) {
                return Optional.empty();
            }

            SceneImage si = new SceneImage();
            si.setId(UUID.randomUUID().toString());
            si.setCacheKey(cacheKey);
            si.setImageData(imageBytes);
            si.setContentType("image/png");
            si.setPrompt(prompt);
            si.setCreateTime(System.currentTimeMillis());
            sceneImageRepository.save(si);

            log.info("场景图片生成成功: cacheKey={}, size={}KB", cacheKey, imageBytes.length / 1024);
            return Optional.of(si);
        } catch (Exception e) {
            log.warn("场景图片生成失败: cacheKey={}, error={}", cacheKey, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * 根据ID获取图片
     */
    public Optional<SceneImage> getById(String id) {
        return sceneImageRepository.findById(id);
    }

    /**
     * 基于原图编辑生成新图片（图生图）
     */
    public Optional<SceneImage> editImage(String sourceImageId, String editPrompt) {
        Optional<SceneImage> source = sceneImageRepository.findById(sourceImageId);
        if (source.isEmpty() || source.get().getImageData() == null) {
            log.warn("编辑图片失败：原图不存在 id={}", sourceImageId);
            return Optional.empty();
        }

        String base64 = Base64.getEncoder().encodeToString(source.get().getImageData());
        String cacheKey = "edit_" + sourceImageId + "_" + editPrompt.hashCode() + "_" + System.currentTimeMillis();

        try {
            byte[] imageBytes = editAndDownload(base64, editPrompt);
            if (imageBytes == null || imageBytes.length == 0) {
                return Optional.empty();
            }

            SceneImage si = new SceneImage();
            si.setId(UUID.randomUUID().toString());
            si.setCacheKey(cacheKey);
            si.setImageData(imageBytes);
            si.setContentType("image/png");
            si.setPrompt(editPrompt);
            si.setCreateTime(System.currentTimeMillis());
            sceneImageRepository.save(si);

            log.info("图片编辑成功: sourceId={}, size={}KB", sourceImageId, imageBytes.length / 1024);
            return Optional.of(si);
        } catch (Exception e) {
            log.warn("图片编辑失败: sourceId={}, error={}", sourceImageId, e.getMessage());
            return Optional.empty();
        }
    }

    private byte[] editAndDownload(String imageBase64, String prompt) throws Exception {
        GenerateImagesRequest request = GenerateImagesRequest.builder()
                .model(model)
                .prompt(prompt)
                .image(List.of(imageBase64))
                .size("1024x1024")
                .watermark(false)
                .build();

        ImagesResponse response = arkService.generateImages(request);
        if (response == null || response.getData() == null || response.getData().isEmpty()) {
            return null;
        }

        String imageUrl = response.getData().get(0).getUrl();
        return downloadImage(imageUrl);
    }

    private byte[] generateAndDownload(String prompt) throws Exception {
        GenerateImagesRequest request = GenerateImagesRequest.builder()
                .model(model)
                .prompt(prompt)
                .size("1024x1024")
                .watermark(false)
                .build();

        ImagesResponse response = arkService.generateImages(request);
        if (response == null || response.getData() == null || response.getData().isEmpty()) {
            return null;
        }

        String imageUrl = response.getData().get(0).getUrl();
        return downloadImage(imageUrl);
    }

    private byte[] downloadImage(String imageUrl) throws IOException {
        Request req = new Request.Builder().url(imageUrl).get().build();
        try (Response resp = httpClient.newCall(req).execute()) {
            if (!resp.isSuccessful() || resp.body() == null) {
                throw new IOException("下载图片失败: HTTP " + resp.code());
            }
            return resp.body().bytes();
        }
    }
}
