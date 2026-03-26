import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import {
  fetchChatHistory, sendChatMessage,
  type ChatMessageData,
} from '../../services/api';
import styles from './ChatPanel.module.css';

type Channel = 'world' | 'guild' | 'private';

const CHANNELS: { key: Channel; label: string; chatType: number }[] = [
  { key: 'world', label: '世界', chatType: 1 },
  { key: 'guild', label: '盟会', chatType: 3 },
  { key: 'private', label: '私聊', chatType: 2 },
];

const POLL_INTERVAL = 5000;

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ChatPanel() {
  const { playerId } = usePlayerStore();
  const myId = Number(playerId) || 0;

  const [channel, setChannel] = useState<Channel>('world');
  const [collapsed, setCollapsed] = useState(true);
  const [messages, setMessages] = useState<Record<Channel, ChatMessageData[]>>({
    world: [], guild: [], private: [],
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const chatType = CHANNELS.find((c) => c.key === channel)!.chatType;

  const loadMessages = useCallback(async (ch: Channel) => {
    const ct = CHANNELS.find((c) => c.key === ch)!.chatType;
    try {
      const res = await fetchChatHistory(ct);
      setMessages((prev) => ({ ...prev, [ch]: res.messages }));
    } catch { /* 静默 */ }
  }, []);

  // 初次加载 + 轮询
  useEffect(() => {
    loadMessages(channel);
    pollRef.current = setInterval(() => loadMessages(channel), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [channel, loadMessages]);

  // 自动滚动到底部
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, channel, collapsed]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const msg = await sendChatMessage(text, chatType);
      setMessages((prev) => ({
        ...prev,
        [channel]: [...prev[channel], msg],
      }));
      setInput('');
    } catch { /* 静默 */ }
    setSending(false);
  }, [input, sending, chatType, channel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const currentMessages = messages[channel];

  return (
    <div className={`${styles.chatWrapper} ${collapsed ? styles.collapsed : ''}`}>
      {/* 频道标签 */}
      <div className={styles.chatHeader}>
        {CHANNELS.map((ch) => (
          <button
            key={ch.key}
            className={`${styles.channelTab} ${channel === ch.key ? styles.channelTabActive : ''}`}
            onClick={() => { setChannel(ch.key); if (collapsed) setCollapsed(false); }}
          >
            {ch.label}
          </button>
        ))}
        <button className={styles.toggleBtn} onClick={() => setCollapsed((v) => !v)}>
          {collapsed ? '展开' : '收起'}
        </button>
      </div>

      {/* 消息列表 */}
      {!collapsed && (
        <>
          <div className={styles.messageList} ref={listRef}>
            {currentMessages.length === 0 ? (
              <div className={styles.emptyHint}>暂无消息</div>
            ) : (
              currentMessages.map((msg) => (
                <div key={msg.messageId} className={styles.msgItem}>
                  <span className={`${styles.msgSender} ${msg.senderId === myId ? styles.msgSenderSelf : ''}`}>
                    {msg.senderName}
                  </span>
                  <span className={styles.msgContent}>{msg.content}</span>
                  <span className={styles.msgTime}>{formatTime(msg.timestamp)}</span>
                </div>
              ))
            )}
          </div>

          {/* 输入栏 */}
          <div className={styles.inputBar}>
            <input
              className={styles.chatInput}
              placeholder={`发送${CHANNELS.find((c) => c.key === channel)!.label}消息…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={200}
            />
            <button className={styles.sendBtn} onClick={handleSend} disabled={sending || !input.trim()}>
              发送
            </button>
          </div>
        </>
      )}
    </div>
  );
}
