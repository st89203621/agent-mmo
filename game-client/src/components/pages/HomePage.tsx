import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import { usePhaserGame } from '../../phaser/usePhaserGame';
import HomeScene from '../../phaser/HomeScene';
import {
  fetchPersonInfo, fetchExploreStatus, fetchPets, fetchCompanions,
  fetchRebirthStatus, fetchCheckinStatus, doCheckin,
  generateBackground, generateSubjectPortrait, editSubjectPortrait,
  logout,
  type PersonData, type PetData, type CompanionData,
  type PortraitTarget, type EditPortraitParams,
} from '../../services/api';
import type { ExploreStatus } from '../../types';
import { useTransparentPortrait } from '../../hooks/useTransparentPortrait';
import { useParallax3D } from '../../hooks/useParallax3D';
import ChatPanel from '../chat/ChatPanel';
import styles from './HomePage.module.css';

const ART_STYLES = [
  // ── 东方 ──
  { key: '仙侠CG插画风，高精度数字绘画', label: '仙侠CG' },
  { key: '唯美古风工笔画，线条精致清晰', label: '古风工笔' },
  { key: '国风赛璐璐动画风，色块分明轮廓锐利', label: '国风动画' },
  { key: '敦煌壁画风，矿彩质感边缘锐利', label: '敦煌壁画' },
  { key: '浮世绘和风，粗线条色块平涂', label: '浮世绘' },
  { key: '武侠写实CG风，电影级数字绘画', label: '武侠写实' },
  // ── 日韩 ──
  { key: '日系赛璐璐动漫风，线条清晰色块平涂', label: '日系动漫' },
  { key: '韩系精致半写实插画风，高饱和细腻渲染', label: '韩系插画' },
  { key: '日系唯美少女漫画风，柔光精致', label: '少女漫画' },
  { key: '新海诚光影动画风，通透色彩精致线条', label: '新海诚风' },
  // ── 欧美 ──
  { key: '欧美奇幻数字绘画风，史诗级CG插画', label: '奇幻CG' },
  { key: '美漫超英赛璐璐风，粗线条强对比', label: '美漫风' },
  { key: '暗黑哥特CG风，阴郁精致数字绘画', label: '暗黑哥特' },
  { key: '北欧神话史诗CG风，磅礴大气', label: '北欧史诗' },
  { key: 'Art Deco装饰艺术风，几何线条对比鲜明', label: '装饰艺术' },
  // ── 科幻 ──
  { key: '赛博朋克霓虹CG风，高对比发光边缘', label: '赛博朋克' },
  { key: '蒸汽朋克机械CG风，金属质感清晰', label: '蒸汽朋克' },
  { key: '太空歌剧科幻CG风，未来感金属光泽', label: '太空歌剧' },
  { key: '末日废土写实CG风，粗粝质感', label: '末日废土' },
  // ── 特色 ──
  { key: '宝石质感水晶画风，透明折射光泽锐利', label: '水晶宝石' },
  { key: '3D渲染写实风，次世代游戏CG质感', label: '3D写实' },
  { key: '洛可可宫廷华丽风，精致繁复高清', label: '洛可可' },
  { key: '暗金浮雕风，金属蚀刻高对比', label: '暗金浮雕' },
  { key: '梦幻童话插画风，柔光清透精致', label: '梦幻童话' },
];

const BG_THEMES = [
  { key: '樱花林', label: '樱花林' },
  { key: '竹海清风', label: '竹海清风' },
  { key: '星空银河', label: '星空银河' },
  { key: '雪山日出', label: '雪山日出' },
  { key: '碧海蓝天', label: '碧海蓝天' },
  { key: '紫藤花瀑', label: '紫藤花瀑' },
  { key: '秋日红枫', label: '秋日红枫' },
  { key: '月下荷塘', label: '月下荷塘' },
  { key: '云海仙境', label: '云海仙境' },
  { key: '薰衣草田', label: '薰衣草田' },
  { key: '雨后古镇', label: '雨后古镇' },
  { key: '极光冰原', label: '极光冰原' },
  { key: '桃源溪谷', label: '桃源溪谷' },
  { key: '暮色沙漠', label: '暮色沙漠' },
  { key: '萤火森林', label: '萤火森林' },
  { key: '晨雾山岚', label: '晨雾山岚' },
];

type PickerMode = 'portrait' | 'background' | 'edit' | null;

/* ── 编辑维度配置 ── */
const PERSON_DIMS = {
  hairstyle: { label: '发型', options: ['长发飘逸', '短发干练', '双马尾', '高马尾', '披肩卷发', '盘发', '半扎发', '寸头利落'] },
  expression: { label: '表情', options: ['温柔微笑', '冷酷凝视', '开朗大笑', '沉思忧郁', '傲然不屑', '害羞低眉', '坚毅自信', '邪魅一笑'] },
  clothing: { label: '服饰', options: ['华丽战甲', '飘逸长袍', '轻便皮甲', '素雅布衣', '宫廷礼服', '斗篷风衣', '武僧法衣', '龙纹锦袍'] },
  accessory: { label: '配饰', options: ['发簪玉冠', '面纱遮面', '耳坠项链', '肩甲护臂', '披风流苏', '额间宝石', '腰间佩剑', '手持法杖'] },
  pose: { label: '姿态', options: ['正面端庄', '侧身回眸', '抱臂而立', '单手托腮', '负手而立', '御剑而行', '掐诀凝气', '倚靠斜卧'] },
  hairColor: { label: '发色', options: ['乌黑亮泽', '银白如雪', '赤红似火', '金色璀璨', '湛蓝如海', '翠绿如玉', '紫罗兰色', '渐变双色'] },
} as const;

const COMPANION_DIMS = {
  expression: { label: '表情', options: ['温柔微笑', '冷酷凝视', '开朗大笑', '沉思忧郁', '傲然不屑', '害羞低眉', '坚毅自信', '邪魅一笑'] },
  clothing: { label: '服饰', options: ['华丽战甲', '飘逸长袍', '轻便皮甲', '素雅布衣', '宫廷礼服', '斗篷风衣', '武僧法衣', '龙纹锦袍'] },
  accessory: { label: '配饰', options: ['发簪玉冠', '面纱遮面', '耳坠项链', '肩甲护臂', '披风流苏', '额间宝石', '腰间佩剑', '手持法杖'] },
  pose: { label: '姿态', options: ['正面端庄', '侧身回眸', '抱臂而立', '单手托腮', '负手而立', '御剑而行', '掐诀凝气', '倚靠斜卧'] },
  hairColor: { label: '发色', options: ['乌黑亮泽', '银白如雪', '赤红似火', '金色璀璨', '湛蓝如海', '翠绿如玉', '紫罗兰色', '渐变双色'] },
} as const;

const PET_DIMS = {
  bodyColor: { label: '体色', options: ['烈焰红', '冰霜蓝', '翡翠绿', '暗影紫', '金光闪耀', '银白冰晶', '漆黑如墨', '彩虹渐变'] },
  pose: { label: '姿态', options: ['威严站立', '展翅高飞', '蜷伏休憩', '怒吼咆哮', '灵动跳跃', '回首凝望', '俯冲攻击', '温驯依偎'] },
  expression: { label: '神态', options: ['威严霸气', '灵动俏皮', '温驯忠诚', '凶猛狂暴', '高傲冷峻', '憨态可掬', '神秘深邃', '活泼好动'] },
  accessory: { label: '装饰', options: ['铠甲披挂', '灵光环绕', '宝石镶嵌', '符文刻印', '鞍具缰绳', '花环装饰', '火焰尾迹', '冰晶覆体'] },
} as const;

type EditDims = Record<string, { label: string; options: readonly string[] }>;

function getEditDims(target: PortraitTarget): EditDims {
  switch (target) {
    case 'companion': return COMPANION_DIMS;
    case 'pet': return PET_DIMS;
    default: return PERSON_DIMS;
  }
}

interface HomeData {
  person: PersonData | null;
  explore: ExploreStatus | null;
  rebirthInfo: { currentWorldIndex: number; currentBook: string; totalRebirths: number } | null;
  checkin: { todayChecked: boolean; consecutiveDays: number; totalDays: number } | null;
  pets: PetData[];
  companions: CompanionData[];
}

export default function HomePage() {
  const { navigateTo, currentBookWorld } = useGameStore();
  const { playerName, gold, diamond, clearPlayer } = usePlayerStore();
  const phaserRef = useRef<HTMLDivElement>(null);
  const portraitZoneRef = useRef<HTMLElement>(null);
  usePhaserGame(phaserRef, [HomeScene]);
  const parallax = useParallax3D(portraitZoneRef);

  const [data, setData] = useState<HomeData>({
    person: null, explore: null, rebirthInfo: null, checkin: null, pets: [], companions: [],
  });
  const [loading, setLoading] = useState(true);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingBg, setGeneratingBg] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0].key);
  const [selectedTheme, setSelectedTheme] = useState(BG_THEMES[0].key);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editSelections, setEditSelections] = useState<Record<string, string | undefined>>({});
  const [editCustom, setEditCustom] = useState('');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── 多主体立绘切换 ── */
  const [activeSubject, setActiveSubject] = useState<PortraitTarget>('person');
  const [portraitUrls, setPortraitUrls] = useState<Record<string, string | null>>({ person: null });

  const activePortraitUrl = (() => {
    if (activeSubject === 'person') return portraitUrls.person ?? null;
    if (activeSubject === 'companion') {
      const comp = data.companions[0];
      return comp ? (portraitUrls[`comp_${comp.id}`] ?? null) : null;
    }
    const pet = data.pets[0];
    return pet ? (portraitUrls[`pet_${pet.id}`] ?? null) : null;
  })();

  const activeTargetId = (() => {
    if (activeSubject === 'companion') return data.companions[0]?.id;
    if (activeSubject === 'pet') return data.pets[0]?.id;
    return undefined;
  })();

  const activeLabel = (() => {
    if (activeSubject === 'companion') return data.companions[0]?.name ?? '灵侣';
    if (activeSubject === 'pet') return data.pets[0]?.nickname ?? '宠物';
    return data.person?.name || playerName || '无名侠客';
  })();

  /* ── 事件处理 ── */
  const handleNamePointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => setShowLogoutConfirm(true), 800);
  }, []);
  const handleNamePointerUp = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);
  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(false);
    clearPlayer();
    logout().catch(() => {});
  }, [clearPlayer]);

  useEffect(() => () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }, []);

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
        pets,
        companions,
      });
      // 初始化各主体已有的立绘URL
      const urls: Record<string, string | null> = {};
      urls.person = p?.portraitUrl ?? null;
      pets.forEach((pet) => { if (pet.portraitUrl) urls[`pet_${pet.id}`] = pet.portraitUrl; });
      companions.forEach((c) => { if (c.portraitUrl) urls[`comp_${c.id}`] = c.portraitUrl; });
      setPortraitUrls(urls);
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
    } catch { toast.error('签到失败'); }
  }, [data.checkin]);

  /* ── 统一立绘生成（角色/灵侣/宠物） ── */
  const handleGenerateSubject = useCallback(async (style: string) => {
    if (generating) return;
    setGenerating(true);
    setPickerMode(null);
    try {
      const res = await generateSubjectPortrait({ target: activeSubject, targetId: activeTargetId, style });
      const key = activeSubject === 'person' ? 'person'
        : activeSubject === 'companion' ? `comp_${activeTargetId}` : `pet_${activeTargetId}`;
      setPortraitUrls((prev) => ({ ...prev, [key]: res.portraitUrl }));
      toast.success('立绘生成完成');
    } catch { toast.error('立绘生成失败'); }
    setGenerating(false);
  }, [generating, activeSubject, activeTargetId]);

  const handleGenerateBg = useCallback(async (theme: string) => {
    if (generatingBg) return;
    setGeneratingBg(true);
    setPickerMode(null);
    try {
      const res = await generateBackground({ theme });
      setBgUrl(res.bgUrl);
      toast.success('背景生成完成');
    } catch { toast.error('背景生成失败'); }
    setGeneratingBg(false);
  }, [generatingBg]);

  /* ── 统一立绘编辑 ── */
  const handleEditPortrait = useCallback(async () => {
    if (generating) return;
    const params: EditPortraitParams = {
      target: activeSubject,
      targetId: activeTargetId,
      ...editSelections,
      custom: editCustom || undefined,
    };
    const hasAny = Object.entries(params).some(([k, v]) => k !== 'target' && k !== 'targetId' && v);
    if (!hasAny) { toast.error('请至少选择一项调整'); return; }

    setGenerating(true);
    setPickerMode(null);
    try {
      const res = await editSubjectPortrait(params);
      const key = activeSubject === 'person' ? 'person'
        : activeSubject === 'companion' ? `comp_${activeTargetId}`
        : `pet_${activeTargetId}`;
      setPortraitUrls((prev) => ({ ...prev, [key]: res.portraitUrl }));
      setEditSelections({});
      setEditCustom('');
      toast.success('立绘调整完成');
    } catch { toast.error('立绘调整失败'); }
    setGenerating(false);
  }, [generating, activeSubject, activeTargetId, editSelections, editCustom]);

  const toggleEditSelection = useCallback((dim: string, value: string) => {
    setEditSelections((prev) => ({ ...prev, [dim]: prev[dim] === value ? undefined : value }));
  }, []);

  const transparentPortrait = useTransparentPortrait(activePortraitUrl);

  const person = data.person;
  const worldLabel = data.rebirthInfo ? `第${data.rebirthInfo.currentWorldIndex + 1}世` : '';
  const bookLabel = data.rebirthInfo?.currentBook || currentBookWorld?.title || '';
  const hasBg = !!bgUrl;

  /* 可切换的主体列表 */
  const subjects: { key: PortraitTarget; label: string; available: boolean }[] = [
    { key: 'person', label: '角色', available: true },
    { key: 'companion', label: data.companions[0]?.name ?? '灵侣', available: data.companions.length > 0 },
    { key: 'pet', label: data.pets[0]?.nickname ?? '宠物', available: data.pets.length > 0 },
  ];

  const editDims = getEditDims(activeSubject);

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
      {hasBg && <div className={styles.bgVignette} />}
      <div ref={phaserRef} className={`${styles.phaserLayer} ${hasBg ? styles.phaserDim : ''}`} />

      {/* HUD */}
      <div className={styles.hud}>
        {/* 第一行：世界定位 + 资源 */}
        <div className={styles.row1}>
          <span className={styles.worldTag}>
            {worldLabel}{worldLabel && bookLabel ? ' · ' : ''}{bookLabel}
          </span>
          <div className={styles.row1Right}>
            <span className={styles.coinBadge}><i className={styles.coinDot} />{gold}</span>
            <span className={styles.diamondBadge}><i className={styles.diamondDot} />{diamond}</span>
            {data.checkin && !data.checkin.todayChecked && (
              <button className={styles.checkinBtn} onClick={handleCheckin}>
                签到·{data.checkin.consecutiveDays + 1}天
              </button>
            )}
            {data.checkin?.todayChecked && (
              <span className={styles.checkinDone}>已签·{data.checkin.consecutiveDays}天</span>
            )}
          </div>
        </div>

        {/* 第二行：角色名 */}
        <div className={styles.row2}>
          <h1
            className={styles.charName}
            onClick={() => navigateTo(activeSubject === 'pet' ? 'pet' : activeSubject === 'companion' ? 'companion' : 'character')}
            onPointerDown={handleNamePointerDown}
            onPointerUp={handleNamePointerUp}
            onPointerLeave={handleNamePointerUp}
          >
            {activeLabel}
          </h1>
        </div>

        {/* 第三行：属性 + 行动力 */}
        <div className={styles.row3}>
          {person?.basicProperty ? (
            <div className={styles.statStrip}>
              <StatMini label="攻" value={person.basicProperty.physicsAttack + person.basicProperty.magicAttack} />
              <StatMini label="防" value={person.basicProperty.physicsDefense + person.basicProperty.magicDefense} />
              <StatMini label="速" value={person.basicProperty.speed} />
              <StatMini label="HP" value={person.basicProperty.hp} />
            </div>
          ) : <div />}
          {data.explore && (
            <div className={styles.apGroup}>
              <span className={styles.apLabel}>行动力</span>
              <div className={styles.apTrack}>
                <div className={styles.apFill} style={{ width: `${(data.explore.actionPoints / data.explore.maxPoints) * 100}%` }} />
              </div>
              <span className={styles.apText}>{data.explore.actionPoints}/{data.explore.maxPoints}</span>
            </div>
          )}
        </div>

        {/* 立绘区域 — 3D拖拽旋转 */}
        <section className={styles.portraitZone} ref={portraitZoneRef}>
          <div className={styles.portraitDepthContainer}>
            {/* 底层投影 — 旋转时阴影向反方向偏移 */}
            {transparentPortrait && (
              <div
                className={styles.portraitShadowLayer}
                style={{
                  transform: `translateX(${-parallax.translateX * 0.6}px) scale(0.92)`,
                  opacity: 0.3 + parallax.intensity * 0.3,
                }}
              />
            )}
            {/* 主体立绘 */}
            <div
              className={`${styles.portraitFrame} ${activePortraitUrl ? styles.alive : ''}`}
              style={{
                transform: `perspective(600px) rotateY(${parallax.rotateY}deg) rotateX(${parallax.rotateX}deg) translateX(${parallax.translateX}px)`,
              }}
            >
              {transparentPortrait ? (
                <img src={transparentPortrait} alt="立绘" className={styles.portraitImg} />
              ) : (
                <div className={styles.portraitPlaceholder}>
                  <span className={styles.portraitChar}>
                    {activeLabel.charAt(0) || '侠'}
                  </span>
                </div>
              )}
              {/* 动态边光 — 旋转时在边缘产生高光 */}
              {transparentPortrait && (
                <div
                  className={styles.portraitEdgeLight}
                  style={{
                    backgroundPosition: `${50 - parallax.rotateY * 2}% 50%`,
                    opacity: parallax.intensity * 0.6,
                  }}
                />
              )}
            </div>
            {/* 前景高光层 — 反向偏移制造纵深 */}
            {transparentPortrait && (
              <div
                className={styles.portraitHighlightLayer}
                style={{
                  transform: `translateX(${-parallax.translateX * 1.2}px)`,
                  opacity: 0.05 + parallax.intensity * 0.15,
                }}
              />
            )}
          </div>
          {/* 聊天面板 — 悬浮在立绘上方，不干扰拖拽 */}
          <ChatPanel />

          {/* 底部操作栏：主体切换 + 生成/编辑按钮 */}
          <div className={styles.bottomBar}>
            {/* 主体切换标签 */}
            <div className={styles.subjectTabs}>
              {subjects.filter((s) => s.available).map((s) => (
                <button
                  key={s.key}
                  className={`${styles.subjectTab} ${activeSubject === s.key ? styles.subjectTabActive : ''}`}
                  onClick={() => { setActiveSubject(s.key); setEditSelections({}); setEditCustom(''); }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* 操作按钮 */}
            <div className={styles.actionGroup}>
              {generating ? (
                <span className={styles.genStatus}>生成中…</span>
              ) : (
                <>
                  <button
                    className={styles.actionBtn}
                    onClick={() => activePortraitUrl ? setPickerMode('portrait') : handleGenerateSubject(selectedStyle)}
                  >
                    {activePortraitUrl ? '换立绘' : '生成立绘'}
                  </button>
                  {activePortraitUrl && (
                    <button className={styles.actionBtn} onClick={() => setPickerMode('edit')}>
                      调整
                    </button>
                  )}
                </>
              )}
              {generatingBg ? (
                <span className={styles.genStatus}>…</span>
              ) : (
                <button className={styles.actionBtn} onClick={() => setPickerMode('background')}>
                  换背景
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 退出登录确认 */}
      {showLogoutConfirm && (
        <div className={styles.pickerOverlay} onClick={() => setShowLogoutConfirm(false)}>
          <div className={`${styles.pickerPanel} ${styles.confirmPanel}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.pickerTitle}>退出登录</h3>
            <p className={styles.pickerHint}>确定要退出当前账号吗？</p>
            <div className={styles.confirmActions}>
              <button className={`${styles.pickerItem} ${styles.confirmBtn}`} onClick={() => setShowLogoutConfirm(false)}>取消</button>
              <button className={`${styles.pickerConfirm} ${styles.confirmBtn}`} onClick={handleLogout}>退出</button>
            </div>
          </div>
        </div>
      )}

      {/* 风格选择面板 */}
      {pickerMode === 'portrait' && (
        <div className={styles.pickerOverlay} onClick={() => setPickerMode(null)}>
          <div className={styles.pickerPanel} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.pickerTitle}>选择立绘风格</h3>
            <p className={styles.pickerHint}>为「{activeLabel}」生成对应风格立绘</p>
            <div className={styles.pickerGrid}>
              {ART_STYLES.map((s) => (
                <button
                  key={s.key}
                  className={`${styles.pickerItem} ${selectedStyle === s.key ? styles.pickerActive : ''}`}
                  onClick={() => setSelectedStyle(s.key)}
                >{s.label}</button>
              ))}
            </div>
            <button className={styles.pickerConfirm} onClick={() => handleGenerateSubject(selectedStyle)}>
              生成「{ART_STYLES.find((s) => s.key === selectedStyle)?.label}」立绘
            </button>
          </div>
        </div>
      )}

      {/* 背景选择面板 */}
      {pickerMode === 'background' && (
        <div className={styles.pickerOverlay} onClick={() => setPickerMode(null)}>
          <div className={styles.pickerPanel} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.pickerTitle}>选择背景主题</h3>
            <p className={styles.pickerHint}>选择一个清新的场景主题</p>
            <div className={styles.pickerGrid}>
              {BG_THEMES.map((t) => (
                <button
                  key={t.key}
                  className={`${styles.pickerItem} ${selectedTheme === t.key ? styles.pickerActive : ''}`}
                  onClick={() => setSelectedTheme(t.key)}
                >{t.label}</button>
              ))}
            </div>
            <button className={styles.pickerConfirm} onClick={() => handleGenerateBg(selectedTheme)}>
              生成「{BG_THEMES.find((t) => t.key === selectedTheme)?.label}」背景
            </button>
          </div>
        </div>
      )}

      {/* 立绘编辑面板 */}
      {pickerMode === 'edit' && (
        <div className={styles.pickerOverlay} onClick={() => setPickerMode(null)}>
          <div className={`${styles.pickerPanel} ${styles.editPanel}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.pickerTitle}>调整「{activeLabel}」立绘</h3>
            <p className={styles.pickerHint}>选择想要调整的维度，也可输入自定义描述</p>
            <div className={styles.editScroll}>
              {Object.entries(editDims).map(([dim, cfg]) => (
                <div key={dim} className={styles.editSection}>
                  <span className={styles.editDimLabel}>{cfg.label}</span>
                  <div className={styles.editOptionRow}>
                    {cfg.options.map((opt) => (
                      <button
                        key={opt}
                        className={`${styles.editOption} ${editSelections[dim] === opt ? styles.editOptionActive : ''}`}
                        onClick={() => toggleEditSelection(dim, opt)}
                      >{opt}</button>
                    ))}
                  </div>
                </div>
              ))}
              <div className={styles.editSection}>
                <span className={styles.editDimLabel}>自定义描述</span>
                <input
                  className={styles.editInput}
                  placeholder="例：增加一道伤疤、换成红色眼瞳…"
                  value={editCustom}
                  onChange={(e) => setEditCustom(e.target.value)}
                />
              </div>
            </div>
            <button className={styles.pickerConfirm} onClick={handleEditPortrait}>应用调整</button>
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
