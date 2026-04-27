import { useEffect, useRef, useState } from 'react';
import { generateSceneImage } from '../services/api';
import { getOptimalImageSize } from '../utils/responsiveImageLoader';

interface ImageBackgroundProps {
  /** 生成图片的NPC ID（如果是纯风景则以explore_bg_开头） */
  imageId: string;
  /** 场景提示词/描述 */
  sceneHint: string;
  /** 艺术风格（可选） */
  artStyle?: string;
  /** 子组件 */
  children?: React.ReactNode;
  /** 图片覆盖度（0-1，默认0.5） */
  opacity?: number;
}

/**
 * 响应式图片背景容器
 * 自动根据设备选择合适的图片尺寸，降低带宽
 */
export function ImageBackground({
  imageId,
  sceneHint,
  artStyle,
  children,
  opacity = 0.5,
}: ImageBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    const generateBg = async () => {
      if (!containerRef.current) return;

      try {
        setLoading(true);
        setError('');
        setImageUrl('');

        const rect = containerRef.current.getBoundingClientRect();
        const size = getOptimalImageSize(
          Math.ceil(rect.width) || 512,
          Math.ceil(rect.height) || 512,
          window.devicePixelRatio,
        );

        const result = await generateSceneImage(
          imageId,
          0,
          artStyle,
          sceneHint,
          size.width,
          size.height,
        );

        if (!cancelled) setImageUrl(result.imageUrl);
      } catch (err) {
        if (!cancelled) {
          console.error('背景图片生成失败:', err);
          setError(err instanceof Error ? err.message : '生成失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    generateBg();
    return () => { cancelled = true; };
  }, [imageId, sceneHint, artStyle]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* 背景图片 */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="background"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity,
          }}
        />
      )}

      {/* 加载状态 */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)',
            color: '#999',
            fontSize: '12px',
            zIndex: 10,
          }}
        >
          生成背景中...
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            color: '#f0b3a8',
            fontSize: '12px',
            zIndex: 10,
          }}
        >
          {error}
        </div>
      )}

      {/* 内容层 */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  );
}
