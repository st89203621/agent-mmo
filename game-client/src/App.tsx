import React, { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { usePlayerStore } from './store/playerStore';
import { getMe } from './services/api';
import GameLayout from './components/layout/GameLayout';
import LoginPage from './components/pages/LoginPage';
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
import type { PageId } from './types';

const PAGE_MAP: Record<PageId, React.FC> = {
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
};

export default function App() {
  const { currentPage } = useGameStore();
  const { playerId, setPlayer } = usePlayerStore();
  const [checking, setChecking] = useState(true);

  // 启动时检查是否已登录（session复用）
  useEffect(() => {
    getMe()
      .then((data) => {
        setPlayer(String(data.userId), data.username, '');
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0e0b09', color: '#c9a84c', fontFamily: 'serif', fontSize: '18px',
      }}>
        七世轮回书
      </div>
    );
  }

  // 未登录显示登录页
  if (!playerId) {
    return <LoginPage />;
  }

  const PageComponent = PAGE_MAP[currentPage] || StoryPage;

  return (
    <GameLayout>
      <PageComponent />
    </GameLayout>
  );
}
