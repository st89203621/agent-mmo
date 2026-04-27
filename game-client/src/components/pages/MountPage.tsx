import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';

interface Mount {
  id: string;
  icon: string;
  name: string;
  level: number;
  tier: string;
  desc: string;
  speedBonus: number;
  atkBonus: number;
  carry: number;
  active?: boolean;
  locked?: boolean;
  tone?: 'red' | 'jade' | 'gold' | 'purple';
}

// TODO: 接入 /mount/list 接口
const MOCK_MOUNTS: Mount[] = [
  { id: 'm1', icon: '骏', name: '骨腾神骏', level: 8, tier: 'UR · 135 神骑', desc: '白骏衔云', speedBonus: 18, atkBonus: 60, carry: 2, active: true },
  { id: 'm2', icon: '雕', name: '玄冥雕', level: 5, tier: 'SR · 御风', desc: '振翅扶摇', speedBonus: 12, atkBonus: 40, carry: 1 },
  { id: 'm3', icon: '狐', name: '九尾狐', level: 3, tier: 'SR · 灵兽', desc: '尾尾生辉', speedBonus: 10, atkBonus: 30, carry: 1, tone: 'purple' },
  { id: 'm4', icon: '龟', name: '玄武', level: 4, tier: 'R · 镇魂', desc: '驮山而行', speedBonus: 6, atkBonus: 50, carry: 2 },
  { id: 'm5', icon: '鹿', name: '金麒麟', level: 2, tier: 'SR · 祥瑞', desc: '蹄踏祥云', speedBonus: 14, atkBonus: 35, carry: 1 },
  { id: 'm6', icon: '舟', name: '鸳鸯舟', level: 1, tier: 'UR · 双坐', desc: '双人同骑', speedBonus: 8, atkBonus: 20, carry: 2, tone: 'red' },
  { id: 'm7', icon: '?', name: '未解锁', level: 0, tier: '★ 7 · 未知', desc: '?', speedBonus: 0, atkBonus: 0, carry: 0, locked: true },
];

const BUFFS: { icon: string; tone: Mount['tone']; name: string; desc: string; status: string; on?: boolean }[] = [
  { icon: '行', tone: 'jade', name: '骑行速度 · 移速 +18%', desc: '出战 骨腾神骏 · 基础 15% + 骑承 3%', status: '生效', on: true },
  { icon: '冲', tone: 'red', name: '冲刺撞伤 · 攻击 +60', desc: '骨腾神骏 Lv8 · 冲撞暴击 +10%', status: '生效', on: true },
  { icon: '鉴', tone: 'gold', name: '图鉴激活 · 6 / 15', desc: '永久 · HP +240 / MP +180', status: '永久' },
  { icon: '舟', tone: 'purple', name: '鸳鸯舟 · 双人同坐', desc: '配偶同骑 · 亲密 +5 / 10 分钟', status: '已解' },
];

export default function MountPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [activeId, setActiveId] = useState(MOCK_MOUNTS.find((m) => m.active)?.id || MOCK_MOUNTS[0].id);

  const active = MOCK_MOUNTS.find((m) => m.id === activeId) || MOCK_MOUNTS[0];

  const handleRide = (m: Mount) => {
    if (m.locked) {
      toast.error('该坐骑尚未解锁');
      return;
    }
    setActiveId(m.id);
    toast.info(`已换乘 ${m.name}`);
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>坐 骑 苑</span>
            <span className={styles.appbarZone}>骑 行 中 · {active.name}</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="进阶" onClick={() => toast.info('进阶尚在筹备')}>进</button>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => navigateTo('home')}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.mtShow}>
          <div className={styles.mtPic}>{`丹青\n\n${active.name}\n${active.desc}`}</div>
          <div className={styles.mtNm}>{active.name}</div>
          <div className={styles.mtTag}>{active.tier}</div>
          <div className={styles.mtSp}>
            <div className={styles.mtSpC}>
              <div className={styles.mtSpV}>+ {active.speedBonus}%</div>
              <div className={styles.mtSpL}>移 速</div>
            </div>
            <div className={styles.mtSpC}>
              <div className={styles.mtSpV}>+ {active.atkBonus}</div>
              <div className={styles.mtSpL}>攻 防</div>
            </div>
            <div className={styles.mtSpC}>
              <div className={styles.mtSpV}>+ {active.carry}</div>
              <div className={styles.mtSpL}>骑 承</div>
            </div>
          </div>
        </div>

        <div className={styles.sectLine}>已 收 坐 骑 · {MOCK_MOUNTS.filter((m) => !m.locked).length} 只</div>

        <div className={styles.mtList}>
          {MOCK_MOUNTS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`${styles.mtItem} ${m.id === activeId ? styles.mtItemOn : ''} ${m.locked ? styles.mtItemLock : ''}`.trim()}
              onClick={() => handleRide(m)}
              disabled={m.locked}
            >
              <span className={styles.mtItemAv}>{m.icon}</span>
              <span className={styles.mtItemNm}>{m.name}</span>
              <span className={styles.mtItemLv}>{m.locked ? m.tier : `Lv ${m.level}`}</span>
            </button>
          ))}
        </div>

        <div className={styles.sectLine}>坐 骑 总 加 成 · 图 鉴 效 果</div>

        {BUFFS.map((b, i) => {
          const toneCls = b.tone === 'jade' ? styles.mtBuffAvJade : b.tone === 'red' ? styles.mtBuffAvRed : b.tone === 'gold' ? styles.mtBuffAvGold : b.tone === 'purple' ? styles.mtBuffAvPurple : '';
          return (
            <div key={i} className={styles.mtBuff}>
              <span className={`${styles.mtBuffAv} ${toneCls}`.trim()}>{b.icon}</span>
              <div className={styles.mtBuffBd}>
                <div className={styles.mtBuffNm}>{b.name}</div>
                <div className={styles.mtBuffBf}>{b.desc}</div>
              </div>
              <span className={`${styles.mtBuffTm} ${b.on ? styles.mtBuffTmOn : ''}`.trim()}>{b.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
