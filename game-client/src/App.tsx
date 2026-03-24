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
import type { PageId } from './types';

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

  const PageComponent = PAGE_MAP[currentPage] || HomePage;

  return (
    <>
      <Toast />
      <GameLayout>
        <PageComponent />
      </GameLayout>
    </>
  );
}
