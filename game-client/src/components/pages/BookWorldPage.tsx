import React, { useEffect, useState } from 'react';
import { fetchBookWorlds, selectBookWorld } from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import type { BookWorld } from '../../types';
import styles from './PageSkeleton.module.css';

/** P13 · 书籍世界选择页 */
export default function BookWorldPage() {
  const [books, setBooks] = useState<BookWorld[]>([]);
  const { setBookWorld } = useGameStore();
  const { currentWorldIndex } = usePlayerStore();

  useEffect(() => {
    fetchBookWorlds()
      .then((res) => setBooks(res.books))
      .catch(() => {});
  }, []);

  const handleSelect = async (book: BookWorld) => {
    await selectBookWorld(currentWorldIndex, book.id);
    setBookWorld(book);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>书籍世界</h2>
        <p className={styles.subtitle}>选择一部作品，踏入那个世界</p>
      </div>
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
