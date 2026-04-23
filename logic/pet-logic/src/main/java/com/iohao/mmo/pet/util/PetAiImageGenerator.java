package com.iohao.mmo.pet.util;

import com.iohao.mmo.common.ai.image.AiImageProvider;
import com.iohao.mmo.common.ai.image.AiImageRequest;
import com.iohao.mmo.common.ai.image.AiImageResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * 宠物 AI 图片生成器：通过 {@link AiImageProvider} 生成图片并落盘到前端静态资源目录，
 * 保存时自动将纯黑背景替换为 PNG 透明。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PetAiImageGenerator {

    private final PetAssetProperties config;
    private final AiImageProvider imageProvider;

    public List<String> generatePetImage(String prompt) throws Exception {
        log.info("开始生成宠物图片, provider={}, prompt={}", imageProvider.providerName(), prompt);

        AiImageResult result = imageProvider.generate(AiImageRequest.builder()
                .prompt(prompt)
                .width(1024)
                .height(1024)
                .build());

        if (result == null || result.getImages() == null || result.getImages().isEmpty()) {
            log.warn("AI 图片响应为空");
            return List.of();
        }

        ensureDirectoryExists();
        List<String> urls = new ArrayList<>(result.getImages().size());
        int index = 0;
        for (byte[] imageBytes : result.getImages()) {
            String fileName = "pet_" + System.currentTimeMillis() + "_" + (++index) + ".png";
            Path filePath = Paths.get(config.getFrontendAssetsPath(), fileName);
            writePng(imageBytes, filePath);
            String url = config.getFrontendServerUrl() + "/assets/pets/ai-generated/" + fileName;
            log.info("图片落盘: {}, url={}", filePath.toAbsolutePath(), url);
            urls.add(url);
        }
        return urls;
    }

    public String generatePromptForPet(String petType, String element, String style) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("图片风格为").append(style == null || style.isBlank() ? "像素风" : style).append("，");
        prompt.append(getPetDescription(petType, element));
        prompt.append("，全身像，完整主体，不要裁剪任何部分，纯黑色背景，背景必须是纯黑色(RGB 0,0,0)，主体居中，高清，清晰边缘");
        return prompt.toString();
    }

    private void ensureDirectoryExists() {
        Path path = Paths.get(config.getFrontendAssetsPath().replace("\\", "/"));
        try {
            if (!Files.exists(path)) {
                Files.createDirectories(path);
                log.info("创建图片保存目录: {}", path.toAbsolutePath());
            }
        } catch (IOException e) {
            throw new IllegalStateException("创建图片保存目录失败: " + path, e);
        }
    }

    private void writePng(byte[] imageBytes, Path filePath) throws IOException {
        try (InputStream in = new ByteArrayInputStream(imageBytes)) {
            BufferedImage originalImage = ImageIO.read(in);
            if (originalImage == null) {
                throw new IOException("无法解析图片数据");
            }
            BufferedImage pngImage = new BufferedImage(
                    originalImage.getWidth(),
                    originalImage.getHeight(),
                    BufferedImage.TYPE_INT_ARGB);
            removeBlackBackground(originalImage, pngImage);

            Path parent = filePath.getParent();
            if (parent != null && !Files.exists(parent)) {
                Files.createDirectories(parent);
            }
            if (!ImageIO.write(pngImage, "PNG", filePath.toFile())) {
                throw new IOException("保存 PNG 失败: " + filePath);
            }
        }
    }

    private void removeBlackBackground(BufferedImage src, BufferedImage dst) {
        int tolerance = config.getBackgroundRemovalTolerance();
        int width = src.getWidth();
        int height = src.getHeight();
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int rgb = src.getRGB(x, y);
                int r = (rgb >> 16) & 0xFF;
                int g = (rgb >> 8) & 0xFF;
                int b = rgb & 0xFF;
                int brightness = (r + g + b) / 3;
                boolean isBackground = brightness <= tolerance
                        || (r <= tolerance && g <= tolerance && b <= tolerance);
                dst.setRGB(x, y, isBackground ? 0x00000000 : (0xFF000000 | (rgb & 0x00FFFFFF)));
            }
        }
    }

    private String getPetDescription(String petType, String element) {
        String baseDesc = switch (petType == null ? "" : petType.toLowerCase()) {
            case "dragon" -> "一只可爱的小龙";
            case "phoenix" -> "一只美丽的凤凰";
            case "unicorn" -> "一只优雅的独角兽";
            case "wolf" -> "一只威武的狼";
            case "fox" -> "一只灵巧的狐狸";
            case "cat" -> "一只可爱的猫咪";
            case "dog" -> "一只忠诚的小狗";
            default -> "一只神奇的生物";
        };

        String elementDesc = switch (element == null ? "" : element.toLowerCase()) {
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
        return baseDesc + elementDesc;
    }
}
