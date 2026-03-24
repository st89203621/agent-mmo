import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import { usePhaserGame } from '../../phaser/usePhaserGame';
import HomeScene from '../../phaser/HomeScene';
import {
  fetchPersonInfo, fetchExploreStatus, fetchPets, fetchCompanions,
  fetchRebirthStatus, fetchCheckinStatus, doCheckin,
  type PersonData, type PetData, type CompanionData,
} from '../../services/api';
import type { ExploreStatus } from '../../types';
import styles from './HomePage.module.css';

interface HomeData {
  person: PersonData | null;
  explore: ExploreStatus | null;
  rebirthInfo: { currentWorldIndex: number; currentBook: string; totalRebirths: number } | null;
  checkin: { todayChecked: boolean; consecutiveDays: number; totalDays: number } | null;
  pet: PetData | null;
  companion: CompanionData | null;
}

/** 快捷入口 */
const ACTIONS = [
  { id: 'story', label: '剧情', icon: '📜', desc: '续写命运' },
  { id: 'explore', label: '探索', icon: '🗺️', desc: '寻访奇遇' },
  { id: 'dungeon', label: '副本', icon: '⚔️', desc: '挑战试炼' },
  { id: 'quest', label: '任务', icon: '📋', desc: '悬赏接引' },
  { id: 'book-world', label: '书库', icon: '📚', desc: '入书世界' },
  { id: 'inventory', label: '背包', icon: '🎒', desc: '整理行囊' },
] as const;

export default function HomePage() {
  const { navigateTo, currentBookWorld } = useGameStore();
  const { playerName, gold, diamond } = usePlayerStore();
  const phaserRef = useRef<HTMLDivElement>(null);
  usePhaserGame(phaserRef, [HomeScene]);

  const [data, setData] = useState<HomeData>({
    person: null, explore: null, rebirthInfo: null, checkin: null, pet: null, companion: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchPersonInfo().catch(() => null),
      fetchExploreStatus().catch(() => null),
      fetchRebirthStatus().catch(() => null),
      fetchCheckinStatus().catch(() => null),
      fetchPets().catch(() => ({ pets: [] })),
      fetchCompanions().catch(() => ({ companions: [] })),
    ]).then(([person, explore, rebirth, checkin, petRes, compRes]) => {
      const pets = (petRes as { pets: PetData[] })?.pets || [];
      const companions = (compRes as { companions: CompanionData[] })?.companions || [];
      setData({
        person: person as PersonData | null,
        explore: explore as ExploreStatus | null,
        rebirthInfo: rebirth as HomeData['rebirthInfo'],
        checkin: checkin as HomeData['checkin'],
        pet: pets[0] || null,
        companion: companions[0] || null,
      });
      setLoading(false);
    });
  }, []);

  const handleCheckin = useCallback(async () => {
    if (data.checkin?.todayChecked) return;
    try {
      const res = await doCheckin();
      setData((prev) => ({ ...prev, checkin: res }));
      toast.reward('签到成功！');
    } catch {
      toast.error('签到失败');
    }
  }, [data.checkin]);

  const person = data.person;
  const worldLabel = data.rebirthInfo
    ? `第${data.rebirthInfo.currentWorldIndex + 1}世`
    : '';
  const bookLabel = data.rebirthInfo?.currentBook || currentBookWorld?.title || '';
  const charInitial = person?.name?.charAt(0) || playerName?.charAt(0) || '侠';

  if (loading) {
    return (
      <div className={styles.page}>
        <div ref={phaserRef} className={styles.phaserLayer} />
        <div className={styles.loadingCenter}>七世轮回书</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Phaser 粒子背景 */}
      <div ref={phaserRef} className={styles.phaserLayer} />

      {/* HUD 层 */}
      <div className={styles.hud}>
        {/* 顶部栏: 货币 + 签到 */}
        <header className={styles.topBar}>
          <div className={styles.currencyGroup}>
            <span className={styles.coinBadge}>
              <i className={styles.coinDot} />
              {gold}
            </span>
            <span className={styles.diamondBadge}>
              <i className={styles.diamondDot} />
              {diamond}
            </span>
          </div>
          {data.checkin && !data.checkin.todayChecked && (
            <button className={styles.checkinBtn} onClick={handleCheckin}>
              签到 · 第{data.checkin.consecutiveDays + 1}天
            </button>
          )}
          {data.checkin?.todayChecked && (
            <span className={styles.checkinDone}>已签到 · {data.checkin.consecutiveDays}天</span>
          )}
        </header>

        {/* 角色区域 */}
        <section className={styles.characterZone} onClick={() => navigateTo('character')}>
          {/* 角色头像 */}
          <div className={styles.avatarRing}>
            <div className={styles.avatarInner}>
              <span className={styles.avatarChar}>{charInitial}</span>
            </div>
          </div>

          {/* 角色名和世界信息 */}
          <h1 className={styles.charName}>{person?.name || playerName || '无名侠客'}</h1>
          {(worldLabel || bookLabel) && (
            <p className={styles.charTitle}>
              {worldLabel}{worldLabel && bookLabel ? ' · ' : ''}{bookLabel}
            </p>
          )}

          {/* 属性条 */}
          {person?.basicProperty && (
            <div className={styles.statStrip}>
              <StatMini label="攻" value={person.basicProperty.physicsAttack + person.basicProperty.magicAttack} />
              <StatMini label="防" value={person.basicProperty.physicsDefense + person.basicProperty.magicDefense} />
              <StatMini label="速" value={person.basicProperty.speed} />
              <StatMini label="HP" value={person.basicProperty.hp} />
            </div>
          )}
        </section>

        {/* 宠物 / 灵侣 浮窗 */}
        <div className={styles.companionRow}>
          {data.pet && (
            <button className={styles.companionChip} onClick={() => navigateTo('pet')}>
              {data.pet.aiImageUrl ? (
                <img src={data.pet.aiImageUrl} alt={data.pet.nickname} className={styles.companionImg} />
              ) : (
                <span className={styles.companionIcon}>🐾</span>
              )}
              <span className={styles.companionLabel}>{data.pet.nickname || '宠物'}</span>
            </button>
          )}
          {data.companion && (
            <button className={styles.companionChip} onClick={() => navigateTo('companion')}>
              <span className={styles.companionIcon}>💫</span>
              <span className={styles.companionLabel}>{data.companion.name}</span>
              <span className={styles.companionLevel}>Lv.{data.companion.level}</span>
            </button>
          )}
        </div>

        {/* 行动力指示器 */}
        {data.explore && (
          <div className={styles.apBar}>
            <span className={styles.apLabel}>行动力</span>
            <div className={styles.apTrack}>
              <div
                className={styles.apFill}
                style={{ width: `${(data.explore.actionPoints / data.explore.maxPoints) * 100}%` }}
              />
            </div>
            <span className={styles.apText}>
              {data.explore.actionPoints}/{data.explore.maxPoints}
            </span>
          </div>
        )}

        {/* 底部快捷操作 */}
        <nav className={styles.actionRing}>
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              className={styles.actionBtn}
              onClick={() => navigateTo(a.id as Parameters<typeof navigateTo>[0])}
            >
              <span className={styles.actionIcon}>{a.icon}</span>
              <span className={styles.actionName}>{a.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

/** 迷你属性值 */
function StatMini({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}
