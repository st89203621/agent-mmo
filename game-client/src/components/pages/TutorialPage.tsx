import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface TutorialStep {
  step: string;
  title: string;
  desc: string;
}

// TODO: 接入 /tutorial/steps 与 /tutorial/progress 接口
const STEPS: TutorialStep[] = [
  {
    step: 'STEP 01 / 06',
    title: '踏 入 仙 途',
    desc: '点 击 中 央 按 钮 开 启 「 闯 关 」 玩 法 。 此 处 为 你 主 要 的 战 力 来 源 。',
  },
  {
    step: 'STEP 02 / 06',
    title: '收 取 八 方',
    desc: '左 上 角 「 灵 田 」 与 「 渔 樵 」 每 隔 一 时 辰 自 动 凝 聚 资 源 ， 莫 要 错 过 。',
  },
  {
    step: 'STEP 03 / 06',
    title: '论 道 江 湖',
    desc: '底 部 「 社 交 」 入 口 集 结 了 友 朋 、 师 门 与 万 千 弟 子 。 切 莫 独 行 千 里 。',
  },
  {
    step: 'STEP 04 / 06',
    title: '修 持 神 兵',
    desc: '在 「 包 袱 」 中 长 按 装 备 即 可 进 入 「 神 匠 阁 」 强 化 、 镶 嵌 与 重 铸 。',
  },
  {
    step: 'STEP 05 / 06',
    title: '勘 破 命 数',
    desc: '「 福 缘 簿 」 内 含 签 到 、 转 盘 与 新 手 礼 包 。 每 日 三 次 ， 不 容 错 失 。',
  },
  {
    step: 'STEP 06 / 06',
    title: '同 道 共 行',
    desc: '完 成 引 导 后 ， 可 在 「 设 置 · 帮 助 」 中 重 新 唤 醒 此 引 导 。 祝 你 道 业 长 青 。',
  },
];

export default function TutorialPage() {
  usePageBackground(PAGE_BG.TUTORIAL);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [idx, setIdx] = useState(0);
  const cur = STEPS[idx];
  const isLast = idx === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      navigateTo('home');
      return;
    }
    setIdx((i) => i + 1);
  };

  const handleSkip = () => navigateTo('home');

  return (
    <div className={styles.ttMask}>
      <div className={styles.ttSpotlight}>
        <span className={styles.ttHand}>☚</span>
      </div>

      <div className={styles.ttCard}>
        <div className={styles.ttStp}>{cur.step}</div>
        <div className={styles.ttTl}>{cur.title}</div>
        <div className={styles.ttDs}>{cur.desc}</div>

        <div className={styles.ttActs}>
          <button type="button" className={`${styles.ttBtn} ${styles.ttBtnSkip}`} onClick={handleSkip}>
            跳 过
          </button>
          <button type="button" className={`${styles.ttBtn} ${styles.ttBtnNext}`} onClick={handleNext}>
            {isLast ? '完 成' : '下 一 步'}
          </button>
        </div>

        <div className={styles.ttProg}>
          {STEPS.map((_, i) => {
            const cls =
              i < idx ? styles.ttProgDOn : i === idx ? styles.ttProgDCur : '';
            return <div key={i} className={`${styles.ttProgD} ${cls}`.trim()} />;
          })}
        </div>
      </div>
    </div>
  );
}
