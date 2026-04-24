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
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>系统 / 区域 / 玩家动态</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>消息</div>
          <div className={styles.subtitle}>{zoneId}</div>
        </div>
      </div>

      <div className={styles.scroll}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>系统公告</span>
          </div>
          <div className={styles.list}>
            {systemNotices.map((item) => (
              <div key={item} className={styles.card}>
                <div className={styles.name}>{item}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>玩家留言摘要</span>
          </div>
          <div className={styles.list}>
            {messages.length === 0 ? (
              <div className={styles.empty}>暂无玩家动态</div>
            ) : messages.slice(0, 8).map((item) => (
              <div key={item.id} className={styles.card}>
                <div className={styles.row}>
                  <div className={styles.name}>{item.authorName}</div>
                  <div className={styles.meta}>{new Date(item.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className={styles.desc}>{item.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
