import { useCallback, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { PageId } from '../../types';
import styles from './TeleportMenu.module.css';

interface TeleportItem {
  id: string;
  label: string;
  pageId: PageId;
  badge?: 'hot' | 'new';
}

interface TeleportGroupDef {
  label: string;
  hint?: string;
  items: TeleportItem[];
}

const GROUPS: TeleportGroupDef[] = [
  {
    label: '功能区',
    hint: '日常福利',
    items: [
      { id: 'recharge', label: '充值礼包', pageId: 'recharge', badge: 'hot' },
      { id: 'activity-online', label: '在线领奖', pageId: 'activity' },
      { id: 'explore', label: '探险', pageId: 'dungeon' },
    ],
  },
  {
    label: '经济区',
    hint: '交易市场',
    items: [
      { id: 'shop', label: '商城', pageId: 'shop' },
      { id: 'market', label: '集市', pageId: 'market' },
      { id: 'stall', label: '小摊', pageId: 'stall' },
      { id: 'auction', label: '拍卖', pageId: 'auction', badge: 'hot' },
      { id: 'forge', label: '神匠', pageId: 'forge' },
    ],
  },
  {
    label: '战斗区',
    hint: '今日热战',
    items: [
      { id: 'arena', label: '竞技场', pageId: 'arena' },
      { id: 'world-boss', label: '世界 Boss', pageId: 'world-boss', badge: 'hot' },
      { id: 'dungeon', label: '副本', pageId: 'dungeon' },
    ],
  },
  {
    label: '社交区',
    hint: '人间烟火',
    items: [
      { id: 'matchmaking', label: '婚介', pageId: 'matchmaking' },
      { id: 'message-board', label: '留言板', pageId: 'message-board' },
      { id: 'guild', label: '组队', pageId: 'guild' },
      { id: 'fishing', label: '钓鱼', pageId: 'fishing' },
    ],
  },
];

interface TeleportMenuProps {
  onClose: () => void;
}

export default function TeleportMenu({ onClose }: TeleportMenuProps): JSX.Element {
  const navigateTo = useGameStore((s) => s.navigateTo);

  const handleJump = useCallback((item: TeleportItem) => {
    navigateTo(item.pageId);
    onClose();
  }, [navigateTo, onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="传送菜单"
      onClick={onClose}
    >
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <span className={styles.title}>传 送</span>
            <span className={styles.subtitle}>梦中人 · 心之所向</span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className={styles.scroll}>
          {GROUPS.map((group) => (
            <div key={group.label} className={styles.group}>
              <div className={styles.groupHeader}>
                <span className={styles.groupBadge} />
                <span className={styles.groupLabel}>{group.label}</span>
                {group.hint && <span className={styles.groupHint}>{group.hint}</span>}
              </div>
              <div className={styles.grid}>
                {group.items.map((item) => {
                  const cls = `${styles.item} ${item.badge === 'hot' ? styles.itemHot : ''}`.trim();
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cls}
                      onClick={() => handleJump(item)}
                    >
                      {item.badge && <span className={styles.itemBadge}>{item.badge === 'hot' ? '热' : '新'}</span>}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>按 ESC 或点击空白处关闭</div>
      </div>
    </div>
  );
}
