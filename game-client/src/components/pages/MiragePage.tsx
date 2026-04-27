import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface Trial {
  icon: string;
  name: string;
  desc: string;
  v: string;
}

// TODO: 接入 /mirage/state 与 /mirage/enter 接口
const TRIALS: Trial[] = [
  { icon: '幻', name: '七 情 镜', desc: '化 解 心 魔 · 限 时 三 刻', v: '+ 60 神 识' },
  { icon: '迷', name: '九 曲 廊', desc: '迷 失 之 局 · 寻 出 玄 关', v: '+ 120 魂 力' },
  { icon: '惑', name: '太 虚 楼', desc: '万 象 共 现 · 一 念 即 至', v: '+ 1 命 格 卷' },
  { icon: '灭', name: '寂 灭 渊', desc: '直 面 虚 无 · 三 心 不 退', v: '+ 1 紫 玄 散' },
];

export default function MiragePage() {
  usePageBackground(PAGE_BG.MIRAGE);
  const navigateTo = useGameStore((s) => s.navigateTo);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>警 幻 魔 境</span>
            <span className={styles.appbarZone}>幻 由 心 生 · 镜 自 道 显</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => navigateTo('home')}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.mrAtmo}>
          <div className={styles.mrAtmoStars} />
          <div className={styles.mrEye}>瞳</div>
        </div>

        <div className={styles.mrInfo}>
          <div className={styles.mrInfoT}>太 虚 之 心</div>
          <div className={styles.mrInfoS}>每 日 子 时 重 启 · 三 试 见 真</div>
        </div>

        <button type="button" className={styles.mrEnter} onClick={() => toast.info('入 境 ...')}>
          入 镜
        </button>

        <div className={styles.sectLine}>试 炼 名 录</div>

        {TRIALS.map((t, i) => (
          <div key={i} className={styles.mrTrial}>
            <span className={styles.mrTrialIc}>{t.icon}</span>
            <div>
              <div className={styles.mrTrialNm}>{t.name}</div>
              <div className={styles.mrTrialDs}>{t.desc}</div>
            </div>
            <span className={styles.mrTrialV}>{t.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
