import React, { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { usePlayerStore } from './store/playerStore';
import { getMe, fetchPersonInfo } from './services/api';
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
import QuestPage from './components/pages/QuestPage';
import ShopPage from './components/pages/ShopPage';
import RankPage from './components/pages/RankPage';
import CompanionPage from './components/pages/CompanionPage';
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
  'quest': QuestPage,
  'shop': ShopPage,
  'rank': RankPage,
  'companion': CompanionPage,
};

export default function App() {
  const { currentPage, navigateTo } = useGameStore();
  const { playerId, setPlayer } = usePlayerStore();
  const [checking, setChecking] = useState(true);
  const [needCreate, setNeedCreate] = useState(false);

  // 启动时检查是否已登录（session复用）+ 角色是否存在
  useEffect(() => {
    getMe()
      .then(async (data) => {
        setPlayer(String(data.userId), data.username, '');
        // 检查角色是否已创建
        try {
          const person = await fetchPersonInfo();
          if (!person.exists) {
            setNeedCreate(true);
          }
        } catch { /* 忽略，进入默认页 */ }
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

  // 未创角则显示创角页
  if (needCreate && currentPage !== 'char-create') {
    const CreatePage = PAGE_MAP['char-create'];
    return (
      <GameLayout>
        <CreatePage />
      </GameLayout>
    );
  }

  const PageComponent = PAGE_MAP[currentPage] || StoryPage;

  return (
    <GameLayout>
      <PageComponent />
    </GameLayout>
  );
}
