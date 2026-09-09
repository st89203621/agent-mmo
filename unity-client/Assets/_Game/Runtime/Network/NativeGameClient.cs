using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Google.Protobuf;
using Lunhui.Protocol;

namespace Lunhui
{
    public sealed class NativeGameClient
    {
        private readonly IoGameNetworkSession session;
        private long moveSequence, actionSequence;
        private bool disposed;
        private Task growthRefresh, worldPoll;
        public PersonMessage Person { get; private set; }
        public PlayerCurrencyMessage Currency { get; private set; } = new PlayerCurrencyMessage();
        public BagMessage Bag { get; private set; } = new BagMessage();
        public List<EquipMessage> Equipment { get; private set; } = new List<EquipMessage>();
        public List<PetMessage> Pets { get; private set; } = new List<PetMessage>();
        public NativeGuildState Guild { get; private set; }
        public NativeMountainState Mountains { get; private set; }
        public NativeWorldSnapshot Snapshot { get; private set; }
        public Dictionary<string, EnchantMessage> Enchantments { get; } = new Dictionary<string, EnchantMessage>();
        public List<ChatMessage> ChatHistory { get; private set; } = new List<ChatMessage>();
        public List<TradeMessage> Trades { get; private set; } = new List<TradeMessage>();
        public TeamMessage Team { get; private set; }
        public List<TitleMessage> Titles { get; private set; } = new List<TitleMessage>();
        public List<TitleMessage> AvailableTitles { get; private set; } = new List<TitleMessage>();
        public TitleMessage EquippedTitle { get; private set; } = new TitleMessage();
        public const int WorldChatType = 1;
        public const int PrivateChatType = 2;
        private readonly Dictionary<long, int> unreadPrivateChatCounts = new Dictionary<long, int>();
        public int UnreadWorldChatCount { get; private set; }
        public IReadOnlyDictionary<long, int> UnreadPrivateChatCounts => unreadPrivateChatCounts;
        public int TotalUnreadChatCount => UnreadWorldChatCount + GetUnreadPrivateChatCount();
        public ChatMessage LatestChatMessage => ChatHistory.Count == 0 ? null : ChatHistory[ChatHistory.Count - 1];
        public bool Ready { get; private set; }
        public bool Connected => !disposed && session.Authenticated;
        public event Action Changed;
        public event Action<NativeWorldSnapshot> WorldChanged;
        public event Action<ChatMessage> ChatReceived;
        public event Action ChatUnreadChanged;

        public NativeGameClient(IoGameNetworkSession connection)
        {
            session = connection;
            session.BroadcastReceived += OnBroadcast;
        }

        public Task<T> Call<T>(int route, object payload = null) where T : IMessage<T>, new()
            => session.RequestAsync(route, payload, response => new MessageParser<T>(() => new T()).ParseFrom(response.Message.Data));

        public Task<List<T>> List<T>(int route, object payload = null) where T : IMessage<T>, new()
            => session.RequestAsync(route, payload, response => response.ListValue<T>());

        public async Task Initialize()
        {
            Ready = false;
            await RefreshGrowth();
            Guild = await Call<NativeGuildState>(ServerRoutes.GuildAction_nativeState);
            Mountains = await Call<NativeMountainState>(ServerRoutes.TreasureMountainAction_nativeState);
            await RefreshTitles();
            await EnterWorld(0, true);
            EnsureCurrent();
            Ready = true;
            Changed?.Invoke();
        }

        public Task RefreshGrowth() => growthRefresh != null && !growthRefresh.IsCompleted
            ? growthRefresh : growthRefresh = ReadGrowth();

        private async Task ReadGrowth()
        {
            // Publish the refreshed caches together after all reads succeed.
            var person = await Call<PersonMessage>(ServerRoutes.PersonAction_getPerson);
            var currency = await Call<PlayerCurrencyMessage>(ServerRoutes.ShopAction_getPlayerCurrency);
            var bag = await Call<BagMessage>(ServerRoutes.BagAction_getBag);
            var equipment = await List<EquipMessage>(ServerRoutes.EquipAction_getEquipList);
            var pets = await List<PetMessage>(ServerRoutes.PetAction_getContractPets);
            var enchantments = new Dictionary<string, EnchantMessage>();
            foreach (var equip in equipment)
                if (equip.Equipped) enchantments[equip.Id] = await Call<EnchantMessage>(ServerRoutes.EnchantAction_getEnchantInfo,
                    new EnchantMessage { EquipId = equip.Id });
            EnsureCurrent();
            Person = person; Currency = currency; Bag = bag; Equipment = equipment; Pets = pets;
            Enchantments.Clear();
            foreach (var pair in enchantments) Enchantments[pair.Key] = pair.Value;
            Changed?.Invoke();
        }

        public async Task UpdatePerson(UpdatePersonMessage request)
        {
            Person = await Call<PersonMessage>(ServerRoutes.PersonAction_updatePerson, request);
            EnsureCurrent(); Changed?.Invoke();
        }

        public async Task MutateGuild(NativeGuildRequest request)
        {
            Guild = await Call<NativeGuildState>(ServerRoutes.GuildAction_nativeMutate, request);
            EnsureCurrent(); Changed?.Invoke();
            if (!Guild.Success) throw new InvalidOperationException(Guild.Message);
            await RefreshGrowth();
        }

        public async Task RefreshMountains()
        {
            Mountains = await Call<NativeMountainState>(ServerRoutes.TreasureMountainAction_nativeState);
            EnsureCurrent(); Changed?.Invoke();
        }

        public async Task RefreshCommunity()
        {
            EnsureCurrent();
            var chat = await List<ChatMessage>(ServerRoutes.ChatAction_getChatHistory);
            var trades = await List<TradeMessage>(ServerRoutes.TradeAction_listTrades);
            ChatHistory = chat ?? new List<ChatMessage>();
            TrimChatHistory();
            Trades = trades ?? new List<TradeMessage>();
            if (Team != null && !string.IsNullOrEmpty(Team.TeamId))
                Team = await Call<TeamMessage>(ServerRoutes.TeamBattleAction_getTeamInfo, Team.TeamId);
            Changed?.Invoke();
        }

        public async Task RefreshTitles()
        {
            var titles = await List<TitleMessage>(ServerRoutes.TitleAction_listTitles);
            var available = await List<TitleMessage>(ServerRoutes.TitleAction_listAvailable);
            var equipped = await Call<TitleMessage>(ServerRoutes.TitleAction_getEquipped);
            Titles = titles ?? new List<TitleMessage>();
            AvailableTitles = available ?? new List<TitleMessage>();
            EquippedTitle = equipped ?? new TitleMessage();
            Changed?.Invoke();
        }

        public async Task<TitleMessage> EquipTitle(string titleId)
        {
            if (string.IsNullOrWhiteSpace(titleId)) throw new InvalidOperationException("请选择要装备的称号");
            var equipped = await Call<TitleMessage>(ServerRoutes.TitleAction_equipTitle, titleId.Trim());
            await RefreshTitles();
            await RefreshGrowth();
            await PollWorld();
            return equipped ?? EquippedTitle;
        }

        public async Task<TitleMessage> UnequipTitle()
        {
            var result = await Call<TitleMessage>(ServerRoutes.TitleAction_unequipTitle);
            await RefreshTitles();
            await RefreshGrowth();
            await PollWorld();
            return result ?? EquippedTitle;
        }

        public async Task<TitleMessage> GetEquippedTitle()
        {
            EquippedTitle = await Call<TitleMessage>(ServerRoutes.TitleAction_getEquipped) ?? new TitleMessage();
            Changed?.Invoke();
            return EquippedTitle;
        }

        public async Task ClaimTitle(string titleId)
        {
            if (string.IsNullOrWhiteSpace(titleId)) throw new InvalidOperationException("请选择称号");
            await Call<TitleMessage>(ServerRoutes.TitleAction_claimTitle, titleId.Trim());
            await RefreshTitles();
        }

        public async Task SendWorldChat(string content)
        {
            EnsureCurrent();
            if (string.IsNullOrWhiteSpace(content)) throw new InvalidOperationException("消息不能为空");
            string json = "{\"receiverId\":0,\"content\":\"" + EscapeJson(content.Trim()) + "\",\"chatType\":1}";
            var message = await Call<ChatMessage>(ServerRoutes.ChatAction_sendWorldMessage, json);
            AppendChat(message);
            Changed?.Invoke();
        }

        public async Task SendPrivateChat(long receiverId, string content)
        {
            EnsureCurrent();
            if (receiverId <= 0 || string.IsNullOrWhiteSpace(content)) throw new InvalidOperationException("请填写接收者和消息");
            string json = "{\"receiverId\":" + receiverId + ",\"content\":\"" + EscapeJson(content.Trim()) + "\",\"chatType\":2}";
            var message = await Call<ChatMessage>(ServerRoutes.ChatAction_sendPrivateMessage, json);
            AppendChat(message);
            Changed?.Invoke();
        }

        public async Task CreateTeam()
        {
            Team = await Call<TeamMessage>(ServerRoutes.TeamBattleAction_createTeam);
            EnsureCurrent(); Changed?.Invoke();
        }

        public async Task JoinTeam(string teamId)
        {
            Team = await Call<TeamMessage>(ServerRoutes.TeamBattleAction_joinTeam, teamId);
            EnsureCurrent(); Changed?.Invoke();
        }

        public async Task LeaveTeam()
        {
            if (Team == null || string.IsNullOrEmpty(Team.TeamId)) return;
            Team = await Call<TeamMessage>(ServerRoutes.TeamBattleAction_leaveTeam, Team.TeamId);
            EnsureCurrent(); Changed?.Invoke();
        }

        public async Task CreateTrade(string itemId, int quantity, int price)
        {
            if (string.IsNullOrWhiteSpace(itemId) || quantity <= 0 || price <= 0)
                throw new InvalidOperationException("请填写有效的物品、数量和价格");
            var order = await Call<TradeMessage>(ServerRoutes.TradeAction_createTrade,
                new CreateTradeRequest { ItemId = itemId.Trim(), Quantity = quantity, Price = price, Currency = "gold" });
            if (order != null) Trades.Insert(0, order);
            Changed?.Invoke();
        }

        public async Task AcceptTrade(string tradeId)
        {
            await Call<TradeMessage>(ServerRoutes.TradeAction_acceptTrade, tradeId);
            await RefreshCommunity();
        }

        private static string EscapeJson(string value) => value.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", " ").Replace("\n", " ");

        private const int ChatWorldBroadcastRoute = ServerRoutes.ChatAction_sendWorldMessage + 99;
        private const int ChatPrivateBroadcastRoute = ServerRoutes.ChatAction_sendWorldMessage + 100;

        private void OnBroadcast(int route, byte[] data)
        {
            if (disposed || data == null || data.Length == 0) return;
            if (route != ChatWorldBroadcastRoute && route != ChatPrivateBroadcastRoute) return;
            try
            {
                var message = ChatMessage.Parser.ParseFrom(data);
                if (message == null || string.IsNullOrEmpty(message.Content)) return;
                if (!AppendChat(message)) return;
                if (message.SenderId != (Person?.UserId ?? 0))
                {
                    RegisterUnread(message, route == ChatPrivateBroadcastRoute ? PrivateChatType : WorldChatType);
                    ChatUnreadChanged?.Invoke();
                }
                ChatReceived?.Invoke(message);
                Changed?.Invoke();
            }
            catch (Exception) { }
        }

        private bool AppendChat(ChatMessage message)
        {
            if (message == null) return false;
            if (!string.IsNullOrEmpty(message.MessageId) && ChatHistory.Exists(item => item.MessageId == message.MessageId)) return false;
            ChatHistory.Add(message);
            TrimChatHistory();
            return true;
        }

        private void TrimChatHistory()
        {
            if (ChatHistory == null) ChatHistory = new List<ChatMessage>();
            if (ChatHistory.Count <= 50) return;
            ChatHistory.RemoveRange(0, ChatHistory.Count - 50);
        }

        private void RegisterUnread(ChatMessage message, int chatType)
        {
            if (chatType == WorldChatType)
            {
                UnreadWorldChatCount++;
                return;
            }
            if (chatType != PrivateChatType) return;
            long peerId = PrivatePeerId(message);
            if (peerId <= 0) return;
            unreadPrivateChatCounts.TryGetValue(peerId, out int count);
            unreadPrivateChatCounts[peerId] = count + 1;
        }

        private long PrivatePeerId(ChatMessage message)
        {
            long currentUserId = Person?.UserId ?? 0;
            if (currentUserId > 0) return message.SenderId == currentUserId ? message.ReceiverId : message.SenderId;
            return message.SenderId > 0 ? message.SenderId : message.ReceiverId;
        }

        public int GetUnreadPrivateChatCount(long peerId = 0)
        {
            if (peerId > 0) return unreadPrivateChatCounts.TryGetValue(peerId, out int count) ? count : 0;
            int total = 0;
            foreach (int count in unreadPrivateChatCounts.Values) total += count;
            return total;
        }

        public List<ChatMessage> GetChatMessages(int chatType = 0, long conversationUserId = 0)
        {
            var result = new List<ChatMessage>();
            foreach (var message in ChatHistory)
            {
                if (chatType > 0 && message.ChatType != chatType) continue;
                if (chatType == PrivateChatType && conversationUserId > 0 && PrivatePeerId(message) != conversationUserId) continue;
                result.Add(message);
            }
            return result;
        }

        public List<ChatMessage> GetRecentPrivateConversations()
        {
            var result = new List<ChatMessage>();
            var peers = new HashSet<long>();
            for (int index = ChatHistory.Count - 1; index >= 0; index--)
            {
                var message = ChatHistory[index];
                if (message.ChatType != PrivateChatType) continue;
                long peerId = PrivatePeerId(message);
                if (peerId <= 0 || !peers.Add(peerId)) continue;
                result.Add(message);
            }
            result.Reverse();
            return result;
        }

        public void MarkChatRead(int chatType = WorldChatType, long conversationUserId = 0)
        {
            if (chatType == WorldChatType)
            {
                if (UnreadWorldChatCount == 0) return;
                UnreadWorldChatCount = 0;
                ChatUnreadChanged?.Invoke();
                Changed?.Invoke();
                return;
            }
            if (chatType != PrivateChatType) return;
            if (conversationUserId > 0)
            {
                if (!unreadPrivateChatCounts.Remove(conversationUserId)) return;
            }
            else if (unreadPrivateChatCounts.Count == 0) return;
            else unreadPrivateChatCounts.Clear();
            ChatUnreadChanged?.Invoke();
            Changed?.Invoke();
        }

        public async Task ActMountain(NativeMountainRequest request)
        {
            Mountains = await Call<NativeMountainState>(ServerRoutes.TreasureMountainAction_nativeAct, request);
            EnsureCurrent(); Changed?.Invoke();
            if (!Mountains.Success) throw new InvalidOperationException(Mountains.Message);
            if (request.Operation == "CLAIM")
            {
                await RefreshGrowth();
                Guild = await Call<NativeGuildState>(ServerRoutes.GuildAction_nativeState);
                EnsureCurrent(); Changed?.Invoke();
            }
        }

        public async Task EnterWorld(int realm, bool resume = false, int submap = 0)
        {
            var snapshot = await Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeEnter,
                new NativeWorldRequest { Realm = realm, Resume = resume, Submap = submap });
            PublishWorld(snapshot);
            if (!snapshot.Accepted) throw new InvalidOperationException(snapshot.Message);
        }

        public Task PollWorld() => worldPoll != null && !worldPoll.IsCompleted ? worldPoll : worldPoll = ReadWorld();

        private async Task ReadWorld() => PublishWorld(await Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeSnapshot));

        public async Task Move(int realm, float x, float z, float yaw)
        {
            PublishWorld(await Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeMove,
                new NativeMoveRequest { Realm = realm, Submap = Snapshot.Submap, Sequence = ++moveSequence, X = x, Z = z, Yaw = yaw }));
        }

        public async Task Act(string action, string target)
        {
            var snapshot = await Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeAction,
                new NativeCombatRequest { Realm = Snapshot.Realm, Submap = Snapshot.Submap, Sequence = ++actionSequence, Action = action, TargetId = target ?? "" });
            PublishWorld(snapshot);
            if (!snapshot.Accepted) throw new InvalidOperationException(snapshot.Message);
        }

        public async Task Interact(string id)
        {
            var snapshot = await Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeInteract,
                new NativeInteractRequest { Realm = Snapshot.Realm, Submap = Snapshot.Submap, TargetId = id });
            PublishWorld(snapshot);
            if (!snapshot.Accepted) throw new InvalidOperationException(snapshot.Message);
        }

        public async Task Revive() => PublishWorld(await Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeRevive));

        private void PublishWorld(NativeWorldSnapshot value)
        {
            EnsureCurrent();
            if (Snapshot != null && value.ServerTime < Snapshot.ServerTime) return;
            Snapshot = value;
            moveSequence = Math.Max(moveSequence, value.LastMoveSequence);
            actionSequence = Math.Max(actionSequence, value.LastActionSequence);
            WorldChanged?.Invoke(value);
        }

        private void EnsureCurrent()
        {
            if (disposed || !session.Authenticated) throw new OperationCanceledException("账号连接已变更。");
        }

        public void Suspend() => Ready = false;
        public void Dispose()
        {
            if (disposed) return;
            disposed = true;
            Ready = false;
            session.BroadcastReceived -= OnBroadcast;
        }
    }
}
