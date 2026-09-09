package com.iohao.mmo.common.ai.image;

import lombok.extern.slf4j.Slf4j;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * 服务端始终生成 1024x1024 高清原图，按需缩放到目标尺寸再下发。
 * 缩放成本约 20-50ms，相比一次 AI 生成（数秒到十几秒）可忽略。
 */
@Slf4j
public final class ImageScaler {

    private ImageScaler() {}

    public static byte[] scale(byte[] sourceBytes, int targetWidth, int targetHeight) {
        if (sourceBytes == null || sourceBytes.length == 0 || targetWidth <= 0 || targetHeight <= 0) {
            return sourceBytes;
        }
        try {
            BufferedImage src = ImageIO.read(new ByteArrayInputStream(sourceBytes));
            if (src == null) return sourceBytes;
            if (src.getWidth() == targetWidth && src.getHeight() == targetHeight) return sourceBytes;

            int type = src.getColorModel().hasAlpha()
                    ? BufferedImage.TYPE_INT_ARGB
                    : BufferedImage.TYPE_INT_RGB;
            BufferedImage scaled = new BufferedImage(targetWidth, targetHeight, type);
            Graphics2D g = scaled.createGraphics();
            try {
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g.drawImage(src, 0, 0, targetWidth, targetHeight, null);
            } finally {
                g.dispose();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(scaled, "png", out);
            return out.toByteArray();
        } catch (IOException e) {
            log.warn("图片缩放失败 target={}x{} err={}", targetWidth, targetHeight, e.getMessage());
            return sourceBytes;
        }
    }
}
