import { useCallback, useEffect, useRef, useState } from 'react';
import { addBookFromWeb, fetchBookWorlds, selectBookWorld } from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import type { BookWorld } from '../../types';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

type AddMsg = { kind: 'ok' | 'err'; text: string } | null;

export default function BookWorldPage() {
  usePageBackground(PAGE_BG.BOOK_WORLD);
  const setBookWorld = useGameStore((s) => s.setBookWorld);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const currentWorldIndex = usePlayerStore((s) => s.currentWorldIndex);

  const [books, setBooks] = useState<BookWorld[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<AddMsg>(null);
  const [entering, setEntering] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchBookWorlds();
      setBooks(res.books || []);
    } catch {
      setBooks([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  useEffect(() => {
    if (showAdd) {
      inputRef.current?.focus();
    }
  }, [showAdd]);

  const handleSelect = useCallback(async (book: BookWorld) => {
    setEntering(book.id);
    try {
      await selectBookWorld(currentWorldIndex, book.id);
      setBookWorld(book);
    } finally {
      setEntering(null);
    }
  }, [currentWorldIndex, setBookWorld]);

  const handleAdd = useCallback(async () => {
    const title = addTitle.trim();
    if (!title) return;
    setAdding(true);
    setAddMsg(null);
    try {
      const res = await addBookFromWeb(title);
      setAddMsg({ kind: 'ok', text: res.msg });
      setAddTitle('');
      await loadBooks();
      window.setTimeout(() => setAddMsg(null), 3000);
    } catch (e) {
      setAddMsg({ kind: 'err', text: e instanceof Error ? e.message : '添加失败' });
    }
    setAdding(false);
  }, [addTitle, loadBooks]);

  const firstChar = (s: string) => (s || '').trim().slice(0, 1) || '书';

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>书 境</span>
            <span className={styles.appbarZone}>入一本书 · 化身其中</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('home')} type="button" aria-label="首页">家</button>
            <button
              className={styles.appbarIcon}
              onClick={() => setShowAdd((v) => !v)}
              type="button"
              aria-label={showAdd ? '收起' : '新增'}
            >
              {showAdd ? '×' : '＋'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.bwHero}>
          <div className={styles.bwHeroTitle}>书 籍 世 界</div>
          <div className={styles.bwHeroSub}>选一部作品 · 踏入那个世界</div>
          {showAdd && (
            <>
              <div className={styles.bwAddBar}>
                <input
                  ref={inputRef}
                  className={styles.bwAddInput}
                  placeholder="输入书名，如《雪中悍刀行》"
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !adding) {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                  disabled={adding}
                />
                <button
                  className={styles.bwAddBtn}
                  onClick={handleAdd}
                  disabled={adding || !addTitle.trim()}
                  type="button"
                >
                  {adding ? '搜索中...' : '搜 索 入 册'}
                </button>
              </div>
              {addMsg && (
                <div className={`${styles.bwAddMsg} ${addMsg.kind === 'ok' ? styles.bwAddMsgOk : styles.bwAddMsgErr}`}>
                  {addMsg.text}
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.sectRow}>
          藏 书 阁
          <span className={styles.sectMore}>共 {books.length} 卷</span>
        </div>

        {loading ? (
          <div className={styles.feedEmpty}>藏书加载中...</div>
        ) : books.length === 0 ? (
          <div className={styles.feedEmpty}>书海空空 · 点击右上角＋添加</div>
        ) : (
          <div className={styles.bwGrid}>
            {books.map((book) => (
              <button
                key={book.id}
                className={styles.bwCard}
                onClick={() => handleSelect(book)}
                disabled={entering === book.id}
                type="button"
              >
                <div className={styles.bwCardCover}>{firstChar(book.title)}</div>
                <div className={styles.bwCardTitle}>
                  {entering === book.id ? '入册中...' : book.title}
                </div>
                <div className={styles.bwCardAuthor}>{book.author || '佚名'}</div>
                {book.category && <div className={styles.bwCardCategory}>{book.category}</div>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
