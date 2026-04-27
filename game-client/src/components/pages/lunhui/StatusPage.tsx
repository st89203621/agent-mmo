import { useEffect, useMemo, useState } from 'react';
import { fetchEquipList, fetchPersonInfo, fetchRebirthStatus, logout, type EquipData, type PersonData } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';
import { usePlayerStore } from '../../../store/playerStore';
import type { PageId } from '../../../types';
import styles from './LunhuiPages.module.css';

interface MenuEntry {
  label: string;
  page: PageId;
}

interface MenuSection {
  title: string;
  items: MenuEntry[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: '战 斗',
    items: [
      { label: '闯 关', page: 'battle' },
      { label: '副 本', page: 'dungeon' },
      { label: '世 界 BOSS', page: 'world-boss' },
      { label: '团 战', page: 'team-battle' },
      { label: '武 斗', page: 'arena' },
      { label: '战 场', page: 'battlefield' },
      { label: '塔 防', page: 'soul-tower' },
      { label: '魔 境', page: 'mirage' },
      { label: '秘 境', page: 'secret-realm' },
      { label: '宝 山', page: 'treasure-mountain' },
      { label: '捉 鬼', page: 'ghost-house' },
      { label: '射 击', page: 'shooting' },
    ],
  },
  {
    title: '养 成',
    items: [
      { label: '装 备', page: 'character' },
      { label: '强 化', page: 'enchant' },
      { label: '神 兵', page: 'forge' },
      { label: '技 能', page: 'skill-tree' },
      { label: '宠 物', page: 'pet' },
      { label: '砸 蛋', page: 'pet-summon' },
      { label: '坐 骑', page: 'mount' },
      { label: '时 装', page: 'fashion' },
      { label: '鬼 炉', page: 'rune-furnace' },
      { label: '附 魂', page: 'soul-attach' },
      { label: '转 生', page: 'rebirth' },
      { label: '命 格', page: 'fate-map' },
      { label: '玄 典', page: 'mystic-tome' },
    ],
  },
  {
    title: '社 交',
    items: [
      { label: '帮 派', page: 'guild' },
      { label: '好 友', page: 'friend' },
      { label: '师 徒', page: 'master-disciple' },
      { label: '传 承', page: 'lineage' },
      { label: '夫 妻', page: 'couple-cultivation' },
      { label: '婚 礼', page: 'wedding' },
      { label: '聊 天', page: 'chat' },
      { label: '邮 件', page: 'mail' },
      { label: '名 录', page: 'message-board' },
      { label: '匹 配', page: 'matchmaking' },
      { label: '附 近', page: 'nearby' },
      { label: '同 游', page: 'coexplore' },
    ],
  },
  {
    title: '生 活',
    items: [
      { label: '家 园', page: 'housing' },
      { label: '钓 鱼', page: 'fishing' },
      { label: '银 行', page: 'bank' },
      { label: '集 市', page: 'trade' },
      { label: '拍 卖', page: 'auction' },
      { label: '商 城', page: 'shop' },
      { label: '花 圃', page: 'flower' },
      { label: '伴 灵', page: 'companion' },
      { label: '探 索', page: 'explore' },
      { label: '记 忆', page: 'memory' },
      { label: '故 事', page: 'story' },
      { label: '世 界', page: 'world-map' },
    ],
  },
  {
    title: '福 利',
    items: [
      { label: '签 到', page: 'checkin' },
      { label: '转 盘', page: 'wheel' },
      { label: '活 动', page: 'events' },
      { label: '任 务', page: 'quest' },
      { label: '成 就', page: 'achievement' },
      { label: '称 号', page: 'title' },
      { label: '名 人 堂', page: 'hall-of-fame' },
      { label: '排 行', page: 'ranking' },
      { label: '通 知', page: 'notification' },
      { label: '引 导', page: 'tutorial' },
      { label: '战 力', page: 'power' },
      { label: '图 鉴', page: 'codex' },
    ],
  },
  {
    title: '商 城',
    items: [
      { label: '充 值', page: 'recharge' },
      { label: '月 卡', page: 'monthly-card' },
      { label: '累 充', page: 'first-recharge' },
      { label: 'VIP', page: 'vip' },
      { label: '设 置', page: 'settings' },
    ],
  },
];

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

        {MENU_SECTIONS.map((sect) => (
          <div key={sect.title} className={styles.stBlock}>
            <div className={styles.stBlockHead}>{sect.title}</div>
            <div className={styles.quickMatrix}>
              {sect.items.map((it) => (
                <button
                  key={it.page + it.label}
                  className={styles.quickMatrixBtn}
                  onClick={() => navigateTo(it.page)}
                  type="button"
                >
                  {it.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
