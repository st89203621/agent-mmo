import type { ReactNode } from 'react';
import { useGameStore } from '../../store/gameStore';
import styles from './GameLayout.module.css';

interface Props {
  children: ReactNode;
}

const NAV_ACTIONS = [
  { id: 'home', label: '首页', pageId: 'home' as const },
  { id: 'hub', label: '主城', pageId: 'hub' as const },
  { id: 'teleport', label: '功能', pageId: 'teleport' as const },
  { id: 'inventory', label: '背包', pageId: 'inventory' as const },
  { id: 'status', label: '我的', pageId: 'status' as const },
];

export default function GameLayout({ children }: Props) {
  const currentPage = useGameStore((s) => s.currentPage);
  const navigateTo = useGameStore((s) => s.navigateTo);

  return (
    <div className={styles.stage}>
      <div className={styles.app}>
        <main className={styles.content}>{children}</main>

        <nav className={styles.nav}>
          {NAV_ACTIONS.map((item) => {
            const active = currentPage === item.pageId;
            return (
              <button
                key={item.id}
                className={`${styles.navBtn} ${active ? styles.active : ''}`.trim()}
                onClick={() => navigateTo(item.pageId)}
                type="button"
              >
                <span className={styles.navIcon}>{item.label.slice(0, 1)}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
