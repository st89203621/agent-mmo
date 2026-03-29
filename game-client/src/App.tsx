import React, { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { usePlayerStore } from './store/playerStore';
import { getMe, fetchPersonInfo, fetchSelectedBook, fetchPlayerCurrency } from './services/api';
import GameLayout from './components/layout/GameLayout';
import Toast from './components/common/Toast';
import LoginPage from './components/pages/LoginPage';
import HomePage from './components/pages/HomePage';
import StoryPage from './components/pages/StoryPage';
import BattlePage from './components/pages/BattlePage';
import ExplorePage from './components/pages/ExplorePage';
import MemoryPage from './components/pages/MemoryPage';
import RebirthPage from './components/pages/RebirthPage';
import CharacterPage from './components/pages/CharacterPage';
import EquipDetailPage from './components/pages/EquipDetailPage';
import EnchantPage from './components/pages/EnchantPage';
import SkillTreePage from './components/pages/SkillTreePage';
import InventoryPage from './components/pages/InventoryPage';
import PetPage from './components/pages/PetPage';
import PetSummonPage from './components/pages/PetSummonPage';
import BookWorldPage from './components/pages/BookWorldPage';
import DungeonPage from './components/pages/DungeonPage';
import CodexPage from './components/pages/CodexPage';
import CharCreatePage from './components/pages/CharCreatePage';
import AchievementPage from './components/pages/AchievementPage';
import QuestPage from './components/pages/QuestPage';
import ShopPage from './components/pages/ShopPage';
import CompanionPage from './components/pages/CompanionPage';
import TitlePage from './components/pages/TitlePage';
import GuildPage from './components/pages/GuildPage';
import ScenePage from './components/pages/ScenePage';
import TreasureMountainPage from './components/pages/TreasureMountainPage';
import FlowerPage from './components/pages/FlowerPage';
import TradePage from './components/pages/TradePage';
import TeamBattlePage from './components/pages/TeamBattlePage';
import FateMapPage from './components/pages/FateMapPage';
import type { PageId } from './types';

/** 错误边界：防止子组件崩溃导致整个页面黑屏 */
class PageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown) { console.error('[PageError]', error); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12,
          background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--font-ui)',
        }}>
          <span style={{ fontSize: 36 }}>!</span>
          <p>页面加载异常</p>
          <button
            style={{
              padding: '8px 20px', background: 'var(--gold)', color: 'var(--ink)',
              border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer',
            }}
            onClick={() => this.setState({ hasError: false })}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * 页面缓存组件：主导航页面保持挂载（display:none 隐藏），
 * 切回时瞬间显示无需重新加载。子页面正常卸载/挂载。
 */
function PageCache({ currentPage }: { currentPage: PageId }) {
  const [visited, setVisited] = React.useState<Set<PageId>>(() => new Set([currentPage]));

  React.useEffect(() => {
    if (KEEP_ALIVE_PAGES.includes(currentPage) && !visited.has(currentPage)) {
      setVisited((prev) => new Set(prev).add(currentPage));
    }
  }, [currentPage]);

  const isKeepAlive = KEEP_ALIVE_PAGES.includes(currentPage);

  return (
    <>
      {/* 保活页面：已访问过的主导航页面始终挂载 */}
      {KEEP_ALIVE_PAGES.filter((id) => visited.has(id)).map((id) => {
        const Page = PAGE_MAP[id];
        return (
          <div key={id} style={{ display: currentPage === id ? 'contents' : 'none', height: '100%' }}>
            <PageErrorBoundary><Page /></PageErrorBoundary>
          </div>
        );
      })}
      {/* 子页面：正常挂载/卸载 */}
      {!isKeepAlive && (() => {
        const Page = PAGE_MAP[currentPage] || HomePage;
        return <PageErrorBoundary><Page /></PageErrorBoundary>;
      })()}
    </>
  );
}

/** 主导航页面：保持挂载，切换时用 display:none 隐藏，避免重复加载 */
const KEEP_ALIVE_PAGES: PageId[] = ['home', 'story', 'explore', 'character', 'achievement'];

const PAGE_MAP: Record<PageId, React.FC> = {
  'home': HomePage,
  'story': StoryPage,
  'battle': BattlePage,
  'explore': ExplorePage,
  'memory': MemoryPage,
  'rebirth': RebirthPage,
  'character': CharacterPage,
  'equip-detail': EquipDetailPage,
  'enchant': EnchantPage,
  'skill-tree': SkillTreePage,
  'inventory': InventoryPage,
  'pet': PetPage,
  'pet-summon': PetSummonPage,
  'book-world': BookWorldPage,
  'dungeon': DungeonPage,
  'codex': CodexPage,
  'char-create': CharCreatePage,
  'achievement': AchievementPage,
  'quest': QuestPage,
  'shop': ShopPage,
  'companion': CompanionPage,
  'title': TitlePage,
  'guild': GuildPage,
  'scene': ScenePage,
  'treasure-mountain': TreasureMountainPage,
  'flower': FlowerPage,
  'trade': TradePage,
  'team-battle': TeamBattlePage,
  'fate-map': FateMapPage,
};

export default function App() {
  const { currentPage, navigateTo } = useGameStore();
  const { playerId, setPlayer, personCreated, setPersonCreated } = usePlayerStore();
  const [checking, setChecking] = useState(true);

  // 启动时检查是否已登录（session复用）+ 角色是否存在 + 恢复已选书籍 + 加载货币
  useEffect(() => {
    getMe()
      .then(async (data) => {
        setPlayer(String(data.userId), data.username, '');
        // 并行加载角色、已选书籍、货币
        const [person, book, cur] = await Promise.all([
          fetchPersonInfo().catch(() => ({ exists: false }) as { exists: boolean }),
          fetchSelectedBook(usePlayerStore.getState().currentWorldIndex || 1).catch(() => null),
          fetchPlayerCurrency().catch(() => ({ gold: 0, diamond: 0 })),
        ]);
        setPersonCreated(!!person.exists);
        // 恢复已选书籍到 gameStore
        if (book && book.bookId) {
          useGameStore.getState().setBookWorld({
            id: book.bookId, title: book.title, author: book.author,
            category: book.category, loreSummary: book.loreSummary,
            artStyle: book.artStyle, colorPalette: book.colorPalette,
            languageStyle: book.languageStyle, coverUrl: '',
          });
        }
        // 恢复货币到 playerStore
        usePlayerStore.getState().setCurrency(cur.gold, cur.diamond);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <>
        <Toast />
        <div style={{
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0e0b09', color: '#c9a84c', fontFamily: 'serif', fontSize: '18px',
        }}>
          七世轮回书
        </div>
      </>
    );
  }

  // 未登录显示登录页
  if (!playerId) {
    return (
      <>
        <Toast />
        <LoginPage />
      </>
    );
  }

  // 未创角则显示创角页
  if (!personCreated && currentPage !== 'char-create') {
    const CreatePage = PAGE_MAP['char-create'];
    return (
      <>
        <Toast />
        <GameLayout>
          <CreatePage />
        </GameLayout>
      </>
    );
  }

  return (
    <>
      <Toast />
      <GameLayout>
        <PageCache currentPage={currentPage} />
      </GameLayout>
    </>
  );
}
