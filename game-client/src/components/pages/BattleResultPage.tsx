import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';

interface LootRow {
  icon: string;
  name: string;
  qty: string;
  rarity?: 'rare' | 'ur';
  firstDrop?: boolean;
}

interface BattleResultParams {
  victory?: boolean;
  rounds?: number;
  duration?: number;
  topDamage?: number;
  zone?: string;
  loot?: LootRow[];
}

const DEFAULT_LOOT: LootRow[] = [
  { icon: '¥', name: '游戏币', qty: '+ 340' },
  { icon: '经', name: '经验', qty: '+ 1,280' },
  { icon: '魂', name: '猫精魂魄', qty: '× 2' },
  { icon: '粉', name: '玄铁粉', qty: '× 3' },
  { icon: '晶', name: '紫晶矿 · 稀有', qty: '× 1', rarity: 'rare' },
  { icon: '图', name: '绝世长剑 · 图纸', qty: '✦ 首爆', rarity: 'ur', firstDrop: true },
];

export default function BattleResultPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const params = useGameStore((s) => s.pageParams) as BattleResultParams;

  const victory = params.victory ?? true;
  const rounds = params.rounds ?? 3;
  const duration = params.duration ?? 24;
  const topDamage = params.topDamage ?? 403;
  const zone = params.zone || '猎场宝山 · 3 回合';
  const loot = params.loot && params.loot.length > 0 ? params.loot : DEFAULT_LOOT;

  const handlePick = () => {
    toast.reward('已 拾 取 全 部 战 利 品');
    navigateTo('home');
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>战 罢</span>
            <span className={styles.appbarZone}>{zone}</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="关闭" onClick={() => navigateTo('home')}>×</button>
          </div>
        </div>
      </div>

      <div className={styles.endDim}>
        <div className={styles.endCard}>
          <div className={`${styles.endHd} ${victory ? '' : styles.endHdLose}`}>{victory ? '胜' : '败'}</div>
          <div className={styles.endSub}>
            · 气 盖 山 河 · {victory ? 'VICTORY' : 'DEFEAT'} ·
          </div>

          <div className={styles.endStats}>
            <div>
              <div className={styles.endStatsL}>回 合</div>
              <div className={styles.endStatsV}>{rounds}</div>
            </div>
            <div>
              <div className={styles.endStatsL}>耗 时</div>
              <div className={styles.endStatsV}>{duration}s</div>
            </div>
            <div>
              <div className={styles.endStatsL}>最 高</div>
              <div className={`${styles.endStatsV} ${styles.endStatsVRed}`}>{topDamage}</div>
            </div>
          </div>

          <div className={styles.endLoot}>
            <div className={styles.endLootH}>✦ 战 利 品 · 共 {loot.length}</div>
            {loot.map((l, i) => {
              const icCls = l.rarity === 'rare' ? styles.endLootIcRare : l.rarity === 'ur' ? styles.endLootIcUr : '';
              const nmCls = l.rarity === 'rare' ? styles.endLootNmRare : l.rarity === 'ur' ? styles.endLootNmUr : '';
              return (
                <div key={i} className={styles.endLootRow}>
                  <span className={`${styles.endLootIc} ${icCls}`.trim()}>{l.icon}</span>
                  <span className={`${styles.endLootNm} ${nmCls}`.trim()}>{l.name}</span>
                  <span
                    className={styles.endLootN}
                    style={{
                      color:
                        l.rarity === 'ur'
                          ? 'var(--accent-red)'
                          : l.rarity === 'rare'
                            ? 'var(--accent-purple)'
                            : undefined,
                    }}
                  >
                    {l.qty}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={styles.endBtns}>
            <button type="button" className={styles.endBtn} onClick={() => navigateTo('home')}>离 开</button>
            <button type="button" className={styles.endBtn} onClick={() => navigateTo('battle')}>再 战</button>
            <button type="button" className={`${styles.endBtn} ${styles.endBtnMain}`} onClick={handlePick}>拾 取</button>
          </div>
        </div>
      </div>
    </div>
  );
}
