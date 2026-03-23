import React, { useState } from 'react';
import { login, register, getMe } from '../../services/api';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import styles from './LoginPage.module.css';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setPlayer } = usePlayerStore();
  const { navigateTo } = useGameStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const fn = mode === 'login' ? login : register;
      const data = await fn(username.trim(), password.trim());
      setPlayer(String(data.userId), data.nickname || data.username, '');
      navigateTo('story');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} />

      <div className={styles.card}>
        <h1 className={styles.title}>七世轮回书</h1>
        <p className={styles.subtitle}>SEVEN REINCARNATIONS</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
          <input
            className={styles.input}
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? '请稍候...' : mode === 'login' ? '踏入轮回' : '创建账号'}
          </button>
        </form>

        <button className={styles.switchBtn} onClick={switchMode}>
          {mode === 'login' ? '尚无账号？注册' : '已有账号？登录'}
        </button>
      </div>

      <p className={styles.footer}>以AI智能体为核心的情感向RPG</p>
    </div>
  );
}
