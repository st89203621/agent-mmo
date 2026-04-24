import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchChatHistory, fetchPrivateChat, sendChatMessage } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';
import type { ChatChannelMessage } from '../../../types';
import styles from './LunhuiPages.module.css';

const CHANNELS = [
  { key: 'world', label: '世界', chatType: 1 },
  { key: 'guild', label: '盟会', chatType: 2 },
  { key: 'team', label: '队伍', chatType: 3 },
] as const;

type Channel = typeof CHANNELS[number]['key'] | 'private';

export default function ChatPage() {
  const params = useGameStore((s) => s.pageParams);
  const [channel, setChannel] = useState<Channel>(params.targetId ? 'private' : 'world');
  const [messages, setMessages] = useState<ChatChannelMessage[]>([]);
  const [input, setInput] = useState('');
  const targetId = Number(params.targetId || 0);
  const targetName = String(params.targetName || '玩友');

  const load = useCallback(async () => {
    try {
      if (channel === 'private' && targetId) {
        const res = await fetchPrivateChat(targetId);
        setMessages((res.messages || []).map((item) => ({
          messageId: item.messageId,
          senderId: item.senderId,
          senderName: item.senderName,
          content: item.content,
          channel: 'private',
          timestamp: item.timestamp,
          receiverId: item.receiverId,
        })));
      } else {
        const current = CHANNELS.find((item) => item.key === channel) || CHANNELS[0];
        const res = await fetchChatHistory(current.chatType);
        setMessages((res.messages || []).map((item) => ({
          messageId: item.messageId,
          senderId: item.senderId,
          senderName: item.senderName,
          content: item.content,
          channel: current.key,
          timestamp: item.timestamp,
          receiverId: item.receiverId,
        })));
      }
    } catch {
      setMessages([]);
    }
  }, [channel, targetId]);

  useEffect(() => {
    load();
  }, [load]);

  const channelLabel = useMemo(() => (
    channel === 'private' ? `私聊 · ${targetName}` : CHANNELS.find((item) => item.key === channel)?.label || '世界'
  ), [channel, targetName]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content) return;
    const chatType = channel === 'private' ? 4 : (CHANNELS.find((item) => item.key === channel)?.chatType || 1);
    const sent = await sendChatMessage(content, chatType, channel === 'private' ? targetId : 0);
    setMessages((prev) => [...prev, {
      messageId: sent.messageId,
      senderId: sent.senderId,
      senderName: sent.senderName,
      content: sent.content,
      channel,
      timestamp: sent.timestamp,
      receiverId: sent.receiverId,
    }]);
    setInput('');
  }, [channel, input, targetId]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>频道聊天</div>
        <div className={styles.titleRow}>
          <div className={styles.title}>聊天</div>
          <div className={styles.subtitle}>{channelLabel}</div>
        </div>
      </div>

      <div className={styles.scroll}>
        <div className={styles.tabs}>
          {CHANNELS.map((item) => (
            <button
              key={item.key}
              className={`${styles.tab} ${channel === item.key ? styles.tabActive : ''}`}
              onClick={() => setChannel(item.key)}
            >
              {item.label}
            </button>
          ))}
          {targetId > 0 && (
            <button
              className={`${styles.tab} ${channel === 'private' ? styles.tabActive : ''}`}
              onClick={() => setChannel('private')}
            >
              私聊
            </button>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.list}>
            {messages.length === 0 ? (
              <div className={styles.empty}>暂时还没有聊天记录</div>
            ) : messages.map((item) => (
              <div key={item.messageId} className={styles.card}>
                <div className={styles.row}>
                  <div className={styles.name}>{item.senderName}</div>
                  <div className={styles.meta}>{new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className={styles.desc}>{item.content}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>发送消息</span>
          </div>
          <div className={styles.row}>
            <input
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入要说的话…"
            />
            <button className={styles.button} onClick={handleSend}>发送</button>
          </div>
        </div>
      </div>
    </div>
  );
}
