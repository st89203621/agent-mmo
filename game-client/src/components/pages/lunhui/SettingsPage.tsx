import { useCallback, useEffect, useState } from 'react';
import { logout } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';
import { usePlayerStore } from '../../../store/playerStore';
import { toast } from '../../../store/toastStore';
import {
  VISUAL_STYLES,
  type VisualStyleId,
  getVisualStyle,
  setVisualStyle,
  clearAllAssetCache,
} from '../../../data/visualAssets';
import styles from './LunhuiPages.module.css';
import { usePageBackground } from '../../common/PageShell';
import { PAGE_BG } from '../../../data/pageBackgrounds';

const STORAGE_KEY = 'mmo.settings';

interface LocalSettings {
  sound: boolean;
  bgm: boolean;
  notifyMail: boolean;
  notifyAuction: boolean;
  graphics: 'low' | 'medium' | 'high';
}

const DEFAULTS: LocalSettings = {
  sound: true,
  bgm: true,
  notifyMail: true,
  notifyAuction: true,
  graphics: 'high',
};

function loadSettings(): LocalSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<LocalSettings>) };
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(s: LocalSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore quota errors
  }
}

const GRAPHICS_LABEL: Record<LocalSettings['graphics'], string> = {
  low: '节能',
  medium: '标准',
  high: '高清',
};

export default function SettingsPage() {
  usePageBackground(PAGE_BG.SETTINGS);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const playerId = usePlayerStore((s) => s.playerId);
  const playerName = usePlayerStore((s) => s.playerName);
  const clearPlayer = usePlayerStore((s) => s.clearPlayer);

  const [settings, setSettings] = useState<LocalSettings>(() => loadSettings());
  const [loggingOut, setLoggingOut] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<VisualStyleId>(() => getVisualStyle().id);

  const handleStyleChange = useCallback((id: VisualStyleId) => {
    setVisualStyle(id);
    setCurrentStyle(id);
  }, []);

  const handleRedrawAll = useCallback(() => {
    clearAllAssetCache();
    toast.info('图片缓存已清除，重新进入各页面将自动重绘');
  }, []);

  useEffect(() => { saveSettings(settings); }, [settings]);

  const toggle = useCallback(<K extends keyof LocalSettings>(key: K) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] } as LocalSettings));
  }, []);

  const setGraphics = useCallback((g: LocalSettings['graphics']) => {
    setSettings((prev) => ({ ...prev, graphics: g }));
  }, []);

  const handleLogout = useCallback(async () => {
    if (!window.confirm('确认退出当前账号？')) return;
    setLoggingOut(true);
    try {
      await logout().catch(() => {});
      clearPlayer();
      toast.info('已退出登录');
      navigateTo('login');
    } finally {
      setLoggingOut(false);
    }
  }, [clearPlayer, navigateTo]);

  const renderSwitch = (on: boolean, onToggle: () => void, label: string) => (
    <button
      className={`${styles.setSwitch} ${on ? styles.setSwitchOn : ''}`.trim()}
      onClick={onToggle}
      type="button"
      aria-label={label}
      aria-pressed={on}
    >
      <span className={styles.setSwitchDot} />
    </button>
  );

  return (
    <div className={styles.mockPage}>
      <div className={styles.appbar}>
        <div className={styles.appbarRow}>
          <div className={styles.appbarLoc}>
            <span className={styles.appbarBook}>设 置</span>
            <span className={styles.appbarZone}>账户 · 音效 · 画质</span>
          </div>
          <div className={styles.appbarIcons}>
            <button className={styles.appbarIcon} onClick={() => navigateTo('status')} type="button" aria-label="返回">返</button>
          </div>
        </div>
      </div>

      <div className={styles.scrollPlain}>
        <div className={styles.sectRow}>账 户 信 息</div>
        <div className={styles.setRow}>
          <div className={styles.setRowK}>
            角色名
            <span className={styles.setRowDesc}>当前登录角色</span>
          </div>
          <span className={styles.setRowV}>{playerName || '未登录'}</span>
        </div>
        <div className={styles.setRow}>
          <div className={styles.setRowK}>
            玩家 ID
            <span className={styles.setRowDesc}>唯一标识</span>
          </div>
          <span className={styles.setRowV}>{playerId || '—'}</span>
        </div>

        <div className={styles.sectRow}>音 效 画 质</div>
        <div className={styles.setRow}>
          <div className={styles.setRowK}>
            战斗音效
            <span className={styles.setRowDesc}>技能 · 命中 · UI 反馈</span>
          </div>
          {renderSwitch(settings.sound, () => toggle('sound'), '战斗音效')}
        </div>
        <div className={styles.setRow}>
          <div className={styles.setRowK}>
            背景音乐
            <span className={styles.setRowDesc}>主城 / 野外 · 自动切换</span>
          </div>
          {renderSwitch(settings.bgm, () => toggle('bgm'), '背景音乐')}
        </div>
        <div className={styles.setRow}>
          <div className={styles.setRowK}>
            画质模式
            <span className={styles.setRowDesc}>影响帧率与流畅度</span>
          </div>
          <select
            className={styles.setSelect}
            value={settings.graphics}
            onChange={(e) => setGraphics(e.target.value as LocalSettings['graphics'])}
          >
            {(Object.keys(GRAPHICS_LABEL) as LocalSettings['graphics'][]).map((g) => (
              <option key={g} value={g}>{GRAPHICS_LABEL[g]}</option>
            ))}
          </select>
        </div>

        <div className={styles.sectRow}>消 息 提 醒</div>
        <div className={styles.setRow}>
          <div className={styles.setRowK}>
            邮件到达提醒
            <span className={styles.setRowDesc}>系统邮件 · 奖励邮件</span>
          </div>
          {renderSwitch(settings.notifyMail, () => toggle('notifyMail'), '邮件到达提醒')}
        </div>
        <div className={styles.setRow}>
          <div className={styles.setRowK}>
            拍卖 / 集市提醒
            <span className={styles.setRowDesc}>成交 / 被竞价通知</span>
          </div>
          {renderSwitch(settings.notifyAuction, () => toggle('notifyAuction'), '拍卖提醒')}
        </div>

        <div className={styles.sectRow}>画 风 · 重 绘</div>
        <div className={styles.setRow} style={{ flexWrap: 'wrap', gap: 8 }}>
          <div className={styles.setRowK} style={{ width: '100%' }}>
            插画风格
            <span className={styles.setRowDesc}>影响全局 AI 生成画面的美术风格</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {VISUAL_STYLES.map((s) => (
              <button
                key={s.id}
                className={`${styles.tpItem} ${currentStyle === s.id ? styles.tpItemRed : ''}`.trim()}
                onClick={() => handleStyleChange(s.id as VisualStyleId)}
                type="button"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.setRow}>
          <div className={styles.setRowK}>
            全局重绘
            <span className={styles.setRowDesc}>清除所有图片缓存，重新进入页面自动生成</span>
          </div>
          <button
            className={styles.tpItem}
            onClick={handleRedrawAll}
            type="button"
          >
            重 绘 全 部
          </button>
        </div>

        <button
          className={styles.setDanger}
          onClick={handleLogout}
          disabled={loggingOut}
          type="button"
        >
          {loggingOut ? '退 出 中 ...' : '退 出 登 录'}
        </button>

        <div className={styles.setAbout}>
          轮 回 Online · 气盖山河区 · H5 融合客户端
        </div>
      </div>
    </div>
  );
}
