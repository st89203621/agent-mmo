import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchMyGuild,
  fetchGuildList,
  fetchGuildMembers,
  createGuild,
  joinGuild,
  leaveGuild,
  dissolveGuild,
  donateGold,
  kickGuildMember,
  fetchPartyList,
  createParty,
  joinParty,
  leaveParty,
  type GuildData,
  type GuildMemberData,
  type PartyRecruitment,
} from '../../services/api';
import { useGameStore } from '../../store/gameStore';
import { usePlayerStore } from '../../store/playerStore';
import { toast } from '../../store/toastStore';
import { confirmDialog } from '../../store/confirmStore';
import styles from './lunhui/LunhuiPages.module.css';
import { usePageBackground } from '../common/PageShell';
import { PAGE_BG } from '../../data/pageBackgrounds';

const POSITION_LABEL: Record<string, string> = {
  LEADER: '盟主',
  ELDER: '长老',
  MEMBER: '成员',
};

const POSITION_WEIGHT: Record<string, number> = {
  LEADER: 0,
  ELDER: 1,
  MEMBER: 2,
};

function formatDate(ts?: number) {
  if (!ts || !Number.isFinite(ts)) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function firstChar(s?: string) {
  return (s || '').trim().slice(0, 1) || '盟';
}

function memberFirstChar(name?: string) {
  return (name || '').trim().slice(0, 1) || '侠';
}

type MainTab = 'guild' | 'party';

function PartyHallPanel() {
  const [parties, setParties] = useState<PartyRecruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [goal, setGoal] = useState('');
  const [maxStr, setMaxStr] = useState('5');
  const [minLevelStr, setMinLevelStr] = useState('1');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPartyList();
      setParties(res.parties);
    } catch {
      setParties([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleCreate = async () => {
    const trimmed = goal.trim();
    if (!trimmed) { toast.warning('请输入队伍目标'); return; }
    const max = Number.parseInt(maxStr, 10);
    const minLevel = Number.parseInt(minLevelStr, 10);
    if (!Number.isFinite(max) || max < 2 || max > 5) { toast.warning('队伍人数 2~5'); return; }
    if (!Number.isFinite(minLevel) || minLevel < 1) { toast.warning('请输入有效等级'); return; }
    setBusy('create');
    try {
      await createParty(trimmed, max, minLevel);
      toast.success('队伍创建成功');
      setGoal('');
      setCreating(false);
      await reload();
    } catch {
      toast.error('系统繁忙，请稍后再试');
    }
    setBusy(null);
  };

  const handleJoin = async (p: PartyRecruitment) => {
    setBusy(`join-${p.partyId}`);
    try {
      await joinParty(p.partyId);
      toast.success(`已加入「${p.leaderName}」的队伍`);
      await reload();
    } catch {
      toast.error('系统繁忙，请稍后再试');
    }
    setBusy(null);
  };

  const handleLeave = async () => {
    const ok = await confirmDialog({
      title: '离 队',
      message: '确认离开当前队伍？',
      confirmText: '离 队',
      danger: true,
    });
    if (!ok) return;
    setBusy('leave');
    try {
      await leaveParty();
      toast.success('已离队');
      await reload();
    } catch {
      toast.error('系统繁忙，请稍后再试');
    }
    setBusy(null);
  };

  return (
    <div className={styles.scrollPlain}>
      <div className={styles.guJoinBanner}>
        <div className={styles.guJoinTitle}>四 海 同 行</div>
        <div className={styles.guJoinSub}>组队挑战副本、世界 BOSS · 同袍而行，事半功倍</div>
        {creating ? (
          <div className={styles.guJoinCreate} style={{ flexDirection: 'column', gap: 6 }}>
            <input
              className={styles.guDonateInput}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="队伍目标 · 如：扫荡灵霄洞"
              maxLength={24}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className={styles.guDonateInput}
                value={maxStr}
                onChange={(e) => setMaxStr(e.target.value)}
                placeholder="人数 2-5"
                type="number"
                min={2}
                max={5}
              />
              <input
                className={styles.guDonateInput}
                value={minLevelStr}
                onChange={(e) => setMinLevelStr(e.target.value)}
                placeholder="最低等级"
                type="number"
                min={1}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={styles.guDonateBtn}
                onClick={handleCreate}
                disabled={busy === 'create'}
                type="button"
              >
                {busy === 'create' ? '...' : '创 建'}
              </button>
              <button
                className={styles.guDonateBtn}
                onClick={() => setCreating(false)}
                type="button"
                style={{ opacity: 0.7 }}
              >
                取 消
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.guJoinCreate} style={{ gap: 6 }}>
            <button
              className={styles.guDonateBtn}
              onClick={() => setCreating(true)}
              type="button"
            >
              创 建 队 伍
            </button>
            <button
              className={styles.guDonateBtn}
              onClick={handleLeave}
              disabled={busy === 'leave'}
              type="button"
              style={{ opacity: 0.85 }}
            >
              {busy === 'leave' ? '...' : '离 队'}
            </button>
          </div>
        )}
      </div>

      <div className={styles.sectRow}>
        招 募 中 的 队 伍
        <span className={styles.sectMore}>{parties.length} 支</span>
      </div>

      <div className={styles.guList}>
        {loading ? (
          <div className={styles.feedEmpty}>队伍信息载入中...</div>
        ) : parties.length === 0 ? (
          <div className={styles.feedEmpty}>当前无招募中的队伍，可创建一支</div>
        ) : (
          parties.map((p) => {
            const full = p.current >= p.max;
            return (
              <div key={p.partyId} className={styles.guListItem}>
                <div className={styles.guListCrest}>{firstChar(p.leaderName)}</div>
                <div className={styles.guListBody}>
                  <div className={styles.guListName}>{p.goal || '组队同行'}</div>
                  <div className={styles.guListMeta}>
                    队长 {p.leaderName} · {p.current}/{p.max} 人 · 入队 Lv ≥ {p.minLevel}
                  </div>
                </div>
                <button
                  className={styles.guListJoin}
                  onClick={() => handleJoin(p)}
                  disabled={full || busy === `join-${p.partyId}`}
                  type="button"
                >
                  {busy === `join-${p.partyId}` ? '...' : (full ? '已满' : '加入')}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function GuildPage() {
  usePageBackground(PAGE_BG.GUILD);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const playerId = usePlayerStore((s) => s.playerId);
  const playerName = usePlayerStore((s) => s.playerName);

  const [mainTab, setMainTab] = useState<MainTab>('guild');
  const [guild, setGuild] = useState<GuildData | null>(null);
  const [members, setMembers] = useState<GuildMemberData[]>([]);
  const [guildList, setGuildList] = useState<GuildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [donateAmount, setDonateAmount] = useState('');
  const [operating, setOperating] = useState<string | null>(null);

  const renderTabBar = () => (
    <div className={styles.enchTabs}>
      <button
        className={`${styles.enchTab} ${mainTab === 'guild' ? styles.enchTabOn : ''}`.trim()}
        onClick={() => setMainTab('guild')}
        type="button"
      >
        公 会
      </button>
      <button
        className={`${styles.enchTab} ${mainTab === 'party' ? styles.enchTabOn : ''}`.trim()}
        onClick={() => setMainTab('party')}
        type="button"
      >
        组 队 大 厅
      </button>
    </div>
  );

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const my = await fetchMyGuild();
      if (my.hasGuild === false) {
        setGuild(null);
        setMembers([]);
        const list = await fetchGuildList().catch(() => ({ guilds: [] as GuildData[] }));
        setGuildList(list.guilds);
      } else {
        setGuild(my);
        const mem = await fetchGuildMembers().catch(() => ({ members: [] as GuildMemberData[] }));
        setMembers(mem.members || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const pw = (POSITION_WEIGHT[a.position] ?? 9) - (POSITION_WEIGHT[b.position] ?? 9);
      if (pw !== 0) return pw;
      return b.contribution - a.contribution;
    });
  }, [members]);

  const isLeader = guild?.myPosition === 'LEADER';
  const isElder = guild?.myPosition === 'ELDER' || isLeader;

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) { toast.warning('请输入盟会名称'); return; }
    setOperating('create');
    try {
      await createGuild(trimmed);
      toast.success('盟会创建成功');
      setNewName('');
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '创建失败');
    }
    setOperating(null);
  };

  const handleJoin = async (guildId: string) => {
    setOperating(guildId);
    try {
      const res = await joinGuild(guildId);
      if (res.success) {
        toast.success('加入成功');
        await refreshAll();
      } else {
        toast.error('加入失败');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加入失败');
    }
    setOperating(null);
  };

  const handleLeave = async () => {
    const ok = await confirmDialog({
      title: '退 出 盟 会',
      message: '退出后将失去当前盟会成员身份，是否继续？',
      confirmText: '退 出',
      danger: true,
    });
    if (!ok) return;
    setOperating('leave');
    try {
      const res = await leaveGuild();
      if (res.success) {
        toast.success('已退出盟会');
        await refreshAll();
      } else {
        toast.error('盟主不能退出，请先转让或解散');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '退出失败');
    }
    setOperating(null);
  };

  const handleDissolve = async () => {
    const ok = await confirmDialog({
      title: '解 散 盟 会',
      message: '此操作无法撤销，盟会及所有成员关系将被解除。',
      confirmText: '解 散',
      danger: true,
    });
    if (!ok) return;
    setOperating('dissolve');
    try {
      const res = await dissolveGuild();
      if (res.success) {
        toast.success('盟会已解散');
        await refreshAll();
      } else {
        toast.error('解散失败');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '解散失败');
    }
    setOperating(null);
  };

  const handleDonate = async () => {
    const amount = Number.parseInt(donateAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.warning('请输入有效金额');
      return;
    }
    setOperating('donate');
    try {
      await donateGold(amount);
      toast.reward(`捐献 ${amount.toLocaleString()} 金币`);
      setDonateAmount('');
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '捐献失败');
    }
    setOperating(null);
  };

  const handleKick = async (target: GuildMemberData) => {
    const ok = await confirmDialog({
      title: '踢 出 成 员',
      message: `确认将「${target.playerName}」踢出盟会？`,
      confirmText: '踢 出',
      danger: true,
    });
    if (!ok) return;
    setOperating(`kick-${target.playerId}`);
    try {
      const res = await kickGuildMember(target.playerId);
      if (res.success) {
        toast.success('已踢出');
        await refreshAll();
      } else {
        toast.error('操作失败');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
    setOperating(null);
  };

  if (mainTab === 'party') {
    return (
      <div className={styles.mockPage}>
        <div className={styles.appbar}>
          <div className={styles.appbarRow}>
            <div className={styles.appbarLoc}>
              <span className={styles.appbarBook}>组 队 大 厅</span>
              <span className={styles.appbarZone}>四海同行</span>
            </div>
            <div className={styles.appbarIcons}>
              <button className={styles.appbarIcon} onClick={() => navigateTo('chat')} type="button" aria-label="聊天">聊</button>
            </div>
          </div>
        </div>
        {renderTabBar()}
        <PartyHallPanel />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.mockPage}>
        <div className={styles.appbar}>
          <div className={styles.appbarRow}>
            <div className={styles.appbarLoc}>
              <span className={styles.appbarBook}>盟 会</span>
            </div>
          </div>
        </div>
        {renderTabBar()}
        <div className={styles.feedEmpty}>盟会信息载入中...</div>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className={styles.mockPage}>
        <div className={styles.appbar}>
          <div className={styles.appbarRow}>
            <div className={styles.appbarLoc}>
              <span className={styles.appbarBook}>盟 会</span>
              <span className={styles.appbarZone}>尚未加入</span>
            </div>
            <div className={styles.appbarIcons}>
              <button className={styles.appbarIcon} onClick={refreshAll} type="button" aria-label="刷新">⟳</button>
            </div>
          </div>
        </div>
        {renderTabBar()}

        <div className={styles.guJoinBanner}>
          <div className={styles.guJoinTitle}>择 盟 而 聚</div>
          <div className={styles.guJoinSub}>创建盟会需 500 万金币 · 或加入现有盟会</div>
          <div className={styles.guJoinCreate}>
            <input
              className={styles.guDonateInput}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="盟会名称（不超过12字）"
              maxLength={12}
            />
            <button
              className={styles.guDonateBtn}
              onClick={handleCreate}
              disabled={operating === 'create'}
              type="button"
            >
              {operating === 'create' ? '...' : '创 盟'}
            </button>
          </div>
        </div>

        <div className={styles.sectRow}>
          可 加 入 的 盟 会
          <span className={styles.sectMore}>{guildList.length} 个</span>
        </div>

        <div className={styles.guList}>
          {guildList.length === 0 ? (
            <div className={styles.feedEmpty}>当前无可加入的盟会，自立山头吧</div>
          ) : (
            guildList.map((g) => (
              <div key={g.guildId} className={styles.guListItem}>
                <div className={styles.guListCrest}>{firstChar(g.name)}</div>
                <div className={styles.guListBody}>
                  <div className={styles.guListName}>{g.name}</div>
                  <div className={styles.guListMeta}>
                    Lv {g.level} · {g.memberCount}/{g.maxMembers} 人 · 盟主 {g.leaderName}
                  </div>
                </div>
                <button
                  className={styles.guListJoin}
                  onClick={() => handleJoin(g.guildId)}
                  disabled={operating === g.guildId || g.memberCount >= g.maxMembers}
                  type="button"
                >
                  {operating === g.guildId ? '...' : (g.memberCount >= g.maxMembers ? '已满' : '加入')}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const myPositionLabel = POSITION_LABEL[guild.myPosition || 'MEMBER'] || '成员';
  const createDateText = formatDate(guild.createTime);

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>盟 会</span>
            <span className={styles.appbarZone}>{guild.name}</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('chat')} type="button" aria-label="盟聊">聊</button>
            <button className={styles.appbarIcon} onClick={() => navigateTo('ranking')} type="button" aria-label="贡献榜">贡</button>
          </div>
        </div>
      </div>
      {renderTabBar()}

      <div className={styles.scrollPlain}>
        <div className={styles.guBanner}>
          <div className={styles.guCrest}>{firstChar(guild.name)}</div>
          <div className={styles.guName}>
            <div className={styles.guN1}>{guild.name}</div>
            <div className={styles.guN2}>
              盟主 · {guild.leaderName}
              {createDateText && ` · 创盟 ${createDateText}`}
            </div>
          </div>
        </div>

        <div className={styles.guStats}>
          <div className={styles.guStatItem}>
            <div className={styles.guStatV}>Lv {guild.level}</div>
            <div className={styles.guStatK}>盟等</div>
          </div>
          <div className={styles.guStatItem}>
            <div className={styles.guStatV}>{guild.memberCount}/{guild.maxMembers}</div>
            <div className={styles.guStatK}>成员</div>
          </div>
          <div className={styles.guStatItem}>
            <div className={styles.guStatV}>{guild.totalConstruction.toLocaleString()}</div>
            <div className={styles.guStatK}>建设</div>
          </div>
          <div className={styles.guStatItem}>
            <div className={styles.guStatV}>{guild.totalHonor.toLocaleString()}</div>
            <div className={styles.guStatK}>荣誉</div>
          </div>
        </div>

        <div className={styles.sectRow}>我 的 数 据</div>
        <div className={styles.guOccupy}>
          <div className={styles.guRow}>
            <span className={styles.guRowK}>职 位</span>
            <span className={styles.guRowV}>{myPositionLabel}</span>
          </div>
          <div className={styles.guRow}>
            <span className={styles.guRowK}>个人贡献</span>
            <span className={`${styles.guRowV} ${styles.guRowVRed}`}>
              {(guild.myContribution ?? 0).toLocaleString()}
            </span>
          </div>
          <div className={styles.guRow}>
            <span className={styles.guRowK}>个人建设</span>
            <span className={styles.guRowV}>{(guild.myConstruction ?? 0).toLocaleString()}</span>
          </div>
          <div className={styles.guRow}>
            <span className={styles.guRowK}>个人荣誉</span>
            <span className={`${styles.guRowV} ${styles.guRowVGreen}`}>
              {(guild.myHonor ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className={styles.guDonateRow}>
          <input
            className={styles.guDonateInput}
            type="number"
            min={1}
            value={donateAmount}
            onChange={(e) => setDonateAmount(e.target.value)}
            placeholder="捐献金额 · 金币"
          />
          <button
            className={styles.guDonateBtn}
            onClick={handleDonate}
            disabled={operating === 'donate'}
            type="button"
          >
            {operating === 'donate' ? '...' : '捐 献'}
          </button>
        </div>

        {guild.notice && (
          <>
            <div className={styles.sectRow}>盟 会 公 告</div>
            <div className={styles.guOccupy}>
              <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
                {guild.notice}
              </div>
            </div>
          </>
        )}

        <div className={styles.sectRow}>
          盟 友 名 册
          <span className={styles.sectMore}>共 {sortedMembers.length} 人</span>
        </div>
        <div className={styles.guMembers}>
          {sortedMembers.length === 0 ? (
            <div className={styles.feedEmpty}>盟会尚无其他成员</div>
          ) : (
            sortedMembers.map((m) => {
              const isSelf = !!playerId && String(m.playerId) === String(playerId);
              const titleCls =
                m.position === 'LEADER' ? styles.guMemberTitle :
                m.position === 'ELDER' ? `${styles.guMemberTitle} ${styles.guMemberTitleGold}` : '';
              return (
                <div key={m.playerId} className={styles.guMember}>
                  <div className={styles.guMemberAv}>{memberFirstChar(m.playerName)}</div>
                  <div className={styles.guMemberInfo}>
                    <div className={styles.guMemberNm}>
                      {titleCls && <span className={titleCls}>{POSITION_LABEL[m.position]}</span>}
                      {m.playerName}
                      {isSelf && <span className={styles.guMemberSelf}>（你）</span>}
                    </div>
                    <div className={styles.guMemberSt}>
                      建设 {m.construction} · 荣誉 {m.honor}
                    </div>
                  </div>
                  <div className={styles.guMemberContribution}>贡 {m.contribution}</div>
                  {isElder && m.position === 'MEMBER' && !isSelf && (
                    <button
                      className={styles.guMemberKick}
                      onClick={() => handleKick(m)}
                      disabled={operating === `kick-${m.playerId}`}
                      type="button"
                    >
                      踢
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className={styles.guActions}>
          <button
            className={styles.guAct}
            onClick={() => navigateTo('treasure-mountain')}
            type="button"
          >
            宝 山
          </button>
          <button
            className={styles.guAct}
            onClick={() => navigateTo('world-boss')}
            type="button"
          >
            盟 战
          </button>
          {isLeader ? (
            <button
              className={`${styles.guAct} ${styles.guActRed}`}
              onClick={handleDissolve}
              disabled={operating === 'dissolve'}
              type="button"
            >
              解 散
            </button>
          ) : (
            <button
              className={`${styles.guAct} ${styles.guActRed}`}
              onClick={handleLeave}
              disabled={operating === 'leave'}
              type="button"
            >
              退 出
            </button>
          )}
        </div>

        {playerName && (
          <div style={{ padding: '8px 14px 16px', fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            当前视角 · {playerName}
          </div>
        )}
      </div>
    </div>
  );
}
