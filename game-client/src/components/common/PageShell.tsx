import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { fetchVisualAsset, generateVisualAsset } from '../../services/api';
import type { VisualAssetSpec } from '../../data/visualAssets';
import { subscribeRedraw, getRedrawVersion } from '../../data/redrawStore';
import { THEMES, getTheme, setTheme, subscribeTheme } from '../../data/themeStore';
import styles from './PageShell.module.css';

interface PageShellContextValue {
  setBgAsset: (asset?: VisualAssetSpec) => void;
}

const PageShellContext = createContext<PageShellContextValue | null>(null);

/**
 * 页面在自己组件内一行上报背景图，由顶层 PageShell 接管渲染。
 * 卸载时自动清空，避免跨页残留。
 */
export function usePageBackground(asset?: VisualAssetSpec): void {
  const ctx = useContext(PageShellContext);
  const key = asset
    ? `${asset.assetKey}|${asset.width}x${asset.height}|${asset.name}|${asset.description}`
    : '';
  useEffect(() => {
    if (!ctx) return;
    ctx.setBgAsset(asset);
    return () => ctx.setBgAsset(undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, key]);
}

interface Props {
  children: ReactNode;
  bgAsset?: VisualAssetSpec;
  className?: string;
}

function bgStorageKey(asset: VisualAssetSpec): string {
  return `lunhui.asset.${asset.width}x${asset.height}.${asset.assetKey}`;
}

export default function PageShell({ children, bgAsset: defaultBgAsset, className = '' }: Props) {
  const themeId = useSyncExternalStore(subscribeTheme, getTheme);
  const redrawVersion = useSyncExternalStore(subscribeRedraw, getRedrawVersion);
  const lastRedrawVersion = useRef(0);

  const [reportedAsset, setReportedAsset] = useState<VisualAssetSpec | undefined>(undefined);
  const bgAsset = reportedAsset ?? defaultBgAsset;

  const [bgUrl, setBgUrl] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const styleBtnRef = useRef<HTMLButtonElement>(null);

  const ctxValue = useMemo<PageShellContextValue>(
    () => ({ setBgAsset: setReportedAsset }),
    [],
  );

  useEffect(() => {
    if (!bgAsset) {
      setBgUrl('');
      return;
    }
    let cancelled = false;
    const cached = localStorage.getItem(bgStorageKey(bgAsset));
    if (cached) setBgUrl(cached);
    else setBgUrl('');

    fetchVisualAsset(bgAsset.assetKey, bgAsset.width, bgAsset.height)
      .then((data) => {
        if (cancelled) return;
        if (data.imageUrl) {
          setBgUrl(data.imageUrl);
          localStorage.setItem(bgStorageKey(bgAsset), data.imageUrl);
          return;
        }
        // 后端无缓存 · 首次静默生成（失败由 12 主题底图托底）
        if (cached) return; // 已有 LS 缓存，避免重复触发
        setDrawing(true);
        generateVisualAsset({ ...bgAsset })
          .then((d) => {
            if (cancelled) return;
            setBgUrl(d.imageUrl);
            localStorage.setItem(bgStorageKey(bgAsset), d.imageUrl);
          })
          .catch(() => { /* 失败 → 主题底图托底 */ })
          .finally(() => { if (!cancelled) setDrawing(false); });
      })
      .catch(() => { /* fallback：用 12 主题底图 */ });

    return () => {
      cancelled = true;
    };
  }, [bgAsset]);

  useEffect(() => {
    if (!bgAsset) return;
    if (redrawVersion === 0 || redrawVersion === lastRedrawVersion.current) return;
    lastRedrawVersion.current = redrawVersion;
    setBgUrl('');
    setDrawing(true);
    generateVisualAsset({ ...bgAsset, force: true })
      .then((data) => {
        setBgUrl(data.imageUrl);
        localStorage.setItem(bgStorageKey(bgAsset), data.imageUrl);
      })
      .catch(() => { /* 失败 → 主题底图托底 */ })
      .finally(() => setDrawing(false));
  }, [redrawVersion, bgAsset]);

  const handleRedraw = useCallback(async () => {
    if (!bgAsset || drawing) return;
    setDrawing(true);
    try {
      const data = await generateVisualAsset({ ...bgAsset, force: true });
      setBgUrl(data.imageUrl);
      localStorage.setItem(bgStorageKey(bgAsset), data.imageUrl);
    } catch {
      /* noop · 保留旧图 */
    } finally {
      setDrawing(false);
    }
  }, [bgAsset, drawing]);

  const togglePop = useCallback(() => {
    if (!open && styleBtnRef.current) {
      const r = styleBtnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  }, [open]);

  return (
    <PageShellContext.Provider value={ctxValue}>
      <div className={`${styles.shell} ${styles['theme' + themeId]} ${className}`.trim()}>
        {bgUrl && <img className={styles.bgImage} src={bgUrl} alt="" draggable={false} />}

        <div className={styles.toolbar}>
          {bgAsset && (
            <button
              type="button"
              className={styles.toolBtn}
              onClick={handleRedraw}
              disabled={drawing}
              title="重绘背景"
              aria-label="重绘背景"
            >
              {drawing ? '…' : '绘'}
            </button>
          )}
          <button
            ref={styleBtnRef}
            type="button"
            className={styles.toolBtn}
            onClick={togglePop}
            title="切换风格"
            aria-label="切换风格"
          >
            风
          </button>
        </div>

        <div className={styles.body}>{children}</div>

        {open && createPortal(
          <>
            <div className={styles.popBackdrop} onClick={() => setOpen(false)} />
            <div className={styles.pop} style={{ top: pos.top, right: pos.right }}>
              <div className={styles.popTitle}>风格 · 12 选 1</div>
              <div className={styles.popGrid}>
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.chip} ${themeId === t.id ? styles.chipActive : ''}`.trim()}
                    onClick={() => { setTheme(t.id); setOpen(false); }}
                  >
                    <span className={styles.chipNum}>#{t.id}</span>
                    <span className={styles.chipName}>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body,
        )}
      </div>
    </PageShellContext.Provider>
  );
}
