import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchChatHistory, fetchPrivateChat, sendChatMessage } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';
import type { ChatChannelMessage } from '../../../types';
import styles from './LunhuiPages.module.css';
import { usePageBackground } from '../../common/PageShell';
import { PAGE_BG } from '../../../data/pageBackgrounds';

const CHANNELS = [
  { key: 'world', label: '世界', chatType: 1 },
  { key: 'guild', label: '盟会', chatType: 2 },
  { key: 'team', label: '队伍', chatType: 3 },
] as const;

type Channel = typeof CHANNELS[number]['key'] | 'private';

export default function ChatPage() {
  usePageBackground(PAGE_BG.CHAT);
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

  const channelLabel = useMemo(
    () => (channel === 'private' ? targetName : CHANNELS.find((item) => item.key === channel)?.label || '世界'),
    [channel, targetName],
  );

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content) return;
    const chatType = channel === 'private' ? 4 : (CHANNELS.find((item) => item.key === channel)?.chatType || 1);
    const sent = await sendChatMessage(content, chatType, channel === 'private' ? targetId : 0);
    setMessages((prev) => [
      ...prev,
      {
        messageId: sent.messageId,
        senderId: sent.senderId,
        senderName: sent.senderName,
        content: sent.content,
        channel,
        timestamp: sent.timestamp,
        receiverId: sent.receiverId,
      },
    ]);
    setInput('');
  }, [channel, input, targetId]);

  return (
    <div className={styles.mockPage}>
      <div className={styles.chatHead}>
        <div className={styles.chatAvatar}>{channelLabel.slice(0, 1)}</div>
        <div className={styles.chatHeadBody}>
          <div className={styles.chatName}>{channel === 'private' ? `${targetName} · Lv 24` : `${channelLabel} 频道`}</div>
          <div className={styles.chatStatus}>{channel === 'private' ? '● 在线 · 极北大陆' : '● 频道在线 · 实时同步'}</div>
        </div>
        <div className={styles.chatOps}>
          {CHANNELS.map((item) => (
            <button
              key={item.key}
              className={`${styles.chatOp} ${channel === item.key ? styles.chatOpOn : ''}`.trim()}
              onClick={() => setChannel(item.key)}
              type="button"
            >
              {item.label.slice(0, 1)}
            </button>
          ))}
          {targetId > 0 && (
            <button
              className={`${styles.chatOp} ${channel === 'private' ? styles.chatOpOn : ''}`.trim()}
              onClick={() => setChannel('private')}
              type="button"
            >
              私
            </button>
          )}
        </div>
      </div>

      <div className={styles.chatStream}>
        <div className={`${styles.chatMsg} ${styles.chatMsgSys}`}>
          <div className={styles.chatBubble}>— 今日 · 聊 天 记 录 —</div>
        </div>
        {messages.length === 0 ? (
          <div className={`${styles.chatMsg} ${styles.chatMsgSys}`}>
            <div className={styles.chatBubble}>暂无聊天记录</div>
          </div>
        ) : messages.map((item, index) => {
          const isMe = index % 2 === 1;
          return (
            <div key={item.messageId} className={`${styles.chatMsg} ${isMe ? styles.chatMsgMe : ''}`.trim()}>
              <div className={styles.chatBubble}>{item.content}</div>
              <span className={styles.chatTime}>
                {new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.chatComposer}>
        <input
          className={styles.chatInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入要说的话..."
        />
        <button className={styles.chatSend} onClick={handleSend} type="button">发 送</button>
      </div>
    </div>
  );
}
