import React, { useState } from 'react';
import { login, register } from '../../services/api';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { IosStatus } from '../common/fusion';
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

  const submit = async () => {
    if (!username.trim() || !password.trim()) {
      setError('请 输 入 用 户 名 和 密 码');
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

  const handleForm = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <div className={styles.page}>
      <IosStatus />

      <div className={styles.logo}>
        <div className={styles.logoMain}>七 世 轮 回</div>
        <div className={styles.logoSub}>· 气 盖 山 河 ·</div>
        <div className={styles.logoEn}>SEVEN REINCARNATIONS · OVER MOUNTAINS AND RIVERS</div>
      </div>

      <div className={styles.portrait}>
        <div className={styles.portraitMain}>
          <span className={styles.portraitMask}>轮</span>
          <span className={styles.portraitTip}>丹 青 · 开 篇</span>
        </div>
      </div>

      <div className={styles.server}>
        <div className={styles.serverRow}>
          <span className={styles.serverK}>当 前 分 区</span>
          <span>
            <span className={styles.serverV}>83 · 气盖山河</span>
            <span className={styles.serverState}>火爆</span>
          </span>
        </div>
        <button type="button" className={styles.serverSwitch}>
          ↔ 切换分区（共 99 区）
        </button>
      </div>

      <form className={styles.form} onSubmit={handleForm}>
        <div className={styles.formH}>
          <span>{mode === 'login' ? '— 登 录 账 号 —' : '— 注 册 账 号 —'}</span>
          <button type="button" className={styles.formMode} onClick={switchMode}>
            {mode === 'login' ? '注 册 ›' : '已 有 账 号 ›'}
          </button>
        </div>
        <input
          className={styles.input}
          type="text"
          placeholder="用 户 名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
        />
        <input
          className={styles.input}
          type="password"
          placeholder="密 码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {error && <div className={styles.error}>{error}</div>}
      </form>

      <div className={styles.notice}>
        · 新 区「气盖山河」开 服 · 7 天 冲 级 豪 礼 · 创 角 即 送 灵 骑
      </div>

      <div className={styles.btns}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSec}`}
          onClick={switchMode}
          disabled={loading}
        >
          {mode === 'login' ? '注 册 账 号' : '返 回 登 录'}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrim}`}
          onClick={submit}
          disabled={loading}
        >
          {loading ? '请 稍 候' : '开 启 轮 回'}
        </button>
      </div>

      <div className={styles.footer}>以 A I 智 能 体 为 核 心 的 情 感 向 R P G</div>
    </div>
  );
}
