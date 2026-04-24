import type { ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { PageId } from '../../types';
import styles from './GameLayout.module.css';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  pageId: PageId;
  matches: PageId[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: '首页',
    icon: '首',
    pageId: 'home',
    matches: ['home', 'story', 'chat'],
  },
  {
    id: 'hub',
    label: '主城',
    icon: '主',
    pageId: 'hub',
    matches: [
      'hub', 'scene', 'place', 'teleport', 'nearby', 'book-world',
      'world-map', 'hunt', 'battle', 'dungeon', 'world-boss',
      'team-battle', 'treasure-mountain', 'secret-realm', 'explore',
    ],
  },
  {
    id: 'housing',
    label: '家园',
    icon: '家',
    pageId: 'housing',
    matches: ['housing', 'flower'],
  },
  {
    id: 'inventory',
    label: '背包',
    icon: '包',
    pageId: 'inventory',
    matches: ['inventory', 'equip-detail', 'enchant', 'forge'],
  },
  {
    id: 'me',
    label: '我的',
    icon: '我',
    pageId: 'status',
    matches: [
      'status', 'character', 'pet', 'pet-summon',
      'friend', 'mail', 'settings', 'vip', 'achievement',
      'title', 'codex', 'quest', 'skill-tree', 'rebirth',
      'destiny-path', 'mystic-tome', 'fate-map', 'matchmaking',
      'coexplore', 'memory', 'companion',
    ],
  },
];

interface Props {
  children: ReactNode;
}

export default function GameLayout({ children }: Props) {
  const currentPage = useGameStore((s) => s.currentPage);
  const navigateTo = useGameStore((s) => s.navigateTo);

  return (
    <div className={styles.stage}>
      <div className={styles.app}>
        <main className={styles.content} key={currentPage}>{children}</main>

        <nav className={styles.tabbar}>
          {NAV_ITEMS.map((item) => {
            const active = item.matches.includes(currentPage);
            return (
              <button
                key={item.id}
                className={`${styles.tab} ${active ? styles.active : ''}`.trim()}
                onClick={() => navigateTo(item.pageId)}
                type="button"
              >
                <span className={styles.ti}>{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
