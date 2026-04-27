package com.iohao.mmo.story.service;

import com.iohao.mmo.common.ai.image.AiImageProvider;
import com.iohao.mmo.common.ai.image.AiImageRequest;
import com.iohao.mmo.common.ai.image.AiImageResult;
import com.iohao.mmo.story.entity.SceneImage;
import com.iohao.mmo.story.repository.SceneImageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * 场景图片服务 - 通过 AiImageProvider 抽象（本地 ComfyUI / 火山）生成并持久化图片。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SceneImageService {

    private final SceneImageRepository sceneImageRepository;
    private final AiImageProvider imageProvider;

    public Optional<SceneImage> getOrGenerate(String cacheKey, String prompt) {
        return getOrGenerate(cacheKey, prompt, 1024, 1024, false);
    }

    public Optional<SceneImage> getOrGenerate(String cacheKey, String prompt, int width, int height) {
        return getOrGenerate(cacheKey, prompt, width, height, false);
    }

    /**
     * @param force true 表示重绘：先删除同 cacheKey 的旧记录，再生成。
     *              这样同一资产永远只有一条记录，避免 prefix 查询读到历史图。
     */
    public Optional<SceneImage> getOrGenerate(String cacheKey, String prompt, int width, int height, boolean force) {
        String cacheLookupKey = width + "x" + height + "_" + cacheKey;
        List<SceneImage> cached = sceneImageRepository.findByCacheKey(cacheLookupKey);
        if (force) {
            cached.forEach(si -> sceneImageRepository.deleteById(si.getId()));
        } else if (!cached.isEmpty()) {
            SceneImage existing = cached.get(0);
            if (existing.getImageData() != null && existing.getImageData().length > 0) {
                log.info("【文生图】命中缓存: cacheKey={}", cacheLookupKey);
                return Optional.of(existing);
            }
            log.info("清除无效缓存: cacheKey={}", cacheLookupKey);
            cached.forEach(si -> sceneImageRepository.deleteById(si.getId()));
        }

        log.info("【文生图】发起请求: cacheKey={}, size={}x{}, force={}, provider={}",
                cacheLookupKey, width, height, force, imageProvider.providerName());
        try {
            byte[] imageBytes = generateBytes(AiImageRequest.builder()
                    .prompt(prompt)
                    .width(width)
                    .height(height)
                    .build());
            if (imageBytes == null || imageBytes.length == 0) {
                return Optional.empty();
            }
            return Optional.of(persist(cacheLookupKey, prompt, imageBytes));
        } catch (Exception e) {
            log.warn("场景图片生成失败: cacheKey={}, error={}", cacheLookupKey, e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<SceneImage> getById(String id) {
        return sceneImageRepository.findById(id);
    }

    public Optional<SceneImage> findByExactKey(String cacheLookupKey) {
        return sceneImageRepository.findByCacheKey(cacheLookupKey).stream()
                .filter(si -> si.getImageData() != null && si.getImageData().length > 0)
                .findFirst();
    }

    /** 取最新一张匹配前缀的图（按 createTime 倒序），用于不感知完整 cacheKey 的查找场景。 */
    public Optional<SceneImage> findCachedByPrefix(String prefix) {
        return sceneImageRepository.findByCacheKeyStartingWithOrderByCreateTimeDesc(prefix).stream()
                .filter(si -> si.getImageData() != null && si.getImageData().length > 0)
                .findFirst();
    }

    public Optional<SceneImage> editImage(String sourceImageId, String editPrompt) {
        Optional<SceneImage> source = sceneImageRepository.findById(sourceImageId);
        if (source.isEmpty() || source.get().getImageData() == null) {
            log.warn("编辑图片失败：原图不存在 id={}", sourceImageId);
            return Optional.empty();
        }

        String base64 = Base64.getEncoder().encodeToString(source.get().getImageData());
        String cacheKey = "edit_" + sourceImageId + "_" + editPrompt.hashCode() + "_" + System.currentTimeMillis();

        try {
            byte[] imageBytes = generateBytes(AiImageRequest.builder()
                    .prompt(editPrompt)
                    .sourceImageBase64(base64)
                    .build());
            if (imageBytes == null || imageBytes.length == 0) {
                return Optional.empty();
            }
            return Optional.of(persist(cacheKey, editPrompt, imageBytes));
        } catch (Exception e) {
            log.warn("图片编辑失败: sourceId={}, error={}", sourceImageId, e.getMessage());
            return Optional.empty();
        }
    }

    private byte[] generateBytes(AiImageRequest request) throws Exception {
        AiImageResult result = imageProvider.generate(request);
        if (result == null || result.getImages() == null || result.getImages().isEmpty()) {
            return null;
        }
        return result.getImages().get(0);
    }

    private SceneImage persist(String cacheKey, String prompt, byte[] bytes) {
        SceneImage si = new SceneImage();
        si.setId(UUID.randomUUID().toString());
        si.setCacheKey(cacheKey);
        si.setImageData(bytes);
        si.setContentType("image/png");
        si.setPrompt(prompt);
        si.setCreateTime(System.currentTimeMillis());
        sceneImageRepository.save(si);
        log.info("场景图片入库: cacheKey={}, size={}KB", cacheKey, bytes.length / 1024);
        return si;
    }
}
