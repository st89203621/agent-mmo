import { useState } from 'react';
import { createTeam, joinTeam, leaveTeam, type TeamData } from '../../services/api';
import { useGameStore } from '../../store/gameStore';

export default function TeamBattlePage() {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(false);
  const navigateTo = useGameStore(s => s.navigateTo);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const t = await createTeam();
      setTeam(t);
    } finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!joinId.trim()) return;
    setLoading(true);
    try {
      const t = await joinTeam(joinId.trim());
      setTeam(t);
    } finally { setLoading(false); }
  };

  const handleLeave = async () => {
    if (!team) return;
    await leaveTeam(team.teamId);
    setTeam(null);
  };

  const members = team?.memberNames ? JSON.parse(team.memberNames) as string[] : [];
  const memberIds = team?.memberIds ? JSON.parse(team.memberIds) as number[] : [];

  return (
    <div style={{ padding: '16px 20px', minHeight: '100vh', background: '#0a0a12' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={() => navigateTo('home')} style={{ background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer' }}>←</button>
        <h2 style={{ color: '#e8c44a', margin: 0, fontSize: 20 }}>组队PvP</h2>
      </div>

      {!team ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button onClick={handleCreate} disabled={loading}
            style={{ padding: '16px', borderRadius: 10, border: '2px solid #e8c44a', background: 'rgba(232,196,74,0.1)', color: '#e8c44a', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            {loading ? '创建中...' : '创建队伍'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="输入队伍ID加入"
              style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #333', background: '#111', color: '#fff' }} />
            <button onClick={handleJoin} disabled={loading}
              style={{ padding: '12px 20px', borderRadius: 8, border: 'none', background: '#4caf50', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              加入
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>队伍ID: {team.teamId}</div>
            <div style={{ color: '#e0e0e0', fontSize: 14, marginBottom: 4 }}>状态：<span style={{ color: '#e8c44a' }}>{team.status}</span></div>
            <div style={{ color: '#e0e0e0', fontSize: 14 }}>成员 ({team.teamSize}/3)：</div>
            <div style={{ marginTop: 8 }}>
              {memberIds.map((id, i) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#aaa' }}>
                    {i + 1}
                  </span>
                  <span style={{ color: id === team.leaderId ? '#e8c44a' : '#ccc', fontSize: 14 }}>
                    {members[i] || `#${id}`}
                    {id === team.leaderId && <span style={{ marginLeft: 6, fontSize: 11, color: '#e8c44a' }}>队长</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleLeave}
              style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #f44336', background: 'transparent', color: '#f44336', fontWeight: 600, cursor: 'pointer' }}>
              离开队伍
            </button>
            <button disabled={team.teamSize < 2}
              style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: team.teamSize >= 2 ? '#e8c44a' : '#444', color: '#000', fontWeight: 700, cursor: 'pointer' }}>
              开始匹配
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
