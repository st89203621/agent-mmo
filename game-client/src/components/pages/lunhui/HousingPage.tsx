import { useEffect, useState } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { toast } from '../../../store/toastStore';
import type { PageId } from '../../../types';
import styles from './LunhuiPages.module.css';
import { usePageBackground } from '../../common/PageShell';
import { PAGE_BG } from '../../../data/pageBackgrounds';

interface Room {
  key: string;
  name: string;
  icon: string;
  desc: string;
  level: number;
  maxLevel: number;
  income: string;
  incomeWarn?: boolean;
  unlockReq?: string;
  to?: PageId;
}

// TODO: 接入 /housing/state 与 /housing/upgrade 接口
const HOUSE_NAME = '墨 染 小 筑';
const HOUSE_LEVEL = '一 阶 院 落 · 三 进 三 出';
const HOUSE_PLATE = '雪 镇 · 巷 北 三 号';

const ROOMS: Room[] = [
  { key: 'yard', name: '前 庭', icon: '庭', desc: '日 产 金 币 · 离 线 挂 机 主 槽', level: 3, maxLevel: 10, income: '+ 1,260 / 时' },
  { key: 'bed', name: '卧 房', icon: '寝', desc: '提 升 离 线 时 长 与 体 力 上 限', level: 2, maxLevel: 10, income: '+ 6 时 离 线' },
  { key: 'forge', name: '工 坊', icon: '匠', desc: '产 出 强 化 材 料 与 摆 件 蓝 图', level: 2, maxLevel: 10, income: '+ 8 凝 神 砂 / 时' },
  { key: 'garden', name: '花 园', icon: '园', desc: '种 植 缘 分 信 物 · 解 锁 转 生 资 格', level: 4, maxLevel: 10, income: '4 / 5 · 5 级 解 锁 转 生', to: 'flower' },
  { key: 'pet', name: '宝 宝 房', icon: '宠', desc: '寄 养 灵 宠 · 提 升 资 质 增 长', level: 1, maxLevel: 10, income: '+ 2 资 质 / 日', to: 'pet' },
  { key: 'shrine', name: '祠 堂', icon: '祠', desc: '供 奉 先 祖 · 提 升 转 生 加 成', level: 0, maxLevel: 10, income: '未 启 用', incomeWarn: true, unlockReq: '需 3 转' },
];

const VISITORS = [
  { nm: '苏 倾 月', av: '苏' },
  { nm: '陆 长 渊', av: '陆' },
  { nm: '柳 弦 歌', av: '柳' },
  { nm: '萧 引 之', av: '萧' },
];

const ACTS: { key: string; label: string; icon: string }[] = [
  { key: 'visit', label: '串 门', icon: '访' },
  { key: 'decor', label: '布 置', icon: '饰' },
  { key: 'invite', label: '邀 客', icon: '邀' },
  { key: 'expand', label: '扩 建', icon: '建' },
];

export default function HousingPage() {
  usePageBackground(PAGE_BG.HOUSING);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const back = useGameStore((s) => s.back);
  const [pendingGold, setPendingGold] = useState(8460);
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPendingGold((g) => g + 21), 60000);
    return () => clearInterval(t);
  }, []);

  const handleCollect = () => {
    if (pendingGold === 0 || collecting) return;
    setCollecting(true);
    setTimeout(() => {
      toast.reward(`收 取 ${pendingGold.toLocaleString()} 游 戏 币`);
      setPendingGold(0);
      setCollecting(false);
    }, 320);
  };

  const handleRoom = (r: Room) => {
    if (r.unlockReq) {
      toast.error(r.unlockReq);
      return;
    }
    if (r.to) {
      navigateTo(r.to);
      return;
    }
    toast.info(`${r.name} 升 级 筹 备 中`);
  };

  const handleAct = (key: string) => {
    if (key === 'visit') {
      navigateTo('friend');
      return;
    }
    if (key === 'decor') {
      navigateTo('flower');
      return;
    }
    toast.info('该 操 作 尚 在 筹 备');
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>家 产 · 宅 院</span>
            <span className={styles.appbarZone}>院 落 / 离 线 / 串 门 / 收 益</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => back()}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.hsHero}>
          <div className={styles.hsHeroSky} />
          <div className={styles.hsHeroPlate}>{HOUSE_PLATE}</div>
          <div className={styles.hsHeroLevel}>院 阶 ☆ 三</div>
          <div className={styles.hsHeroHouse}>宅</div>
          <span className={styles.hsHeroSmoke}>烟</span>
          <span className={`${styles.hsHeroLamp} ${styles.hsHeroLampL}`} />
          <span className={`${styles.hsHeroLamp} ${styles.hsHeroLampR}`} />
        </div>

        <div className={styles.hsTitle}>
          <div className={styles.hsTitleNm}>{HOUSE_NAME}</div>
          <div className={styles.hsTitleSb}>{HOUSE_LEVEL}</div>
        </div>

        <div className={styles.hsIncome}>
          <div className={styles.hsIncomeBd}>
            <div className={styles.hsIncomeK}>未 收 取 离 线 收 益</div>
            <div className={styles.hsIncomeRow}>
              <span className={styles.hsIncomeV}>{pendingGold.toLocaleString()}</span>
              <span className={styles.hsIncomeU}>游 戏 币 · 上 限 24 时</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.hsIncomeBtn}
            onClick={handleCollect}
            disabled={collecting || pendingGold === 0}
          >
            {pendingGold === 0 ? '已 收 取' : collecting ? '...' : '收 取'}
          </button>
        </div>

        <div className={styles.hsRooms}>
          {ROOMS.map((r) => (
            <div
              key={r.key}
              className={`${styles.hsRoom} ${r.unlockReq ? styles.hsRoomLocked : ''}`.trim()}
              onClick={() => handleRoom(r)}
            >
              {r.unlockReq && <span className={styles.hsRoomLockTag}>{r.unlockReq}</span>}
              <div className={styles.hsRoomHead}>
                <span className={styles.hsRoomIc}>{r.icon}</span>
                <span className={styles.hsRoomNm}>{r.name}</span>
                <span className={styles.hsRoomLv}>Lv {r.level}/{r.maxLevel}</span>
              </div>
              <div className={styles.hsRoomDs}>{r.desc}</div>
              <div className={styles.hsRoomFt}>
                <span className={`${styles.hsRoomFtV} ${r.incomeWarn ? styles.hsRoomFtVRed : ''}`.trim()}>
                  {r.income}
                </span>
                <button
                  type="button"
                  className={styles.hsRoomFtBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRoom(r);
                  }}
                >
                  {r.unlockReq ? '受 限' : r.to ? '入 内' : '升 级'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.hsGuestBar}>
          <span className={styles.hsGuestK}>今 日 访 客</span>
          <div className={styles.hsGuestList}>
            {VISITORS.length === 0 ? (
              <span className={styles.hsGuestEmpty}>院 内 清 静</span>
            ) : (
              VISITORS.map((v) => (
                <span key={v.nm} className={styles.hsGuestAv} title={v.nm}>
                  {v.av}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={styles.hsActs}>
        {ACTS.map((a) => (
          <button key={a.key} type="button" className={styles.hsActBtn} onClick={() => handleAct(a.key)}>
            <span className={styles.hsActBtnI}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
