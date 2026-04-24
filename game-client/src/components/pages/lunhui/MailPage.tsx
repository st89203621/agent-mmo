import { useCallback, useEffect, useMemo, useState } from 'react';
import { claimMailReward, fetchMailList, readMail } from '../../../services/api';
import type { MailItem } from '../../../types';
import styles from './LunhuiPages.module.css';

type MailFilter = 'all' | 'unread' | 'reward';

export default function MailPage() {
  const [mails, setMails] = useState<MailItem[]>([]);
  const [selected, setSelected] = useState<MailItem | null>(null);
  const [filter, setFilter] = useState<MailFilter>('all');

  const load = useCallback(() => {
    fetchMailList().then((res) => setMails(res.mails || [])).catch(() => setMails([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openMail = useCallback(async (mail: MailItem) => {
    const detail = await readMail(mail.id);
    setSelected(detail);
    load();
  }, [load]);

  const claimReward = useCallback(async (mailId: string) => {
    await claimMailReward(mailId);
    load();
    setSelected((prev) => (prev && prev.id === mailId ? { ...prev, rewardClaimed: true } : prev));
  }, [load]);

  const filteredMails = useMemo(() => {
    if (filter === 'unread') return mails.filter((mail) => !mail.read);
    if (filter === 'reward') return mails.filter((mail) => mail.reward && !mail.rewardClaimed);
    return mails;
  }, [filter, mails]);

  const unreadCount = mails.filter((mail) => !mail.read).length;
  const rewardCount = mails.filter((mail) => mail.reward && !mail.rewardClaimed).length;

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>邮 箱</span>
            <span className={styles.appbarZone}>未读 {unreadCount} · 附件 {rewardCount}</span>
          </div>
          <div className={styles.appbarIcons}>
            <div className={styles.appbarIconPlain}>写</div>
            <div className={styles.appbarIconPlain}>索</div>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.mailHead}>
          <button
            className={`${styles.mailFilter} ${filter === 'all' ? styles.mailFilterOn : ''}`.trim()}
            onClick={() => setFilter('all')}
            type="button"
          >
            全部
          </button>
          <button
            className={`${styles.mailFilter} ${filter === 'unread' ? styles.mailFilterOn : ''}`.trim()}
            onClick={() => setFilter('unread')}
            type="button"
          >
            未读
          </button>
          <button
            className={`${styles.mailFilter} ${filter === 'reward' ? styles.mailFilterOn : ''}`.trim()}
            onClick={() => setFilter('reward')}
            type="button"
          >
            附件
          </button>
          <div className={styles.mailClear}>清理</div>
        </div>

        <div className={styles.mailList}>
          {filteredMails.map((mail) => (
            <button
              key={mail.id}
              className={`${styles.mailItem} ${!mail.read ? styles.mailUnread : ''}`.trim()}
              onClick={() => openMail(mail)}
              type="button"
            >
              <div className={styles.mailIcon}>{mail.reward ? '奖' : '信'}</div>
              <div className={styles.mailBody}>
                <div className={styles.mailTitle}>{mail.title}</div>
                <div className={styles.mailSub}>{mail.senderName} · {mail.content.slice(0, 32)}</div>
              </div>
              <div className={styles.mailMeta}>
                <div>{new Date(mail.createdAt).toLocaleDateString('zh-CN')}</div>
                {mail.reward && !mail.rewardClaimed && <span className={styles.mailReward}>可领</span>}
              </div>
            </button>
          ))}
          {filteredMails.length === 0 && <div className={styles.feedEmpty}>当前筛选下没有邮件</div>}
        </div>

        {selected && (
          <>
            <div className={styles.sectLine}>邮 件 内 容</div>
            <div className={styles.mailDetail}>
              <div className={styles.mailDetailTitle}>{selected.title}</div>
              <div className={styles.mailDetailMeta}>{selected.senderName}</div>
              <div className={styles.mailDetailText}>{selected.content}</div>
              {selected.reward && (
                <div className={styles.mailAttachment}>附件：{selected.reward}</div>
              )}
              {selected.reward && !selected.rewardClaimed && (
                <button className={styles.mailClaimBtn} onClick={() => claimReward(selected.id)} type="button">
                  领 取 附 件
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
