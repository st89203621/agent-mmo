import { useEffect, useMemo, useState } from 'react';
import { fetchServerList, type ServerInfo } from '../../services/api';
import styles from './ServerSelectPanel.module.css';

type Filter = 'all' | 'recommended' | 'new';

interface Props {
  onClose: () => void;
  onPick: (server: ServerInfo) => void;
  selectedId: string;
}

const STATUS_CLASS: Record<string, string> = {
  火爆: styles.statusHot,
  新区: styles.statusNew,
  推荐: styles.statusReco,
  流畅: styles.statusFlow,
  畅通: styles.statusCalm,
};

export default function ServerSelectPanel({ onClose, onPick, selectedId }: Props) {
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [pendingId, setPendingId] = useState(selectedId);

  useEffect(() => {
    let cancelled = false;
    fetchServerList()
      .then((res) => {
        if (cancelled) return;
        setServers(res.servers || []);
        if (!pendingId && res.current) setPendingId(res.current);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const kw = keyword.trim();
    return servers.filter((s) => {
      if (filter === 'recommended' && !s.recommended) return false;
      if (filter === 'new' && !s.newServer) return false;
      if (kw && !s.name.includes(kw) && !s.id.includes(kw)) return false;
      return true;
    });
  }, [servers, filter, keyword]);

  const confirm = () => {
    const target = servers.find((s) => s.id === pendingId);
    if (target) onPick(target);
  };

  return (
    <div className={styles.overlay}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={onClose}>← 返 回</button>
        <div className={styles.title}>选 择 分 区</div>
        <div className={styles.tip}>共 {servers.length || '—'} 区</div>
      </header>

      <div className={styles.searchRow}>
        <input
          className={styles.search}
          placeholder="搜 索 区 服 / 编 号"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${filter === 'all' ? styles.tabActive : ''}`}
          onClick={() => setFilter('all')}
        >
          全 部
        </button>
        <button
          type="button"
          className={`${styles.tab} ${filter === 'recommended' ? styles.tabActive : ''}`}
          onClick={() => setFilter('recommended')}
        >
          推 荐
        </button>
        <button
          type="button"
          className={`${styles.tab} ${filter === 'new' ? styles.tabActive : ''}`}
          onClick={() => setFilter('new')}
        >
          新 区
        </button>
      </div>

      <div className={styles.list}>
        {loading ? (
          <div className={styles.loading}>正 在 拉 取 分 区 列 表 …</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>未 找 到 匹 配 分 区</div>
        ) : (
          filtered.map((s) => {
            const isActive = s.id === pendingId;
            return (
              <button
                key={s.id}
                type="button"
                className={`${styles.item} ${isActive ? styles.itemActive : ''} ${s.newServer ? styles.itemNew : ''}`}
                onClick={() => setPendingId(s.id)}
                onDoubleClick={() => onPick(s)}
              >
                <div className={styles.itemTopRow}>
                  <span className={styles.itemName}>{s.name}</span>
                  <span className={`${styles.statusChip} ${STATUS_CLASS[s.status] ?? ''}`}>{s.status}</span>
                </div>
                <div className={styles.itemMeta}>
                  <span>在线 {s.online.toLocaleString()}</span>
                  {s.recommended && <span>· 推荐</span>}
                </div>
              </button>
            );
          })
        )}
      </div>

      <footer className={styles.footer}>
        <span>已 选 · {servers.find((s) => s.id === pendingId)?.name || '尚 未 选 择'}</span>
        <button
          type="button"
          className={styles.confirmBtn}
          disabled={!pendingId || loading}
          onClick={confirm}
        >
          进 入
        </button>
      </footer>
    </div>
  );
}
