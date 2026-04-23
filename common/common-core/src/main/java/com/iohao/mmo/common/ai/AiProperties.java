package com.iohao.mmo.common.ai;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "ai")
public class AiProperties {

    private Chat chat = new Chat();
    private Image image = new Image();

    @Data
    public static class Chat {
        /** local | volcengine */
        private String provider = "volcengine";
        private Local local = new Local();
        private Volcengine volcengine = new Volcengine();

        @Data
        public static class Local {
            /** OpenAI 兼容入口：vLLM/Ollama/llama.cpp-server 等 */
            private String baseUrl = "http://127.0.0.1:11434/v1";
            private String model = "qwen2.5:14b";
            private String apiKey = "";
            private int timeoutSec = 120;
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
            private String weightDtype = "fp8_e4m3fn";
            private int pollIntervalMs = 100;
            private int timeoutSec = 300;
        }

        @Data
        public static class Volcengine {
            private String apiKey = "";
            private String model = "doubao-seedream-4-0-250828";
            private String size = "1024x1024";
        }
    }
}
