import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

type TabKey = 'pair' | 'apply' | 'archive';

interface PairRow {
  name: string;
  isMaster: boolean;
  rel: string;
  level: string;
  intimacy: number;
}

// TODO: 接入 /master/pair 与 /master/apply 接口
const TAB_DEFS: { key: TabKey; label: string; count: number }[] = [
  { key: 'pair', label: '已 缔 师 徒', count: 3 },
  { key: 'apply', label: '待 拜 名 帖', count: 5 },
  { key: 'archive', label: '出 师 名 录', count: 8 },
];

const SELF = {
  role: '入 室 弟 子',
  name: '凌 川',
  status: '执 教 三 月 · 收 徒 三 人',
  cap: '门 中 可 收 弟 子 5 / 5',
};

const MOCK_PAIRS: PairRow[] = [
  { name: '陆 长 渊', isMaster: true, rel: '授 业 师 父', level: '元 婴 · 上 阶', intimacy: 8420 },
  { name: '沈 微 之', isMaster: false, rel: '亲 传 弟 子', level: '筑 基 · 七 重', intimacy: 3260 },
  { name: '柳 弦 歌', isMaster: false, rel: '记 名 弟 子', level: '炼 气 · 九 重', intimacy: 1880 },
  { name: '萧 引 之', isMaster: false, rel: '俗 家 弟 子', level: '炼 气 · 三 重', intimacy: 720 },
];

export default function MasterDisciplePage() {
  usePageBackground(PAGE_BG.MASTER_DISCIPLE);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [tab, setTab] = useState<TabKey>('pair');

  const handleAct = (target: string) => {
    toast.info(`传 音 给 ${target}`);
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>师 徒 录</span>
            <span className={styles.appbarZone}>授 业 · 解 惑 · 传 承</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => navigateTo('home')}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.msHead}>
          <div className={styles.msHeadRole}>{SELF.role}</div>
          <div className={styles.msHeadNm}>{SELF.name}</div>
          <div className={styles.msHeadSta}>{SELF.status}</div>
          <div className={styles.msHeadCap}>{SELF.cap}</div>
        </div>

        <div className={styles.msTabs}>
          {TAB_DEFS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`${styles.msTabsBtn} ${tab === t.key ? styles.msTabsBtnOn : ''}`.trim()}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className={styles.msTabsBtnCnt}>{t.count}</span>
            </button>
          ))}
        </div>

        {tab === 'pair' && MOCK_PAIRS.map((p, i) => (
          <div key={i} className={styles.msPair}>
            <span className={`${styles.msPairAv} ${p.isMaster ? styles.msPairAvMaster : ''}`.trim()}>
              {p.name.charAt(0)}
            </span>
            <div>
              <div className={styles.msPairNm}>
                {p.name}
                <span className={`${styles.msPairRel} ${p.isMaster ? styles.msPairRelMaster : ''}`.trim()}>
                  {p.rel}
                </span>
              </div>
              <div className={styles.msPairSm}>{p.level}</div>
              <div className={styles.msPairInt}>羁 绊 {p.intimacy.toLocaleString()}</div>
            </div>
            <button type="button" className={styles.msPairBtn} onClick={() => handleAct(p.name)}>
              传 音
            </button>
          </div>
        ))}

        {tab === 'apply' && (
          <div className={styles.msPair}>
            <span className={styles.msPairAv}>新</span>
            <div>
              <div className={styles.msPairNm}>暂 无 待 处 理 名 帖</div>
              <div className={styles.msPairSm}>新 弟 子 拜 师 申 请 将 在 此 显 示</div>
            </div>
          </div>
        )}

        {tab === 'archive' && (
          <div className={styles.msPair}>
            <span className={styles.msPairAv}>典</span>
            <div>
              <div className={styles.msPairNm}>出 师 名 录 整 理 中</div>
              <div className={styles.msPairSm}>师 门 历 代 弟 子 将 在 此 列 出</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
