import { useEffect, useState, type FormEvent } from 'react';
import {
  fetchVisualAsset,
  generateVisualAsset,
  login,
  register,
  fetchServerList,
} from '../../services/api';
import { getVisualContext } from '../../data/visualAssets';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import ServerSelectPanel from './ServerSelectPanel';
import styles from './lunhui/LunhuiPages.module.css';

type Mode = 'login' | 'register';

const COVER_ASSET = {
  assetKey: 'login_cover_qigai',
  type: 'banner' as const,
  name: '气盖山河 · 登录封面',
  description: '执剑侠客云端而立，背后江山万里，赤金朱砂双色，云雾翻涌，仙气弥漫，正面构图，史诗氛围，半身像。',
  width: 420,
  height: 520,
};
const COVER_CACHE_KEY = `lunhui.asset.${COVER_ASSET.width}x${COVER_ASSET.height}.${COVER_ASSET.assetKey}`;

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverPickerOpen, setServerPickerOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [coverGenerating, setCoverGenerating] = useState(false);

  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const currentServerId = usePlayerStore((s) => s.currentServerId);
  const currentServerName = usePlayerStore((s) => s.currentServerName);
  const setCurrentServer = usePlayerStore((s) => s.setCurrentServer);

  // 初始化默认分区（从后端获取 current）
  useEffect(() => {
    if (currentServerId) return;
    fetchServerList()
      .then((res) => {
        const def = res.servers.find((s) => s.id === res.current) ?? res.servers[0];
        if (def) setCurrentServer(def.id, def.name);
      })
      .catch(() => {});
  }, [currentServerId, setCurrentServer]);

  // 封面图：先取缓存 → 后端拉 → 仍无则触发生成
  useEffect(() => {
    let cancelled = false;
    const cached = localStorage.getItem(COVER_CACHE_KEY);
    if (cached) setCoverUrl(cached);

    fetchVisualAsset(COVER_ASSET.assetKey, COVER_ASSET.width, COVER_ASSET.height)
      .then((data) => {
        if (cancelled) return;
        if (data.imageUrl) {
          setCoverUrl(data.imageUrl);
          localStorage.setItem(COVER_CACHE_KEY, data.imageUrl);
          return;
        }
        setCoverGenerating(true);
        return generateVisualAsset({ ...COVER_ASSET, context: getVisualContext() })
          .then((res) => {
            if (cancelled) return;
            if (res.imageUrl) {
              setCoverUrl(res.imageUrl);
              localStorage.setItem(COVER_CACHE_KEY, res.imageUrl);
            }
          })
          .finally(() => { if (!cancelled) setCoverGenerating(false); });
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

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
      navigateTo('char-select');
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleForm = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  const serverLabel = currentServerName || '83 · 气盖山河';

  return (
    <div className={styles.lgPage}>
      <div className={styles.lgLogo}>
        <div className={styles.lgLogoMain}>气 盖 山 河</div>
        <div className={styles.lgLogoSub}>· 气 盖 山 河 ·</div>
        <div className={styles.lgLogoEn}>LUNHUI ONLINE · OVER MOUNTAINS AND RIVERS</div>
      </div>

      <div className={styles.lgPortrait}>
        <div className={styles.lgPortraitMain}>
          {coverUrl ? (
            <img className={styles.lgPortraitImg} src={coverUrl} alt="气盖山河" draggable={false} />
          ) : (
            <span className={styles.lgPortraitMask}>轮</span>
          )}
          <span className={styles.lgPortraitTip}>
            {coverGenerating ? '封 面 绘 制 中 …' : '江 湖 · 开 篇'}
          </span>
        </div>
      </div>

      <div className={styles.lgServer}>
        <div className={styles.lgServerRow}>
          <span className={styles.lgServerK}>当 前 分 区</span>
          <span>
            <span className={styles.lgServerV}>{serverLabel}</span>
            <span className={styles.lgServerState}>火爆</span>
          </span>
        </div>
        <button type="button" className={styles.lgServerSwitch} onClick={() => setServerPickerOpen(true)}>
          ↔ 切换分区（共 99 区）
        </button>
      </div>

      <form className={styles.lgForm} onSubmit={handleForm}>
        <div className={styles.lgFormH}>
          <span>{mode === 'login' ? '— 登 录 账 号 —' : '— 注 册 账 号 —'}</span>
          <button type="button" className={styles.lgFormMode} onClick={switchMode}>
            {mode === 'login' ? '注 册 ›' : '已 有 账 号 ›'}
          </button>
        </div>
        <input
          className={styles.lgInput}
          type="text"
          placeholder="用 户 名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
        />
        <input
          className={styles.lgInput}
          type="password"
          placeholder="密 码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {error && <div className={styles.lgError}>{error}</div>}
      </form>

      <div className={styles.lgNotice}>
        · 新 区「气盖山河」开 服 · 7 天 冲 级 豪 礼 · 创 角 即 送 灵 骑
      </div>

      <div className={styles.lgBtns}>
        <button
          type="button"
          className={`${styles.lgBtn} ${styles.lgBtnSec}`}
          onClick={switchMode}
          disabled={loading}
        >
          {mode === 'login' ? '注 册 账 号' : '返 回 登 录'}
        </button>
        <button
          type="button"
          className={`${styles.lgBtn} ${styles.lgBtnPrim}`}
          onClick={submit}
          disabled={loading}
        >
          {loading ? '请 稍 候' : '进 入 江 湖'}
        </button>
      </div>

      <div className={styles.lgFooter}>复刻 lunhui 原版手机 MMO 体验</div>

      {serverPickerOpen && (
        <ServerSelectPanel
          selectedId={currentServerId}
          onClose={() => setServerPickerOpen(false)}
          onPick={(server) => {
            setCurrentServer(server.id, server.name);
            setServerPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
