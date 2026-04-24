import { useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { fetchMessageBoard, postBoardMessage } from '../../services/api';
import { toast } from '../../store/toastStore';
import type { BoardMessage } from '../../types';
import page from '../../styles/page.module.css';

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return '刚刚';
  if (diff < 3600)  return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

type Scope = 'world' | 'zone';

export default function MessageBoardPage() {
  const { playerName } = usePlayerStore();
  const [tab, setTab] = useState<Scope>('world');
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMessageBoard(tab === 'zone' ? 'main_city' : undefined);
      setMessages(res.messages || []);
    } catch { setMessages([]); }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const handlePost = useCallback(async () => {
    const content = input.trim();
    if (!content) return;
    if (content.length > 140) { toast.error('留言不能超过140字'); return; }
    setPosting(true);
    try {
      const msg = await postBoardMessage(content, tab === 'zone' ? 'main_city' : undefined);
      setMessages(prev => [msg, ...prev]);
      setInput('');
      toast.success('留言成功');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '发送失败');
    }
    setPosting(false);
  }, [input, tab]);

  return (
    <div className={page.page}>
      <div className={page.tabRow}>
        {([['world', '全服'], ['zone', '本区']] as const).map(([k, l]) => (
          <button
            key={k}
            className={`${page.tab} ${tab === k ? page.tabActive : ''}`}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>

      <div className={page.searchRow}>
        <div className={page.cardRow}>
          <input
            className={page.input}
            placeholder={`以${playerName || '侠客'}的名义留言…（140字内）`}
            maxLength={140}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handlePost()}
          />
          <button
            className={page.secondaryBtn}
            disabled={posting || !input.trim()}
            onClick={handlePost}
            style={{ flexShrink: 0 }}
          >
            {posting ? '…' : '发送'}
          </button>
        </div>
      </div>

      <div className={page.scrollArea}>
        {loading ? (
          <div className={page.empty}><p>加载中…</p></div>
        ) : messages.length === 0 ? (
          <div className={page.empty}>
            <span className={page.placeholderIcon}>💬</span>
            <p>留言板空空如也</p>
            <span className={page.hint}>第一个说点什么吧</span>
          </div>
        ) : messages.map(msg => (
          <div key={msg.id} className={page.card}>
            <div className={page.cardHeader}>
              <span className={page.cardTitle} style={{ color: 'var(--gold-dim)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600 }}>
                {msg.authorName}
              </span>
              <span className={page.cardMeta}>{timeAgo(msg.createdAt)}</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--font-ui)', lineHeight: 1.6, margin: 0 }}>
              {msg.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
