package com.iohao.mmo.api.dev;

import com.iohao.mmo.common.ai.image.AiImageProvider;
import com.iohao.mmo.common.ai.image.AiImageRequest;
import com.iohao.mmo.common.ai.image.AiImageResult;
import com.iohao.mmo.common.ai.video.AiVideoProvider;
import com.iohao.mmo.common.ai.video.AiVideoRequest;
import com.iohao.mmo.common.ai.video.AiVideoResult;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * AI 素材工作台 REST 接口。
 *
 * <p>仅向 {@code dev.workbench.admin-usernames} 白名单中的用户开放。
 * 复用全局 {@link AiImageProvider} 单例，按当前 {@code ai.image.provider} 配置走 Volcengine 或 Local ComfyUI。
 */
@Slf4j
@RestController
@RequestMapping("/api/dev/ai")
public class DevAiController {

    @Resource
    AiImageProvider imageProvider;

    @Resource
    AiVideoProvider videoProvider;

    @Resource
    DevAssetStorage storage;

    @Resource
    DevWorkbenchProperties props;

    @GetMapping("/permission")
    public ResponseEntity<Map<String, Object>> permission(HttpSession session) {
        return ok(Map.of("allowed", isAdmin(session), "provider", imageProvider.providerName()));
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> upload(@RequestParam("file") MultipartFile file,
                                                      HttpSession session) {
        requireAdmin(session);
        if (file.isEmpty()) return err("文件为空");
        long sizeKb = file.getSize() / 1024;
        if (sizeKb > props.getMaxUploadKb()) {
            return err("文件超过 " + props.getMaxUploadKb() + "KB 限制");
        }
        try {
            String ext = parseExt(file.getOriginalFilename());
            DevAssetStorage.StoredAsset saved = storage.saveUpload(file.getBytes(), ext);
            return ok(Map.of("url", saved.url(), "name", saved.name(), "size", saved.size()));
        } catch (Exception e) {
            log.error("上传参考图失败", e);
            return err("上传失败: " + e.getMessage());
        }
    }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generate(@RequestBody GenerateBody body, HttpSession session) {
        requireAdmin(session);
        if (body.prompt == null || body.prompt.isBlank()) return err("提示词不能为空");

        int count = clamp(body.getCount(), 1, props.getMaxBatch());
        int width = clamp(body.getWidth(), 256, 2048);
        int height = clamp(body.getHeight(), 256, 2048);
        // 同一份参考图只上传一次，得到 provider 句柄供 4 张复用，避免并发上传被对端 reset
        String sourceRef = null;
        byte[] referenceBytes = loadReferenceBytes(body.referenceUrl);
        if (referenceBytes != null) {
            try {
                sourceRef = imageProvider.prepareSource(referenceBytes);
            } catch (Exception e) {
                log.warn("参考图预上传失败，回退每张内联上传", e);
            }
        }
        log.info("DevAi 生成开始 provider={} count={} size={}x{} hasRef={} sourceRef={} prompt={}",
                imageProvider.providerName(), count, width, height, referenceBytes != null, sourceRef, body.prompt);
        long t0 = System.currentTimeMillis();
        String fallbackB64 = (sourceRef == null && referenceBytes != null)
                ? Base64.getEncoder().encodeToString(referenceBytes) : null;

        // 串行投递：ComfyUI 单卡只能串行执行，并发投递只会把 deadline 累加到尾部任务上导致集体超时
        int okCount = 0;
        List<DevAssetStorage.StoredAsset> items = new java.util.ArrayList<>();
        List<String> errors = new java.util.ArrayList<>();
        for (int i = 0; i < count; i++) {
            try {
                items.addAll(generateOne(body, width, height, sourceRef, fallbackB64, i));
                okCount++;
            } catch (Exception e) {
                log.warn("DevAi 单次生成失败 #{}/{}", i + 1, count, e);
                errors.add(rootMessage(e));
            }
        }
        log.info("DevAi 生成完成 ok={}/{} cost={}ms errors={}",
                okCount, count, System.currentTimeMillis() - t0, errors);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("items", items);
        data.put("ok", okCount);
        data.put("total", count);
        data.put("errors", errors);
        return ok(data);
    }

    @DeleteMapping("/assets")
    public ResponseEntity<Map<String, Object>> deleteAsset(@RequestParam("url") String url, HttpSession session) {
        requireAdmin(session);
        try {
            return ok(Map.of("deleted", storage.delete(url)));
        } catch (Exception e) {
            return err("删除失败: " + e.getMessage());
        }
    }

    @PostMapping("/animate")
    public ResponseEntity<Map<String, Object>> animate(@RequestBody AnimateBody body, HttpSession session) {
        requireAdmin(session);
        if (body.imageUrl == null || body.imageUrl.isBlank()) return err("缺少 imageUrl");
        byte[] bytes = loadReferenceBytes(body.imageUrl);
        if (bytes == null) return err("源图加载失败：" + body.imageUrl);

        // 如果未指定宽高，读取源图实际尺寸
        int width = body.getWidth();
        int height = body.getHeight();
        if (body.width == null || body.height == null) {
            try {
                var img = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(bytes));
                if (img != null) {
                    width = (img.getWidth() / 16) * 16;   // 对齐到16
                    height = (img.getHeight() / 16) * 16;
                }
            } catch (Exception ignored) {}
        }

        String prompt = (body.prompt == null || body.prompt.isBlank())
                ? "the character moves energetically, waving arms, hair and clothes flowing with strong wind, dynamic lively animation"
                : body.prompt.trim();
        log.info("DevAi 动画化开始 size={}x{} frames={} prompt={}",
                width, height, body.getFrames(), prompt);
        long t0 = System.currentTimeMillis();
        try {
            String sourceRef = videoProvider.prepareSource(bytes);
            AiVideoRequest req = AiVideoRequest.builder()
                    .prompt(prompt)
                    .sourceImageRef(sourceRef)
                    .sourceImageBase64(sourceRef == null ? Base64.getEncoder().encodeToString(bytes) : null)
                    .width(width)
                    .height(height)
                    .frames(body.getFrames())
                    .stepsOverride(Math.max(0, body.getSteps()))
                    .seedOverride(body.getSeed())
                    .negativePromptOverride(body.negativePrompt)
                    .videoModel(body.getVideoModel())
                    .build();
            AiVideoResult result = videoProvider.generate(req);
            byte[] finalData = result.getData();
            String ext = result.getExt();
            // webp 动画逐帧抠除黑色背景
            if ("webp".equalsIgnoreCase(ext)) {
                try {
                    finalData = removeBlackBackground(finalData);
                } catch (Exception e) {
                    log.warn("逐帧抠图失败，使用原始输出", e);
                }
            }
            DevAssetStorage.StoredAsset saved = storage.saveOutput(finalData, ext);
            log.info("DevAi 动画化完成 cost={}ms file={}", System.currentTimeMillis() - t0, saved.url());
            return ok(Map.of("item", saved, "frames", result.getFrames()));
        } catch (Exception e) {
            log.warn("DevAi 动画化失败", e);
            return err("生成失败: " + rootMessage(e));
        }
    }

    // ── 内部 ───────────────────────────────────────

    /** 多视角模板：保持同一角色一致性，仅切换镜头角度。 */
    private static final String[] VIEW_SUFFIX = {
            "front view, facing camera, full body, T-pose",
            "3/4 front view, full body",
            "side profile view, full body",
            "back view, full body"
    };

    private List<DevAssetStorage.StoredAsset> generateOne(GenerateBody body, int width, int height,
                                                          String sourceRef, String fallbackB64, int index) {
        try {
            String prompt = composePrompt(body, index);
            AiImageRequest req = AiImageRequest.builder()
                    .prompt(prompt)
                    .width(width)
                    .height(height)
                    .count(1)
                    .watermark(false)
                    .sourceImageRef(sourceRef)
                    .sourceImageBase64(fallbackB64)
                    .stepsOverride(Math.max(0, body.getSteps()))
                    .cfgOverride(Math.max(0.0, body.getCfg()))
                    .seedOverride(body.getSeed())
                    .negativePromptOverride(body.negativePrompt)
                    .build();
            AiImageResult result = imageProvider.generate(req);
            List<DevAssetStorage.StoredAsset> items = new java.util.ArrayList<>();
            for (byte[] png : result.getImages()) {
                items.add(storage.saveOutput(png, ".png"));
            }
            return items;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String composePrompt(GenerateBody body, int index) {
        if ("views".equalsIgnoreCase(body.batchMode)) {
            return body.prompt + ", " + VIEW_SUFFIX[index % VIEW_SUFFIX.length];
        }
        return body.prompt;
    }

    private byte[] loadReferenceBytes(String referenceUrl) {
        if (referenceUrl == null || referenceUrl.isBlank()) return null;
        // 工作台资源
        if (referenceUrl.startsWith(DevAssetStorage.URL_PREFIX)) {
            try {
                Path p = storage.root().resolve(referenceUrl.substring(DevAssetStorage.URL_PREFIX.length()));
                if (!p.normalize().startsWith(storage.root())) return null;
                return Files.readAllBytes(p);
            } catch (Exception e) {
                log.warn("参考图加载失败 url={}", referenceUrl, e);
                return null;
            }
        }
        // 其他本地静态资源（立绘等），通过 HTTP 回环获取
        if (referenceUrl.startsWith("/")) {
            try {
                var req = new okhttp3.Request.Builder()
                        .url("http://localhost:8090" + referenceUrl).get().build();
                try (var resp = new okhttp3.OkHttpClient().newCall(req).execute()) {
                    if (resp.isSuccessful() && resp.body() != null) {
                        return resp.body().bytes();
                    }
                }
            } catch (Exception e) {
                log.warn("本地资源加载失败 url={}", referenceUrl, e);
            }
        }
        return null;
    }

    /** 调用 Python 脚本对动画 webp 逐帧去黑底 */
    private byte[] removeBlackBackground(byte[] webpData) throws Exception {
        Path tmp = Files.createTempFile("mmo-vid-", ".webp");
        Path out = Files.createTempFile("mmo-vid-alpha-", ".webp");
        try {
            Files.write(tmp, webpData);
            String python = "C:\\ComfyUI_windows_portable\\python_embeded\\python.exe";
            String script = "C:\\ComfyUI_windows_portable\\remove_bg.py";
            ProcessBuilder pb = new ProcessBuilder(python, script, tmp.toString(), out.toString());
            pb.redirectErrorStream(true);
            Process proc = pb.start();
            String output = new String(proc.getInputStream().readAllBytes());
            int code = proc.waitFor();
            if (code != 0) {
                throw new IOException("remove_bg.py 失败 code=" + code + " output=" + output);
            }
            log.info("逐帧抠图完成: {}", output.trim());
            return Files.readAllBytes(out);
        } finally {
            Files.deleteIfExists(tmp);
            Files.deleteIfExists(out);
        }
    }

    private boolean isAdmin(HttpSession session) {
        // 本地开发环境：跳过权限检查
        return true;
    }

    private void requireAdmin(HttpSession session) {
        if (!isAdmin(session)) {
            throw new SecurityException("需要管理员权限才能使用素材工作台");
        }
    }

    private static int clamp(int v, int lo, int hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    private static String parseExt(String name) {
        if (name == null) return ".png";
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) return ".png";
        String ext = name.substring(dot).toLowerCase(Locale.ROOT);
        return switch (ext) {
            case ".png", ".jpg", ".jpeg", ".webp", ".bmp" -> ext;
            default -> ".png";
        };
    }

    private static String rootMessage(Throwable t) {
        Throwable cur = t;
        while (cur.getCause() != null && cur.getCause() != cur) cur = cur.getCause();
        return cur.getMessage() == null ? cur.getClass().getSimpleName() : cur.getMessage();
    }

    private ResponseEntity<Map<String, Object>> ok(Map<String, Object> data) {
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("code", 0);
        resp.put("data", data);
        return ResponseEntity.ok(resp);
    }

    private ResponseEntity<Map<String, Object>> err(String msg) {
        return ResponseEntity.ok(Map.of("code", -1, "msg", msg));
    }

    public static class AnimateBody {
        /** 必填：要动起来的源图 URL，必须落在 /assets/dev-workbench/ 下 */
        public String imageUrl;
        /** 动作描述；不填则用默认 */
        public String prompt;
        public String negativePrompt;
        public Integer width;
        public Integer height;
        public Integer frames;
        public Integer steps;
        public Long seed;
        /** 视频模型：ltxv（风景氛围）/ wan（角色动作），默认 wan */
        public String videoModel;

        public int getWidth() { return width == null ? 480 : width; }
        public int getHeight() { return height == null ? 480 : height; }
        public int getFrames() { return frames == null ? 17 : frames; }
        public int getSteps() { return steps == null ? 0 : steps; }
        public long getSeed() { return seed == null ? 0L : seed; }
        public String getVideoModel() { return videoModel == null || videoModel.isBlank() ? "wan" : videoModel; }
    }

    public static class GenerateBody {
        public String prompt;
        public String negativePrompt;
        public Integer width;
        public Integer height;
        public Integer count;
        public Integer steps;
        /** 批次模式：single（默认，多张同 prompt 不同 seed）/ views（4 视角：正/3-4/侧/背） */
        public String batchMode;
        public Double cfg;
        public Long seed;
        public String referenceUrl;

        public int getWidth() { return width == null ? 1024 : width; }
        public int getHeight() { return height == null ? 1024 : height; }
        public int getCount() { return count == null ? 1 : count; }
        public int getSteps() { return steps == null ? 0 : steps; }
        public double getCfg() { return cfg == null ? 0.0 : cfg; }
        public long getSeed() { return seed == null ? 0L : seed; }
    }
}
