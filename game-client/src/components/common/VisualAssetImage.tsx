import { type ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { fetchVisualAsset, generateVisualAsset } from '../../services/api';
import type { VisualAssetSpec } from '../../data/visualAssets';
import { subscribeRedraw, getRedrawVersion } from '../../data/redrawStore';
import styles from './VisualAssetImage.module.css';

interface Props extends VisualAssetSpec {
  className?: string;
  imageClassName?: string;
  children?: ReactNode;
  generateLabel?: string;
  showGenerate?: boolean;
  autoGenerate?: boolean;
}

function storageKey(assetKey: string, width: number, height: number) {
  return `lunhui.asset.${width}x${height}.${assetKey}`;
}

export default function VisualAssetImage({
  assetKey,
  type,
  name,
  description,
  context,
  width,
  height,
  className = '',
  imageClassName = '',
  children,
  generateLabel = '生成',
  showGenerate = true,
  autoGenerate = false,
}: Props) {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchDone, setFetchDone] = useState(false);
  const autoTriggered = useRef(false);

  // 始终持有最新的 props，供重绘回调使用
  const propsRef = useRef({ assetKey, type, name, description, context, width, height });
  propsRef.current = { assetKey, type, name, description, context, width, height };

  // 订阅全局重绘信号（useSyncExternalStore 保证 React 同步感知版本变化）
  const redrawVersion = useSyncExternalStore(subscribeRedraw, getRedrawVersion);
  const lastRedrawVersion = useRef(0);

  useEffect(() => {
    if (redrawVersion === 0 || redrawVersion === lastRedrawVersion.current) return;
    if (!autoGenerate) return;
    lastRedrawVersion.current = redrawVersion;
    const p = propsRef.current;
    setImageUrl('');
    setFetchDone(false);
    setError('');
    setLoading(true);
    generateVisualAsset({ ...p, force: true })
      .then((data) => {
        setImageUrl(data.imageUrl);
        localStorage.setItem(storageKey(p.assetKey, p.width, p.height), data.imageUrl);
      })
      .catch(() => setError('重绘失败'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redrawVersion]);

  // 正常加载：先读缓存，再 fetch 服务器
  useEffect(() => {
    let cancelled = false;
    autoTriggered.current = false;
    setFetchDone(false);
    setImageUrl('');

    const key = storageKey(assetKey, width, height);
    const cached = localStorage.getItem(key);
    if (cached) setImageUrl(cached);

    fetchVisualAsset(assetKey, width, height)
      .then((data) => {
        if (cancelled) return;
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
          localStorage.setItem(key, data.imageUrl);
        }
        setFetchDone(true);
      })
      .catch(() => {
        if (!cancelled) setFetchDone(true);
      });

    return () => { cancelled = true; };
  }, [assetKey, height, width]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await generateVisualAsset({
        assetKey, type, name, description, context, width, height,
        force: !!imageUrl,
      });
      setImageUrl(data.imageUrl);
      localStorage.setItem(storageKey(assetKey, width, height), data.imageUrl);
    } catch {
      setError('生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [assetKey, context, description, height, imageUrl, name, type, width]);

  // 首次没有图时自动生成
  useEffect(() => {
    if (autoGenerate && fetchDone && !imageUrl && !loading && !autoTriggered.current) {
      autoTriggered.current = true;
      handleGenerate();
    }
  }, [autoGenerate, fetchDone, imageUrl, loading, handleGenerate]);

  return (
    <div className={`${styles.asset} ${styles[type] || ''} ${className}`.trim()}>
      {imageUrl ? (
        <img className={`${styles.image} ${imageClassName}`.trim()} src={imageUrl} alt={name} draggable={false} />
      ) : (
        <div className={styles.fallback}>
          <div className={styles.seal}>{name.slice(0, 1)}</div>
          <div className={styles.name}>{name}</div>
          <div className={styles.hint}>{loading ? '画师挥毫中…' : '点击生成图像'}</div>
        </div>
      )}
      <div className={styles.shade} />
      {children && <div className={styles.content}>{children}</div>}
      {showGenerate && (
        <button className={styles.generate} onClick={handleGenerate} disabled={loading} type="button">
          {loading ? '生成中' : imageUrl ? '重绘' : generateLabel}
        </button>
      )}
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
