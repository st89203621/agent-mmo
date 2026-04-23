import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { fetchMessageBoard, postBoardMessage } from '../../services/api';
import { toast } from '../../store/toastStore';
import type { BoardMessage } from '../../types';
import page from '../../styles/page.module.css';

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)  return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

export default function MessageBoardPage() {
  const navigateTo = useGameStore(s => s.navigateTo);
  const { playerName } = usePlayerStore();
  const [tab, setTab] = useState<'world' | 'zone'>('world');
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
    if (!input.trim()) return;
    if (input.length > 140) { toast.error('留言不能超过140字'); return; }
    setPosting(true);
    try {
      const msg = await postBoardMessage(input.trim(), tab === 'zone' ? 'main_city' : undefined);
      setMessages(prev => [msg, ...prev]);
      setInput('');
      toast.success('留言成功');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '发送失败');
    }
    setPosting(false);
  }, [input, tab]);

  return (
    <div className={page.page}>
      <div className={page.header}>
        <button
          onClick={() => navigateTo('scene')}
          style={{ position: 'absolute', left: 16, top: 16, background: 'none', border: 'none', color: 'var(--ink)', opacity: 0.5, fontSize: 20, cursor: 'pointer' }}
        >←</button>
        <h2 className={page.title}>留言板</h2>
        <p className={page.subtitle}>说点什么，让世界听见</p>
      </div>

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

      {/* 输入框 */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--paper-darker)', display: 'flex', gap: 8 }}>
        <input
          style={{
            flex: 1, padding: '8px 10px', background: 'var(--paper-dark)',
            border: '1px solid var(--paper-darker)', borderRadius: 6,
            fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-ui)', outline: 'none',
          }}
          placeholder={`以${playerName || '侠客'}的名义留言...（140字内）`}
          maxLength={140}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handlePost()}
        />
        <button
          style={{
            padding: '8px 14px', background: posting ? 'none' : 'rgba(201,168,76,0.15)',
            border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6,
            fontSize: 13, color: 'var(--gold-dim)', cursor: 'pointer', fontFamily: 'var(--font-ui)',
            flexShrink: 0,
          }}
          disabled={posting || !input.trim()}
          onClick={handlePost}
        >
          {posting ? '...' : '发送'}
        </button>
      </div>

      <div className={page.scrollArea}>
        {loading ? (
          <div className={page.empty}><p>加载中...</p></div>
        ) : messages.length === 0 ? (
          <div className={page.empty}>
            <span className={page.placeholderIcon}>💬</span>
            <p>留言板空空如也</p>
            <span className={page.hint}>第一个说点什么吧</span>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              style={{
                background: 'var(--paper-dark)', border: '1px solid var(--paper-darker)',
                borderRadius: 10, padding: '12px', marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--gold-dim)', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
                  {msg.authorName}
                </span>
                <span style={{ fontSize: 11, color: 'var(--ink)', opacity: 0.4, fontFamily: 'var(--font-ui)' }}>
                  {timeAgo(msg.createdAt)}
                </span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--font-ui)', lineHeight: 1.6, margin: 0 }}>
                {msg.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
