import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

type Rarity = 'normal' | 'rare' | 'ur' | 'azure';

interface Recipe {
  icon: string;
  rarity: Rarity;
  name: string;
  mats: string;
  ready: boolean;
}

// TODO: 接入 /furnace/recipes 与 /furnace/refine 接口
const RECIPES: Recipe[] = [
  { icon: '焰', rarity: 'normal', name: '聚 灵 丹', mats: '灵 草 ×3 · 兽 骨 ×1', ready: true },
  { icon: '炎', rarity: 'rare', name: '紫 玄 散', mats: '紫 玄 草 ×5 · 龙 涎 ×1', ready: true },
  { icon: '冥', rarity: 'ur', name: '九 转 还 魂', mats: '魂 火 ×9 · 鬼 髓 ×3 · 阳 神 玉 ×1', ready: false },
  { icon: '霜', rarity: 'azure', name: '寒 露 露', mats: '玄 冰 ×4 · 月 华 ×2', ready: true },
  { icon: '焚', rarity: 'rare', name: '赤 焰 散', mats: '赤 焰 草 ×6 · 火 灵 石 ×2', ready: false },
];

const LOG_LINES = [
  '> 子 时 三 刻 · 投 入 灵 草 ×3 · 兽 骨 ×1',
  '> 文 火 七 转 · 火 候 渐 旺',
  '> 武 火 九 沸 · 灵 气 凝 形',
  '> 收 鼎 · 出 丹 · 聚 灵 丹 ×2 · 品 阶 二',
];

const rarityCls: Record<Rarity, string> = {
  normal: '',
  rare: styles.rfRecipeIcRare,
  ur: styles.rfRecipeIcUr,
  azure: styles.rfRecipeIcAzure,
};

export default function RuneFurnacePage() {
  usePageBackground(PAGE_BG.RUNE_FURNACE);
  const navigateTo = useGameStore((s) => s.navigateTo);

  const handleRefine = (r: Recipe) => {
    if (!r.ready) {
      toast.error('材 料 不 足');
      return;
    }
    toast.info(`开 炉 炼 制 · ${r.name}`);
  };

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>鬼 炉 · 魂 鼎</span>
            <span className={styles.appbarZone}>三 昧 真 火 · 万 物 凝 形</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => navigateTo('home')}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.rfStage}>
          <div className={styles.rfCauldron} />
          <div className={styles.rfNm}>九 蕴 玄 鼎</div>
          <div className={styles.rfSub}>当 前 火 候 · 武 火 七 沸</div>
        </div>

        <div className={styles.sectLine}>丹 方 名 录</div>

        {RECIPES.map((r, i) => (
          <div key={i} className={styles.rfRecipe}>
            <span className={`${styles.rfRecipeIc} ${rarityCls[r.rarity]}`.trim()}>
              {r.icon}
            </span>
            <div>
              <div className={styles.rfRecipeNm}>{r.name}</div>
              <div className={`${styles.rfRecipeMat} ${r.ready ? '' : styles.rfRecipeMatLack}`.trim()}>
                {r.mats}
              </div>
            </div>
            <button
              type="button"
              className={`${styles.rfRecipeBtn} ${r.ready ? '' : styles.rfRecipeBtnLock}`.trim()}
              disabled={!r.ready}
              onClick={() => handleRefine(r)}
            >
              {r.ready ? '炼 制' : '缺 料'}
            </button>
          </div>
        ))}

        <div className={styles.sectLine}>炉 中 实 录</div>

        <div className={styles.rfLog}>
          {LOG_LINES.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
