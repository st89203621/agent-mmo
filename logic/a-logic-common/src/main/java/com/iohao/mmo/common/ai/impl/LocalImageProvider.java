package com.iohao.mmo.common.ai.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iohao.mmo.common.ai.AiProperties;
import com.iohao.mmo.common.ai.image.AiImageProvider;
import com.iohao.mmo.common.ai.image.AiImageRequest;
import com.iohao.mmo.common.ai.image.AiImageResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;

/**
 * 本地 ComfyUI HTTP 调用 provider。
 * 工作流通过 pipeline 策略生成，支持 flux2 / flux / sdxl 三档。
 */
@Slf4j
@RequiredArgsConstructor
public class LocalImageProvider implements AiImageProvider {

    private static final MediaType JSON_TYPE = MediaType.get("application/json; charset=utf-8");

    private final AiProperties.Image.Local cfg;
    private final OkHttpClient client;

    public LocalImageProvider(AiProperties.Image.Local cfg) {
        this.cfg = cfg;
        this.client = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .writeTimeout(15, TimeUnit.SECONDS)
                // 单次 HTTP 调用上限：ComfyUI 控制面（/prompt、/history、/view）必须快速返回；
                // 服务端卡死时不让 OkHttp 钉死 Tomcat 线程，整图生成周期由 waitHistory 轮询控制。
                .callTimeout(15, TimeUnit.SECONDS)
                // ComfyUI (uvicorn) 空闲连接会被远端静默关闭，下次复用即触发 "unexpected end of stream"。
                // 禁用连接池复用，强制每次新建 TCP；握手成本相对整体推理耗时可忽略。
                .connectionPool(new ConnectionPool(0, 1, TimeUnit.NANOSECONDS))
                .retryOnConnectionFailure(true)
                .build();
    }

    /** 瞬态连接异常（半关闭 socket / RST）再试一次；其他异常（含 callTimeout）原样抛出。 */
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

    @Override
    public AiImageResult generate(AiImageRequest request) throws Exception {
        String clientId = "mmo-" + UUID.randomUUID();
        JSONObject workflow = WorkflowBuilder.build(cfg, request, clientId);

        String promptId = postPrompt(workflow);
        JSONObject history = waitHistory(promptId);
        List<ImageRef> refs = extractImageRefs(history, promptId);
        if (refs.isEmpty()) {
            throw new IOException("ComfyUI 未返回任何图片, promptId=" + promptId);
        }

        List<byte[]> images = new ArrayList<>(refs.size());
        for (ImageRef ref : refs) {
            images.add(downloadView(ref));
        }
        return new AiImageResult(images, request.getWidth(), request.getHeight());
    }

    @Override
    public String providerName() {
        return "local";
    }

    // ── HTTP ──────────────────────────────────────────

    private String postPrompt(JSONObject workflow) throws IOException {
        Request req = new Request.Builder()
                .url(base() + "/prompt")
                .post(RequestBody.create(workflow.toJSONString(), JSON_TYPE))
                .build();
        try (Response resp = executeWithRetry(req)) {
            if (!resp.isSuccessful() || resp.body() == null) {
                String body = resp.body() == null ? "" : resp.body().string();
                throw new IOException("ComfyUI /prompt HTTP " + resp.code() + " body=" + body);
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
        throw new IOException("ComfyUI 生成超时 promptId=" + promptId);
    }

    private List<ImageRef> extractImageRefs(JSONObject history, String promptId) {
        JSONObject outputs = history.getJSONObject("outputs");
        List<ImageRef> refs = new ArrayList<>();
        if (outputs == null) return refs;
        for (String nodeId : outputs.keySet()) {
            JSONObject node = outputs.getJSONObject(nodeId);
            JSONArray images = node.getJSONArray("images");
            if (images == null) continue;
            for (int i = 0; i < images.size(); i++) {
                JSONObject img = images.getJSONObject(i);
                refs.add(new ImageRef(
                        img.getString("filename"),
                        img.getString("subfolder"),
                        img.getString("type")));
            }
        }
        return refs;
    }

    private byte[] downloadView(ImageRef ref) throws IOException {
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

    private record ImageRef(String filename, String subfolder, String type) {}

    // ── Workflow 策略 ──────────────────────────────────

    private static final class WorkflowBuilder {
        static JSONObject build(AiProperties.Image.Local cfg, AiImageRequest req, String clientId) {
            long seed = ThreadLocalRandom.current().nextLong(0, Long.MAX_VALUE);
            JSONObject prompt = switch (cfg.getPipeline().toLowerCase()) {
                case "flux2" -> flux2(cfg, req, seed);
                case "flux" -> flux(cfg, req, seed);
                case "sdxl" -> sdxl(cfg, req, seed);
                default -> throw new IllegalArgumentException("未知 pipeline: " + cfg.getPipeline());
            };
            JSONObject body = new JSONObject();
            body.put("prompt", prompt);
            body.put("client_id", clientId);
            return body;
        }

        private static JSONObject flux2(AiProperties.Image.Local cfg, AiImageRequest req, long seed) {
            JSONObject p = new JSONObject();
            p.put("1", node("UNETLoader", map(
                    "unet_name", cfg.getDiffusionModel(),
                    "weight_dtype", cfg.getWeightDtype())));
            p.put("2", node("CLIPLoader", map(
                    "clip_name", cfg.getTextEncoder(),
                    "type", "flux2")));
            p.put("3", node("VAELoader", map("vae_name", cfg.getVae())));
            p.put("4", node("CLIPTextEncode", map("text", req.getPrompt(), "clip", ref("2", 0))));
            p.put("5", node("CLIPTextEncode", map("text", "", "clip", ref("2", 0))));
            p.put("6", node("EmptyLatentImage", map(
                    "width", req.getWidth(), "height", req.getHeight(), "batch_size", req.getCount())));
            p.put("7", node("KSampler", map(
                    "seed", seed, "steps", cfg.getSteps(), "cfg", cfg.getCfg(),
                    "sampler_name", cfg.getSamplerName(), "scheduler", cfg.getScheduler(), "denoise", 1.0,
                    "model", ref("1", 0), "positive", ref("4", 0),
                    "negative", ref("5", 0), "latent_image", ref("6", 0))));
            p.put("8", node("VAEDecode", map("samples", ref("7", 0), "vae", ref("3", 0))));
            p.put("9", node("SaveImage", map("filename_prefix", "mmo", "images", ref("8", 0))));
            return p;
        }

        private static JSONObject flux(AiProperties.Image.Local cfg, AiImageRequest req, long seed) {
            JSONObject p = new JSONObject();
            p.put("1", node("UNETLoader", map(
                    "unet_name", cfg.getDiffusionModel(),
                    "weight_dtype", cfg.getWeightDtype())));
            p.put("2", node("DualCLIPLoader", map(
                    "clip_name1", cfg.getTextEncoder(),
                    "clip_name2", "clip_l.safetensors",
                    "type", "flux")));
            p.put("3", node("VAELoader", map("vae_name", cfg.getVae())));
            p.put("4", node("CLIPTextEncode", map("text", req.getPrompt(), "clip", ref("2", 0))));
            p.put("5", node("CLIPTextEncode", map("text", "", "clip", ref("2", 0))));
            p.put("6", node("EmptyLatentImage", map(
                    "width", req.getWidth(), "height", req.getHeight(), "batch_size", req.getCount())));
            p.put("7", node("KSampler", map(
                    "seed", seed, "steps", cfg.getSteps(), "cfg", cfg.getCfg(),
                    "sampler_name", cfg.getSamplerName(), "scheduler", cfg.getScheduler(), "denoise", 1.0,
                    "model", ref("1", 0), "positive", ref("4", 0),
                    "negative", ref("5", 0), "latent_image", ref("6", 0))));
            p.put("8", node("VAEDecode", map("samples", ref("7", 0), "vae", ref("3", 0))));
            p.put("9", node("SaveImage", map("filename_prefix", "mmo", "images", ref("8", 0))));
            return p;
        }

        private static JSONObject sdxl(AiProperties.Image.Local cfg, AiImageRequest req, long seed) {
            String ckpt = (cfg.getCheckpoint() == null || cfg.getCheckpoint().isBlank())
                    ? cfg.getDiffusionModel() : cfg.getCheckpoint();
            JSONObject p = new JSONObject();
            p.put("4", node("CheckpointLoaderSimple", map("ckpt_name", ckpt)));
            p.put("5", node("EmptyLatentImage", map(
                    "width", req.getWidth(), "height", req.getHeight(), "batch_size", req.getCount())));
            p.put("6", node("CLIPTextEncode", map("text", req.getPrompt(), "clip", ref("4", 1))));
            p.put("7", node("CLIPTextEncode", map("text", "", "clip", ref("4", 1))));
            p.put("3", node("KSampler", map(
                    "seed", seed, "steps", cfg.getSteps(), "cfg", cfg.getCfg(),
                    "sampler_name", cfg.getSamplerName(), "scheduler", cfg.getScheduler(), "denoise", 1.0,
                    "model", ref("4", 0), "positive", ref("6", 0),
                    "negative", ref("7", 0), "latent_image", ref("5", 0))));
            p.put("8", node("VAEDecode", map("samples", ref("3", 0), "vae", ref("4", 2))));
            p.put("9", node("SaveImage", map("filename_prefix", "mmo", "images", ref("8", 0))));
            return p;
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
    }
}
