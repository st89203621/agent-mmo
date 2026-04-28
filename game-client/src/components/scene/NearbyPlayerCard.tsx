import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { addFriend, requestPvP } from '../../services/api';
import { toast } from '../../store/toastStore';
import { getPlaceInfo } from '../../data/lunhuiWorld';
import type { NearbyPlayer } from '../../types';
import styles from './NearbyPlayerCard.module.css';

interface NearbyPlayerCardProps {
  player: NearbyPlayer;
  onClose: () => void;
}

export default function NearbyPlayerCard({ player, onClose }: NearbyPlayerCardProps): JSX.Element {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [busy, setBusy] = useState<string | null>(null);

  const zoneName = useMemo(() => getPlaceInfo(player.zoneId).title, [player.zoneId]);
  const initial = useMemo(() => (player.name?.trim()?.[0] ?? '客'), [player.name]);

  const close = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [close]);

  const handleProfile = useCallback(() => {
    navigateTo('character', { playerId: player.playerId, playerName: player.name });
    onClose();
  }, [navigateTo, onClose, player.name, player.playerId]);

  const handleMail = useCallback(() => {
    navigateTo('mail', { to: player.playerId, toName: player.name });
    onClose();
  }, [navigateTo, onClose, player.name, player.playerId]);

  const handleTrade = useCallback(() => {
    navigateTo('trade', { peerId: player.playerId, peerName: player.name });
    onClose();
  }, [navigateTo, onClose, player.name, player.playerId]);

  const handleAddFriend = useCallback(async () => {
    if (busy) return;
    setBusy('friend');
    try {
      const res = await addFriend(player.playerId);
      if (res?.success === false) {
        toast.warning(res.msg || '加好友失败');
      } else {
        toast.success(`已向 ${player.name} 发送好友邀请`);
      }
    } catch {
      toast.warning('好友功能暂未开放');
    } finally {
      setBusy(null);
    }
  }, [busy, player.name, player.playerId]);

  const handleChallenge = useCallback(async () => {
    if (busy) return;
    setBusy('pvp');
    try {
      await requestPvP(player.playerId);
      toast.success(`已向 ${player.name} 发起挑战`);
    } catch {
      toast.warning('切磋功能暂未开放');
    } finally {
      setBusy(null);
    }
  }, [busy, player.name, player.playerId]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`玩家 ${player.name} 资料卡`}
      onClick={close}
    >
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          {player.portraitUrl ? (
            <img className={styles.portrait} src={player.portraitUrl} alt={player.name} />
          ) : (
            <div className={styles.portraitFallback} aria-hidden="true">{initial}</div>
          )}
          <div className={styles.identity}>
            <span className={styles.name}>{player.name}</span>
            <div className={styles.meta}>
              <span className={styles.level}>Lv.{player.level}</span>
              <span className={styles.zone}>{zoneName}</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={close}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionPrimary}`}
            onClick={handleProfile}
            disabled={busy !== null}
          >
            查看详情
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleAddFriend}
            disabled={busy !== null}
          >
            {busy === 'friend' ? '邀请中…' : '加好友'}
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleMail}
            disabled={busy !== null}
          >
            发邮件
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionDanger}`}
            onClick={handleChallenge}
            disabled={busy !== null}
          >
            {busy === 'pvp' ? '约战中…' : '挑战'}
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleTrade}
            disabled={busy !== null}
          >
            交易
          </button>
        </div>

        <div className={styles.footer}>按 ESC 或点击空白处关闭</div>
      </div>
    </div>
  );
}
