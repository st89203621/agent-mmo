import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';

interface ShopUnit {
  key: string;
  name: string;
  icon: string;
  cost: number;
}

// TODO: 接入 /tower/state 与 /tower/place 接口
const HUD = [
  { v: '7', l: '波 数' },
  { v: '12', l: '存 活' },
  { v: '420', l: '魂 币' },
  { v: '03 / 05', l: '心 命' },
];

const TOWER_UNITS: ShopUnit[] = [
  { key: 'arrow', name: '箭 塔', icon: '弓', cost: 80 },
  { key: 'rune', name: '符 塔', icon: '符', cost: 120 },
  { key: 'frost', name: '寒 塔', icon: '霜', cost: 160 },
  { key: 'ult', name: '雷 殛', icon: '雷', cost: 280 },
];

const ROW_TILES = [
  ['', '', 'T', '', '', ''],
  ['', 'E', '', '', 'T', ''],
  ['', '', '', 'E', '', ''],
  ['T', '', 'E', '', '', 'T'],
];

export default function SoulTowerPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [waveStarted, setWaveStarted] = useState(false);

  const handleStart = () => {
    setWaveStarted(true);
    toast.info('第 七 波 来 袭');
  };

  const handlePlace = (u: ShopUnit) => {
    toast.info(`已 选 中 ${u.name} · 请 在 路 径 落 位`);
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>千 魂 祀 塔 防</span>
            <span className={styles.appbarZone}>九 转 守 关 · 浮 屠 镇 魂</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => navigateTo('home')}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.stHud}>
        {HUD.map((h, i) => (
          <div key={i}>
            <div className={styles.stHudV}>{h.v}</div>
            <div className={styles.stHudL}>{h.l}</div>
          </div>
        ))}
      </div>

      <div className={styles.stMap}>
        <div className={styles.stPath}>
          {ROW_TILES.map((row, ri) => (
            <div key={ri} className={styles.stPathRow}>
              {row.map((t, ci) => {
                const cls = t === 'T' ? styles.stTileTower : t === 'E' ? styles.stTileEnemy : '';
                const ch = t === 'T' ? '塔' : t === 'E' ? '魂' : '·';
                return (
                  <div key={ci} className={`${styles.stTile} ${cls}`.trim()}>
                    {ch}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.stWaveBar}>
        <span className={styles.stWaveK}>下 一 波</span>
        <span className={styles.stWaveV}>{waveStarted ? '战 斗 中' : '骷 髅 ×8 · 厉 鬼 ×3'}</span>
        <button type="button" className={styles.stWaveBtn} onClick={handleStart} disabled={waveStarted}>
          {waveStarted ? '进 行 中' : '出 阵'}
        </button>
      </div>

      <div className={styles.stShop}>
        {TOWER_UNITS.map((u) => (
          <button key={u.key} type="button" className={styles.stShopBtn} onClick={() => handlePlace(u)}>
            <span className={styles.stShopI}>{u.icon}</span>
            {u.name}
            <span className={styles.stShopC}>{u.cost}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
