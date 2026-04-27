/**
 * 响应式图片加载工具 - 根据设备和容器尺寸自动选择合适的图片大小
 * 降低带宽压力，支持缓存和预加载
 */

export interface ImageSize {
  width: number;
  height: number;
  label: string; // 'thumbnail' | 'small' | 'medium' | 'large' | 'full'
}

// 预定义的图片尺寸规格
const IMAGE_SIZES: ImageSize[] = [
  { width: 256, height: 256, label: 'thumbnail' },
  { width: 512, height: 512, label: 'small' },
  { width: 768, height: 768, label: 'medium' },
  { width: 1024, height: 1024, label: 'large' },
];

// 全局加载缓存，避免重复请求同一尺寸
const loadingCache = new Map<string, Promise<{ imageId: string; imageUrl: string }>>();

/**
 * 根据容器尺寸和设备像素密度计算最优的图片尺寸
 */
export function getOptimalImageSize(
  containerWidth: number,
  containerHeight: number = containerWidth,
  pixelDensity: number = window.devicePixelRatio || 1,
): ImageSize {
  // 计算需要的实际像素
  const requiredPixels = Math.max(containerWidth, containerHeight) * pixelDensity;

  // 选择第一个满足需求的预定义尺寸，避免过度生成
  return (
    IMAGE_SIZES.find((size) => size.width >= requiredPixels) ||
    IMAGE_SIZES[IMAGE_SIZES.length - 1]
  );
}

/**
 * 获取最小的适用尺寸（用于缩略图、列表等低分辨率场景）
 */
export function getThumbnailSize(): ImageSize {
  return IMAGE_SIZES[0];
}

/**
 * 获取中等尺寸（用于对话框、卡片等中等内容）
 */
export function getMediumSize(): ImageSize {
  return IMAGE_SIZES[2];
}

/**
 * 获取全尺寸（用于全屏背景等最高质量场景）
 */
export function getFullSize(): ImageSize {
  return IMAGE_SIZES[3];
}

/**
 * 计算加载百分比（用于进度指示）
 */
export function calculateBandwidthSavings(originalSize: ImageSize, selectedSize: ImageSize): string {
  const originalPixels = originalSize.width * originalSize.height;
  const selectedPixels = selectedSize.width * selectedSize.height;
  const reduction = Math.round(100 - (selectedPixels / originalPixels) * 100);
  return reduction > 0 ? `节省 ${reduction}% 流量` : '';
}

/**
 * 批量加载多个图片，支持去重和缓存
 */
export async function preloadImages(
  imageUrls: string[],
): Promise<Map<string, HTMLImageElement>> {
  const loaded = new Map<string, HTMLImageElement>();
  const promises = imageUrls.map((url) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        loaded.set(url, img);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    });
  });
  await Promise.all(promises);
  return loaded;
}

/**
 * 智能缓存的图片生成调用（避免重复请求同一尺寸）
 */
export function cachedGenerateImage(
  generateFn: () => Promise<{ imageId: string; imageUrl: string }>,
  cacheKey: string,
): Promise<{ imageId: string; imageUrl: string }> {
  if (!loadingCache.has(cacheKey)) {
    loadingCache.set(
      cacheKey,
      generateFn().finally(() => {
        // 5分钟后清除缓存，允许重新生成
        setTimeout(() => loadingCache.delete(cacheKey), 5 * 60 * 1000);
      }),
    );
  }
  return loadingCache.get(cacheKey)! as Promise<{ imageId: string; imageUrl: string }>;
}

/**
 * 获取适用于特定容器的图片尺寸配置
 */
export function getImageSizeForContainer(
  container: HTMLElement | null,
): ImageSize {
  if (!container) return getFullSize();

  const rect = container.getBoundingClientRect();
  const width = Math.ceil(rect.width) || 512;
  const height = Math.ceil(rect.height) || 512;

  return getOptimalImageSize(width, height);
}

/**
 * 构建支持宽高的图片URL（用于后端直接缩放）
 */
export function buildImageUrl(baseUrl: string, width?: number, height?: number): string {
  if (!width && !height) return baseUrl;

  const separator = baseUrl.includes('?') ? '&' : '?';
  const params: string[] = [];

  if (width) params.push(`w=${width}`);
  if (height) params.push(`h=${height}`);

  return baseUrl + separator + params.join('&');
}
