import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { fetchCurrentZone, fetchMessageBoard, postBoardMessage } from '../../services/api';
import { toast } from '../../store/toastStore';
import type { BoardMessage, BoardMessageType } from '../../types';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

type Scope = 'world' | 'zone';
type FilterKey = 'all' | 'system' | 'ad' | 'trade' | 'user';

interface ZoneScope { id: string; name: string; }

const FILTERS: { key: FilterKey; label: string; match: (m: BoardMessage) => boolean }[] = [
  { key: 'all', label: '全部', match: () => true },
  { key: 'system', label: '公告', match: (m) => (m.type ?? 'user') === 'system' },
  { key: 'ad', label: '广告', match: (m) => (m.type ?? 'user') === 'ad' },
  { key: 'trade', label: '交易', match: (m) => (m.type ?? 'user') === 'trade' },
  { key: 'user', label: '闲谈', match: (m) => (m.type ?? 'user') === 'user' },
];

const POST_TYPES: { key: 'user' | 'ad' | 'trade'; label: string }[] = [
  { key: 'user', label: '闲' },
  { key: 'ad', label: '告' },
  { key: 'trade', label: '易' },
];

function timeAgo(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

function itemClass(type: BoardMessageType | undefined) {
  switch (type) {
    case 'system': return styles.bbItemSys;
    case 'ad': return styles.bbItemAd;
    case 'trade': return styles.bbItemTrade;
    default: return '';
  }
}

export default function MessageBoardPage() {
  usePageBackground(PAGE_BG.MESSAGE_BOARD);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const playerName = usePlayerStore((s) => s.playerName);

  const [scope, setScope] = useState<Scope>('world');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [postType, setPostType] = useState<'user' | 'ad' | 'trade'>('user');
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [posting, setPosting] = useState(false);
  const [zone, setZone] = useState<ZoneScope | null>(null);
  const [zoneFailed, setZoneFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentZone()
      .then((info) => {
        if (cancelled) return;
        if (info?.zoneId) {
          setZone({ id: info.zoneId, name: info.name || info.zoneId });
        } else {
          setZoneFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setZoneFailed(true);
      });
    return () => { cancelled = true; };
  }, []);

  const scopeTabs = useMemo<{ key: Scope; label: string; zoneId?: string }[]>(() => {
    const list: { key: Scope; label: string; zoneId?: string }[] = [
      { key: 'world', label: '全 服', zoneId: undefined },
    ];
    if (zone) list.push({ key: 'zone', label: '本 区', zoneId: zone.id });
    return list;
  }, [zone]);

  useEffect(() => {
    if (scope === 'zone' && !zone) setScope('world');
  }, [scope, zone]);

  const zoneId = scopeTabs.find((t) => t.key === scope)?.zoneId;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMessageBoard(zoneId);
      setMessages(res.messages || []);
    } catch {
      setMessages([]);
    }
    setLoading(false);
  }, [zoneId]);

  useEffect(() => { load(); }, [load]);

  const handlePost = useCallback(async () => {
    const content = input.trim();
    if (!content) return;
    if (content.length > 140) { toast.error('留言不能超过 140 字'); return; }
    setPosting(true);
    try {
      const msg = await postBoardMessage(content, zoneId, postType);
      setMessages((prev) => [msg, ...prev]);
      setInput('');
      toast.success('留言成功');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '发送失败');
    }
    setPosting(false);
  }, [input, zoneId, postType]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: messages.length, system: 0, ad: 0, trade: 0, user: 0 };
    messages.forEach((m) => {
      const t = (m.type ?? 'user') as FilterKey;
      if (c[t] !== undefined) c[t]++;
    });
    return c;
  }, [messages]);

  const filtered = useMemo(() => {
    const def = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
    return messages.filter(def.match);
  }, [messages, filter]);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>留 言 板</span>
            <span className={styles.appbarZone}>
              {scope === 'world'
                ? '全 服 · 实时刷新'
                : `本 区 · ${zone?.name || ''}`}
            </span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={load} type="button" aria-label="刷新">⟳</button>
            <button className={styles.appbarIcon} onClick={() => navigateTo('chat')} type="button" aria-label="私聊">聊</button>
          </div>
        </div>
      </div>

      <div className={styles.enchTabs}>
        {scopeTabs.map((t) => (
          <button
            key={t.key}
            className={`${styles.enchTab} ${scope === t.key ? styles.enchTabOn : ''}`.trim()}
            onClick={() => setScope(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
        {!zone && zoneFailed && (
          <span
            style={{
              flex: 1,
              padding: '10px 4px',
              textAlign: 'center',
              fontSize: 11,
              letterSpacing: 1,
              color: 'var(--text-faint)',
              fontFamily: 'var(--font-ui)',
            }}
          >
            暂无区域信息
          </span>
        )}
      </div>

      <div className={styles.bbPillTabs}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`${styles.bbPill} ${filter === f.key ? styles.bbPillOn : ''}`.trim()}
            onClick={() => setFilter(f.key)}
            type="button"
          >
            {f.label}
            {counts[f.key] > 0 && <span className={styles.bbPillCount}>{counts[f.key]}</span>}
          </button>
        ))}
      </div>

      <div className={styles.bbPostBar}>
        <div className={styles.bbPostType}>
          {POST_TYPES.map((pt) => (
            <button
              key={pt.key}
              className={`${styles.bbPostTypeBtn} ${postType === pt.key ? styles.bbPostTypeBtnOn : ''}`.trim()}
              onClick={() => setPostType(pt.key)}
              type="button"
              aria-label={pt.key}
            >
              {pt.label}
            </button>
          ))}
        </div>
        <input
          className={styles.bbPostInput}
          placeholder={`以 ${playerName || '侠客'} 的名义留言 · 140 字内`}
          maxLength={140}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handlePost();
            }
          }}
        />
        <button
          className={styles.bbPostSend}
          disabled={posting || !input.trim()}
          onClick={handlePost}
          type="button"
        >
          {posting ? '...' : '发 送'}
        </button>
      </div>

      <div className={styles.bbList}>
        {loading ? (
          <div className={styles.bbEmpty}>留言载入中...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.bbEmpty}>
            {filter === 'all' ? '留言板空空如也，第一个说点什么吧' : '此类留言暂无'}
          </div>
        ) : (
          filtered.map((msg) => {
            const type = (msg.type ?? 'user') as BoardMessageType;
            const pinned = type === 'system';
            return (
              <div key={msg.id} className={`${styles.bbItem} ${itemClass(type)}`.trim()}>
                <div className={styles.bbHd}>
                  <span className={styles.bbNm}>
                    {pinned && <span className={styles.bbPin}>顶</span>}
                    {msg.authorName}
                  </span>
                  <span className={styles.bbTm}>{timeAgo(msg.createdAt)}</span>
                </div>
                <div className={styles.bbTx}>{msg.content}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
