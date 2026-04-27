import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

type ChipKey = 'all' | 'sys' | 'social' | 'act' | 'battle' | 'friend';

interface NotifItem {
  id: string;
  tag: ChipKey;
  tagText: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

// TODO: 接入 /notify/feed 与 /notify/read 接口
const CHIPS: { key: ChipKey; label: string; n?: number }[] = [
  { key: 'all', label: '全 部', n: 12 },
  { key: 'sys', label: '系 统', n: 2 },
  { key: 'social', label: '社 交', n: 4 },
  { key: 'act', label: '活 动', n: 3 },
  { key: 'battle', label: '战 报', n: 2 },
  { key: 'friend', label: '挚 友', n: 1 },
];

const FEED: NotifItem[] = [
  {
    id: 'n1',
    tag: 'sys',
    tagText: '系',
    title: '版 本 维 护 公 告',
    body: '甲 子 年 三 月 廿 一 子 时 维 护 三 时 辰 ， 修 复 万 灵 殿 战 报 异 常 。',
    time: '2 时 辰 前',
    unread: true,
  },
  {
    id: 'n2',
    tag: 'social',
    tagText: '社',
    title: '陆 长 渊 邀 你 共 入 万 灵 殿',
    body: '已 备 五 行 阵 旗 ， 卯 时 三 刻 于 山 门 集 结 。',
    time: '4 时 辰 前',
    unread: true,
  },
  {
    id: 'n3',
    tag: 'act',
    tagText: '活',
    title: '七 日 福 缘 已 累 进 第 五 日',
    body: '今 日 可 领 「 紫 玄 散 ×3 」 ， 明 日 解 锁 ' + '「 命 格 重 演 卷 」 。',
    time: '今 日 卯 时',
    unread: false,
  },
  {
    id: 'n4',
    tag: 'battle',
    tagText: '战',
    title: '武 斗 场 · 第 三 轮 胜 报',
    body: '你 击 败 了 「 司 空 雪 」 ， 段 位 跃 至 「 玄 鹤 · 上 位 」 。',
    time: '昨 日 戌 时',
    unread: false,
  },
  {
    id: 'n5',
    tag: 'friend',
    tagText: '友',
    title: '苏 倾 月 上 线 了',
    body: '在 「 镜 华 镇 · 西 街 」 ， 可 前 去 共 道 。',
    time: '昨 日 申 时',
    unread: false,
  },
];

const tagClsMap: Record<ChipKey, string> = {
  all: '',
  sys: styles.nfTagSys,
  social: styles.nfTagSocial,
  act: styles.nfTagAct,
  battle: styles.nfTagBattle,
  friend: styles.nfTagFriend,
};

export default function NotificationPage() {
  usePageBackground(PAGE_BG.NOTIFICATION);
  const back = useGameStore((s) => s.back);
  const [chip, setChip] = useState<ChipKey>('all');

  const list = chip === 'all' ? FEED : FEED.filter((f) => f.tag === chip);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>通 知 中 心</span>
            <span className={styles.appbarZone}>邸 报 · 战 报 · 来 札</span>
          </div>
          <div className={styles.appbarIcons}>
            <button type="button" className={styles.appbarIcon} aria-label="返回" onClick={() => back()}>回</button>
          </div>
        </div>
      </div>

      <div className={styles.nfHead}>
        {CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`${styles.nfChip} ${chip === c.key ? styles.nfChipOn : ''}`.trim()}
            onClick={() => setChip(c.key)}
          >
            {c.label}
            {c.n ? <span className={styles.nfChipN}>{c.n}</span> : null}
          </button>
        ))}
      </div>

      <div className={styles.scrollPlain}>
        {list.length === 0 ? (
          <div className={styles.nfItem}>
            <span className={styles.nfTag}>静</span>
            <div className={styles.nfBd}>
              <div className={styles.nfBdT}>暂 无 此 类 消 息</div>
              <div className={styles.nfBdM}>新 消 息 将 在 此 即 时 显 示</div>
            </div>
          </div>
        ) : (
          list.map((n) => (
            <div
              key={n.id}
              className={`${styles.nfItem} ${n.unread ? styles.nfItemUnread : ''}`.trim()}
            >
              <span className={`${styles.nfTag} ${tagClsMap[n.tag]}`.trim()}>{n.tagText}</span>
              <div className={styles.nfBd}>
                <div className={styles.nfBdT}>{n.title}</div>
                <div className={styles.nfBdM}>{n.body}</div>
                <div className={styles.nfBdTm}>{n.time}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
