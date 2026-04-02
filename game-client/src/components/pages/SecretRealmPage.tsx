import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '../../store/toastStore';
import {
  fetchRealmStatus, enterRealm, exploreRealm, resolveRealmEvent,
  type RealmData, type RealmEvent,
} from '../../services/api';
import page from '../../styles/page.module.css';
import own from './SecretRealmPage.module.css';

const styles = { ...page, ...own };

const EVENT_TYPE_STYLE: Record<string, { label: string; cls: string }> = {
  battle: { label: '战斗', cls: 'eventTypeBattle' },
  treasure: { label: '宝箱', cls: 'eventTypeTreasure' },
  heal: { label: '回复', cls: 'eventTypeHeal' },
  mystery: { label: '奇遇', cls: 'eventTypeMystery' },
};

const FLOOR_NAMES = [
  '混沌边境', '星陨荒原', '幽冥暗道', '灵脉深渊',
  '太虚幻境', '九幽冥殿', '鸿蒙核心', '创世祭坛',
];

function useCountdown(endTime: number) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!endTime) return;
    const tick = () => {
      const diff = Math.max(0, endTime - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setText(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return text;
}

export default function SecretRealmPage() {
  const [realm, setRealm] = useState<RealmData | null>(null);
  const [event, setEvent] = useState<RealmEvent | null>(null);
  const [eventResult, setEventResult] = useState<{ win: boolean; text: string; loot?: { icon: string; name: string }[] } | null>(null);
  const [exploring, setExploring] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const endTime = realm?.endTime ?? (Date.now() + 48 * 3600000);
  const countdown = useCountdown(endTime);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchRealmStatus();
      setRealm(data);
      setLogs(data.logs || []);
    } catch { /* noop */ }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleEnter = useCallback(async () => {
    setExploring(true);
    try {
      const data = await enterRealm();
      setRealm(data);
      setLogs(data.logs || []);
      toast.info('踏入鸿蒙秘境...');
    } catch (e: any) {
      toast.error(e.message || '进入失败');
    }
    setExploring(false);
  }, []);

  const handleExplore = useCallback(async () => {
    if (exploring) return;
    setExploring(true);
    setEventResult(null);
    try {
      const data = await exploreRealm();
      setEvent(data.event);
      if (data.stamina !== undefined && realm) {
        setRealm({ ...realm, stamina: data.stamina, currentFloor: data.currentFloor ?? realm.currentFloor });
      }
    } catch (e: any) {
      toast.error(e.message || '探索失败');
    }
    setExploring(false);
  }, [exploring, realm]);

  const handleResolve = useCallback(async (choice: number) => {
    if (resolving || !event) return;
    setResolving(true);
    try {
      const res = await resolveRealmEvent(event.eventId, choice);
      setEventResult({ win: res.success, text: res.resultText, loot: res.loot });
      if (res.stamina !== undefined && realm) {
        setRealm({ ...realm, stamina: res.stamina, currentFloor: res.currentFloor ?? realm.currentFloor });
      }
      setLogs(prev => [res.logEntry || (res.success ? '顺利通过' : '挑战失败'), ...prev].slice(0, 20));
    } catch (e: any) {
      toast.error(e.message || '处理失败');
    }
    setResolving(false);
  }, [resolving, event, realm]);

  const isEnded = realm?.status === 'ended';
  const isActive = realm?.status === 'active';
  const staminaPct = realm ? Math.max(0, (realm.stamina / realm.maxStamina) * 100) : 100;
  const floor = realm?.currentFloor ?? 1;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>鸿蒙秘境</h2>
        <p className={styles.subtitle}>上古遗迹 · 限时开放</p>
      </div>

      {/* 倒计时 */}
      <div className={styles.timerBar}>
        <span className={styles.timerIcon}>⏳</span>
        <span className={styles.timerText}>{countdown}</span>
        <span className={styles.timerLabel}>后关闭</span>
      </div>

      <div className={styles.scrollArea}>
        {isEnded ? (
          <div className={styles.endBanner}>
            <div className={styles.endIcon}>🌀</div>
            <div className={styles.endTitle}>秘境已关闭</div>
            <div className={styles.endDesc}>等待下次开启...</div>
          </div>
        ) : !isActive ? (
          /* 未进入 */
          <div style={{ padding: 16 }}>
            <div className={styles.realmScene}>
              <div className={styles.realmGlow} />
              <div className={styles.realmIcon}>🌀</div>
              <div className={styles.floorName}>鸿蒙秘境入口</div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className={styles.enterBtn} disabled={exploring} onClick={handleEnter}>
                {exploring ? '正在传送...' : '踏入秘境'}
              </button>
            </div>
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--ink)', opacity: 0.5 }}>
              经验翻倍 · 稀有怪物刷新 · 隐藏宝箱遍布
            </div>
          </div>
        ) : (
          /* 秘境探索中 */
          <>
            <div className={styles.realmScene}>
              <div className={styles.realmGlow} />
              <div className={styles.realmIcon}>🌀</div>
              <div className={styles.floorBadge}>第 {floor} 层</div>
              <div className={styles.floorName}>{FLOOR_NAMES[(floor - 1) % FLOOR_NAMES.length]}</div>
            </div>

            {/* 体力 */}
            <div className={styles.staminaRow}>
              <span className={styles.staminaLabel}>探索体力</span>
              <div className={styles.staminaBarWrap}>
                <div className={styles.staminaBarFill} style={{ width: `${staminaPct}%` }} />
              </div>
              <span className={styles.staminaText}>{realm?.stamina ?? 0}/{realm?.maxStamina ?? 100}</span>
            </div>

            <div className={styles.eventArea}>
              {/* 当前事件 */}
              {event && !eventResult && (
                <div className={styles.eventCard}>
                  <div className={styles.eventHeader}>
                    <span className={styles.eventIcon}>{event.icon}</span>
                    <span className={styles.eventTitle}>{event.title}</span>
                    {event.type && (
                      <span className={`${styles.eventType} ${styles[EVENT_TYPE_STYLE[event.type]?.cls || 'eventTypeMystery']}`}>
                        {EVENT_TYPE_STYLE[event.type]?.label || '未知'}
                      </span>
                    )}
                  </div>
                  <div className={styles.eventDesc}>{event.description}</div>
                  <div className={styles.eventActions}>
                    {(event.choices || ['挑战', '跳过']).map((c, i) => (
                      <button
                        key={i}
                        className={`${styles.eventBtn} ${i === 0 ? styles.eventBtnPrimary : styles.eventBtnSecondary}`}
                        disabled={resolving}
                        onClick={() => handleResolve(i)}
                      >
                        {resolving ? '...' : c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 事件结果 */}
              {eventResult && (
                <div className={styles.eventCard}>
                  <div className={`${styles.eventResult} ${eventResult.win ? styles.eventResultWin : styles.eventResultLose}`}>
                    {eventResult.text}
                  </div>
                  {eventResult.loot && eventResult.loot.length > 0 && (
                    <div className={styles.lootGrid}>
                      {eventResult.loot.map((l, i) => (
                        <div key={i} className={styles.lootItem}>
                          <span className={styles.lootIcon}>{l.icon}</span>
                          {l.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={styles.eventActions} style={{ marginTop: 12 }}>
                    <button
                      className={`${styles.eventBtn} ${styles.eventBtnPrimary}`}
                      disabled={exploring || (realm?.stamina ?? 0) <= 0}
                      onClick={() => { setEvent(null); setEventResult(null); handleExplore(); }}
                    >
                      {(realm?.stamina ?? 0) <= 0 ? '体力耗尽' : '继续探索'}
                    </button>
                  </div>
                </div>
              )}

              {/* 无事件时 - 探索按钮 */}
              {!event && !eventResult && (
                <button
                  className={styles.enterBtn}
                  disabled={exploring || (realm?.stamina ?? 0) <= 0}
                  onClick={handleExplore}
                >
                  {(realm?.stamina ?? 0) <= 0
                    ? '体力耗尽，明日再战'
                    : exploring
                    ? '探索中...'
                    : '深入探索'}
                </button>
              )}
            </div>

            {/* 探索日志 */}
            {logs.length > 0 && (
              <div className={styles.logSection}>
                <div className={styles.logTitle}>探索记录</div>
                <div className={styles.logList}>
                  {logs.map((l, i) => (
                    <div key={i} className={styles.logItem}>{l}</div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
