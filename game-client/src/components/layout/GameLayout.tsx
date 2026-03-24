import React from 'react';
import type { PageId } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
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

/** 这些页面是从角色页等入口进入的子页面，需要显示返回按钮 */
const SUB_PAGES: Record<string, { label: string; back: PageId }> = {
  'skill-tree': { label: '技能树', back: 'character' },
  'pet': { label: '宠物', back: 'character' },
  'pet-summon': { label: '召唤', back: 'pet' },
  'enchant': { label: '附魔', back: 'character' },
  'equip-detail': { label: '装备', back: 'character' },
  'rebirth': { label: '轮回', back: 'character' },
  'memory': { label: '记忆', back: 'character' },
  'book-world': { label: '书库', back: 'character' },
  'codex': { label: '图鉴', back: 'character' },
  'dungeon': { label: '副本', back: 'character' },
  'quest': { label: '任务', back: 'character' },
  'shop': { label: '商城', back: 'character' },
  'companion': { label: '灵侣', back: 'character' },
  'rank': { label: '排行', back: 'achievement' },
};

interface Props {
  children: React.ReactNode;
}

export default function GameLayout({ children }: Props) {
  const { currentPage, previousPage, navigateTo, isTransitioning } = useGameStore();
  const { gold, diamond } = usePlayerStore();

  const subPage = SUB_PAGES[currentPage];

  return (
    <div className={styles.layout}>
      {/* 全局顶栏：子页面返回 + 货币 */}
      {subPage && (
        <div className={styles.topBar}>
          <button
            className={styles.backBtn}
            onClick={() => navigateTo(previousPage && previousPage !== currentPage ? previousPage : subPage.back)}
          >
            &larr; 返回
          </button>
          <span className={styles.topTitle}>{subPage.label}</span>
          <span className={styles.currency}>
            <span className={styles.gold}>{gold}</span>
            <span className={styles.diamond}>{diamond}</span>
          </span>
        </div>
      )}

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
