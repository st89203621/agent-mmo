import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDialogueStore } from '../../store/dialogueStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import {
  startDialogue, sendChoice, sendFreeInput,
  streamStartDialogue, streamChoice, streamFreeInput,
  fetchNpcs, fetchRelations, parseChoices, generateSceneImage,
  fetchBookWorlds, selectBookWorld, fetchSelectedBook, updateArtStyle, addBookFromWeb,
  type DialogueData, type DialogueHistoryItem, type SelectedBookData,
} from '../../services/api';
import FateBar from '../common/FateBar';
import type { BookWorld, DialogueChoice, DialogueMessage, Emotion } from '../../types';
import { EMOTION_LABELS } from '../../constants/emotion';
import styles from './StoryPage.module.css';

const ART_STYLE_PRESETS = [
  '水墨仙侠风', '赛博朋克风', '日系动漫风', '油画写实风',
  '像素复古风', '暗黑哥特风', '清新水彩风', '蒸汽朋克风',
];

export default function StoryPage() {
  const dialogue = useDialogueStore();
  const player = usePlayerStore();
  const game = useGameStore();

  const [loading, setLoading] = useState(false);
  const [dialogueError, setDialogueError] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // 选书阶段
  const [books, setBooks] = useState<BookWorld[]>([]);
  const [selectedBook, setSelectedBook] = useState<SelectedBookData | null>(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [artStyle, setArtStyle] = useState('');
  const [customArtInput, setCustomArtInput] = useState('');

  // 添加书籍
  const [showAddBook, setShowAddBook] = useState(false);
  const [addBookTitle, setAddBookTitle] = useState('');
  const [addBookLoading, setAddBookLoading] = useState(false);
  const [addBookMsg, setAddBookMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 对话阶段
  const [freeInput, setFreeInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 滑动手势
  const touchStartX = useRef(0);
  const touchDelta = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    touchStartX.current = x;
    touchDelta.current = 0;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    touchDelta.current = x - touchStartX.current;
    setSwipeOffset(touchDelta.current);
  }, []);
  const handleTouchEnd = useCallback(() => {
    const threshold = 60;
    const total = dialogue.sceneImages.length;
    if (touchDelta.current < -threshold && galleryIndex < total - 1) {
      setGalleryIndex((i) => i + 1);
    } else if (touchDelta.current > threshold && galleryIndex > 0) {
      setGalleryIndex((i) => i - 1);
    }
    touchDelta.current = 0;
    setSwipeOffset(0);
  }, [galleryIndex, dialogue.sceneImages.length]);

  const currentRelation = player.relations.find((r) => r.npcId === dialogue.npcId);
  // 初始化
  useEffect(() => {
    setBookLoading(true);
    const wi = player.currentWorldIndex || 1;
    Promise.all([
      fetchSelectedBook(wi).catch(() => ({ bookId: '' }) as SelectedBookData),
      player.relations.length === 0 && player.playerId
        ? fetchRelations().then((res) => player.setRelations(res.relations)).catch(() => {})
        : Promise.resolve(),
    ]).then(([sel]) => {
      if (sel && sel.bookId) {
        setSelectedBook(sel);
        setArtStyle(sel.customArtStyle || sel.artStyle || '');
        fetchNpcs(wi, sel.title)
          .then((res) => game.setNpcsInScene(res.npcs))
          .catch(() => {});
      }
    }).finally(() => setBookLoading(false));
  }, [player.currentWorldIndex, player.playerId]);

  // 自动对话触发
  useEffect(() => {
    const autoNpcId = game.pageParams?.autoNpcId as string | undefined;
    if (autoNpcId && selectedBook && !dialogue.isActive && !loading) {
      const npc = game.npcsInScene.find(n => n.npcId === autoNpcId);
      if (npc) {
        handleStartDialogue(autoNpcId);
        game.navigateTo('story');
      }
    }
  }, [game.pageParams?.autoNpcId, game.npcsInScene.length, selectedBook]);

  // 自动滚动
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [dialogue.messages.length, dialogue.currentText]);

  // ── 选书逻辑 ──
  const loadBooks = useCallback(() => {
    if (books.length > 0) return;
    fetchBookWorlds().then((res) => setBooks(res.books)).catch(() => {});
  }, [books.length]);

  const handleSelectBook = useCallback(async (book: BookWorld) => {
    setLoading(true);
    const wi = player.currentWorldIndex || 1;
    const style = artStyle || book.artStyle || '';
    try {
      await selectBookWorld(wi, book.id, style);
      const sel: SelectedBookData = {
        bookId: book.id, title: book.title, author: book.author,
        category: book.category, loreSummary: book.loreSummary,
        artStyle: book.artStyle, colorPalette: book.colorPalette,
        languageStyle: book.languageStyle, customArtStyle: style || null,
      };
      setSelectedBook(sel);
      setArtStyle(style || book.artStyle || '');
      game.setBookWorld(book);
      const res = await fetchNpcs(wi, book.title);
      game.setNpcsInScene(res.npcs);
    } catch (e) {
      setDialogueError(e instanceof Error ? e.message : '选书失败');
    } finally {
      setLoading(false);
    }
  }, [player.currentWorldIndex, artStyle]);

  const handleAddBook = useCallback(async () => {
    const title = addBookTitle.trim();
    if (!title || addBookLoading) return;
    setAddBookLoading(true);
    setAddBookMsg(null);
    try {
      const res = await addBookFromWeb(title);
      setAddBookMsg({ type: 'success', text: res.msg });
      setAddBookTitle('');
      fetchBookWorlds().then((r) => setBooks(r.books)).catch(() => {});
      setTimeout(() => setAddBookMsg(null), 3000);
    } catch (e) {
      setAddBookMsg({ type: 'error', text: e instanceof Error ? e.message : '添加失败' });
    } finally {
      setAddBookLoading(false);
    }
  }, [addBookTitle, addBookLoading]);

  const handleChangeBook = useCallback(() => {
    setSelectedBook(null);
    game.setNpcsInScene([]);
    game.setBookWorld(null);
    loadBooks();
  }, [loadBooks]);

  const handleArtStyleSave = useCallback(async () => {
    const wi = player.currentWorldIndex || 1;
    const style = customArtInput.trim() || artStyle;
    if (!style) return;
    setArtStyle(style);
    setCustomArtInput('');
    await updateArtStyle(wi, style).catch(() => {});
  }, [customArtInput, artStyle, player.currentWorldIndex]);

  // ── 对话逻辑 ──
  const historyToMessages = useCallback((history: DialogueHistoryItem[], sessionId: string): DialogueMessage[] => {
    return history.map((item) => ({
      sessionId,
      speaker: item.speaker,
      emotion: (item.emotion || 'calm') as Emotion,
      text: item.text,
      choices: parseChoices(item.choicesJson || '[]'),
      allowFreeInput: false,
      fateDelta: 0, trustDelta: 0,
      isPlayer: item.role === 'player',
    }));
  }, []);

  const handleComplete = useCallback((data: DialogueData) => {
    const choices = parseChoices(data.choicesJson);
    dialogue.completeMessage({
      sessionId: data.sessionId, speaker: data.speaker,
      emotion: (data.emotion || 'calm') as Emotion, text: data.text,
      choices, allowFreeInput: data.allowFreeInput,
      fateDelta: data.fateDelta, trustDelta: data.trustDelta,
    });
    setLoading(false);
    if (data.sceneHint) {
      dialogue.setSceneImageLoading(true);
      generateSceneImage(dialogue.npcId, player.currentWorldIndex, artStyle || undefined, data.sceneHint)
        .then((res) => dialogue.pushSceneImage(res.imageUrl))
        .catch(() => dialogue.setSceneImageLoading(false));
    }
  }, [dialogue.npcId, player.currentWorldIndex, artStyle]);

  const handleFallbackComplete = useCallback((data: DialogueData) => {
    handleComplete(data);
  }, [handleComplete]);

  const handleStartDialogue = useCallback(async (npcId: string) => {
    setLoading(true);
    setDialogueError('');
    const npc = game.npcsInScene.find((n) => n.npcId === npcId);
    dialogue.setSceneImageLoading(true);
    generateSceneImage(npcId, player.currentWorldIndex, artStyle || undefined)
      .then((res) => {
        dialogue.pushSceneImage(res.imageUrl);
        // 立绘生成后刷新relations，获取更新后的imageUrl
        fetchRelations().then((r) => player.setRelations(r.relations)).catch(() => {});
      })
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
          if (data.resumed && data.history) {
            const historyMsgs = historyToMessages(data.history, data.sessionId);
            dialogue.loadHistory(historyMsgs.slice(0, -1));
            handleComplete(data);
            setShowHistory(false);
            return;
          }
          handleComplete(data);
        },
        onError: async (err) => {
          console.warn('SSE失败，回退到非流式:', err);
          try {
            const data = await startDialogue(npcId, player.currentWorldIndex);
            dialogue.startDialogue(data.sessionId, npcId, npc?.npcName || data.speaker || '');
            if (data.resumed && data.history) {
              const historyMsgs = historyToMessages(data.history, data.sessionId);
              dialogue.loadHistory(historyMsgs.slice(0, -1));
              handleComplete(data);
              return;
            }
            handleFallbackComplete(data);
          } catch (e) {
            console.error(e);
            setDialogueError(e instanceof Error ? e.message : '连接失败，请检查后端服务');
            setLoading(false);
          }
        },
      },
    );
  }, [player.currentWorldIndex, game.npcsInScene, artStyle]);

  const handleChoice = useCallback((choice: DialogueChoice) => {
    if (loading) return;
    setLoading(true);
    dialogue.addPlayerMessage(choice.text);
    dialogue.setStreaming(true);
    dialogue.resetStreamText();
    player.updateRelation(dialogue.npcId, choice.weight.fate, choice.weight.trust);

    abortRef.current = streamChoice(
      { sessionId: dialogue.sessionId, choiceId: choice.id, npcId: dialogue.npcId, worldIndex: player.currentWorldIndex },
      {
        onChunk: (text) => dialogue.appendStreamText(text),
        onComplete: (data) => { dialogue.setStreaming(false); handleComplete(data); },
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

  const handleFreeInput = useCallback(() => {
    if (!freeInput.trim() || loading) return;
    const text = freeInput.trim();
    setFreeInput('');
    setLoading(true);
    dialogue.addPlayerMessage(text);
    dialogue.setStreaming(true);
    dialogue.resetStreamText();

    abortRef.current = streamFreeInput(
      { sessionId: dialogue.sessionId, text, npcId: dialogue.npcId, worldIndex: player.currentWorldIndex },
      {
        onChunk: (chunk) => dialogue.appendStreamText(chunk),
        onComplete: (data) => { dialogue.setStreaming(false); handleComplete(data); },
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

  const handleEndDialogue = useCallback(async () => {
    abortRef.current?.abort();
    dialogue.endDialogue();
    dialogue.reset();
  }, [dialogue.sessionId]);

  // ════════════════════════════════════════════════════
  // 渲染
  // ════════════════════════════════════════════════════

  // ── 阶段3：对话进行中 ──
  if (dialogue.isActive) {
    const lastMsg = dialogue.messages[dialogue.messages.length - 1];
    return (
      <div className={styles.page}>
        {/* 场景图区域 */}
        <div className={styles.scenePortrait} onClick={() => {
          if (dialogue.sceneImages.length > 0) {
            setGalleryIndex(dialogue.sceneImages.length - 1);
            setFullscreenImage(true);
          }
        }}>
          {dialogue.sceneImages.length > 0 ? (
            <img src={dialogue.sceneImages[dialogue.sceneImages.length - 1]} alt="场景" className={styles.sceneImage} />
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
              {EMOTION_LABELS[dialogue.currentEmotion] || '平静'}
            </span>
          </div>
          {currentRelation && (
            <div className={styles.sceneFateBar}>
              <FateBar fateScore={currentRelation.fateScore} trustScore={currentRelation.trustScore} npcName="" compact />
            </div>
          )}
          {dialogue.sceneImages.length > 0 && (
            <span className={styles.fullscreenHint}>
              {dialogue.sceneImages.length > 1 ? `${dialogue.sceneImages.length}张 · 点击查看` : '点击查看大图'}
            </span>
          )}
        </div>

        {/* 全屏画廊 */}
        {fullscreenImage && dialogue.sceneImages.length > 0 && (
          <div className={styles.fullscreenOverlay} onClick={() => setFullscreenImage(false)}>
            <div
              className={styles.galleryBody}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseMove={(e) => { if (e.buttons === 1) handleTouchMove(e); }}
              onMouseUp={handleTouchEnd}
            >
              <img
                src={dialogue.sceneImages[galleryIndex]}
                alt={`场景 ${galleryIndex + 1}`}
                className={styles.fullscreenImage}
                style={{ transform: `translateX(${swipeOffset}px)` }}
                draggable={false}
              />
            </div>
            {dialogue.sceneImages.length > 1 && (
              <div className={styles.galleryFooter} onClick={(e) => e.stopPropagation()}>
                <div className={styles.galleryDots}>
                  {dialogue.sceneImages.map((_, i) => (
                    <span
                      key={i}
                      className={`${styles.galleryDot} ${i === galleryIndex ? styles.galleryDotActive : ''}`}
                      onClick={() => setGalleryIndex(i)}
                    />
                  ))}
                </div>
                <span className={styles.galleryCounter}>{galleryIndex + 1} / {dialogue.sceneImages.length}</span>
              </div>
            )}
            <button className={styles.fullscreenClose} onClick={() => setFullscreenImage(false)}>✕</button>
          </div>
        )}

        {/* 对话区 */}
        <div className={styles.dialogueArea} ref={scrollRef}>
          {showHistory && dialogue.messages.slice(0, -1).map((msg, i) => (
            <div key={i} className={msg.isPlayer ? styles.historyMsgPlayer : styles.historyMsg}>
              <span className={msg.isPlayer ? styles.historySpeakerPlayer : styles.historySpeaker}>{msg.speaker}</span>
              <p className={styles.historyText}>{msg.text}</p>
            </div>
          ))}
          {!showHistory && dialogue.messages.length > 1 && (
            <button className={styles.showHistoryBtn} onClick={() => setShowHistory(true)}>
              查看历史对话 ({dialogue.messages.length - 1}条)
            </button>
          )}
          {dialogue.isStreaming && (
            <div className={styles.dialogueBubble}>
              <p className={styles.dialogueText}>
                {dialogue.currentText}<span className={styles.cursor}>|</span>
              </p>
            </div>
          )}
          {!dialogue.isStreaming && lastMsg && (
            <div className={styles.dialogueBubble}>
              <p className={styles.dialogueText}>{lastMsg.text}</p>
            </div>
          )}
          {loading && !dialogue.isStreaming && (
            <div className={styles.dialogueBubble}>
              <p className={styles.dialogueText}><span className={styles.cursor}>···</span></p>
            </div>
          )}
        </div>

        {/* 操作区 */}
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
              <button className={styles.sendBtn} onClick={handleFreeInput} disabled={!freeInput.trim()}>发送</button>
            </div>
          )}
          <button className={styles.endBtn} onClick={handleEndDialogue}>结束对话</button>
        </div>
      </div>
    );
  }

  // ── 阶段1：选书 ──
  if (!selectedBook && !bookLoading) {
    if (books.length === 0) loadBooks();

    return (
      <div className={`${styles.page} ${styles.pageLibrary}`}>
        {/* 书架头部 */}
        <div className={styles.libraryHeader}>
          <h2 className={styles.libraryTitle}>书阁</h2>
          <p className={styles.librarySubtitle}>选择一部作品，踏入其中的世界</p>
        </div>

        {/* 画风选择区 */}
        <div className={styles.artStyleBar}>
          <div className={styles.artStyleRow}>
            <span className={styles.artStyleLabel}>画风</span>
            <div className={styles.artStyleTags}>
              {ART_STYLE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  className={`${styles.artTag} ${artStyle === preset ? styles.artTagActive : ''}`}
                  onClick={() => setArtStyle(artStyle === preset ? '' : preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.artCustomRow}>
            <input
              className={styles.artCustomInput}
              value={customArtInput}
              onChange={(e) => setCustomArtInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && customArtInput.trim()) { setArtStyle(customArtInput.trim()); setCustomArtInput(''); } }}
              placeholder="自定义画风..."
              maxLength={50}
            />
            {customArtInput.trim() && (
              <button className={styles.artCustomBtn} onClick={() => { setArtStyle(customArtInput.trim()); setCustomArtInput(''); }}>
                确定
              </button>
            )}
          </div>
          {artStyle && <span className={styles.artCurrent}>当前：{artStyle}</span>}
        </div>

        {/* 添加书籍入口 */}
        <div className={styles.addBookBar}>
          <button className={styles.addBookToggle} onClick={() => setShowAddBook(!showAddBook)}>
            {showAddBook ? '收起' : '+ 添加书籍'}
          </button>
          {showAddBook && (
            <div className={styles.addBookForm}>
              <input
                className={styles.addBookInput}
                placeholder={'输入书名，如"雪中悍刀行"'}
                value={addBookTitle}
                onChange={(e) => setAddBookTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddBook(); }}
                disabled={addBookLoading}
                maxLength={50}
              />
              <button className={styles.addBookBtn} onClick={handleAddBook} disabled={addBookLoading || !addBookTitle.trim()}>
                {addBookLoading ? '获取中...' : '搜索'}
              </button>
            </div>
          )}
          {addBookLoading && <p className={styles.addBookHint}>正在从网络获取书籍并分析角色...</p>}
          {addBookMsg && (
            <p className={addBookMsg.type === 'success' ? styles.addBookHint : styles.addBookError}>{addBookMsg.text}</p>
          )}
        </div>

        {/* 书籍列表 */}
        <div className={styles.bookScroll}>
          {books.length === 0 ? (
            <div className={styles.emptyHint}>加载书籍中...</div>
          ) : (
            <div className={styles.bookList}>
              {books.map((book) => (
                <button
                  key={book.id}
                  className={styles.bookCard}
                  onClick={() => handleSelectBook(book)}
                  disabled={loading}
                >
                  <div className={styles.bookCover} style={{
                    background: book.colorPalette
                      ? `linear-gradient(135deg, ${book.colorPalette.split(',')[0]}, ${book.colorPalette.split(',')[1] || '#333'})`
                      : 'linear-gradient(135deg, #2a2420, #1a1610)',
                  }}>
                    <span className={styles.bookInitial}>{book.title.charAt(0)}</span>
                  </div>
                  <div className={styles.bookInfo}>
                    <span className={styles.bookTitle}>{book.title}</span>
                    <span className={styles.bookAuthor}>{book.author}</span>
                    {book.artStyle && <span className={styles.bookArtStyle}>{book.artStyle}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {dialogueError && <div className={styles.errorHint}>{dialogueError}</div>}
          {loading && <div className={styles.loadingHint}>选择中...</div>}
        </div>
      </div>
    );
  }

  // ── 加载中 ──
  if (bookLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyHint}>加载中...</div>
      </div>
    );
  }

  // ── 阶段2：选角色 ──
  return (
    <div className={`${styles.page} ${styles.pageNpcSelect}`}>
      {/* 书籍信息头 */}
      <div className={styles.bookHeader}>
        <div className={styles.bookHeaderBg} style={{
          background: selectedBook?.colorPalette
            ? `linear-gradient(135deg, ${selectedBook.colorPalette.split(',')[0]}40, ${selectedBook.colorPalette.split(',')[1] || '#333'}30)`
            : undefined,
        }} />
        <div className={styles.bookHeaderContent}>
          <h2 className={styles.bookHeaderTitle}>{selectedBook?.title || '书籍世界'}</h2>
          {selectedBook?.loreSummary && (
            <p className={styles.bookHeaderLore}>{selectedBook.loreSummary}</p>
          )}
          <div className={styles.bookHeaderActions}>
            <button className={styles.changeBookBtn} onClick={handleChangeBook}>换书</button>
            {artStyle && <span className={styles.artBadge}>{artStyle}</span>}
          </div>
        </div>
      </div>

      {/* 画风快捷切换 */}
      <div className={styles.artQuickBar}>
        <div className={styles.artStyleTags}>
          {ART_STYLE_PRESETS.slice(0, 4).map((preset) => (
            <button
              key={preset}
              className={`${styles.artTag} ${artStyle === preset ? styles.artTagActive : ''}`}
              onClick={() => { setArtStyle(preset); updateArtStyle(player.currentWorldIndex || 1, preset).catch(() => {}); }}
            >
              {preset}
            </button>
          ))}
        </div>
        <div className={styles.artCustomRow}>
          <input
            className={styles.artCustomInput}
            value={customArtInput}
            onChange={(e) => setCustomArtInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleArtStyleSave(); }}
            placeholder="自定义画风..."
            maxLength={50}
          />
          {customArtInput.trim() && (
            <button className={styles.artCustomBtn} onClick={handleArtStyleSave}>确定</button>
          )}
        </div>
      </div>

      {/* NPC角色列表 */}
      <div className={styles.npcScroll}>
        <div className={styles.npcSectionTitle}>书中人物</div>
        {game.npcsInScene.map((npc) => {
          const rel = player.relations.find((r) => r.npcId === npc.npcId);
          return (
            <button
              key={npc.npcId}
              className={styles.npcCard}
              onClick={() => handleStartDialogue(npc.npcId)}
              disabled={loading}
            >
              <div className={styles.npcAvatar}>
                {rel?.imageUrl?.startsWith('/api/')
                  ? <img src={rel.imageUrl} alt={npc.npcName} className={styles.npcAvatarImg} />
                  : npc.npcName.charAt(0)}
              </div>
              <div className={styles.npcInfo}>
                <span className={styles.npcName}>{npc.npcName}</span>
                <span className={styles.npcRole}>
                  {npc.role}{npc.gender ? ` · ${npc.gender}` : ''}{npc.age ? ` · ${npc.age}` : ''}
                </span>
                {npc.features && <span className={styles.npcFeatures}>{npc.features}</span>}
              </div>
              {rel && (
                <div className={styles.npcFate}>
                  <FateBar fateScore={rel.fateScore} trustScore={rel.trustScore} npcName="" compact />
                </div>
              )}
              <span className={styles.npcArrow}>›</span>
            </button>
          );
        })}
        {game.npcsInScene.length === 0 && !loading && (
          <div className={styles.emptyHint}>该书暂无可交互角色</div>
        )}
      </div>

      {dialogueError && <div className={styles.errorHint}>{dialogueError}</div>}
      {loading && <div className={styles.loadingHint}>连接中...</div>}
    </div>
  );
}
