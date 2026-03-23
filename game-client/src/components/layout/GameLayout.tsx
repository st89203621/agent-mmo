import React from 'react';
import type { PageId } from '../../types';
import { useGameStore } from '../../store/gameStore';
import styles from './GameLayout.module.css';

interface NavItem {
  id: PageId;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'story', label: '剧情', icon: '📜' },
  { id: 'explore', label: '探索', icon: '🗺️' },
  { id: 'character', label: '角色', icon: '👤' },
  { id: 'inventory', label: '背包', icon: '🎒' },
  { id: 'achievement', label: '缘分', icon: '💫' },
];

interface Props {
  children: React.ReactNode;
}

export default function GameLayout({ children }: Props) {
  const { currentPage, navigateTo, isTransitioning } = useGameStore();

  return (
    <div className={styles.layout}>
      <main className={`${styles.content} ${isTransitioning ? styles.transitioning : ''}`}>
        {children}
      </main>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`${styles.navBtn} ${currentPage === item.id ? styles.active : ''}`}
            onClick={() => navigateTo(item.id)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
