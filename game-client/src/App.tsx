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
import PetSummonPage from './components/pages/PetSummonPage';
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
import StoryPage from './components/pages/StoryPage';
import ExplorePage from './components/pages/ExplorePage';
import MemoryPage from './components/pages/MemoryPage';
import RebirthPage from './components/pages/RebirthPage';
import EquipDetailPage from './components/pages/EquipDetailPage';
import SkillTreePage from './components/pages/SkillTreePage';
import BookWorldPage from './components/pages/BookWorldPage';
import CodexPage from './components/pages/CodexPage';
import AchievementPage from './components/pages/AchievementPage';
import CompanionPage from './components/pages/CompanionPage';
import TitlePage from './components/pages/TitlePage';
import FlowerPage from './components/pages/FlowerPage';
import TeamBattlePage from './components/pages/TeamBattlePage';
import FateMapPage from './components/pages/FateMapPage';
import CoexplorePage from './components/pages/CoexplorePage';
import MysticTomePage from './components/pages/MysticTomePage';
import SecretRealmPage from './components/pages/SecretRealmPage';
import CheckinPage from './components/pages/CheckinPage';
import PowerPage from './components/pages/PowerPage';
import MountPage from './components/pages/MountPage';
import FashionPage from './components/pages/FashionPage';
import BankPage from './components/pages/BankPage';
import FishingPage from './components/pages/FishingPage';
import ArenaPage from './components/pages/ArenaPage';
import RechargePage from './components/pages/RechargePage';
import BattleResultPage from './components/pages/BattleResultPage';
import PkResultPage from './components/pages/PkResultPage';
import WeddingPage from './components/pages/WeddingPage';
import MasterDisciplePage from './components/pages/MasterDisciplePage';
import LineagePage from './components/pages/LineagePage';
import CouplePage from './components/pages/CouplePage';
import RuneFurnacePage from './components/pages/RuneFurnacePage';
import SoulAttachPage from './components/pages/SoulAttachPage';
import TutorialPage from './components/pages/TutorialPage';
import NotificationPage from './components/pages/NotificationPage';
import SoulTowerPage from './components/pages/SoulTowerPage';
import MiragePage from './components/pages/MiragePage';
import BattlefieldPage from './components/pages/BattlefieldPage';
import GhostHousePage from './components/pages/GhostHousePage';
import ShootingPage from './components/pages/ShootingPage';
import HallOfFamePage from './components/pages/HallOfFamePage';
import MonthlyCardPage from './components/pages/MonthlyCardPage';
import FirstRechargePage from './components/pages/FirstRechargePage';
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
  story: StoryPage,
  explore: ExplorePage,
  memory: MemoryPage,
  rebirth: RebirthPage,
  'equip-detail': EquipDetailPage,
  enchant: EnchantPage,
  'skill-tree': SkillTreePage,
  'pet-summon': PetSummonPage,
  'book-world': BookWorldPage,
  codex: CodexPage,
  achievement: AchievementPage,
  companion: CompanionPage,
  title: TitlePage,
  flower: FlowerPage,
  'team-battle': TeamBattlePage,
  'fate-map': FateMapPage,
  coexplore: CoexplorePage,
  'mystic-tome': MysticTomePage,
  'secret-realm': SecretRealmPage,
  'destiny-path': ActivityPage,
  checkin: CheckinPage,
  power: PowerPage,
  mount: MountPage,
  fashion: FashionPage,
  bank: BankPage,
  fishing: FishingPage,
  arena: ArenaPage,
  recharge: RechargePage,
  'battle-result': BattleResultPage,
  'pk-result': PkResultPage,
  wedding: WeddingPage,
  'master-disciple': MasterDisciplePage,
  lineage: LineagePage,
  'couple-cultivation': CouplePage,
  'rune-furnace': RuneFurnacePage,
  'soul-attach': SoulAttachPage,
  tutorial: TutorialPage,
  notification: NotificationPage,
  'soul-tower': SoulTowerPage,
  mirage: MiragePage,
  battlefield: BattlefieldPage,
  'ghost-house': GhostHousePage,
  shooting: ShootingPage,
  'hall-of-fame': HallOfFamePage,
  'monthly-card': MonthlyCardPage,
  'first-recharge': FirstRechargePage,
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
        <PageErrorBoundary key={currentPage}>
          <Page />
        </PageErrorBoundary>
      </>
    );
  }

  return (
    <>
      <Toast />
      <GameLayout>
        <PageErrorBoundary key={currentPage}>
          <Page />
        </PageErrorBoundary>
      </GameLayout>
    </>
  );
}
