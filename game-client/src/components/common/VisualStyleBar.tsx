import { useCallback, useState } from 'react';
import {
  VISUAL_STYLES,
  type VisualStyleId,
  getVisualStyle,
  setVisualStyle,
  clearAllAssetCache,
} from '../../data/visualAssets';
import { toast } from '../../store/toastStore';
import styles from './VisualStyleBar.module.css';

interface Props {
  onRedraw?: () => void;
}

export default function VisualStyleBar({ onRedraw }: Props) {
  const [current, setCurrent] = useState<VisualStyleId>(() => getVisualStyle().id);
  const [open, setOpen] = useState(false);

  const handleStyle = useCallback((id: VisualStyleId) => {
    if (id === current) return;
    setVisualStyle(id);
    setCurrent(id);
    clearAllAssetCache();
    toast.info(`画风切换：${VISUAL_STYLES.find((s) => s.id === id)?.label}，重进页面自动重绘`);
    setOpen(false);
    onRedraw?.();
  }, [current, onRedraw]);

  const handleRedrawNow = useCallback(() => {
    clearAllAssetCache();
    toast.info('缓存已清除，正在重绘...');
    setOpen(false);
    onRedraw?.();
  }, [onRedraw]);

  const currentLabel = VISUAL_STYLES.find((s) => s.id === current)?.label ?? '暗金';

  return (
    <div className={styles.wrap}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        画 · {currentLabel}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.row}>
            {VISUAL_STYLES.map((s) => (
              <button
                key={s.id}
                className={`${styles.styleBtn} ${current === s.id ? styles.styleBtnOn : ''}`}
                onClick={() => handleStyle(s.id as VisualStyleId)}
                type="button"
              >
                {s.label}
              </button>
            ))}
          </div>
          <button className={styles.redrawBtn} onClick={handleRedrawNow} type="button">
            重 绘 全 部
          </button>
        </div>
      )}
    </div>
  );
}
