import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDialogueStore } from '../../store/dialogueStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import {
  startDialogue, sendChoice, sendFreeInput, endDialogue,
  streamStartDialogue, streamChoice, streamFreeInput,
  fetchNpcs, fetchRelations, parseChoices, generateSceneImage,
  type DialogueData,
} from '../../services/api';
import FateBar from '../common/FateBar';
import type { DialogueChoice, Emotion } from '../../types';
import styles from './StoryPage.module.css';

export default function StoryPage() {
  const dialogue = useDialogueStore();
  const player = usePlayerStore();
  const game = useGameStore();
  const [freeInput, setFreeInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialogueError, setDialogueError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const currentRelation = player.relations.find((r) => r.npcId === dialogue.npcId);

  // 加载NPC列表
  useEffect(() => {
    if (game.npcsInScene.length === 0) {
      fetchNpcs(player.currentWorldIndex)
        .then((res) => game.setNpcsInScene(res.npcs))
        .catch(() => {});
    }
    if (player.relations.length === 0 && player.playerId) {
      fetchRelations()
        .then((res) => player.setRelations(res.relations))
        .catch(() => {});
    }
  }, [player.currentWorldIndex, player.playerId]);

  // 自动滚动
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [dialogue.messages.length, dialogue.currentText]);

  /** 处理complete事件 */
  const handleComplete = useCallback((data: DialogueData) => {
    const choices = parseChoices(data.choicesJson);
    dialogue.completeMessage({
      sessionId: data.sessionId,
      speaker: data.speaker,
      emotion: (data.emotion || 'calm') as Emotion,
      text: data.text,
      choices,
      allowFreeInput: data.allowFreeInput,
      fateDelta: data.fateDelta,
      trustDelta: data.trustDelta,
    });
    setLoading(false);
  }, []);

  /** fallback：非流式处理 */
  const handleFallbackComplete = useCallback((data: DialogueData) => {
    handleComplete(data);
  }, [handleComplete]);

  /** 开始对话（SSE流式） */
  const handleStartDialogue = useCallback(async (npcId: string) => {
    setLoading(true);
    setDialogueError('');
    const npc = game.npcsInScene.find((n) => n.npcId === npcId);

    // 并行请求场景图片（不阻塞对话）
    dialogue.setSceneImageLoading(true);
    generateSceneImage(npcId, player.currentWorldIndex)
      .then((res) => dialogue.setSceneImage(res.imageUrl))
      .catch(() => dialogue.setSceneImageLoading(false));

    abortRef.current = streamStartDialogue(
      { npcId, worldIndex: player.currentWorldIndex },
      {
        onSessionId: (sessionId) => {
          dialogue.startDialogue(sessionId, npcId, npc?.npcName || '');
          dialogue.setStreaming(true);
        },
        onChunk: (text) => dialogue.appendStreamText(text),
        onComplete: (data) => {
          dialogue.setStreaming(false);
          handleComplete(data);
        },
        onError: async (err) => {
          console.warn('SSE失败，回退到非流式:', err);
          try {
            const data = await startDialogue(npcId, player.currentWorldIndex);
            dialogue.startDialogue(data.sessionId, npcId, npc?.npcName || data.speaker || '');
            handleFallbackComplete(data);
          } catch (e) {
            console.error(e);
            setDialogueError(e instanceof Error ? e.message : '连接失败，请检查后端服务');
            setLoading(false);
          }
        },
      },
    );
  }, [player.currentWorldIndex, game.npcsInScene]);

  /** 选择选项（SSE流式） */
  const handleChoice = useCallback((choice: DialogueChoice) => {
    if (loading) return;
    setLoading(true);
    dialogue.setStreaming(true);
    dialogue.resetStreamText();

    player.updateRelation(dialogue.npcId, choice.weight.fate, choice.weight.trust);

    abortRef.current = streamChoice(
      { sessionId: dialogue.sessionId, choiceId: choice.id, npcId: dialogue.npcId, worldIndex: player.currentWorldIndex },
      {
        onChunk: (text) => dialogue.appendStreamText(text),
        onComplete: (data) => {
          dialogue.setStreaming(false);
          handleComplete(data);
        },
        onError: async () => {
          try {
            const data = await sendChoice(dialogue.sessionId, choice.id, dialogue.npcId, player.currentWorldIndex);
            dialogue.setStreaming(false);
            handleFallbackComplete(data);
          } catch (e) { console.error(e); setLoading(false); dialogue.setStreaming(false); }
        },
      },
    );
  }, [loading, dialogue.npcId, dialogue.sessionId, player.currentWorldIndex]);

  /** 自由输入（SSE流式） */
  const handleFreeInput = useCallback(() => {
    if (!freeInput.trim() || loading) return;
    const text = freeInput.trim();
    setFreeInput('');
    setLoading(true);
    dialogue.setStreaming(true);
    dialogue.resetStreamText();

    abortRef.current = streamFreeInput(
      { sessionId: dialogue.sessionId, text, npcId: dialogue.npcId, worldIndex: player.currentWorldIndex },
      {
        onChunk: (chunk) => dialogue.appendStreamText(chunk),
        onComplete: (data) => {
          dialogue.setStreaming(false);
          handleComplete(data);
        },
        onError: async () => {
          try {
            const data = await sendFreeInput(dialogue.sessionId, text, dialogue.npcId, player.currentWorldIndex);
            dialogue.setStreaming(false);
            handleFallbackComplete(data);
          } catch (e) { console.error(e); setLoading(false); dialogue.setStreaming(false); }
        },
      },
    );
  }, [freeInput, loading, dialogue.npcId, dialogue.sessionId, player.currentWorldIndex]);

  /** 结束对话 */
  const handleEndDialogue = useCallback(async () => {
    abortRef.current?.abort();
    if (dialogue.sessionId) {
      await endDialogue(dialogue.sessionId).catch(() => {});
    }
    dialogue.endDialogue();
    dialogue.reset();
  }, [dialogue.sessionId]);

  // ── NPC选择界面 ──
  if (!dialogue.isActive) {
    return (
      <div className={styles.page}>
        <div className={styles.sceneHeader}>
          <h2 className={styles.sceneTitle}>
            {game.currentBookWorld?.title || '七世轮回书'}
          </h2>
          <p className={styles.sceneDesc}>选择一位角色开始对话</p>
        </div>
        <div className={styles.npcList}>
          {game.npcsInScene.map((npc) => {
            const rel = player.relations.find((r) => r.npcId === npc.npcId);
            return (
              <button
                key={npc.npcId}
                className={styles.npcCard}
                onClick={() => handleStartDialogue(npc.npcId)}
                disabled={loading}
              >
                <div className={styles.npcAvatar}>{npc.npcName.charAt(0)}</div>
                <div className={styles.npcCardInfo}>
                  <span className={styles.npcCardName}>{npc.npcName}</span>
                  <span className={styles.npcCardRole}>{npc.role || npc.bookTitle}</span>
                </div>
                {rel && <FateBar fateScore={rel.fateScore} trustScore={rel.trustScore} npcName="" compact />}
              </button>
            );
          })}
          {game.npcsInScene.length === 0 && (
            <div className={styles.emptyHint}>
              <p>暂无可交互的角色</p>
              <p className={styles.hintText}>请确保后端服务已启动</p>
            </div>
          )}
        </div>
        {dialogueError && (
          <div className={styles.errorHint}>
            <p>{dialogueError}</p>
          </div>
        )}
        {loading && (
          <div className={styles.loadingHint}>
            <p>连接中...</p>
          </div>
        )}
      </div>
    );
  }

  // ── 对话进行中 ──
  const lastMsg = dialogue.messages[dialogue.messages.length - 1];

  return (
    <div className={styles.page}>
      {/* 场景图片 + NPC信息合并区域 */}
      <div className={styles.scenePortrait}>
        {dialogue.sceneImageUrl ? (
          <img src={dialogue.sceneImageUrl} alt="场景" className={styles.sceneImage} />
        ) : dialogue.sceneImageLoading ? (
          <div className={styles.sceneImagePlaceholder}>
            <span className={styles.sceneImageLoadingText}>绘制场景中...</span>
          </div>
        ) : (
          <div className={styles.sceneImagePlaceholder}>
            <span className={styles.sceneFallbackName}>{dialogue.npcName}</span>
          </div>
        )}
        <div className={styles.sceneOverlay} />
        <div className={styles.sceneNpcInfo}>
          <span className={styles.sceneNpcName}>{dialogue.npcName}</span>
          <span className={styles.sceneNpcEmotion} style={{ background: `var(--emotion-${dialogue.currentEmotion})` }}>
            {dialogue.currentEmotion === 'calm' ? '平静' : dialogue.currentEmotion === 'happy' ? '欢喜' :
             dialogue.currentEmotion === 'sad' ? '悲伤' : dialogue.currentEmotion === 'angry' ? '愤怒' :
             dialogue.currentEmotion === 'shy' ? '娇羞' : dialogue.currentEmotion === 'tender' ? '温柔' :
             dialogue.currentEmotion === 'cold' ? '冷漠' : dialogue.currentEmotion}
          </span>
        </div>
        {currentRelation && (
          <div className={styles.sceneFateBar}>
            <FateBar fateScore={currentRelation.fateScore} trustScore={currentRelation.trustScore} npcName="" compact />
          </div>
        )}
      </div>

      <div className={styles.dialogueArea} ref={scrollRef}>
        {showHistory && dialogue.messages.slice(0, -1).map((msg, i) => (
          <div key={i} className={styles.historyMsg}>
            <span className={styles.historySpeaker}>{msg.speaker}</span>
            <p className={styles.historyText}>{msg.text}</p>
          </div>
        ))}

        {!showHistory && dialogue.messages.length > 1 && (
          <button className={styles.showHistoryBtn} onClick={() => setShowHistory(true)}>
            ↑ 查看历史对话 ({dialogue.messages.length - 1}条)
          </button>
        )}

        {/* 流式输出中 */}
        {dialogue.isStreaming && (
          <div className={styles.dialogueBubble}>
            <p className={styles.dialogueText}>
              {dialogue.currentText}
              <span className={styles.cursor}>|</span>
            </p>
          </div>
        )}

        {/* 完成的最新消息 */}
        {!dialogue.isStreaming && lastMsg && (
          <div className={styles.dialogueBubble}>
            <p className={styles.dialogueText}>{lastMsg.text}</p>
          </div>
        )}

        {/* loading等待 */}
        {loading && !dialogue.isStreaming && (
          <div className={styles.dialogueBubble}>
            <p className={styles.dialogueText}>
              <span className={styles.cursor}>···</span>
            </p>
          </div>
        )}
      </div>

      <div className={styles.actionArea}>
        {!loading && !dialogue.isStreaming && dialogue.currentChoices.length > 0 && (
          <div className={styles.choices}>
            {dialogue.currentChoices.map((choice) => (
              <button key={choice.id} className={styles.choiceBtn} onClick={() => handleChoice(choice)}>
                <span className={styles.choiceText}>{choice.text}</span>
                {(choice.weight.fate !== 0 || choice.weight.trust !== 0) && (
                  <span className={styles.choiceWeight}>
                    {choice.weight.fate > 0 && <span className={styles.fateUp}>缘+{choice.weight.fate}</span>}
                    {choice.weight.trust > 0 && <span className={styles.trustUp}>信+{choice.weight.trust}</span>}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {!loading && !dialogue.isStreaming && dialogue.allowFreeInput && (
          <div className={styles.freeInputRow}>
            <input
              className={styles.freeInput}
              value={freeInput}
              onChange={(e) => setFreeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFreeInput()}
              placeholder="自由对话..."
              maxLength={100}
            />
            <button className={styles.sendBtn} onClick={handleFreeInput} disabled={!freeInput.trim()}>
              发送
            </button>
          </div>
        )}

        <button className={styles.endBtn} onClick={handleEndDialogue}>
          结束对话
        </button>
      </div>
    </div>
  );
}
