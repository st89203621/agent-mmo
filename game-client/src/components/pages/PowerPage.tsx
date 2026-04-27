import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import {
  fetchPersonInfo,
  fetchPets,
  fetchCompanions,
  type PersonData,
  type PetData,
  type CompanionData,
} from '../../services/api';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface PowerSource {
  key: string;
  icon: string;
  label: string;
  value: number;
  tone?: 'red' | 'jade' | 'purple' | 'azure';
  pageId?: import('../../types').PageId;
}

interface ImproveTip {
  no: string;
  text: string;
  hint: string;
  tone: 'red' | 'gold' | 'purple';
  goto: import('../../types').PageId;
}

const TIPS: ImproveTip[] = [
  {
    no: '1',
    text: '强 化 装 备 · 战 力 预 估 + 280',
    hint: '前往神匠铺 · 装备打磨与附魔',
    tone: 'red',
    goto: 'enchant',
  },
  {
    no: '2',
    text: '出 战 神 宠 · 战 力 预 估 + 200',
    hint: '挑选高资质宝宝出战 · 提升属性',
    tone: 'gold',
    goto: 'pet',
  },
  {
    no: '3',
    text: '修 习 心 法 · 战 力 预 估 + 80',
    hint: '解锁与升级三道心法',
    tone: 'purple',
    goto: 'skill-tree',
  },
];

function basicPower(p: PersonData['basicProperty'] | undefined): number {
  if (!p) return 0;
  return Math.round(
    (p.physicsAttack || 0) +
      (p.magicAttack || 0) +
      (p.physicsDefense || 0) * 0.6 +
      (p.magicDefense || 0) * 0.6 +
      (p.hp || 0) * 0.05 +
      (p.mp || 0) * 0.05 +
      (p.speed || 0) * 0.4 +
      (p.bonusAttack || 0) +
      (p.bonusDefense || 0) * 0.6 +
      (p.agility || 0) * 0.5,
  );
}

function petPower(pet: PetData): number {
  return Math.round(
    (pet.power || 0) +
      (pet.magicPower || 0) +
      (pet.endurance || 0) * 0.6 +
      (pet.constitution || 0) * 0.4 +
      (pet.agile || 0) * 0.4 +
      (pet.tier || 0) * 30,
  );
}

function companionPower(_c: CompanionData): number {
  return 80;
}

export default function PowerPage() {
  usePageBackground(PAGE_BG.POWER);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [person, setPerson] = useState<PersonData | null>(null);
  const [pets, setPets] = useState<PetData[]>([]);
  const [companions, setCompanions] = useState<CompanionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([fetchPersonInfo(), fetchPets(), fetchCompanions()])
      .then(([p, pt, cm]) => {
        if (p.status === 'fulfilled') setPerson(p.value);
        if (pt.status === 'fulfilled') setPets(pt.value.pets || []);
        if (cm.status === 'fulfilled') setCompanions(cm.value.companions || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const sources: PowerSource[] = useMemo(() => {
    const base = basicPower(person?.basicProperty);
    const petsTotal = pets.reduce((s, p) => s + petPower(p), 0);
    const cmTotal = companions.reduce((s, c) => s + companionPower(c), 0);
    return [
      { key: 'self', icon: '本', label: '基 础 属 性', value: base, pageId: 'character' },
      { key: 'pet', icon: '宠', label: '神 宠', value: petsTotal, tone: 'red', pageId: 'pet' },
      { key: 'cm', icon: '伴', label: '红 颜', value: cmTotal, tone: 'purple', pageId: 'companion' },
      { key: 'eq', icon: '装', label: '装 备', value: 0, pageId: 'character' },
      { key: 'sk', icon: '术', label: '心 法', value: 0, tone: 'azure', pageId: 'skill-tree' },
      { key: 'house', icon: '家', label: '家 园', value: 0, tone: 'jade', pageId: 'housing' },
    ];
  }, [person, pets, companions]);

  const total = sources.reduce((s, x) => s + x.value, 0) || 0;
  const maxVal = Math.max(...sources.map((s) => s.value), 1);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>战 力 总 览</span>
            <span className={styles.appbarZone}>多 源 汇 总 · 可 点 追 溯</span>
          </div>
          <div className={styles.appbarIcons}>
            <button
              type="button"
              className={styles.appbarIcon}
              onClick={() => navigateTo('ranking')}
              aria-label="排行"
            >
              榜
            </button>
            <button
              type="button"
              className={styles.appbarIcon}
              onClick={() => navigateTo('home')}
              aria-label="返回"
            >
              回
            </button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.pwHero}>
          <div className={styles.pwHeroLb}>— 当 前 战 力 —</div>
          <div className={styles.pwHeroVl}>
            {loading ? '...' : total.toLocaleString()}
            <span className={styles.pwHeroVlUnit}>战 力</span>
          </div>
          <div className={styles.pwHeroRk}>
            等 级 <span className={styles.pwHeroRkV}>Lv.{person?.level?.level ?? 1}</span>
            · 修 行 进 度 {Math.min(100, Math.round(((person?.level?.exp ?? 0) / Math.max(1, person?.level?.maxExp ?? 1)) * 100))}%
          </div>
        </div>

        <div className={styles.sectLine}>
          加 成 来 源 · {sources.length} 条
        </div>

        <div className={styles.pwSrcList}>
          {sources.map((s) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            const barWidth = Math.max(4, (s.value / maxVal) * 100);
            const tone = s.tone || '';
            return (
              <div
                key={s.key}
                className={styles.pwSrc}
                onClick={() => s.pageId && navigateTo(s.pageId)}
                role={s.pageId ? 'button' : undefined}
                style={{ cursor: s.pageId ? 'pointer' : 'default' }}
              >
                <span
                  className={`${styles.pwSrcIc} ${tone === 'red' ? styles.pwSrcIcRed : tone === 'jade' ? styles.pwSrcIcJade : tone === 'purple' ? styles.pwSrcIcPurple : tone === 'azure' ? styles.pwSrcIcAzure : ''}`.trim()}
                >
                  {s.icon}
                </span>
                <span className={styles.pwSrcNm}>{s.label}</span>
                <div className={styles.pwSrcBar}>
                  <div
                    className={`${styles.pwSrcBarFill} ${tone}`.trim()}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className={styles.pwSrcVal}>+ {s.value.toLocaleString()}</span>
                <span className={styles.pwSrcPct}>{pct}%</span>
              </div>
            );
          })}
        </div>

        <div className={styles.sectLine}>短 板 提 升 建 议</div>

        {TIPS.map((t) => (
          <div key={t.no} className={styles.pwTip}>
            <span
              className={`${styles.pwTipNo} ${t.tone === 'gold' ? styles.pwTipNoGold : t.tone === 'purple' ? styles.pwTipNoPurple : ''}`.trim()}
            >
              {t.no}
            </span>
            <div className={styles.pwTipBd}>
              <div className={styles.pwTipNm}>{t.text}</div>
              <div className={styles.pwTipBf}>{t.hint}</div>
            </div>
            <button
              type="button"
              className={styles.pwTipGo}
              onClick={() => navigateTo(t.goto)}
            >
              去
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
