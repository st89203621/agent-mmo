import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import { usePhaserGame } from '../../phaser/usePhaserGame';
import HomeScene from '../../phaser/HomeScene';
import {
  fetchPersonInfo, fetchExploreStatus, fetchPets, fetchCompanions,
  fetchRebirthStatus, fetchCheckinStatus, doCheckin, generatePortrait, generateBackground,
  type PersonData, type PetData, type CompanionData,
} from '../../services/api';
import type { ExploreStatus } from '../../types';
import { useTransparentPortrait } from '../../hooks/useTransparentPortrait';
import styles from './HomePage.module.css';

const ART_STYLES = [
  { key: '仙侠水墨风', label: '水墨仙侠' },
  { key: '赛博朋克风', label: '赛博朋克' },
  { key: '日系动漫风', label: '日系动漫' },
  { key: '欧美奇幻油画风', label: '奇幻油画' },
  { key: '像素复古风', label: '像素复古' },
  { key: '暗黑哥特风', label: '暗黑哥特' },
  { key: '唯美古风工笔画', label: '古风工笔' },
  { key: '蒸汽朋克机械风', label: '蒸汽朋克' },
  { key: '克苏鲁神话风', label: '克苏鲁' },
  { key: '浮世绘和风', label: '浮世绘' },
  { key: '北欧神话史诗风', label: '北欧史诗' },
  { key: '敦煌壁画风', label: '敦煌壁画' },
  { key: '梦幻童话风', label: '梦幻童话' },
  { key: '末日废土风', label: '末日废土' },
  { key: '新艺术运动风', label: '新艺术' },
  { key: '波普艺术风', label: '波普艺术' },
];

type PickerMode = 'portrait' | 'background' | null;

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
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingBg, setGeneratingBg] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0].key);

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
      if (p?.bgUrl) setBgUrl(p.bgUrl);
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

  const handleGenerate = useCallback(async (style: string) => {
    if (generating) return;
    setGenerating(true);
    setPickerMode(null);
    try {
      const res = await generatePortrait({ style, force: !!portraitUrl });
      setPortraitUrl(res.portraitUrl);
      toast.success('立绘生成完成');
    } catch {
      toast.error('立绘生成失败');
    }
    setGenerating(false);
  }, [generating, portraitUrl]);

  const handleGenerateBg = useCallback(async (style: string) => {
    if (generatingBg) return;
    setGeneratingBg(true);
    setPickerMode(null);
    try {
      const res = await generateBackground({ style });
      setBgUrl(res.bgUrl);
      toast.success('背景生成完成');
    } catch {
      toast.error('背景生成失败');
    }
    setGeneratingBg(false);
  }, [generatingBg]);

  const transparentPortrait = useTransparentPortrait(portraitUrl);

  const person = data.person;
  const worldLabel = data.rebirthInfo ? `第${data.rebirthInfo.currentWorldIndex + 1}世` : '';
  const bookLabel = data.rebirthInfo?.currentBook || currentBookWorld?.title || '';
  const hasBg = !!bgUrl;

  if (loading) {
    return (
      <div className={styles.page}>
        <div ref={phaserRef} className={styles.phaserLayer} />
        <div className={styles.loadingCenter}>七世轮回书</div>
      </div>
    );
  }

  return (
    <div
      className={styles.page}
      style={hasBg ? { backgroundImage: `url(${bgUrl})` } : undefined}
    >
      {/* 背景暗角遮罩 */}
      {hasBg && <div className={styles.bgVignette} />}

      {/* Phaser 粒子（有背景时降低存在感） */}
      <div ref={phaserRef} className={`${styles.phaserLayer} ${hasBg ? styles.phaserDim : ''}`} />

      {/* HUD */}
      <div className={styles.hud}>
        {/* 顶栏 */}
        <header className={styles.topBar}>
          <div className={styles.currencyGroup}>
            <span className={styles.coinBadge}><i className={styles.coinDot} />{gold}</span>
            <span className={styles.diamondBadge}><i className={styles.diamondDot} />{diamond}</span>
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

        {/* 立绘 */}
        <section className={styles.portraitZone}>
          <div
            className={`${styles.portraitFrame} ${portraitUrl ? styles.alive : ''}`}
            onClick={() => navigateTo('character')}
          >
            {transparentPortrait ? (
              <img src={transparentPortrait} alt="立绘" className={styles.portraitImg} />
            ) : (
              <div className={styles.portraitPlaceholder}>
                <span className={styles.portraitChar}>
                  {person?.name?.charAt(0) || playerName?.charAt(0) || '侠'}
                </span>
              </div>
            )}
            {portraitUrl && <div className={styles.shineOverlay} />}
          </div>

          <div className={styles.portraitActions}>
            {generating ? (
              <div className={styles.genStatus}>立绘生成中…</div>
            ) : (
              <button
                className={styles.styleToggle}
                onClick={() => portraitUrl ? setPickerMode('portrait') : handleGenerate(selectedStyle)}
              >
                {portraitUrl ? '切换立绘' : '生成立绘'}
              </button>
            )}
            {generatingBg ? (
              <div className={styles.genStatus}>背景生成中…</div>
            ) : (
              <button className={styles.styleToggle} onClick={() => setPickerMode('background')}>
                切换背景
              </button>
            )}
          </div>
        </section>

        {/* 角色信息 */}
        <section className={styles.infoZone} onClick={() => navigateTo('character')}>
          <h1 className={styles.charName}>{person?.name || playerName || '无名侠客'}</h1>
          {(worldLabel || bookLabel) && (
            <p className={styles.charTitle}>
              {worldLabel}{worldLabel && bookLabel ? ' · ' : ''}{bookLabel}
            </p>
          )}
          {person?.basicProperty && (
            <div className={styles.statStrip}>
              <StatMini label="攻" value={person.basicProperty.physicsAttack + person.basicProperty.magicAttack} />
              <StatMini label="防" value={person.basicProperty.physicsDefense + person.basicProperty.magicDefense} />
              <StatMini label="速" value={person.basicProperty.speed} />
              <StatMini label="HP" value={person.basicProperty.hp} />
            </div>
          )}
        </section>

        {/* 伴侣 */}
        <div className={styles.companionRow}>
          {data.pet && (
            <button className={styles.companionChip} onClick={() => navigateTo('pet')}>
              {data.pet.aiImageUrl
                ? <img src={data.pet.aiImageUrl} alt={data.pet.nickname} className={styles.companionImg} />
                : <span className={styles.companionIcon}>🐾</span>}
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
              <div className={styles.apFill} style={{ width: `${(data.explore.actionPoints / data.explore.maxPoints) * 100}%` }} />
            </div>
            <span className={styles.apText}>{data.explore.actionPoints}/{data.explore.maxPoints}</span>
          </div>
        )}
      </div>

      {/* 风格选择面板 */}
      {pickerMode && (
        <div className={styles.pickerOverlay} onClick={() => setPickerMode(null)}>
          <div className={styles.pickerPanel} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.pickerTitle}>
              {pickerMode === 'portrait' ? '选择立绘风格' : '选择背景风格'}
            </h3>
            <p className={styles.pickerHint}>
              {pickerMode === 'portrait' ? '立绘与背景将同步生成' : '仅重新生成背景图'}
            </p>
            <div className={styles.pickerGrid}>
              {ART_STYLES.map((s) => (
                <button
                  key={s.key}
                  className={`${styles.pickerItem} ${selectedStyle === s.key ? styles.pickerActive : ''}`}
                  onClick={() => setSelectedStyle(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              className={styles.pickerConfirm}
              onClick={() => pickerMode === 'portrait'
                ? handleGenerate(selectedStyle)
                : handleGenerateBg(selectedStyle)
              }
            >
              {pickerMode === 'portrait'
                ? `生成「${ART_STYLES.find((s) => s.key === selectedStyle)?.label}」立绘`
                : `生成「${ART_STYLES.find((s) => s.key === selectedStyle)?.label}」背景`
              }
            </button>
          </div>
        </div>
      )}
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
