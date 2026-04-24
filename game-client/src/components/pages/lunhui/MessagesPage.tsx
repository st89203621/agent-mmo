import { useEffect, useState } from 'react';
import { fetchMessageBoard, fetchCurrentZone } from '../../../services/api';
import type { BoardMessage } from '../../../types';
import styles from './LunhuiPages.module.css';

const systemNotices = [
  '系统维护补偿已通过邮件发放',
  '今晚 21:00 开启世界 Boss 争夺',
  '限时秒杀已刷新，持续 15 分钟',
];

export default function MessagesPage() {
  const [zoneId, setZoneId] = useState('world');
  const [messages, setMessages] = useState<BoardMessage[]>([]);

  useEffect(() => {
    fetchCurrentZone().then((zone) => setZoneId(zone.zoneId)).catch(() => {});
    fetchMessageBoard().then((res) => setMessages(res.messages || [])).catch(() => setMessages([]));
  }, []);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>消 息</span>
            <span className={styles.appbarZone}>区域 {zoneId} · 动态汇总</span>
          </div>
          <div className={styles.appbarIcons}>
            <div className={styles.appbarIconPlain}>告</div>
            <div className={`${styles.appbarIconPlain} ${styles.appbarIconDot}`}>新</div>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.sectLine}>系 统 公 告</div>
        <div className={styles.feedList}>
          {systemNotices.map((item) => (
            <div key={item} className={styles.feedItem}>
              <div className={styles.feedIcon}>告</div>
              <div className={styles.feedBody}>
                <div className={styles.feedTitle}>系统公告</div>
                <div className={styles.feedText}>{item}</div>
              </div>
              <div className={styles.feedMeta}>刚刚</div>
            </div>
          ))}
        </div>

        <div className={styles.sectLine}>玩 家 动 态</div>
        <div className={styles.feedList}>
          {messages.length === 0 ? (
            <div className={styles.feedEmpty}>暂无玩家动态</div>
          ) : messages.slice(0, 8).map((item) => (
            <div key={item.id} className={styles.feedItem}>
              <div className={styles.feedIcon}>{item.authorName.slice(0, 1)}</div>
              <div className={styles.feedBody}>
                <div className={styles.feedTitle}>{item.authorName}</div>
                <div className={styles.feedText}>{item.content}</div>
              </div>
              <div className={styles.feedMeta}>
                {new Date(item.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
