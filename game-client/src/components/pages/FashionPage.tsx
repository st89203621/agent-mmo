import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface Suit {
  id: string;
  icon: string;
  name: string;
  buff: string;
  tone?: 'red' | 'purple';
  locked?: boolean;
  unlockNote?: string;
}

interface Slot { key: string; label: string; value: string; empty?: boolean }

// TODO: 接入 /fashion/list 接口
const MOCK_SUITS: Suit[] = [
  { id: 's1', icon: '紫', name: '望舒裳', buff: '穿着中', tone: 'purple' },
  { id: 's2', icon: '青', name: '烟萝', buff: 'MP +80' },
  { id: 's3', icon: '红', name: '赤狐裘', buff: '攻 +25', tone: 'red' },
  { id: 's4', icon: '白', name: '素裳', buff: 'HP +60' },
  { id: 's5', icon: '蝶', name: '蝶舞', buff: '闪避 +3%', tone: 'purple' },
  { id: 's6', icon: '囍', name: '婚服', buff: '亲密 +10', tone: 'red' },
  { id: 's7', icon: '云', name: '流云', buff: '移速 +8%' },
  { id: 's8', icon: '月', name: '望月', buff: 'MP +120', tone: 'purple' },
  { id: 's9', icon: '雪', name: '踏雪', buff: 'HP +80' },
  { id: 's10', icon: '龙', name: '龙鳞', buff: '防 +40', tone: 'red' },
  { id: 's11', icon: '?', name: '未解', buff: 'Lv15', locked: true, unlockNote: '满级解锁' },
  { id: 's12', icon: '?', name: '未解', buff: 'VIP3', locked: true, unlockNote: '冲 VIP3' },
];

const SLOTS: Slot[] = [
  { key: 'head', label: '头 饰', value: '青 丝 簪' },
  { key: 'body', label: '衣 着', value: '紫 · 望 舒 裳' },
  { key: 'belt', label: '腰 饰', value: '玉 带 钩' },
  { key: 'cape', label: '披 风', value: '· 未 穿 ·', empty: true },
  { key: 'shoe', label: '鞋 履', value: '绣 花 履' },
  { key: 'hand', label: '手 饰', value: '· 未 穿 ·', empty: true },
];

const BUFFS: { icon: string; tone: Suit['tone']; name: string; desc: string; status: string }[] = [
  { icon: '衣', tone: 'purple', name: '望舒裳 · MP +200 / 闪避 +5%', desc: '套装 1 / 4 · 已激活单件', status: '装备中' },
  { icon: '套', tone: undefined, name: '望舒套装 · 四件套 · 暴击 +8%', desc: '当前 1 / 4 · 缺 披风 / 手饰 / 耳饰', status: '未达' },
  { icon: '染', tone: 'red', name: '染色 · 朱砂红 · 气运 +3', desc: '剩 3 次可染 · 时装染色点 10', status: '已染' },
];

export default function FashionPage() {
  usePageBackground(PAGE_BG.FASHION);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [activeId, setActiveId] = useState('s1');

  const handleWear = (s: Suit) => {
    if (s.locked) {
      toast.error(s.unlockNote || '该时装未解锁');
      return;
    }
    setActiveId(s.id);
    toast.info(`已换 ${s.name}`);
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>时 装 阁</span>
            <span className={styles.appbarZone}>换 装 即 加 buff</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="商城" onClick={() => navigateTo('shop')}>购</button>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => navigateTo('home')}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.fsStage}>
          <div className={styles.fsPic}>{`丹 青\n\n一 袭 紫 衣\n衣 袂 飘 飘`}</div>
          <div className={styles.fsSide}>
            {SLOTS.map((s) => (
              <div key={s.key} className={`${styles.fsSlot} ${s.empty ? styles.fsSlotEmpty : ''}`.trim()}>
                <span className={styles.fsSlotL}>{s.label}</span>
                <span className={styles.fsSlotV}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.sectLine}>时 装 · 属 性 加 成</div>

        {BUFFS.map((b, i) => {
          const toneCls = b.tone === 'red' ? styles.mtBuffAvRed : b.tone === 'purple' ? styles.mtBuffAvPurple : styles.mtBuffAvGold;
          return (
            <div key={i} className={styles.mtBuff}>
              <span className={`${styles.mtBuffAv} ${toneCls}`}>{b.icon}</span>
              <div className={styles.mtBuffBd}>
                <div className={styles.mtBuffNm}>{b.name}</div>
                <div className={styles.mtBuffBf}>{b.desc}</div>
              </div>
              <span className={styles.mtBuffTm}>{b.status}</span>
            </div>
          );
        })}

        <div className={styles.sectLine}>衣 柜 · 已 收 {MOCK_SUITS.filter((s) => !s.locked).length} 套</div>

        <div className={styles.fsGrid}>
          {MOCK_SUITS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.fsCell} ${s.id === activeId ? styles.fsCellOn : ''} ${s.tone === 'red' ? styles.fsCellRed : ''} ${s.locked ? styles.fsCellLock : ''}`.trim()}
              onClick={() => handleWear(s)}
              disabled={s.locked}
            >
              <div className={styles.fsCellIc}>{s.icon}</div>
              <div className={styles.fsCellNm}>{s.name}</div>
              <div className={styles.fsCellB}>{s.buff}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
