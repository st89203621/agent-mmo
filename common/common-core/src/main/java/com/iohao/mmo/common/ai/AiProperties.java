package com.iohao.mmo.common.ai;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "ai")
public class AiProperties {

    private Chat chat = new Chat();
    private Image image = new Image();
    private Video video = new Video();

    @Data
    public static class Chat {
        /** local | volcengine */
        private String provider = "volcengine";
        private Local local = new Local();
        private Volcengine volcengine = new Volcengine();

        @Data
        public static class Local {
            /** OpenAI 兼容入口：vLLM / Ollama / gpustack / llama.cpp-server 等 */
            private String baseUrl = "http://127.0.0.1:11434/v1";
            private String model = "qwen2.5:14b";
            private String apiKey = "";
            private int timeoutSec = 120;
            /**
             * 关闭 Qwen3 / DeepSeek-R1 等模型的 reasoning 输出；
             * 开启后透传 chat_template_kwargs={enable_thinking:false}，避免 token 全耗在思考链上。
             */
            private boolean disableThinking = false;
        }

        @Data
        public static class Volcengine {
            private String apiKey = "";
            private String model = "doubao-pro-32k";
        }
    }

    @Data
    public static class Image {
        /** local | volcengine */
        private String provider = "volcengine";
        private Local local = new Local();
        private Volcengine volcengine = new Volcengine();

        @Data
        public static class Local {
            /** ComfyUI HTTP 端点，如 http://192.168.22.31:8199 */
            private String baseUrl = "http://127.0.0.1:8199";
            private String checkpoint = "";
            private String diffusionModel = "flux-2-klein-9b-fp8.safetensors";
            private String textEncoder = "qwen_3_8b_fp8mixed.safetensors";
            private String vae = "flux2-vae.safetensors";
            /** flux2 | flux | sdxl */
            private String pipeline = "flux2";
            private String samplerName = "euler";
            private String scheduler = "simple";
            private int steps = 4;
            private double cfg = 1.0;
            /** 通用形态类负向提示词（模糊、文字水印、UI 等），由配置注入避免硬编码。 */
            private String negativePrompt = "";
            private String weightDtype = "fp8_e4m3fn";
            private int pollIntervalMs = 100;
            private int timeoutSec = 300;
            /**
             * 图生图去噪强度：0.0 完全保留原图、1.0 等同文生图。
             * 0.4~0.5 适合小幅改动（换发色/服饰），0.6~0.7 通用，0.8+ 几乎重画。
             */
            private double editDenoise = 0.6;
        }

        @Data
        public static class Volcengine {
            private String apiKey = "";
            private String model = "doubao-seedream-4-0-250828";
            private String size = "1024x1024";
        }
    }

    /** 图生视频（i2v），目前仅支持 local（ComfyUI + LTX-Video） */
    @Data
    public static class Video {
        private Local local = new Local();

        @Data
        public static class Local {
            /** ComfyUI HTTP 端点；默认与 image 共享同一台 ComfyUI */
            private String baseUrl = "http://127.0.0.1:8199";
            /** LTX-Video distilled checkpoint 文件名（在 models/diffusion_models 下） */
            private String checkpoint = "ltxv-13b-0.9.7-distilled-fp8.safetensors";
            /** T5XXL text encoder 文件名（在 models/text_encoders 下） */
            private String textEncoder = "t5xxl_fp8_e4m3fn.safetensors";
            /** 蒸馏版 8 步，兼顾速度和动作表现 */
            private int steps = 8;
            /** 提高 cfg 增强 prompt 对动作的控制力 */
            private double cfg = 2.5;
            private double frameRate = 25.0;
            private double maxShift = 2.05;
            private double baseShift = 0.95;
            private boolean stretch = true;
            private double terminal = 0.1;
            /** 输出动画格式：webp（默认，体积小、浏览器原生循环）| mp4 */
            private String outputFormat = "webp";
            private String negativePrompt = "blurry, distorted, low quality, bad anatomy, watermark, text, ui";
            private int pollIntervalMs = 200;
            private int timeoutSec = 600;
        }
    }
}
