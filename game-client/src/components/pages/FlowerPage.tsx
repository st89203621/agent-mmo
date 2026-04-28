import { useEffect, useState } from 'react';
import { fetchFlower, waterFlower, fetchGlobalFate, type FlowerData, type GlobalFateData } from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';
import shell from './lunhui/LunhuiPages.module.css';
import styles from './FlowerPage.module.css';

const STAGE_ICONS: Record<string, string> = {
  '种子': '🌰', '萌芽': '🌱', '含苞': '🌿', '初绽': '🌸', '盛放': '🌺', '永恒': '💮',
};

const STAGE_PROGRESS: { name: string; req: string }[] = [
  { name: '种子', req: '0' },
  { name: '萌芽', req: '50' },
  { name: '含苞', req: '150' },
  { name: '初绽', req: '300' },
  { name: '盛放', req: '500' },
  { name: '永恒', req: '七世圆满' },
];

export default function FlowerPage() {
  usePageBackground(PAGE_BG.FLOWER);
  const back = useGameStore((s) => s.back);
  const [flower, setFlower] = useState<FlowerData | null>(null);
  const [globalFate, setGlobalFate] = useState<GlobalFateData | null>(null);
  const [watering, setWatering] = useState(false);
  const [fateInput, setFateInput] = useState(10);
  const [trustInput, setTrustInput] = useState(10);

  useEffect(() => {
    Promise.all([
      fetchFlower().catch(() => null),
      fetchGlobalFate().catch(() => null),
    ]).then(([f, gf]) => {
      if (f) setFlower(f);
      if (gf) setGlobalFate(gf);
    });
  }, []);

  const handleWater = async () => {
    if (!globalFate) return;
    if (fateInput <= 0) { toast.error('请输入浇灌缘值'); return; }
    if (globalFate.currentFate < fateInput) { toast.error('缘值不足'); return; }
    if (globalFate.currentTrust < trustInput) { toast.error('信值不足'); return; }
    setWatering(true);
    try {
      const updated = await waterFlower(fateInput, trustInput);
      setFlower(updated);
      const gf = await fetchGlobalFate();
      setGlobalFate(gf);
      toast.success('情花得 见 滋 养');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '浇灌失败');
    } finally {
      setWatering(false);
    }
  };

  return (
    <div className={shell.mockPage}>
      <div className={shell.appbar}>
        <div className={shell.appbarRow}>
          <div className={shell.appbarLoc}>
            <span className={shell.appbarBook}>情 花</span>
            <span className={shell.appbarZone}>七 世 缘 念 · 凝 于 一 蕊</span>
          </div>
          <div className={shell.appbarIcons}>
            <button type="button" className={shell.appbarIcon} aria-label="返回" onClick={() => back()}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scroll}>
        {!flower ? (
          <div className={styles.empty}>加 载 中 …</div>
        ) : (
          <>
            <div className={styles.heroCard}>
              <div className={styles.flowerIcon}>{STAGE_ICONS[flower.stage] || '🌰'}</div>
              <div className={`${styles.flowerName} ${flower.color === '彩' ? styles.flowerNameRainbow : ''}`.trim()}>
                {flower.flowerName}
              </div>
              <div className={styles.flowerMeta}>
                阶段 · {flower.stage} 　|　 花色 · {flower.color} 　|　 经历 {flower.worldCount} 世
              </div>
              {flower.bloomed && flower.flowerVerse && (
                <div className={styles.verse}>「 {flower.flowerVerse} 」</div>
              )}
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <div className={`${styles.statValue} ${styles.statValueFate}`}>{flower.totalFateWatered}</div>
                <div className={styles.statLabel}>累 计 浇 灌 缘 值</div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statValue} ${styles.statValueTrust}`}>{flower.totalTrustInfused}</div>
                <div className={styles.statLabel}>累 计 注 入 信 值</div>
              </div>
            </div>

            {!flower.bloomed && globalFate && (
              <div className={styles.actionCard}>
                <div className={styles.actionTitle}>浇 灌 情 花</div>
                <div className={styles.actionStat}>
                  <span>可用缘值 <strong className={styles.actionStatFate}>{globalFate.currentFate}</strong></span>
                  <span>可用信值 <strong className={styles.actionStatTrust}>{globalFate.currentTrust}</strong></span>
                  <span>品级 <strong className={styles.actionStatGrade}>{globalFate.fateGrade}</strong></span>
                </div>
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>缘值</span>
                  <input
                    type="number"
                    className={styles.fieldInput}
                    value={fateInput}
                    onChange={(e) => setFateInput(Math.max(0, Number(e.target.value) || 0))}
                    min={0}
                    max={globalFate.currentFate}
                  />
                  <span className={styles.fieldLabel}>信值</span>
                  <input
                    type="number"
                    className={styles.fieldInput}
                    value={trustInput}
                    onChange={(e) => setTrustInput(Math.max(0, Number(e.target.value) || 0))}
                    min={0}
                    max={globalFate.currentTrust}
                  />
                </div>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={handleWater}
                  disabled={watering || fateInput <= 0}
                >
                  {watering ? '浇 灌 中 …' : '✦ 浇 灌 情 花'}
                </button>
              </div>
            )}

            <div className={styles.stageCard}>
              <div className={styles.stageTitle}>成 长 之 路</div>
              {STAGE_PROGRESS.map(({ name, req }) => {
                const active = flower.stage === name;
                return (
                  <div key={name} className={`${styles.stageRow} ${active ? styles.stageRowOn : ''}`.trim()}>
                    <span className={styles.stageIcon}>{STAGE_ICONS[name]}</span>
                    <span className={styles.stageName}>{name}</span>
                    <span className={styles.stageReq}>缘值 ≥ {req}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
