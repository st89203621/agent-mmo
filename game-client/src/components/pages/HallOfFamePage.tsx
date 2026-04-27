import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

type TabKey = 'power' | 'wealth' | 'arena' | 'guild';

interface HallRow {
  rk: number;
  nm: string;
  sm: string;
  v: string;
  mine?: boolean;
}

// TODO: 接入 /hall/:tab 接口
const TABS: { key: TabKey; label: string }[] = [
  { key: 'power', label: '战 力 榜' },
  { key: 'wealth', label: '富 豪 榜' },
  { key: 'arena', label: '武 道 榜' },
  { key: 'guild', label: '帮 派 榜' },
];

const DATA: Record<TabKey, HallRow[]> = {
  power: [
    { rk: 1, nm: '陆 长 渊', sm: '元 婴 · 上 阶 · 清 平', v: '128,420' },
    { rk: 2, nm: '司 空 雪', sm: '元 婴 · 中 阶 · 玄 武', v: '124,108' },
    { rk: 3, nm: '苏 倾 月', sm: '金 丹 · 巅 峰 · 朱 雀', v: '118,260' },
    { rk: 4, nm: '凌 川', sm: '金 丹 · 后 期 · 清 平', v: '102,840', mine: true },
    { rk: 5, nm: '萧 引 之', sm: '金 丹 · 中 期 · 朱 雀', v: '98,560' },
    { rk: 6, nm: '裴 无 涯', sm: '金 丹 · 中 期 · 玄 武', v: '94,320' },
    { rk: 7, nm: '柳 弦 歌', sm: '金 丹 · 前 期 · 清 平', v: '88,720' },
    { rk: 8, nm: '沈 微 之', sm: '筑 基 · 巅 峰 · 朱 雀', v: '82,180' },
  ],
  wealth: [
    { rk: 1, nm: '万 钱 翁', sm: '七 商 之 首', v: '5,820,000' },
    { rk: 2, nm: '陆 长 渊', sm: '清 平 掌 门', v: '4,360,000' },
    { rk: 3, nm: '柳 三 娘', sm: '玲 珑 阁 主', v: '3,820,000' },
    { rk: 4, nm: '凌 川', sm: '清 平 弟 子', v: '1,260,000', mine: true },
  ],
  arena: [
    { rk: 1, nm: '陆 长 渊', sm: '神 鹤 · 三 段', v: '段 位 168' },
    { rk: 2, nm: '司 空 雪', sm: '神 鹤 · 二 段', v: '段 位 162' },
    { rk: 3, nm: '凌 川', sm: '玄 鹤 · 上 位', v: '段 位 124', mine: true },
  ],
  guild: [
    { rk: 1, nm: '清 平 道 宗', sm: '会 员 ×420', v: '总 战 力 8,260 万' },
    { rk: 2, nm: '玄 武 同 盟', sm: '会 员 ×398', v: '总 战 力 7,920 万' },
    { rk: 3, nm: '朱 雀 联 阙', sm: '会 员 ×376', v: '总 战 力 7,560 万' },
  ],
};

export default function HallOfFamePage() {
  usePageBackground(PAGE_BG.HALL_OF_FAME);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [tab, setTab] = useState<TabKey>('power');
  const list = DATA[tab];
  const [first, second, third, ...rest] = list;

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>名 人 堂</span>
            <span className={styles.appbarZone}>百 川 排 位 · 万 众 瞻 仰</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => navigateTo('home')}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.hfTabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${styles.hfTabBtn} ${tab === t.key ? styles.hfTabBtnOn : ''}`.trim()}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.scrollPlain}>
        {first && second && third && (
          <div className={styles.hfTop3}>
            <div className={`${styles.hfPodium} ${styles.hfPodium2}`}>
              <div className={`${styles.hfPodiumRk} ${styles.hfPodiumRk2}`}>2</div>
              <div className={styles.hfPodiumNm}>{second.nm}</div>
              <div className={styles.hfPodiumV}>{second.v}</div>
            </div>
            <div className={`${styles.hfPodium} ${styles.hfPodium1}`}>
              <div className={`${styles.hfPodiumRk} ${styles.hfPodiumRk1}`}>1</div>
              <div className={styles.hfPodiumNm}>{first.nm}</div>
              <div className={styles.hfPodiumV}>{first.v}</div>
            </div>
            <div className={`${styles.hfPodium} ${styles.hfPodium3}`}>
              <div className={`${styles.hfPodiumRk} ${styles.hfPodiumRk3}`}>3</div>
              <div className={styles.hfPodiumNm}>{third.nm}</div>
              <div className={styles.hfPodiumV}>{third.v}</div>
            </div>
          </div>
        )}

        {rest.map((r) => (
          <div key={r.rk} className={styles.hfRow}>
            <span className={`${styles.hfRowRk} ${r.mine ? styles.hfRowRkMine : ''}`.trim()}>
              #{r.rk}
            </span>
            <div>
              <div className={styles.hfRowNm}>{r.nm}</div>
              <div className={styles.hfRowSm}>{r.sm}</div>
            </div>
            <span className={styles.hfRowV}>{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
