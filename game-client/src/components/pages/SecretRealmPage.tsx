import { useCallback, useEffect, useState } from 'react';
import { toast } from '../../store/toastStore';
import { useGameStore } from '../../store/gameStore';
import {
  fetchRealmStatus,
  enterRealm,
  exploreRealm,
  resolveRealmEvent,
  type RealmData,
  type RealmEvent,
} from '../../services/api';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

const EVENT_TYPE: Record<string, { label: string; cls: string }> = {
  battle: { label: '战 斗', cls: 'srEvtTagBattle' },
  treasure: { label: '宝 箱', cls: 'srEvtTagTreasure' },
  heal: { label: '回 复', cls: 'srEvtTagHeal' },
  mystery: { label: '奇 遇', cls: 'srEvtTagMystery' },
};

const FLOOR_NAMES = [
  '混沌边境',
  '星陨荒原',
  '幽冥暗道',
  '灵脉深渊',
  '太虚幻境',
  '九幽冥殿',
  '鸿蒙核心',
  '创世祭坛',
];

function useCountdown(endTime: number) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!endTime) {
      setText('');
      return;
    }
    const tick = () => {
      const diff = Math.max(0, endTime - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setText(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return text;
}

interface EventResult {
  win: boolean;
  text: string;
  loot?: { icon: string; name: string }[];
}

export default function SecretRealmPage() {
  usePageBackground(PAGE_BG.SECRET_REALM);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [realm, setRealm] = useState<RealmData | null>(null);
  const [event, setEvent] = useState<RealmEvent | null>(null);
  const [eventResult, setEventResult] = useState<EventResult | null>(null);
  const [exploring, setExploring] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const endTime = realm?.endTime ?? Date.now() + 48 * 3600000;
  const countdown = useCountdown(endTime);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchRealmStatus();
      setRealm(data);
      setLogs(data.logs || []);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleEnter = useCallback(async () => {
    setExploring(true);
    try {
      const data = await enterRealm();
      setRealm(data);
      setLogs(data.logs || []);
      toast.info('踏入鸿蒙秘境');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '进入失败');
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
      setRealm((prev) =>
        prev
          ? {
              ...prev,
              stamina: data.stamina ?? prev.stamina,
              currentFloor: data.currentFloor ?? prev.currentFloor,
            }
          : prev,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '探索失败');
    }
    setExploring(false);
  }, [exploring]);

  const handleResolve = useCallback(
    async (choice: number) => {
      if (resolving || !event) return;
      setResolving(true);
      try {
        const res = await resolveRealmEvent(event.eventId, choice);
        setEventResult({ win: res.success, text: res.resultText, loot: res.loot });
        setRealm((prev) =>
          prev
            ? {
                ...prev,
                stamina: res.stamina ?? prev.stamina,
                currentFloor: res.currentFloor ?? prev.currentFloor,
              }
            : prev,
        );
        setLogs((prev) =>
          [res.logEntry || (res.success ? '顺利通过' : '挑战失败'), ...prev].slice(0, 20),
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '处理失败');
      }
      setResolving(false);
    },
    [resolving, event],
  );

  const isEnded = realm?.status === 'ended';
  const isActive = realm?.status === 'active';
  const stamina = realm?.stamina ?? 0;
  const maxStamina = realm?.maxStamina ?? 100;
  const staminaPct = maxStamina ? Math.max(0, (stamina / maxStamina) * 100) : 100;
  const floor = realm?.currentFloor ?? 1;
  const noStamina = stamina <= 0;

  const evtTag = event ? EVENT_TYPE[event.type] : null;

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>秘 境</span>
            <span className={styles.appbarZone}>鸿 蒙 遗 迹 · 限 时 开 放</span>
          </div>
          <div className={styles.appbarIcons}>
            <button
              type="button"
              className={styles.appbarIcon}
              onClick={() => navigateTo('home')}
              aria-label="返回"
            >
              回
            </button>
          </div>
        </div>
      </div>

      <div className={styles.srTimer}>
        <span>距 关 闭</span>
        <span className={styles.srTimerV}>{countdown}</span>
      </div>

      {isEnded ? (
        <div className={styles.srEnd}>
          <div className={styles.srEndRune}>虚</div>
          <div className={styles.srEndTitle}>秘境已关闭</div>
          <div className={styles.srEndDesc}>等待下次开启</div>
        </div>
      ) : (
        <>
          <div className={styles.srScene}>
            <div className={styles.srSceneGlow} />
            <div className={styles.srRune}>玄</div>
            <div className={styles.srFloor}>
              {isActive && (
                <span className={styles.srFloorBadge}>第 {floor} 层</span>
              )}
              {isActive
                ? FLOOR_NAMES[(floor - 1) % FLOOR_NAMES.length]
                : '鸿蒙秘境入口'}
            </div>
          </div>

          {isActive && (
            <div className={styles.srStamina}>
              <span className={styles.srStaminaK}>探 索 体 力</span>
              <div className={styles.srStaminaBar}>
                <div className={styles.srStaminaFill} style={{ width: `${staminaPct}%` }} />
              </div>
              <span className={styles.srStaminaV}>
                {stamina} / {maxStamina}
              </span>
            </div>
          )}

          <div className={styles.srBody}>
            {!isActive ? (
              <>
                <button
                  type="button"
                  className={styles.srEnterBtn}
                  disabled={exploring}
                  onClick={handleEnter}
                >
                  {exploring ? '正 在 传 送 ...' : '踏 入 秘 境'}
                </button>
                <div className={styles.srHint}>经验翻倍 · 稀有怪物 · 隐藏宝箱</div>
              </>
            ) : event && !eventResult ? (
              <div className={styles.srCard}>
                <div className={styles.srCardHead}>
                  <span className={styles.srEvtIcon}>{event.icon || '符'}</span>
                  <span className={styles.srEvtName}>{event.title}</span>
                  {evtTag && (
                    <span className={`${styles.srEvtTag} ${styles[evtTag.cls]}`}>
                      {evtTag.label}
                    </span>
                  )}
                </div>
                <div className={styles.srEvtDesc}>{event.description}</div>
                <div className={styles.srEvtActs}>
                  {(event.choices || ['挑 战', '跳 过']).map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`${styles.srBtn} ${i === 0 ? styles.srBtnPrim : styles.srBtnSec}`}
                      disabled={resolving}
                      onClick={() => handleResolve(i)}
                    >
                      {resolving ? '...' : c}
                    </button>
                  ))}
                </div>
              </div>
            ) : eventResult ? (
              <div className={styles.srCard}>
                <div
                  className={`${styles.srEvtResult} ${eventResult.win ? styles.srEvtResultWin : styles.srEvtResultLose}`}
                >
                  {eventResult.text}
                </div>
                {eventResult.loot && eventResult.loot.length > 0 && (
                  <div className={styles.srLootGrid}>
                    {eventResult.loot.map((l, i) => (
                      <div key={i} className={styles.srLootItem}>
                        <span className={styles.srLootIcon}>{l.icon}</span>
                        {l.name}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className={`${styles.srBtn} ${styles.srBtnPrim}`}
                  disabled={exploring || noStamina}
                  onClick={() => {
                    setEvent(null);
                    setEventResult(null);
                    handleExplore();
                  }}
                >
                  {noStamina ? '体 力 耗 尽' : '继 续 探 索'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.srEnterBtn}
                disabled={exploring || noStamina}
                onClick={handleExplore}
              >
                {noStamina
                  ? '体 力 耗 尽 · 明 日 再 战'
                  : exploring
                    ? '探 索 中 ...'
                    : '深 入 探 索'}
              </button>
            )}

            {logs.length > 0 && (
              <div className={styles.srLogSect}>
                <div className={styles.srLogH}>— 探 索 记 录 —</div>
                <div className={styles.srLogList}>
                  {logs.map((l, i) => (
                    <div key={i} className={styles.srLogItem}>
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
