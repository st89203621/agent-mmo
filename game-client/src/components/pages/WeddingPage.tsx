import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface WeddingState {
  groom: string;
  bride: string;
  date: string;
  rite: string;
  intimacy: number;
  joinedGuest: number;
  giftValue: number;
}

interface GuestRow {
  name: string;
  rel: string;
  gift: string;
}

// TODO: 接入 /wedding/state 与 /wedding/guests 接口
const MOCK_STATE: WeddingState = {
  groom: '凌 川',
  bride: '苏 倾 月',
  date: '甲 子 年 · 三 月 · 十 八',
  rite: '凤 仪 大 典',
  intimacy: 4280,
  joinedGuest: 36,
  giftValue: 12880,
};

const MOCK_GUESTS: GuestRow[] = [
  { name: '萧 引 之', rel: '挚 友', gift: '+ 1,800' },
  { name: '司 空 雪', rel: '盟 友', gift: '+ 980' },
  { name: '陆 长 渊', rel: '宗 师', gift: '+ 3,600' },
  { name: '柳 弦 歌', rel: '同 门', gift: '+ 720' },
  { name: '裴 无 涯', rel: '盟 友', gift: '+ 540' },
];

const ACTIONS: { key: string; label: string; icon: string }[] = [
  { key: 'invite', label: '广 发 请 柬', icon: '帖' },
  { key: 'rite', label: '主 持 大 典', icon: '礼' },
  { key: 'toast', label: '敬 酒 入 席', icon: '盏' },
  { key: 'gift', label: '礼 单 收 录', icon: '册' },
  { key: 'photo', label: '存 影 留 念', icon: '影' },
  { key: 'depart', label: '送 客 归 程', icon: '别' },
];

export default function WeddingPage() {
  usePageBackground(PAGE_BG.WEDDING);
  const back = useGameStore((s) => s.back);

  const handleAction = (key: string) => {
    if (key === 'depart') {
      back();
      return;
    }
    toast.info('该礼节正在筹备');
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>凤 仪 大 典</span>
            <span className={styles.appbarZone}>三 生 同 修 · 七 世 缔 缘</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => back()}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.wdHero}>
          <div className={styles.wdKw}>红 鸾 星 动</div>
          <div className={styles.wdXi}>囍</div>
          <div className={styles.wdPair}>
            {MOCK_STATE.groom}
            <span className={styles.wdHeart}>♡</span>
            {MOCK_STATE.bride}
          </div>
          <div className={styles.wdDate}>{MOCK_STATE.date} · {MOCK_STATE.rite}</div>
        </div>

        <div className={styles.wdStat}>
          <div>
            <div className={styles.wdStatV}>{MOCK_STATE.intimacy.toLocaleString()}</div>
            <div className={styles.wdStatL}>姻 缘 值</div>
          </div>
          <div>
            <div className={styles.wdStatV}>{MOCK_STATE.joinedGuest}</div>
            <div className={styles.wdStatL}>到 场 宾 客</div>
          </div>
          <div>
            <div className={styles.wdStatV}>{MOCK_STATE.giftValue.toLocaleString()}</div>
            <div className={styles.wdStatL}>贺 礼 总 值</div>
          </div>
        </div>

        <div className={styles.wdAct}>
          {ACTIONS.map((a) => (
            <button
              key={a.key}
              type="button"
              className={styles.wdActBtn}
              onClick={() => handleAction(a.key)}
            >
              <span className={styles.wdActBtnI}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>

        <div className={styles.sectLine}>到 场 宾 客 名 录</div>

        {MOCK_GUESTS.map((g, i) => (
          <div key={i} className={styles.wdGuest}>
            <span className={styles.wdGuestAv}>{g.name.charAt(0)}</span>
            <span className={styles.wdGuestNm}>
              {g.name}
              <span className={styles.wdGuestRel}>· {g.rel}</span>
            </span>
            <span className={styles.wdGuestGift}>{g.gift}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
