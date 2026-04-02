import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import page from '../../styles/page.module.css';
import own from './ActivityPage.module.css';

const styles = { ...page, ...own };

interface ActivityDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tag: 'hot' | 'new' | 'daily' | 'limited';
  tagLabel: string;
  glowColor: string;
  wide?: boolean;
  countdown?: boolean;
  navigateTo?: string;
}

const ACTIVITIES: ActivityDef[] = [
  {
    id: 'chaos-boss',
    name: '诸神黄昏',
    desc: '混沌魔神降临，全服联手讨伐！伤害排名瓜分神器碎片与太古灵石',
    icon: '👹',
    tag: 'hot',
    tagLabel: '全服热战',
    glowColor: 'radial-gradient(circle, rgba(220,60,60,0.2), transparent 70%)',
    wide: true,
    countdown: true,
    navigateTo: 'world-boss',
  },
  {
    id: 'spirit-summon',
    name: '万灵降世',
    desc: '远古神宠沉睡于星辰之间，消耗灵石唤醒SSR守护灵兽',
    icon: '🐉',
    tag: 'hot',
    tagLabel: 'SSR概率UP',
    glowColor: 'radial-gradient(circle, rgba(180,120,220,0.25), transparent 70%)',
    navigateTo: 'pet-summon',
  },
  {
    id: 'destiny-wheel',
    name: '天命之轮',
    desc: '每日免费转动命运齿轮，紫金装备、技能秘籍、万年灵药随机掉落',
    icon: '🎡',
    tag: 'daily',
    tagLabel: '每日免费',
    glowColor: 'radial-gradient(circle, rgba(201,168,76,0.25), transparent 70%)',
    navigateTo: 'wheel',
  },
  {
    id: 'mystic-tome',
    name: '太古秘典',
    desc: '开启洪荒秘典宝箱，获得失传绝技——逆天改命、焚天灭地、万剑归宗',
    icon: '📜',
    tag: 'new',
    tagLabel: '新活动',
    glowColor: 'radial-gradient(circle, rgba(80,180,120,0.25), transparent 70%)',
    navigateTo: 'mystic-tome',
  },
  {
    id: 'treasure-war',
    name: '夺宝奇兵',
    desc: '盟会攻防对决，攻占宝山据点，争夺稀世珍宝与盟会荣耀勋章',
    icon: '⚔️',
    tag: 'limited',
    tagLabel: '限时开启',
    glowColor: 'radial-gradient(circle, rgba(200,120,60,0.25), transparent 70%)',
    navigateTo: 'treasure-mountain',
  },
  {
    id: 'celestial-tower',
    name: '通天之塔',
    desc: '无尽试炼一百零八层，每十层一个隐藏Boss，登顶者获称号"逆天者"',
    icon: '🗼',
    tag: 'daily',
    tagLabel: '每日挑战',
    glowColor: 'radial-gradient(circle, rgba(100,140,220,0.25), transparent 70%)',
    navigateTo: 'dungeon',
  },
  {
    id: 'fortune-realm',
    name: '鸿蒙秘境',
    desc: '限时开放的上古遗迹，经验翻倍、稀有怪物刷新、隐藏宝箱遍布',
    icon: '🌀',
    tag: 'limited',
    tagLabel: '限时48h',
    glowColor: 'radial-gradient(circle, rgba(120,200,200,0.25), transparent 70%)',
    countdown: true,
    navigateTo: 'secret-realm',
  },
  {
    id: 'heavenly-arena',
    name: '乾坤擂台',
    desc: '实时跨服对决，赛季积分争霸！前十封神榜留名，专属光效加冕',
    icon: '🏟️',
    tag: 'hot',
    tagLabel: '赛季进行中',
    glowColor: 'radial-gradient(circle, rgba(220,60,120,0.25), transparent 70%)',
    navigateTo: 'team-battle',
  },
];

function useCountdown(targetMinutes: number) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const end = Date.now() + targetMinutes * 60 * 1000;
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMinutes]);
  return remaining;
}

const TAG_CLASS: Record<string, string> = {
  hot: 'actTagHot',
  new: 'actTagNew',
  daily: 'actTagDaily',
  limited: 'actTagLimited',
};

export default function ActivityPage() {
  const navigateTo = useGameStore(s => s.navigateTo);
  const bossCountdown = useCountdown(127);
  const realmCountdown = useCountdown(2880);

  const wideActivities = ACTIVITIES.filter(a => a.wide);
  const normalActivities = ACTIVITIES.filter(a => !a.wide);

  const handleClick = (act: ActivityDef) => {
    if (act.navigateTo) {
      navigateTo(act.navigateTo as any);
    } else {
      toast.info(`${act.name} 即将开放，敬请期待！`);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>活动中心</h2>
        <p className={styles.subtitle}>限时盛典 · 奇遇不断</p>
      </div>

      <div className={styles.scrollArea}>
        {/* 顶部横幅 */}
        <div className={styles.banner}>
          <div className={styles.bannerGlow} />
          <div className={styles.bannerTitle}>七世轮回 · 诸神降临</div>
          <div className={styles.bannerDesc}>参与活动赢取神器碎片、太古秘典、SSR神宠</div>
        </div>

        {/* 全服热战（宽卡片） */}
        {wideActivities.map(act => (
          <button key={act.id} className={`${styles.actCard} ${styles.actCardWide}`} onClick={() => handleClick(act)}>
            <span className={styles.actIcon}>{act.icon}</span>
            <div className={styles.actInfo}>
              <div className={styles.actName}>{act.name}</div>
              <div className={styles.actDesc}>{act.desc}</div>
              <span className={`${styles.actTag} ${styles[TAG_CLASS[act.tag]]}`}>{act.tagLabel}</span>
              {act.id === 'chaos-boss' && (
                <div className={styles.actCountdown}>距下次刷新 {bossCountdown}</div>
              )}
            </div>
            <span className={styles.actArrow}>›</span>
          </button>
        ))}

        <div className={styles.sectionLabel}>热门活动</div>

        {/* 双列活动卡片 */}
        <div className={styles.actGrid}>
          {normalActivities.map(act => (
            <button key={act.id} className={styles.actCard} onClick={() => handleClick(act)}>
              <div className={styles.actCardGlow} style={{ background: act.glowColor }} />
              <span className={styles.actIcon}>{act.icon}</span>
              <div className={styles.actName}>{act.name}</div>
              <div className={styles.actDesc}>{act.desc}</div>
              <span className={`${styles.actTag} ${styles[TAG_CLASS[act.tag]]}`}>{act.tagLabel}</span>
              {act.id === 'fortune-realm' && (
                <div className={styles.actCountdown}>剩余 {realmCountdown}</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
