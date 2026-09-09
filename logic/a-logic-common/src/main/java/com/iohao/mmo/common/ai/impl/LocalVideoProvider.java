package com.iohao.mmo.common.ai.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iohao.mmo.common.ai.AiProperties;
import com.iohao.mmo.common.ai.video.AiVideoProvider;
import com.iohao.mmo.common.ai.video.AiVideoRequest;
import com.iohao.mmo.common.ai.video.AiVideoResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;

/**
 * 本地 ComfyUI + LTX-Video 视频生成 provider。
 */
@Slf4j
@RequiredArgsConstructor
public class LocalVideoProvider implements AiVideoProvider {

    private static final MediaType JSON_TYPE = MediaType.get("application/json; charset=utf-8");

    private final AiProperties.Video.Local cfg;
    private final OkHttpClient client;

    public LocalVideoProvider(AiProperties.Video.Local cfg) {
        this.cfg = cfg;
        this.client = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(600, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .callTimeout(600, TimeUnit.SECONDS)
                .connectionPool(new ConnectionPool(0, 1, TimeUnit.NANOSECONDS))
                .retryOnConnectionFailure(true)
                .build();
    }

    @Override
    public AiVideoResult generate(AiVideoRequest request) throws Exception {
        String clientId = "mmo-vid-" + UUID.randomUUID();

        String uploadedName = request.getSourceImageRef();
        if ((uploadedName == null || uploadedName.isBlank())
                && request.getSourceImageBase64() != null
                && !request.getSourceImageBase64().isBlank()) {
            uploadedName = uploadImage(Base64.getDecoder().decode(request.getSourceImageBase64()));
        }

        JSONObject workflow = "wan".equalsIgnoreCase(request.getVideoModel())
                ? buildWanWorkflow(request, clientId, uploadedName)
                : buildWorkflow(request, clientId, uploadedName);
        String promptId = postPrompt(workflow);
        JSONObject history = waitHistory(promptId);
        List<OutputRef> refs = extractOutputRefs(history);
        if (refs.isEmpty()) {
            throw new IOException("ComfyUI 视频未返回任何输出, promptId=" + promptId);
        }

        OutputRef ref = refs.get(0);
        byte[] data = downloadView(ref);
        String ext = ref.filename.contains(".") ? ref.filename.substring(ref.filename.lastIndexOf('.') + 1) : cfg.getOutputFormat();
        return new AiVideoResult(data, ext, request.getFrames());
    }

    @Override
    public String providerName() {
        return "local";
    }

    @Override
    public String prepareSource(byte[] sourceBytes) throws IOException {
        return uploadImage(sourceBytes);
    }

    // ── HTTP ──────────────────────────────────────────

    private Response executeWithRetry(Request req) throws IOException {
        try {
            return client.newCall(req).execute();
        } catch (IOException first) {
            String msg = first.getMessage() == null ? "" : first.getMessage();
            boolean staleConn = msg.contains("unexpected end of stream")
                    || msg.contains("Connection reset")
                    || msg.contains("Broken pipe");
            if (!staleConn) throw first;
            log.warn("ComfyUI 连接被服务端关闭，重试一次: {}", msg);
            return client.newCall(req).execute();
        }
    }

    private String uploadImage(byte[] pngBytes) throws IOException {
        String filename = "mmo-vid-" + UUID.randomUUID() + ".png";
        RequestBody body = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("image", filename,
                        RequestBody.create(pngBytes, MediaType.parse("image/png")))
                .addFormDataPart("overwrite", "true")
                .addFormDataPart("type", "input")
                .build();
        Request req = new Request.Builder().url(base() + "/upload/image").post(body).build();
        try (Response resp = executeWithRetry(req)) {
            if (!resp.isSuccessful() || resp.body() == null) {
                throw new IOException("ComfyUI /upload/image HTTP " + resp.code());
            }
            return JSON.parseObject(resp.body().string()).getString("name");
        }
    }

    private String postPrompt(JSONObject workflow) throws IOException {
        Request req = new Request.Builder()
                .url(base() + "/prompt")
                .post(RequestBody.create(workflow.toJSONString(), JSON_TYPE))
                .build();
        try (Response resp = executeWithRetry(req)) {
            if (!resp.isSuccessful() || resp.body() == null) {
                String respBody = resp.body() == null ? "" : resp.body().string();
                throw new IOException("ComfyUI /prompt HTTP " + resp.code() + " body=" + respBody);
            }
            return JSON.parseObject(resp.body().string()).getString("prompt_id");
        }
    }

    private JSONObject waitHistory(String promptId) throws IOException, InterruptedException {
        long deadline = System.currentTimeMillis() + cfg.getTimeoutSec() * 1000L;
        while (System.currentTimeMillis() < deadline) {
            Request req = new Request.Builder().url(base() + "/history/" + promptId).get().build();
            try (Response resp = executeWithRetry(req)) {
                if (resp.isSuccessful() && resp.body() != null) {
                    JSONObject json = JSON.parseObject(resp.body().string());
                    JSONObject entry = json.getJSONObject(promptId);
                    if (entry != null) {
                        JSONObject status = entry.getJSONObject("status");
                        if (status != null && status.getBooleanValue("completed")) {
                            return entry;
                        }
                    }
                }
            }
            Thread.sleep(cfg.getPollIntervalMs());
        }
        throw new IOException("ComfyUI 视频生成超时 promptId=" + promptId);
    }

    private List<OutputRef> extractOutputRefs(JSONObject history) {
        JSONObject outputs = history.getJSONObject("outputs");
        List<OutputRef> refs = new ArrayList<>();
        if (outputs == null) return refs;
        for (String nodeId : outputs.keySet()) {
            JSONObject node = outputs.getJSONObject(nodeId);
            // video/animation outputs may appear under "gifs" or "images"
            for (String key : new String[]{"gifs", "images"}) {
                JSONArray arr = node.getJSONArray(key);
                if (arr == null) continue;
                for (int i = 0; i < arr.size(); i++) {
                    JSONObject item = arr.getJSONObject(i);
                    refs.add(new OutputRef(
                            item.getString("filename"),
                            item.getString("subfolder"),
                            item.getString("type")));
                }
            }
        }
        return refs;
    }

    private byte[] downloadView(OutputRef ref) throws IOException {
        HttpUrl url = HttpUrl.parse(base() + "/view").newBuilder()
                .addQueryParameter("filename", ref.filename)
                .addQueryParameter("subfolder", ref.subfolder == null ? "" : ref.subfolder)
                .addQueryParameter("type", ref.type == null ? "output" : ref.type)
                .build();
        Request req = new Request.Builder().url(url).get().build();
        try (Response resp = executeWithRetry(req)) {
            if (!resp.isSuccessful() || resp.body() == null) {
                throw new IOException("ComfyUI /view HTTP " + resp.code());
            }
            return resp.body().bytes();
        }
    }

    private String base() {
        String b = cfg.getBaseUrl();
        return b.endsWith("/") ? b.substring(0, b.length() - 1) : b;
    }

    private record OutputRef(String filename, String subfolder, String type) {}

    // ── Workflow ──────────────────────────────────────

    private JSONObject buildWorkflow(AiVideoRequest req, String clientId, String uploadedImage) {
        long seed = req.getSeedOverride() != 0L
                ? req.getSeedOverride()
                : ThreadLocalRandom.current().nextLong(0, Long.MAX_VALUE);
        int steps = req.getStepsOverride() > 0 ? req.getStepsOverride() : cfg.getSteps();
        String negative = req.getNegativePromptOverride() != null && !req.getNegativePromptOverride().isBlank()
                ? req.getNegativePromptOverride() : cfg.getNegativePrompt();

        JSONObject p = new JSONObject();

        // Load LTX-Video diffusion model (outputs MODEL)
        p.put("1", node("UNETLoader", map(
                "unet_name", cfg.getCheckpoint(),
                "weight_dtype", "default")));

        // Load LTX-Video VAE separately
        p.put("12", node("VAELoader", map(
                "vae_name", "ltxv-vae.safetensors")));

        // Load T5 text encoder
        p.put("2", node("CLIPLoader", map(
                "clip_name", cfg.getTextEncoder(),
                "type", "ltxv")));

        // Positive prompt
        p.put("3", node("CLIPTextEncode", map(
                "text", req.getPrompt(),
                "clip", ref("2", 0))));

        // Negative prompt
        p.put("4", node("CLIPTextEncode", map(
                "text", negative,
                "clip", ref("2", 0))));

        // LTX-Video model sampling config
        p.put("5", node("ModelSamplingLTXV", map(
                "max_shift", cfg.getMaxShift(),
                "base_shift", cfg.getBaseShift(),
                "stretch", cfg.isStretch(),
                "terminal", cfg.getTerminal(),
                "model", ref("1", 0))));

        if (uploadedImage != null) {
            // Image-to-video: load source image
            p.put("10", node("LoadImage", map("image", uploadedImage)));
            p.put("11", node("LTXVImgToVideo", map(
                    "positive", ref("3", 0),
                    "negative", ref("4", 0),
                    "vae", ref("12", 0),
                    "image", ref("10", 0),
                    "width", req.getWidth(),
                    "height", req.getHeight(),
                    "length", req.getFrames(),
                    "batch_size", 1,
                    "strength", 0.35)));
            p.put("6", node("EmptyLTXVLatentVideo", map(
                    "width", req.getWidth(),
                    "height", req.getHeight(),
                    "length", req.getFrames(),
                    "batch_size", 1)));
        } else {
            // Text-to-video: empty latent
            p.put("6", node("EmptyLTXVLatentVideo", map(
                    "width", req.getWidth(),
                    "height", req.getHeight(),
                    "length", req.getFrames(),
                    "batch_size", 1)));
        }

        // KSampler
        p.put("7", node("KSampler", map(
                "seed", seed,
                "steps", steps,
                "cfg", cfg.getCfg(),
                "sampler_name", "euler",
                "scheduler", "simple",
                "denoise", 1.0,
                "model", ref("5", 0),
                "positive", uploadedImage != null ? ref("11", 0) : ref("3", 0),
                "negative", uploadedImage != null ? ref("11", 1) : ref("4", 0),
                "latent_image", uploadedImage != null ? ref("11", 2) : ref("6", 0))));

        // VAE Decode video (use VAE from VAELoader, not MODEL from UNETLoader)
        p.put("8", node("VAEDecodeTiled", map(
                "samples", ref("7", 0),
                "vae", ref("12", 0),
                "tile_size", 512,
                "overlap", 64,
                "temporal_size", 64,
                "temporal_overlap", 8)));

        // Save animation
        String saveNode = "webp".equalsIgnoreCase(cfg.getOutputFormat())
                ? "SaveAnimatedWEBP" : "SaveAnimatedPNG";
        JSONObject saveInputs = map(
                "filename_prefix", "mmo-vid",
                "images", ref("8", 0),
                "fps", cfg.getFrameRate());
        if ("SaveAnimatedWEBP".equals(saveNode)) {
            saveInputs.put("method", "default");
            saveInputs.put("lossless", false);
            saveInputs.put("quality", 95);
        }
        p.put("9", node(saveNode, saveInputs));

        JSONObject body = new JSONObject();
        body.put("prompt", p);
        body.put("client_id", clientId);
        return body;
    }

    private static JSONObject node(String classType, JSONObject inputs) {
        JSONObject o = new JSONObject();
        o.put("class_type", classType);
        o.put("inputs", inputs);
        return o;
    }

    private static JSONArray ref(String nodeId, int outputIdx) {
        JSONArray a = new JSONArray();
        a.add(nodeId);
        a.add(outputIdx);
        return a;
    }

    private static JSONObject map(Object... kv) {
        if (kv.length % 2 != 0) throw new IllegalArgumentException("kv must be even");
        JSONObject o = new JSONObject(kv.length / 2);
        for (int i = 0; i < kv.length; i += 2) {
            o.put((String) kv[i], kv[i + 1]);
        }
        return o;
    }

    // ── Wan2.1 Workflow ─────────────────────────────

    private JSONObject buildWanWorkflow(AiVideoRequest req, String clientId, String uploadedImage) {
        long seed = req.getSeedOverride() != 0L
                ? req.getSeedOverride()
                : ThreadLocalRandom.current().nextLong(0, Long.MAX_VALUE);
        int steps = req.getStepsOverride() > 0 ? req.getStepsOverride() : 6;
        String negative = req.getNegativePromptOverride() != null && !req.getNegativePromptOverride().isBlank()
                ? req.getNegativePromptOverride() : "blurry, distorted, low quality, watermark, text, background movement, flickering background, camera shake, scene change";

        JSONObject p = new JSONObject();

        // Load Wan2.1 diffusion model
        p.put("1", node("UNETLoader", map(
                "unet_name", "wan2.1_i2v_480p_14B_fp8_e4m3fn.safetensors",
                "weight_dtype", "default")));

        // Load Wan2.1 text encoder (umt5xxl)
        p.put("2", node("CLIPLoader", map(
                "clip_name", "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
                "type", "wan")));

        // Load Wan2.1 VAE
        p.put("3", node("VAELoader", map(
                "vae_name", "wan_2.1_vae.safetensors")));

        // Load CLIP Vision
        p.put("4", node("CLIPVisionLoader", map(
                "clip_name", "clip_vision_h.safetensors")));

        // Positive prompt
        p.put("5", node("CLIPTextEncode", map(
                "text", req.getPrompt(),
                "clip", ref("2", 0))));

        // Negative prompt
        p.put("6", node("CLIPTextEncode", map(
                "text", negative,
                "clip", ref("2", 0))));

        // Load source image
        if (uploadedImage != null) {
            p.put("10", node("LoadImage", map("image", uploadedImage)));

            // CLIP Vision encode
            p.put("11", node("CLIPVisionEncode", map(
                    "clip_vision", ref("4", 0),
                    "image", ref("10", 0),
                    "crop", "center")));

            // WanImageToVideo conditioning
            p.put("12", node("WanImageToVideo", map(
                    "positive", ref("5", 0),
                    "negative", ref("6", 0),
                    "vae", ref("3", 0),
                    "width", req.getWidth(),
                    "height", req.getHeight(),
                    "length", req.getFrames(),
                    "batch_size", 1,
                    "clip_vision_output", ref("11", 0),
                    "start_image", ref("10", 0))));
        }

        // KSampler
        p.put("7", node("KSampler", map(
                "seed", seed,
                "steps", steps,
                "cfg", 3.5,
                "sampler_name", "uni_pc_bh2",
                "scheduler", "simple",
                "denoise", 1.0,
                "model", ref("1", 0),
                "positive", uploadedImage != null ? ref("12", 0) : ref("5", 0),
                "negative", uploadedImage != null ? ref("12", 1) : ref("6", 0),
                "latent_image", ref("12", 2))));

        // VAE Decode
        p.put("8", node("VAEDecode", map(
                "samples", ref("7", 0),
                "vae", ref("3", 0))));

        // Save animation as WebP
        p.put("9", node("SaveAnimatedWEBP", map(
                "filename_prefix", "mmo-vid",
                "images", ref("8", 0),
                "fps", 16.0,
                "method", "default",
                "lossless", false,
                "quality", 95)));

        JSONObject body = new JSONObject();
        body.put("prompt", p);
        body.put("client_id", clientId);
        return body;
    }
}
