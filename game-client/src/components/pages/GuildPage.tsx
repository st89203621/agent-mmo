import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchMyGuild, fetchGuildList, fetchGuildMembers,
  createGuild, joinGuild, leaveGuild, dissolveGuild, donateGold, kickGuildMember,
} from '../../services/api';
import type { GuildData, GuildMemberData } from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { toast } from '../../store/toastStore';
import styles from './PageSkeleton.module.css';

const POS_LABEL: Record<string, string> = { LEADER: '盟主', ELDER: '长老', MEMBER: '成员' };

type View = 'info' | 'members' | 'browse';

export default function GuildPage() {
  const [guild, setGuild] = useState<GuildData | null>(null);
  const [members, setMembers] = useState<GuildMemberData[]>([]);
  const [guildList, setGuildList] = useState<GuildData[]>([]);
  const [view, setView] = useState<View>('info');
  const [newName, setNewName] = useState('');
  const [donateAmount, setDonateAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const loadGuild = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyGuild();
      if (data.hasGuild === false) {
        setGuild(null);
        const list = await fetchGuildList();
        setGuildList(list.guilds);
        setView('browse');
      } else {
        setGuild(data);
        setView('info');
      }
    } catch {}
    setLoading(false);
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const data = await fetchGuildMembers();
      setMembers(data.members);
    } catch {}
  }, []);

  useEffect(() => { loadGuild(); }, [loadGuild]);
  useEffect(() => { if (view === 'members' && guild) loadMembers(); }, [view, guild, loadMembers]);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.warning('请输入盟会名称'); return; }
    try {
      await createGuild(newName.trim());
      toast.success('盟会创建成功');
      setNewName('');
      loadGuild();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '创建失败');
    }
  };

  const handleJoin = async (guildId: string) => {
    const res = await joinGuild(guildId);
    res.success ? toast.success('加入成功') : toast.error('加入失败');
    loadGuild();
  };

  const handleLeave = async () => {
    const res = await leaveGuild();
    res.success ? toast.success('已退出盟会') : toast.error('盟主不能退出');
    loadGuild();
  };

  const handleDissolve = async () => {
    const res = await dissolveGuild();
    res.success ? toast.success('盟会已解散') : toast.error('解散失败');
    loadGuild();
  };

  const handleDonate = async () => {
    const amount = parseInt(donateAmount);
    if (!amount || amount <= 0) { toast.warning('请输入捐献金额'); return; }
    await donateGold(amount);
    toast.success(`捐献 ${amount} 金币成功`);
    setDonateAmount('');
    loadGuild();
  };

  const handleKick = async (targetId: number) => {
    const res = await kickGuildMember(targetId);
    res.success ? toast.success('已踢出') : toast.error('操作失败');
    loadMembers();
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}><h2 className={styles.title}>盟会</h2></div>
        <p style={{ textAlign: 'center', opacity: 0.5, marginTop: 40 }}>加载中...</p>
      </div>
    );
  }

  // 未加入盟会：显示创建/浏览
  if (!guild) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h2 className={styles.title}>盟会</h2>
          <p className={styles.subtitle}>创建或加入一个盟会，结交志同道合的伙伴</p>
        </div>
        <div className={styles.scrollArea}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>创建盟会（需500万金币）</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{
                  flex: 1, padding: '10px 12px',
                  background: 'var(--paper-dark)', border: '1px solid var(--paper-darker)',
                  borderRadius: 'var(--radius-md)', color: 'var(--ink)',
                  fontSize: '14px', fontFamily: 'inherit',
                }}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="盟会名称"
                maxLength={12}
              />
              <button className={styles.primaryBtn} onClick={handleCreate} style={{ width: 'auto', padding: '10px 20px' }}>
                创建
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>可加入的盟会</h3>
            {guildList.length === 0 && <p style={{ opacity: 0.5, fontSize: 13 }}>暂无盟会</p>}
            {guildList.map(g => (
              <div key={g.guildId} className={styles.card} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{g.name}</span>
                  <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.6 }}>
                    Lv.{g.level} | {g.memberCount}/{g.maxMembers}人 | 盟主: {g.leaderName}
                  </span>
                </div>
                <button className={styles.smallBtn} onClick={() => handleJoin(g.guildId)}>加入</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 已加入盟会
  const isLeader = guild.myPosition === 'LEADER';
  const isElder = guild.myPosition === 'ELDER' || isLeader;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>{guild.name}</h2>
        <p className={styles.subtitle}>Lv.{guild.level} | {POS_LABEL[guild.myPosition || 'MEMBER']}</p>
      </div>

      <div className={styles.tabRow}>
        <button className={`${styles.tabBtn} ${view === 'info' ? styles.tabActive : ''}`}
                onClick={() => setView('info')}>盟会信息</button>
        <button className={`${styles.tabBtn} ${view === 'members' ? styles.tabActive : ''}`}
                onClick={() => setView('members')}>成员 ({guild.memberCount})</button>
      </div>

      <div className={styles.scrollArea}>
        {view === 'info' && (
          <>
            <div className={styles.card}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                <div>盟主: <b>{guild.leaderName}</b></div>
                <div>人数: <b>{guild.memberCount}/{guild.maxMembers}</b></div>
                <div>总建设: <b>{guild.totalConstruction}</b></div>
                <div>总荣誉: <b>{guild.totalHonor}</b></div>
              </div>
            </div>

            <div className={styles.card}>
              <h4 style={{ fontSize: 13, margin: '0 0 6px', opacity: 0.7 }}>我的数据</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, fontSize: 13 }}>
                <div>贡献: <b>{guild.myContribution}</b></div>
                <div>建设: <b>{guild.myConstruction}</b></div>
                <div>荣誉: <b>{guild.myHonor}</b></div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>捐献金币</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{
                    flex: 1, padding: '8px 12px',
                    background: 'var(--paper-dark)', border: '1px solid var(--paper-darker)',
                    borderRadius: 'var(--radius-md)', color: 'var(--ink)', fontSize: '14px', fontFamily: 'inherit',
                  }}
                  type="number"
                  value={donateAmount}
                  onChange={e => setDonateAmount(e.target.value)}
                  placeholder="金额"
                />
                <button className={styles.smallBtn} onClick={handleDonate}>捐献</button>
              </div>
            </div>

            <div className={styles.section}>
              <button className={styles.actionBtn}
                style={{ width: '100%', marginTop: 0 }}
                onClick={() => useGameStore.getState().navigateTo('treasure-mountain')}>
                宝山探宝
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {!isLeader && <button className={styles.smallBtn} onClick={handleLeave} style={{ color: 'var(--red)' }}>退出盟会</button>}
              {isLeader && <button className={styles.smallBtn} onClick={handleDissolve} style={{ color: 'var(--red)' }}>解散盟会</button>}
            </div>
          </>
        )}

        {view === 'members' && (
          <>
            {members.sort((a, b) => {
              const order: Record<string, number> = { LEADER: 0, ELDER: 1, MEMBER: 2 };
              return (order[a.position] ?? 9) - (order[b.position] ?? 9);
            }).map(m => (
              <div key={m.playerId} className={styles.card} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{m.playerName}</span>
                  <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.6 }}>
                    {POS_LABEL[m.position]} | 贡献{m.contribution} | 建设{m.construction} | 荣誉{m.honor}
                  </span>
                </div>
                {isElder && m.position === 'MEMBER' && (
                  <button className={styles.smallBtn} onClick={() => handleKick(m.playerId)}
                          style={{ fontSize: 11, color: 'var(--red)' }}>踢出</button>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
