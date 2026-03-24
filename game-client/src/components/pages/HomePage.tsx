import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import { usePhaserGame } from '../../phaser/usePhaserGame';
import HomeScene from '../../phaser/HomeScene';
import {
  fetchPersonInfo, fetchExploreStatus, fetchPets, fetchCompanions,
  fetchRebirthStatus, fetchCheckinStatus, doCheckin, generatePortrait,
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

export default function HomePage() {
  const { navigateTo, currentBookWorld } = useGameStore();
  const { playerName, gold, diamond } = usePlayerStore();
  const phaserRef = useRef<HTMLDivElement>(null);
  usePhaserGame(phaserRef, [HomeScene]);

  const [data, setData] = useState<HomeData>({
    person: null, explore: null, rebirthInfo: null, checkin: null, pet: null, companion: null,
  });
  const [loading, setLoading] = useState(true);
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [generatingPortrait, setGeneratingPortrait] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchPersonInfo().catch(() => null),
      fetchExploreStatus().catch(() => null),
      fetchRebirthStatus().catch(() => null),
      fetchCheckinStatus().catch(() => null),
      fetchPets().catch(() => ({ pets: [] })),
      fetchCompanions().catch(() => ({ companions: [] })),
    ]).then(([person, explore, rebirth, checkin, petRes, compRes]) => {
      const p = person as PersonData | null;
      const pets = (petRes as { pets: PetData[] })?.pets || [];
      const companions = (compRes as { companions: CompanionData[] })?.companions || [];
      setData({
        person: p,
        explore: explore as ExploreStatus | null,
        rebirthInfo: rebirth as HomeData['rebirthInfo'],
        checkin: checkin as HomeData['checkin'],
        pet: pets[0] || null,
        companion: companions[0] || null,
      });
      if (p?.portraitUrl) setPortraitUrl(p.portraitUrl);
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

  const handleGeneratePortrait = useCallback(async () => {
    if (generatingPortrait) return;
    setGeneratingPortrait(true);
    try {
      const res = await generatePortrait({ force: !!portraitUrl });
      setPortraitUrl(res.portraitUrl);
      toast.success(portraitUrl ? '立绘已更新' : '立绘生成成功');
    } catch {
      toast.error('立绘生成失败');
    }
    setGeneratingPortrait(false);
  }, [generatingPortrait, portraitUrl]);

  const person = data.person;
  const worldLabel = data.rebirthInfo
    ? `第${data.rebirthInfo.currentWorldIndex + 1}世`
    : '';
  const bookLabel = data.rebirthInfo?.currentBook || currentBookWorld?.title || '';

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

        {/* 角色立绘区域 */}
        <section className={styles.portraitZone}>
          <div className={styles.portraitFrame} onClick={() => navigateTo('character')}>
            {portraitUrl ? (
              <img src={portraitUrl} alt="角色立绘" className={styles.portraitImg} />
            ) : (
              <div className={styles.portraitPlaceholder}>
                <span className={styles.portraitChar}>
                  {person?.name?.charAt(0) || playerName?.charAt(0) || '侠'}
                </span>
              </div>
            )}
          </div>

          {/* 生成/更换立绘按钮 */}
          <button
            className={styles.portraitGenBtn}
            onClick={handleGeneratePortrait}
            disabled={generatingPortrait}
          >
            {generatingPortrait ? '绘制中…' : portraitUrl ? '重绘' : '生成立绘'}
          </button>
        </section>

        {/* 角色信息 */}
        <section className={styles.infoZone} onClick={() => navigateTo('character')}>
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

        {/* 宠物/灵侣 */}
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

        {/* 行动力 */}
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
      </div>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}
