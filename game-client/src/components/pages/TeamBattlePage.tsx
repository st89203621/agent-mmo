import { useState } from 'react';
import { createTeam, joinTeam, leaveTeam, type TeamData } from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

export default function TeamBattlePage() {
  usePageBackground(PAGE_BG.TEAM_BATTLE);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const t = await createTeam();
      setTeam(t);
    } catch (e) {
      toast.error((e as Error).message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const id = joinId.trim();
    if (!id) return;
    setLoading(true);
    try {
      const t = await joinTeam(id);
      setTeam(t);
      setJoinId('');
    } catch (e) {
      toast.error((e as Error).message || '加入失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!team) return;
    try {
      await leaveTeam(team.teamId);
      setTeam(null);
    } catch (e) {
      toast.error((e as Error).message || '离队失败');
    }
  };

  const handleStart = () => toast.info('匹配系统尚在筹备 · 敬请期待');

  const members: string[] = team?.memberNames ? JSON.parse(team.memberNames) : [];
  const memberIds: number[] = team?.memberIds ? JSON.parse(team.memberIds) : [];

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>组 队</span>
            <span className={styles.appbarZone}>3V3 · 江 湖 争 锋</span>
          </div>
          <div className={styles.appbarIcons}>
            <button
              type="button"
              className={styles.appbarIcon}
              onClick={() => navigateTo('home')}
              aria-label="返回"
            >回</button>
          </div>
        </div>
      </div>

      <div className={styles.tbHero}>
        <div className={styles.tbHeroTitle}>3 V 3 组 队</div>
        <div className={styles.tbHeroSub}>—— 同 道 共 征 · 以 力 破 局 ——</div>
      </div>

      {!team ? (
        <div className={styles.scrollPlain}>
          <div className={styles.sectRow}>
            队 伍 组 建
            <span className={styles.sectMore}>满员 3 / 3</span>
          </div>
          <div className={styles.tbSection}>
            <button
              type="button"
              className={styles.tbBtnCreate}
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? '创 建 中 ...' : '✦ 创 建 队 伍'}
            </button>
            <div className={styles.tbField}>
              <input
                className={styles.tbInput}
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="输入队伍 ID 加入"
              />
              <button
                type="button"
                className={styles.tbBtnJoin}
                onClick={handleJoin}
                disabled={loading || !joinId.trim()}
              >
                加 入
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.scrollPlain}>
            <div className={styles.tbCard}>
              <div className={styles.tbCardHead}>
                <span className={styles.tbCardId}>队伍 #{team.teamId}</span>
                <span className={styles.tbCardStatus}>{team.status}</span>
              </div>
              <div className={styles.tbCardCount}>成 员 {team.teamSize} / 3</div>
              {memberIds.map((id, i) => {
                const isLeader = id === team.leaderId;
                return (
                  <div key={id} className={styles.tbMember}>
                    <span className={styles.tbMemberSlot}>{i + 1}</span>
                    <span
                      className={`${styles.tbMemberName}${isLeader ? ` ${styles.tbMemberLeader}` : ''}`}
                    >
                      {members[i] || `旅人 #${id}`}
                      {isLeader && <span className={styles.tbLeaderTag}>队 长</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={styles.tbOps}>
            <button
              type="button"
              className={`${styles.tbOpsBtn} ${styles.tbOpsLeave}`}
              onClick={handleLeave}
            >
              离 开 队 伍
            </button>
            <button
              type="button"
              className={`${styles.tbOpsBtn} ${styles.tbOpsStart}`}
              onClick={handleStart}
              disabled={team.teamSize < 2}
            >
              开 始 匹 配
            </button>
          </div>
        </>
      )}
    </div>
  );
}
