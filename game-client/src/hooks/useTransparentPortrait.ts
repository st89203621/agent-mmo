import { useState, useEffect } from 'react';

/**
 * 将黑色背景的立绘图片处理为透明背景
 * 原理：逐像素检测亮度，近黑色区域设为透明，平滑过渡避免硬边
 */
export function useTransparentPortrait(src: string | null): string | null {
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!src) { setResult(null); return; }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;

      // 亮度阈值：低于 LOW 完全透明，LOW~HIGH 平滑过渡，高于 HIGH 完全不透明
      const LOW = 12;
      const HIGH = 35;

      for (let i = 0; i < d.length; i += 4) {
        const brightness = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        if (brightness < LOW) {
          d[i + 3] = 0;
        } else if (brightness < HIGH) {
          d[i + 3] = Math.round(((brightness - LOW) / (HIGH - LOW)) * 255);
        }
        // brightness >= HIGH: 保持原始 alpha (255)
      }

      ctx.putImageData(imageData, 0, 0);
      setResult(canvas.toDataURL('image/png'));
    };
    img.onerror = () => setResult(src); // 降级：直接用原图
    img.src = src;
  }, [src]);

  return result;
}
