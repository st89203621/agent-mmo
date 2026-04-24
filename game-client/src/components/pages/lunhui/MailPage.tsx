import { useCallback, useEffect, useState } from 'react';
import { claimMailReward, fetchMailList, readMail } from '../../../services/api';
import type { MailItem } from '../../../types';
import styles from './LunhuiPages.module.css';

export default function MailPage() {
  const [mails, setMails] = useState<MailItem[]>([]);
  const [selected, setSelected] = useState<MailItem | null>(null);

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
  }, [load]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>系统信件 / 奖励</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>邮件</div>
          <div className={styles.subtitle}>{mails.length} 封</div>
        </div>
      </div>

      <div className={styles.scroll}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>邮件列表</span>
          </div>
          <div className={styles.list}>
            {mails.map((mail) => (
              <div key={mail.id} className={styles.card}>
                <div className={styles.row}>
                  <div className={styles.stack}>
                    <div className={styles.name}>{mail.title}</div>
                    <div className={styles.meta}>{mail.senderName} · {mail.read ? '已读' : '未读'}</div>
                  </div>
                  <button className={styles.button} onClick={() => openMail(mail)}>查看</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className={styles.panel}>
            <div className={styles.panelTitle}>
              <span>{selected.title}</span>
              {selected.reward && <span className={styles.chip}>{selected.reward}</span>}
            </div>
            <div className={styles.desc}>{selected.content}</div>
            {selected.reward && !selected.rewardClaimed && (
              <button className={styles.button} onClick={() => claimReward(selected.id)}>
                领取附件
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
