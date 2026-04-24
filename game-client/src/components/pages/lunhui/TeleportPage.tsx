import { TELEPORT_GROUPS } from '../../../data/lunhuiWorld';
import { useGameStore } from '../../../store/gameStore';
import styles from './LunhuiPages.module.css';

export default function TeleportPage() {
  const navigateTo = useGameStore((s) => s.navigateTo);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>梦中人</span>
            <span className={styles.appbarZone}>传送使者 · 功能菜单</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('messages')} type="button">信</button>
            <button className={styles.appbarIcon} onClick={() => navigateTo('friend')} type="button">友</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.noticeBoard}>
          <div className={styles.noticeTitle}>你心之所向，是何处？</div>
          <div className={styles.noticeSub}>按照 `fusion_mockup` 的分类结构重排，先选分类，再进对应玩法。</div>
        </div>

        {TELEPORT_GROUPS.map((group) => (
          <div key={group.label}>
            <div className={styles.sectLine}>{group.label}</div>
            <div className={styles.tpGrid}>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`${styles.tpItem} ${item.badge === 'hot' ? styles.tpItemRed : ''}`.trim()}
                  onClick={() => navigateTo(item.pageId, item.zoneId ? { zoneId: item.zoneId } : undefined)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button className={styles.tpCloseBtn} onClick={() => navigateTo('hub')} type="button">
          × 关 闭
        </button>
      </div>
    </div>
  );
}
