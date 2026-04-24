import React, { useEffect, useMemo, useState } from 'react';
import { getMe, fetchPersonInfo, fetchPlayerCurrency } from './services/api';
import type { PageId } from './types';
import { useGameStore } from './store/gameStore';
import { usePlayerStore } from './store/playerStore';
import Toast from './components/common/Toast';
import GameLayout from './components/layout/GameLayout';
import LoginPage from './components/pages/LoginPage';
import CharCreatePage from './components/pages/CharCreatePage';
import ScenePage from './components/pages/ScenePage';
import CharacterPage from './components/pages/CharacterPage';
import InventoryPage from './components/pages/InventoryPage';
import QuestPage from './components/pages/QuestPage';
import PetPage from './components/pages/PetPage';
import TradePage from './components/pages/TradePage';
import AuctionPage from './components/pages/AuctionPage';
import ShopPage from './components/pages/ShopPage';
import GuildPage from './components/pages/GuildPage';
import MessageBoardPage from './components/pages/MessageBoardPage';
import WorldBossPage from './components/pages/WorldBossPage';
import WheelPage from './components/pages/WheelPage';
import BattlePage from './components/pages/BattlePage';
import DungeonPage from './components/pages/DungeonPage';
import TreasureMountainPage from './components/pages/TreasureMountainPage';
import EnchantPage from './components/pages/EnchantPage';
import ActivityPage from './components/pages/ActivityPage';
import HomePage from './components/pages/HomePage';
import CharSelectPage from './components/pages/lunhui/CharSelectPage';
import TeleportPage from './components/pages/lunhui/TeleportPage';
import PlacePage from './components/pages/lunhui/PlacePage';
import NearbyPage from './components/pages/lunhui/NearbyPage';
import MessagesPage from './components/pages/lunhui/MessagesPage';
import ChatPage from './components/pages/lunhui/ChatPage';
import FriendPage from './components/pages/lunhui/FriendPage';
import MailPage from './components/pages/lunhui/MailPage';
import WorldMapPage from './components/pages/lunhui/WorldMapPage';
import MatchmakingPage from './components/pages/lunhui/MatchmakingPage';
import SettingsPage from './components/pages/lunhui/SettingsPage';
import EventsPage from './components/pages/lunhui/EventsPage';
import VipPage from './components/pages/lunhui/VipPage';
import RankingPage from './components/pages/lunhui/RankingPage';
import HousingPage from './components/pages/lunhui/HousingPage';
import StatusPage from './components/pages/lunhui/StatusPage';

class PageErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: unknown) { console.error('[PageError]', error); }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 24, color: '#EDE5D3', textAlign: 'center' }}>页面加载异常，请刷新重试。</div>;
    }
    return this.props.children;
  }
}

const PAGE_MAP: Record<PageId, React.FC> = {
  login: LoginPage,
  'char-select': CharSelectPage,
  'char-create': CharCreatePage,
  hub: ScenePage,
  scene: ScenePage,
  place: PlacePage,
  teleport: TeleportPage,
  status: StatusPage,
  character: CharacterPage,
  inventory: InventoryPage,
  nearby: NearbyPage,
  messages: MessagesPage,
  'message-board': MessageBoardPage,
  chat: ChatPage,
  friend: FriendPage,
  mail: MailPage,
  matchmaking: MatchmakingPage,
  guild: GuildPage,
  market: TradePage,
  stall: TradePage,
  trade: TradePage,
  auction: AuctionPage,
  shop: ShopPage,
  forge: EnchantPage,
  housing: HousingPage,
  pet: PetPage,
  quest: QuestPage,
  battle: BattlePage,
  hunt: BattlePage,
  'world-boss': WorldBossPage,
  wheel: WheelPage,
  ranking: RankingPage,
  dungeon: DungeonPage,
  'world-map': WorldMapPage,
  events: EventsPage,
  activity: ActivityPage,
  vip: VipPage,
  settings: SettingsPage,
  'treasure-mountain': TreasureMountainPage,
  home: HomePage,
  story: ChatPage,
  explore: PlacePage,
  memory: CharacterPage,
  rebirth: CharacterPage,
  'equip-detail': CharacterPage,
  enchant: EnchantPage,
  'skill-tree': CharacterPage,
  'pet-summon': PetPage,
  'book-world': ScenePage,
  codex: CharacterPage,
  achievement: CharacterPage,
  companion: HomePage,
  title: CharacterPage,
  flower: HomePage,
  'team-battle': BattlePage,
  'fate-map': MatchmakingPage,
  coexplore: ChatPage,
  'mystic-tome': ActivityPage,
  'secret-realm': ActivityPage,
  'destiny-path': ActivityPage,
};

const SHELL_LESS_PAGES: PageId[] = ['login', 'char-select', 'char-create'];

export default function App() {
  const currentPage = useGameStore((s) => s.currentPage);
  const replaceTo = useGameStore((s) => s.replaceTo);
  const { playerId, setPlayer, personCreated, setPersonCreated } = usePlayerStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getMe()
      .then(async (data) => {
        setPlayer(String(data.userId), data.username, '');
        const [person, currency] = await Promise.all([
          fetchPersonInfo().catch(() => ({ exists: false })),
          fetchPlayerCurrency().catch(() => ({ gold: 0, diamond: 0 })),
        ]);
        setPersonCreated(!!person.exists);
        usePlayerStore.getState().setCurrency(currency.gold, currency.diamond);
        replaceTo('char-select');
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [replaceTo, setPersonCreated, setPlayer]);

  const Page = useMemo(() => PAGE_MAP[currentPage] || HomePage, [currentPage]);

  if (checking) {
    return (
      <>
        <Toast />
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EDE5D3' }}>
          正在连接气盖山河区…
        </div>
      </>
    );
  }

  if (!playerId) {
    return (
      <>
        <Toast />
        <LoginPage />
      </>
    );
  }

  if (!personCreated && currentPage !== 'char-create') {
    return (
      <>
        <Toast />
        <CharSelectPage />
      </>
    );
  }

  if (currentPage === 'char-select' || SHELL_LESS_PAGES.includes(currentPage)) {
    return (
      <>
        <Toast />
        <PageErrorBoundary>
          <Page />
        </PageErrorBoundary>
      </>
    );
  }

  return (
    <>
      <Toast />
      <GameLayout>
        <PageErrorBoundary>
          <Page />
        </PageErrorBoundary>
      </GameLayout>
    </>
  );
}
