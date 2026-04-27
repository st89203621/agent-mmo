import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getOptimalImageSize,
  getThumbnailSize,
  getMediumSize,
  getFullSize,
  getImageSizeForContainer,
} from '../utils/responsiveImageLoader';
import type { ImageSize } from '../utils/responsiveImageLoader';

interface UseResponsiveImageOptions {
  /** 图片使用场景: 'thumbnail'缩略图 | 'card'卡片 | 'dialog'对话框 | 'fullscreen'全屏 */
  scenario?: 'thumbnail' | 'card' | 'dialog' | 'fullscreen';
  /** 自定义容器宽度（不指定则自动检测） */
  customWidth?: number;
  /** 自定义容器高度 */
  customHeight?: number;
  /** 是否自动调整大小（响应窗口变化） */
  autoResize?: boolean;
}

/**
 * 根据使用场景自动选择合适的图片尺寸
 * 支持响应式调整，避免浪费带宽
 */
export function useResponsiveImage(
  containerRef: React.RefObject<HTMLElement>,
  options: UseResponsiveImageOptions = {},
): ImageSize {
  const [imageSize, setImageSize] = useState<ImageSize>(() => {
    const { scenario, customWidth, customHeight } = options;

    // 场景预设
    if (scenario === 'thumbnail') return getThumbnailSize();
    if (scenario === 'card') return getOptimalImageSize(200, 200);
    if (scenario === 'dialog') return getMediumSize();
    if (scenario === 'fullscreen') return getFullSize();

    // 自定义尺寸
    if (customWidth && customHeight) {
      return getOptimalImageSize(customWidth, customHeight);
    }

    // 自动检测容器
    return getImageSizeForContainer(containerRef.current);
  });

  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const updateSize = useCallback(() => {
    const { customWidth, customHeight } = options;

    if (customWidth && customHeight) {
      const size = getOptimalImageSize(customWidth, customHeight);
      setImageSize(size);
    } else if (containerRef.current) {
      const size = getImageSizeForContainer(containerRef.current);
      setImageSize(size);
    }
  }, [options]);

  useEffect(() => {
    if (!options.autoResize || !containerRef.current) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [options.autoResize, updateSize]);

  return imageSize;
}

/**
 * 用于生成图片的Hook（整合响应式尺寸）
 */
export function useGenerateResponsiveImage(
  generateFn: (width: number, height: number) => Promise<{ imageUrl: string; imageId: string }>,
  containerRef: React.RefObject<HTMLElement>,
  options: UseResponsiveImageOptions = {},
) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const imageSize = useResponsiveImage(containerRef, options);

  const generateImage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await generateFn(imageSize.width, imageSize.height);
      setImageUrl(result.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('生成图片失败'));
    } finally {
      setLoading(false);
    }
  }, [generateFn, imageSize]);

  useEffect(() => {
    generateImage();
  }, [generateImage]);

  return { imageUrl, loading, error, imageSize, regenerate: generateImage };
}
