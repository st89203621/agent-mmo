import { useGameStore } from '../../store/gameStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

interface LineageLine {
  text: string;
  isMine?: boolean;
}

// TODO: 接入 /lineage/tree 接口
const LINES: LineageLine[] = [
  { text: '初 代 ┄ 玄 真 子 · 开 山 立 派' },
  { text: '  └ 二 代 ┄ 太 一 真 人' },
  { text: '      ├ 三 代 ┄ 北 冥 道 长' },
  { text: '      └ 三 代 ┄ 南 离 真 君' },
  { text: '          ├ 四 代 ┄ 陆 长 渊 · 现 任 掌 门' },
  { text: '          │   ├ 五 代 ┄ 凌 川（你）', isMine: true },
  { text: '          │   ├ 五 代 ┄ 沈 微 之' },
  { text: '          │   └ 五 代 ┄ 柳 弦 歌' },
  { text: '          └ 四 代 ┄ 司 空 雪' },
  { text: '              └ 五 代 ┄ 萧 引 之' },
];

export default function LineagePage() {
  usePageBackground(PAGE_BG.LINEAGE);
  const back = useGameStore((s) => s.back);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>师 门 传 承</span>
            <span className={styles.appbarZone}>世 系 谱 · 五 代 二 十 四 脉</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => back()}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.sectLine}>清 平 道 宗 · 谱 系</div>

        <div className={styles.lnTree}>
          {LINES.map((l, i) => (
            <div
              key={i}
              className={`${styles.lnLine} ${l.isMine ? styles.lnLineMine : ''}`.trim()}
            >
              {l.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
