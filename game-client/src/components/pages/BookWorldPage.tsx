import React, { useCallback, useEffect, useRef, useState } from 'react';
import { addBookFromWeb, fetchBookWorlds, selectBookWorld } from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import type { BookWorld } from '../../types';
import styles from './PageSkeleton.module.css';

/** P13 · 书籍世界选择页 */
export default function BookWorldPage() {
  const [books, setBooks] = useState<BookWorld[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setBookWorld } = useGameStore();
  const { currentWorldIndex } = usePlayerStore();

  const loadBooks = useCallback(() => {
    fetchBookWorlds()
      .then((res) => setBooks(res.books))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    if (showAdd && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showAdd]);

  const handleSelect = async (book: BookWorld) => {
    await selectBookWorld(currentWorldIndex, book.id);
    setBookWorld(book);
  };

  const handleAdd = async () => {
    const title = addTitle.trim();
    if (!title) return;

    setAdding(true);
    setAddMsg(null);

    try {
      const res = await addBookFromWeb(title);
      setAddMsg({ type: 'success', text: res.msg });
      setAddTitle('');
      loadBooks();
      // 3秒后关闭提示
      setTimeout(() => setAddMsg(null), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '添加失败';
      setAddMsg({ type: 'error', text: msg });
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !adding) {
      handleAdd();
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>书籍世界</h2>
          <p className={styles.subtitle}>选择一部作品，踏入那个世界</p>
        </div>
        <button className={styles.addToggleBtn} onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '收起' : '添加书籍'}
        </button>
      </div>

      {showAdd && (
        <>
          <div className={styles.addBookBar}>
            <input
              ref={inputRef}
              className={styles.addBookInput}
              placeholder={'输入书名，如"雪中悍刀行"'}
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={adding}
            />
            <button
              className={styles.addBookBtn}
              onClick={handleAdd}
              disabled={adding || !addTitle.trim()}
            >
              {adding ? '获取中...' : '搜索添加'}
            </button>
          </div>
          {adding && (
            <div className={styles.addBookLoading}>
              正在从网络获取书籍并分析角色，请稍候...
            </div>
          )}
          {addMsg && (
            <div className={addMsg.type === 'success' ? styles.addBookSuccess : styles.addBookError}>
              {addMsg.text}
            </div>
          )}
        </>
      )}

      <div className={styles.scrollArea}>
        {books.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.placeholderIcon}>📚</span>
            <p>加载书籍中...</p>
          </div>
        ) : (
          <div className={styles.bookGrid}>
            {books.map((book) => (
              <button key={book.id} className={styles.bookCard} onClick={() => handleSelect(book)}>
                <div className={styles.bookCover}>
                  <span className={styles.bookEmoji}>📖</span>
                </div>
                <div className={styles.bookInfo}>
                  <span className={styles.bookTitle}>{book.title}</span>
                  <span className={styles.bookAuthor}>{book.author}</span>
                  <span className={styles.bookCategory}>{book.category}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
