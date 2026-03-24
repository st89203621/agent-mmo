/*
 * ioGame
 * Copyright (C) 2021 - 2023  渔民小镇 （262610965@qq.com、luoyizhu@gmail.com） . All Rights Reserved.
 * # iohao.com . 渔民小镇
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package com.iohao.mmo.pet.util;

import com.volcengine.ark.runtime.model.images.generation.GenerateImagesRequest;
import com.volcengine.ark.runtime.model.images.generation.ImagesResponse;
import com.volcengine.ark.runtime.service.ArkService;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * 火山引擎AI图片生成器 - 使用ArkService（参照ImageGenerationsExample）
 *
 * @author 渔民小镇
 * @date 2024-10-13
 */
@Slf4j
@Component
public class VolcengineAiImageGenerator {

    private final VolcengineConfig config;
    private final ArkService arkService;
    private final OkHttpClient httpClient;

    public VolcengineAiImageGenerator(VolcengineConfig config) {
        this.config = config;

        // 初始化ArkService - 使用图片专用API Key
        String imageApiKey = config.getEffectiveImageApiKey();
        ConnectionPool connectionPool = new ConnectionPool(5, 1, TimeUnit.SECONDS);
        Dispatcher dispatcher = new Dispatcher();
        this.arkService = ArkService.builder()
                .dispatcher(dispatcher)
                .connectionPool(connectionPool)
                .apiKey(imageApiKey)
                .build();

        // 初始化HTTP客户端用于下载图片
        // 超时时间设置为60秒,因为AI生成图片可能需要较长时间
        this.httpClient = new OkHttpClient.Builder()
                .connectionPool(connectionPool)
                .connectTimeout(60, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(60, TimeUnit.SECONDS)
                .build();

        // 确保保存目录存在
        ensureDirectoryExists();

        log.info("ArkService(图片)初始化成功，API Key: {}...",
                imageApiKey.substring(0, Math.min(10, imageApiKey.length())));
        log.info("图片保存路径: {}", config.getFrontendAssetsPath());
    }

    /**
     * 确保图片保存目录存在
     */
    private void ensureDirectoryExists() {
        String pathStr = config.getFrontendAssetsPath();
        try {
            // 规范化路径（处理Windows路径分隔符）
            pathStr = pathStr.replace("\\", "/");
            Path path = Paths.get(pathStr);
            
            // 检查路径是否存在
            if (!Files.exists(path)) {
                try {
                    Files.createDirectories(path);
                    log.info("✅ 创建图片保存目录: {}", path.toAbsolutePath());
                } catch (Exception e) {
                    log.warn("⚠️ 无法创建目录: {}，将使用临时目录", path.toAbsolutePath());
                    // 使用系统临时目录作为备选
                    pathStr = System.getProperty("java.io.tmpdir") + "/mxd-mmo/pets/ai-generated";
                    path = Paths.get(pathStr);
                    if (!Files.exists(path)) {
                        Files.createDirectories(path);
                    }
                    log.info("✅ 使用临时目录: {}", path.toAbsolutePath());
                }
            }
        } catch (Exception e) {
            log.error("❌ 创建图片保存目录失败: {}", pathStr, e);
            // 不抛出异常，让程序继续运行（后续图片生成会失败，但服务可以启动）
        }
    }

    /**
     * 生成宠物图片 - 下载到前端静态资源目录
     *
     * @param prompt 图片描述提示词
     * @return 图片的完整HTTP URL列表（例如：http://localhost:8080/assets/pets/ai-generated/pet_xxx.jpg）
     */
    public List<String> generatePetImage(String prompt) throws Exception {
        log.info("🎨 开始生成宠物图片，提示词: {}", prompt);

        List<String> imageDataList = new ArrayList<>();

        try {
            // 创建图片生成请求（参照ImageGenerationsExample）
            GenerateImagesRequest generateRequest = GenerateImagesRequest.builder()
                    .model(config.getModel())  // 使用配置的模型，默认 "doubao-seedream-4-0-250828"
                    .prompt(prompt)
                    .watermark(false)  // 不添加水印
                    .build();

            log.info("📡 发送请求到模型: {}", config.getModel());

            // 调用ArkService生成图片
            ImagesResponse imagesResponse = arkService.generateImages(generateRequest);

            // 下载图片到本地
            if (imagesResponse != null && imagesResponse.getData() != null && !imagesResponse.getData().isEmpty()) {
                int index = 0;
                for (var imageData : imagesResponse.getData()) {
                    String imageUrl = imageData.getUrl();
                    log.info("📥 下载图片 {}/{}: {}", ++index, imagesResponse.getData().size(), imageUrl);

                    try {
                        // 下载图片到本地
                        String localPath = downloadImageToLocal(imageUrl, index);
                        imageDataList.add(localPath);
                        log.info("✅ 图片 {} 下载成功: {}", index, localPath);
                    } catch (IOException e) {
                        log.error("❌ 下载图片 {} 失败: {}", index, imageUrl, e);
                        throw new Exception("下载图片失败: " + e.getMessage(), e);
                    }
                }
            } else {
                log.warn("⚠️ 响应中没有图片数据");
            }

            log.info("🎉 图片生成完成，共生成 {} 张图片", imageDataList.size());
            return imageDataList;

        } catch (Exception e) {
            log.error("❌ 生成宠物图片失败", e);
            throw e;
        }
    }

    /**
     * 下载图片到本地静态资源目录,并转换为PNG格式以支持透明背景
     *
     * @param imageUrl 图片URL
     * @param index 图片索引
     * @return 完整的HTTP URL（例如：http://192.168.0.105:8080/assets/pets/ai-generated/pet_123456789.png）
     */
    private String downloadImageToLocal(String imageUrl, int index) throws IOException {
        Request request = new Request.Builder()
                .url(imageUrl)
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("下载图片失败，HTTP状态码: " + response.code());
            }

            if (response.body() == null) {
                throw new IOException("响应体为空");
            }

            // 生成文件名（使用PNG格式以支持透明背景）
            String fileName = "pet_" + System.currentTimeMillis() + "_" + index + ".png";
            // 构建完整路径（frontendAssetsPath 已包含 ai-generated 目录）
            Path filePath = Paths.get(config.getFrontendAssetsPath(), fileName);

            // 读取图片并转换为PNG格式
            try (InputStream inputStream = response.body().byteStream()) {
                // 读取原始图片
                BufferedImage originalImage = ImageIO.read(inputStream);

                if (originalImage == null) {
                    throw new IOException("无法读取图片数据");
                }

                log.info("📷 原始图片尺寸: {}x{}, 类型: {}",
                    originalImage.getWidth(),
                    originalImage.getHeight(),
                    originalImage.getType());

                // 创建支持透明度的新图片 (TYPE_INT_ARGB)
                BufferedImage pngImage = new BufferedImage(
                    originalImage.getWidth(),
                    originalImage.getHeight(),
                    BufferedImage.TYPE_INT_ARGB
                );

                // 将黑色背景转换为透明
                pngImage = removeBlackBackground(originalImage, pngImage);

                // 边缘平滑处理(可选)
               //  pngImage = smoothEdges(pngImage);

                // 确保父目录存在
                Path parentDir = filePath.getParent();
                if (parentDir != null && !Files.exists(parentDir)) {
                    Files.createDirectories(parentDir);
                    log.info("✅ 创建目录: {}", parentDir.toAbsolutePath());
                }

                // 保存为PNG格式
                File outputFile = filePath.toFile();
                boolean saved = ImageIO.write(pngImage, "PNG", outputFile);

                if (!saved) {
                    throw new IOException("保存PNG图片失败");
                }

                log.info("✅ 图片已转换为PNG格式: {}", fileName);
            }

            // 返回完整的HTTP URL（前端可以直接访问）
            // 例如：http://192.168.0.105:8080/assets/pets/ai-generated/pet_123456789.png
            String relativePath = "assets/pets/ai-generated/" + fileName;
            String fullUrl = config.getFrontendServerUrl() + "/" + relativePath;
            log.info("🌐 生成图片访问URL: {}", fullUrl);
            return fullUrl;
        }
    }

    /**
     * 去除黑色背景,转换为透明背景
     *
     * @param originalImage 原始图片
     * @param targetImage 目标图片(支持透明度)
     * @return 处理后的图片
     */
    private BufferedImage removeBlackBackground(BufferedImage originalImage, BufferedImage targetImage) {
        int width = originalImage.getWidth();
        int height = originalImage.getHeight();

        // 从配置读取参数,可通过application.properties调整
        final int TOLERANCE = config.getBackgroundRemovalTolerance();

        int transparentPixels = 0;

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int rgb = originalImage.getRGB(x, y);

                // 提取RGB分量
                int red = (rgb >> 16) & 0xFF;
                int green = (rgb >> 8) & 0xFF;
                int blue = rgb & 0xFF;

                // 计算亮度(平均值)
                int brightness = (red + green + blue) / 3;

                // 判断是否为背景:
                // 接近黑色(低亮度 + RGB值都很低)
                boolean isBackground = false;

                // 方法1: 低亮度 = 黑色/深灰色
                if (brightness <= TOLERANCE) {
                    isBackground = true;
                }

                // 方法2: RGB值都接近0
                if (red <= TOLERANCE &&
                    green <= TOLERANCE &&
                    blue <= TOLERANCE) {
                    isBackground = true;
                }

                if (isBackground) {
                    // 设置为完全透明
                    targetImage.setRGB(x, y, 0x00000000);
                    transparentPixels++;
                } else {
                    // 保持原始颜色,但确保不透明
                    int alpha = 0xFF000000;
                    targetImage.setRGB(x, y, alpha | (rgb & 0x00FFFFFF));
                }
            }
        }

        double transparentPercentage = (transparentPixels * 100.0) / (width * height);
        log.info("🎨 背景处理完成 - 透明像素: {}个 ({:.2f}%), 容差: {}",
            transparentPixels, transparentPercentage, TOLERANCE);

        return targetImage;
    }

    /**
     * 根据宠物属性生成提示词
     *
     * @param petType 宠物类型
     * @param element 元素属性
     * @param style   风格
     * @return 生成的提示词
     */
    public String generatePromptForPet(String petType, String element, String style) {
        StringBuilder prompt = new StringBuilder();

        // 添加风格
        if (style != null && !style.isEmpty()) {
            prompt.append("图片风格为").append(style).append("，");
        } else {
            prompt.append("图片风格为像素风，");
        }

        // 添加宠物类型描述
        String petDescription = getPetDescription(petType, element);
        prompt.append(petDescription);

        // 添加完整性要求
        prompt.append("，全身像，完整主体，不要裁剪任何部分，纯黑色背景，背景必须是纯黑色(RGB 0,0,0)，主体居中，高清，清晰边缘");

        return prompt.toString();
    }

    /**
     * 获取宠物描述
     */
    private String getPetDescription(String petType, String element) {
        String baseDesc = switch (petType.toLowerCase()) {
            case "dragon" -> "一只可爱的小龙";
            case "phoenix" -> "一只美丽的凤凰";
            case "unicorn" -> "一只优雅的独角兽";
            case "wolf" -> "一只威武的狼";
            case "fox" -> "一只灵巧的狐狸";
            case "cat" -> "一只可爱的猫咪";
            case "dog" -> "一只忠诚的小狗";
            default -> "一只神奇的生物";
        };
        
        if (element != null && !element.isEmpty()) {
            String elementDesc = switch (element.toLowerCase()) {
                case "fire" -> "，身上燃烧着火焰";
                case "ice" -> "，身上环绕着冰霜";
                case "thunder" -> "，身上闪烁着雷电";
                case "water" -> "，身上流动着水流";
                case "earth" -> "，身上覆盖着岩石";
                case "wind" -> "，身上环绕着旋风";
                case "dark" -> "，身上笼罩着暗影";
                case "light" -> "，身上散发着圣光";
                default -> "";
            };
            baseDesc += elementDesc;
        }
        
        return baseDesc;
    }


    public static void main(String[] args) {
        VolcengineConfig config = new VolcengineConfig();
        VolcengineAiImageGenerator generator = new VolcengineAiImageGenerator(config);
        try {
            // 测试纯黑色背景提示词 - 强调主体完整
            String prompt = "一只火焰属性的中国神龙，像素艺术，复古游戏风格，16位图形，全身像，完整主体，不要裁剪任何部分，纯黑色背景，背景必须是纯黑色(RGB 0,0,0)，主体居中，高清，清晰边缘";
            log.info("🧪 测试提示词: {}", prompt);

            List<String> imageDataList = generator.generatePetImage(prompt);

            log.info("🎉 测试完成，生成 {} 张图片", imageDataList.size());
            imageDataList.forEach(url -> log.info("📷 图片URL: {}", url));

        } catch (Exception e) {
            log.error("❌ 测试失败", e);
        }
    }
}
