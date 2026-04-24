import { useEffect, useMemo, useState } from 'react';
import { fetchEquipList, fetchPersonInfo, fetchRebirthStatus, logout, type EquipData, type PersonData } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';
import { usePlayerStore } from '../../../store/playerStore';
import styles from './LunhuiPages.module.css';

function getQualityClass(equip?: EquipData) {
  if (!equip) return '';
  if (equip.quality >= 5) return styles.invOrange;
  if (equip.quality >= 4) return styles.invPurple;
  if (equip.quality >= 3) return styles.invBlue;
  if (equip.quality >= 2) return styles.invGreen;
  return styles.invWhite;
}

const SLOT_LABELS = [
  { position: 1, label: '武器', icon: '剑' },
  { position: 2, label: '护甲', icon: '甲' },
  { position: 3, label: '饰品', icon: '戒' },
  { position: 4, label: '坐骑', icon: '骑' },
  { position: 5, label: '宝宝', icon: '宠' },
];

export default function StatusPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const { gold, diamond, levelInfo } = usePlayerStore();
  const [person, setPerson] = useState<PersonData | null>(null);
  const [equips, setEquips] = useState<EquipData[]>([]);
  const [rebirth, setRebirth] = useState<{ currentWorldIndex: number; currentBook: string } | null>(null);

  useEffect(() => {
    fetchPersonInfo().then(setPerson).catch(() => setPerson(null));
    fetchEquipList().then((res) => setEquips(res.equips || [])).catch(() => setEquips([]));
    fetchRebirthStatus().then(setRebirth).catch(() => setRebirth(null));
  }, []);

  const basic = person?.basicProperty;
  const slots = useMemo(
    () => SLOT_LABELS.map((slot) => ({ slot, equip: equips.find((item) => item.position === slot.position) })),
    [equips],
  );

  return (
    <div className={styles.mockPage}>
      <div className={styles.stHero}>
        <div className={styles.stHeroBtns}>
          <button className={styles.stHeroBtn} onClick={() => navigateTo('home')} type="button">主页</button>
          <button className={styles.stHeroBtn} onClick={() => navigateTo('inventory')} type="button">背包</button>
          <button className={styles.stHeroBtn} onClick={() => { logout().catch(() => {}); location.reload(); }} type="button">退出</button>
        </div>
        <div className={styles.stPortrait}>
          {person?.portraitUrl ? <img src={person.portraitUrl} alt={person.name || '角色'} className={styles.stPortraitImg} /> : '丹青'}
        </div>
        <div className={styles.stNamebox}>
          <div className={styles.stName}>{person?.name || '未命名角色'}</div>
          <div className={styles.stSub}>
            [{person?.profession || 'ATTACK'}] Lv {levelInfo?.level || person?.level?.level || 1}
            {' · '}
            {rebirth ? `${rebirth.currentWorldIndex} 转` : '未转生'}
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.stBlock}>
          <div className={styles.stBlockHead}>基 本</div>
          <div className={styles.stKv2}>
            <div className={styles.stKv}><span className={styles.stK}>游戏币</span><span className={styles.stV}>{gold.toLocaleString()}</span></div>
            <div className={styles.stKv}><span className={styles.stK}>玩币</span><span className={`${styles.stV} ${styles.cGold}`}>{diamond.toLocaleString()}</span></div>
            <div className={styles.stKv}><span className={styles.stK}>书卷</span><span className={styles.stV}>{rebirth?.currentBook || '气盖山河'}</span></div>
            <div className={styles.stKv}><span className={styles.stK}>经验</span><span className={styles.stV}>{levelInfo ? `${levelInfo.exp}/${levelInfo.maxExp}` : '--'}</span></div>
          </div>
        </div>

        <div className={styles.stBlock}>
          <div className={styles.stBlockHead}>属 性</div>
          <div className={styles.stKv2}>
            <div className={styles.stKv}><span className={styles.stK}>生命</span><span className={styles.stV}>{basic?.hp ?? 0}</span></div>
            <div className={styles.stKv}><span className={styles.stK}>法力</span><span className={styles.stV}>{basic?.mp ?? 0}</span></div>
            <div className={styles.stKv}><span className={styles.stK}>物攻</span><span className={styles.stV}>{basic?.physicsAttack ?? 0}</span></div>
            <div className={styles.stKv}><span className={styles.stK}>物防</span><span className={styles.stV}>{basic?.physicsDefense ?? 0}</span></div>
            <div className={styles.stKv}><span className={styles.stK}>法攻</span><span className={styles.stV}>{basic?.magicAttack ?? 0}</span></div>
            <div className={styles.stKv}><span className={styles.stK}>速度</span><span className={styles.stV}>{basic?.speed ?? 0}</span></div>
            <div className={styles.stKv}><span className={styles.stK}>敏捷</span><span className={styles.stV}>{basic?.agility ?? 0}</span></div>
            <div className={styles.stKv}><span className={styles.stK}>暴击</span><span className={styles.stV}>{basic?.critRate ?? 0}%</span></div>
          </div>
        </div>

        <div className={styles.stBlock}>
          <div className={styles.stBlockHead}>装 备</div>
          <div className={styles.invGrid}>
            {slots.map(({ slot, equip }) => (
              <button
                key={slot.position}
                className={`${styles.invSlot} ${equip ? `${styles.invSlotHasItem} ${getQualityClass(equip)}` : ''}`.trim()}
                onClick={() => navigateTo(equip ? 'character' : 'inventory', equip ? { tab: 'info' } : undefined)}
                type="button"
              >
                {equip?.icon || slot.icon}
                {equip && <span className={styles.invQty}>+{equip.grade || equip.level}</span>}
                {!equip && <span className={styles.invBind}>{slot.label}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.stBlock}>
          <div className={styles.stBlockHead}>快 捷</div>
          <div className={styles.quickMatrix}>
            {[
              ['装备', 'character'],
              ['背包', 'inventory'],
              ['排行', 'ranking'],
              ['邮件', 'mail'],
              ['好友', 'friend'],
              ['任务', 'quest'],
              ['宠物', 'pet'],
              ['活动', 'events'],
            ].map(([label, page]) => (
              <button key={label} className={styles.quickMatrixBtn} onClick={() => navigateTo(page as never)} type="button">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
