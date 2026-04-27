import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '../../store/toastStore';
import { fetchTomePool, drawTome, type TomeSkillBook } from '../../services/api';
import page from '../../styles/page.module.css';
import own from './MysticTomePage.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

const styles = { ...page, ...own };

const RANK_STYLE: Record<string, { color: string; bg: string; card: string; reveal: string }> = {
  SSR: { color: '#e05050', bg: 'rgba(220,60,60,0.15)', card: 'bookCardSsr', reveal: 'revealCardSsr' },
  SR: { color: '#b478dc', bg: 'rgba(180,120,220,0.15)', card: 'bookCardSr', reveal: 'revealCardSr' },
  R: { color: '#648cdc', bg: 'rgba(100,140,220,0.15)', card: 'bookCardR', reveal: 'revealCardR' },
  N: { color: '#9e9e9e', bg: 'rgba(160,160,160,0.15)', card: '', reveal: '' },
};

function getRankStyle(rank: string) {
  return RANK_STYLE[rank] || RANK_STYLE.N;
}

export default function MysticTomePage() {
  usePageBackground(PAGE_BG.MYSTIC_TOME);
  const [pool, setPool] = useState<TomeSkillBook[]>([]);
  const [drawResults, setDrawResults] = useState<TomeSkillBook[] | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [pity, setPity] = useState({ current: 0, guarantee: 90 });
  const [drawOneCost, setDrawOneCost] = useState(160);
  const [drawTenCost, setDrawTenCost] = useState(1440);

  const loadPool = useCallback(async () => {
    try {
      const data = await fetchTomePool();
      setPool(data.books || []);
      setPity({ current: data.pityCount ?? 0, guarantee: data.pityGuarantee ?? 90 });
      setDrawOneCost(data.drawOneCost ?? 160);
      setDrawTenCost(data.drawTenCost ?? 1440);
    } catch { /* noop */ }
  }, []);

  useEffect(() => { loadPool(); }, [loadPool]);

  const handleDraw = useCallback(async (count: number) => {
    if (drawing) return;
    setDrawing(true);
    try {
      const res = await drawTome(count);
      setDrawResults(res.results || []);
      setPity({ current: res.pityCount ?? pity.current, guarantee: pity.guarantee });
    } catch (e: any) {
      toast.error(e.message || '抽取失败');
    }
    setDrawing(false);
  }, [drawing, pity]);

  const ssrBooks = pool.filter(b => b.rank === 'SSR');
  const srBooks = pool.filter(b => b.rank === 'SR');
  const rBooks = pool.filter(b => b.rank === 'R');

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>太古秘典</h2>
        <p className={styles.subtitle}>开启洪荒秘典，获得失传绝技</p>
      </div>

      {/* 池子展示 */}
      <div className={styles.poolBanner}>
        <div className={styles.poolGlow} />
        <div className={styles.poolIcon}>📜</div>
        <div className={styles.poolName}>洪荒秘典 · 技能书池</div>
        <div className={styles.poolDesc}>逆天改命 · 焚天灭地 · 万剑归宗 概率UP</div>
        <div className={styles.rateRow}>
          <span className={`${styles.rateBadge} ${styles.rateSsr}`}>SSR 1.5%</span>
          <span className={`${styles.rateBadge} ${styles.rateSr}`}>SR 10%</span>
          <span className={`${styles.rateBadge} ${styles.rateR}`}>R 88.5%</span>
        </div>
      </div>

      {/* 保底计数 */}
      <div className={styles.pityRow}>
        <span>距保底: <span className={styles.pityVal}>{pity.guarantee - pity.current}</span> 抽</span>
        <span>已抽: <span className={styles.pityVal}>{pity.current}</span> 次</span>
      </div>

      <div className={styles.scrollArea}>
        {/* 抽取按钮 */}
        <div className={styles.drawSection}>
          <button
            className={`${styles.drawBtn} ${styles.drawOne}`}
            disabled={drawing}
            onClick={() => handleDraw(1)}
          >
            单抽
            <span className={styles.drawCost}>{drawOneCost} 钻石</span>
          </button>
          <button
            className={`${styles.drawBtn} ${styles.drawTen}`}
            disabled={drawing}
            onClick={() => handleDraw(10)}
          >
            十连抽
            <span className={styles.drawCost}>{drawTenCost} 钻石</span>
          </button>
        </div>

        {/* UP技能书展示 */}
        {ssrBooks.length > 0 && (
          <div className={styles.bookSection}>
            <div className={styles.bookSectionTitle}>SSR 概率UP</div>
            <div className={styles.bookGrid}>
              {ssrBooks.map(b => {
                const rs = getRankStyle(b.rank);
                return (
                  <div key={b.id} className={`${styles.bookCard} ${styles[rs.card]}`}>
                    <span className={styles.bookIcon}>{b.icon}</span>
                    <span className={styles.bookName}>{b.name}</span>
                    <span className={styles.bookRank} style={{ color: rs.color, background: rs.bg }}>SSR</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {srBooks.length > 0 && (
          <div className={styles.bookSection}>
            <div className={styles.bookSectionTitle}>SR 技能书</div>
            <div className={styles.bookGrid}>
              {srBooks.map(b => {
                const rs = getRankStyle(b.rank);
                return (
                  <div key={b.id} className={`${styles.bookCard} ${styles[rs.card]}`}>
                    <span className={styles.bookIcon}>{b.icon}</span>
                    <span className={styles.bookName}>{b.name}</span>
                    <span className={styles.bookRank} style={{ color: rs.color, background: rs.bg }}>SR</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {rBooks.length > 0 && (
          <div className={styles.bookSection}>
            <div className={styles.bookSectionTitle}>R 技能书</div>
            <div className={styles.bookGrid}>
              {rBooks.map(b => {
                const rs = getRankStyle(b.rank);
                return (
                  <div key={b.id} className={`${styles.bookCard} ${styles[rs.card]}`}>
                    <span className={styles.bookIcon}>{b.icon}</span>
                    <span className={styles.bookName}>{b.name}</span>
                    <span className={styles.bookRank} style={{ color: rs.color, background: rs.bg }}>R</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 开箱结果 */}
      {drawResults && (
        <div className={styles.revealOverlay} onClick={() => setDrawResults(null)}>
          <div className={styles.revealCards} onClick={e => e.stopPropagation()}>
            {drawResults.map((b, i) => {
              const rs = getRankStyle(b.rank);
              return (
                <div key={i} className={`${styles.revealCard} ${styles[rs.reveal]}`}>
                  <span className={styles.revealIcon}>{b.icon}</span>
                  <span className={styles.revealName}>{b.name}</span>
                  <span className={styles.revealRank} style={{ color: rs.color }}>{b.rank}</span>
                </div>
              );
            })}
          </div>
          <button className={styles.revealClose} onClick={() => setDrawResults(null)}>确认</button>
        </div>
      )}
    </div>
  );
}
