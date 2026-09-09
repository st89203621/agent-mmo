using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;
using Google.Protobuf;
using IoGame.Sdk;
using Lunhui.Protocol;
using UnityWebSocket;

namespace Lunhui
{
    public sealed class IoGameNetworkSession : IGameNetworkSession
    {
        private const int LoginRoute = ServerRoutes.LoginAction_loginVerify;
        private const int RegisterRoute = ServerRoutes.LoginAction_register;
        private const int ProfileRoute = ServerRoutes.PersonAction_getPerson;
        private const double ConnectTimeout = 12;
        private const double RequestTimeout = 15;
        private const double HeartbeatInterval = 8;
        private const double ServerTimeout = 35;
        private static IoGameNetworkSession activeSession;
        private readonly ConcurrentQueue<Action> deliveries = new ConcurrentQueue<Action>();
        private readonly Dictionary<int, PendingRequest> pending = new Dictionary<int, PendingRequest>();
        private readonly List<UnityChannel> closingChannels = new List<UnityChannel>();
        private UnityChannel channel;
        private Action afterConnect;
        private int generation;
        private long userId;
        private string nickname;
        private double connectStarted;
        private double lastReceived;
        private double nextHeartbeat;
        private double nextLivenessProbe;
        private bool suspended;
        private string reconnectUsername, reconnectPassword;
        private bool restoringSession;
        // A phone can lose Wi-Fi or cellular coverage for minutes. Keep the
        // authenticated credentials in memory and continue reconnecting with
        // a capped exponential backoff instead of logging the player out after
        // a few transient failures.
        private int reconnectAttempts;
        private double reconnectAt;
        public int HeartbeatReplies { get; private set; }
        public int LivenessReplies { get; private set; }

        public NetworkConnectionState State { get; private set; } = NetworkConnectionState.Offline;
        public bool Authenticated { get; private set; }
        public string Endpoint { get; private set; } = string.Empty;
        public string LastError { get; private set; } = string.Empty;
        public event Action<NetworkConnectionState> StateChanged;
        public event Action<string> ErrorReceived;
        public event Action<GameProfileSnapshot> ProfileReceived;
        // Broadcasts do not carry a pending request id. Expose them separately
        // so features such as world chat can arrive without polling.
        public event Action<int, byte[]> BroadcastReceived;
        public event Action<GameActionRequest> ActionAccepted { add { } remove { } }

        private static double Now => (double)Stopwatch.GetTimestamp() / Stopwatch.Frequency;

        public void Connect(string endpoint)
        {
            Disconnect();
            OpenConnection(endpoint);
        }

        private void OpenConnection(string endpoint)
        {
            reconnectAt = 0;
            DisconnectInternal();
            if (!GameServerSettings.TryNormalizeEndpoint(endpoint, false, out string validatedEndpoint, out string error))
            {
                Fail(error);
                return;
            }

            if (activeSession != null && activeSession != this) activeSession.Disconnect();
            activeSession = this;
            Endpoint = new Uri(validatedEndpoint).AbsoluteUri;
            LastError = string.Empty;
            connectStarted = Now;
            SetState(NetworkConnectionState.Connecting);
            var connection = generation;
            channel = new UnityChannel(Endpoint,
                () => Post(connection, OnOpen),
                bytes => Post(connection, () => Receive(bytes)),
                () => Post(connection, () => Fail("与服务器的连接已断开，请重新登录。")),
                () => Post(connection, () => Fail("无法连接服务器，请检查服务器地址和网络。")));

            // The upstream SDK is process-wide. One authenticated session owns it at a time.
            IoGameSetting.EnableDevMode = false;
            IoGameSetting.SetLanguage(IoGameLanguage.China);
            IoGameSetting.RequestCommandTimeout = (int)(RequestTimeout * 1000);
            IoGameSetting.ListenMessageCallback = new SilentMessageListener();
            IoGameSetting.GameGameConsole = new SilentConsole();
            IoGameSetting.Url = Endpoint;
            IoGameSetting.NetChannel = channel;
            try { IoGameSetting.StartNet(); }
            catch (Exception) { Fail("连接初始化失败，请重新连接服务器。"); }
        }

        public void Register(GameRegistrationRequest request)
        {
            if (!ValidCredentials(request?.Username, request?.Password)) return;
            var username = request.Username.Trim();
            var password = request.Password;
            WhenConnected(() => Send(RegisterRoute,
                new RegisterRequest { Username = username, Password = password }, result =>
                {
                    var registered = RegisterResponse.Parser.ParseFrom(result.Message.Data);
                    if (!registered.Success)
                    {
                        Error("注册失败，请更换账号后重试。");
                        return;
                    }
                    Login(new GameLoginRequest { Username = username, Password = password });
                }));
        }

        public void Login(GameLoginRequest request)
        {
            if (!ValidCredentials(request?.Username, request?.Password)) return;
            var username = request.Username.Trim();
            var password = request.Password;
            WhenConnected(() => Send(LoginRoute,
                new LoginVerify { Username = username, Password = password }, result =>
                {
                    var user = UserInfo.Parser.ParseFrom(result.Message.Data);
                    if (user.Id <= 0) { Fail("服务器返回了无效的账号信息。"); return; }
                    userId = user.Id;
                    nickname = user.Nickname;
                    Authenticated = true;
                    reconnectUsername = username;
                    reconnectPassword = password;
                    restoringSession = false;
                    LoadProfile(userId);
                }));
        }

        public void LoadProfile(long characterId)
        {
            if (!Authenticated || State != NetworkConnectionState.Connected)
            {
                Error("请先登录后再读取角色。");
                return;
            }
            if (characterId > 0 && characterId != userId)
            {
                Error("只能读取当前账号的角色。");
                return;
            }
            Send(ProfileRoute, null, result =>
            {
                var person = PersonMessage.Parser.ParseFrom(result.Message.Data);
                if (person.UserId != userId) { Fail("服务器返回的角色与账号不一致。"); return; }
                var stats = person.BasicProperty;
                reconnectAttempts = 0;
                ProfileReceived?.Invoke(new GameProfileSnapshot
                {
                    UserId = userId,
                    Nickname = string.IsNullOrEmpty(person.Name) ? nickname : person.Name,
                    Level = person.Level?.Level ?? 0,
                    Experience = person.Level?.Exp ?? 0,
                    MaxHealth = stats?.Hp ?? 0,
                    Attack = stats?.PhysicsAttack ?? 0,
                    Defense = stats?.PhysicsDefense ?? 0,
                    Speed = stats?.Speed ?? 0,
                    Career = -1,
                    Realm = -1,
                    Profession = string.Empty
                });
            });
        }

        public void SendAction(GameActionRequest request)
        {
            Error("此玩法尚未接入服务器结算，请使用本地体验。");
        }

        public Task<T> RequestAsync<T>(int route, object payload, Func<ResponseResult, T> decode)
        {
            var completion = new TaskCompletionSource<T>();
            if (!Authenticated)
            {
                completion.SetException(new InvalidOperationException("连接正在恢复，请稍候。"));
                return completion.Task;
            }
            Send(route, payload, result =>
            {
                try { completion.TrySetResult(decode(result)); }
                catch (Exception exception) { completion.TrySetException(exception); }
            }, message => completion.TrySetException(new InvalidOperationException(message)));
            return completion.Task;
        }

        public void Tick()
        {
            if (suspended) return;
            for (var i = closingChannels.Count - 1; i >= 0; i--)
            {
                closingChannels[i].DispatchEvents();
                if (closingChannels[i].Closed) closingChannels.RemoveAt(i);
            }
            channel?.DispatchEvents();
            var count = 0;
            while (count++ < 128 && deliveries.TryDequeue(out var action)) action();
            var now = Now;
            if (reconnectAt > 0 && now >= reconnectAt)
            {
                reconnectAt = 0;
                OpenConnection(Endpoint);
                return;
            }
            if (State == NetworkConnectionState.Connecting && now - connectStarted > ConnectTimeout)
            {
                Fail("连接服务器超时，请检查地址和服务器状态。");
                return;
            }
            if (State != NetworkConnectionState.Connected) return;
            if (now - lastReceived > ServerTimeout)
            {
                Fail("服务器长时间未响应，请重新连接。");
                return;
            }
            foreach (var item in pending.Values)
            {
                if (now <= item.Deadline) continue;
                Fail("服务器请求超时，请重新连接后重试。");
                return;
            }
            // Older External deployments exclude idle replies. A harmless authenticated route
            // verifies that the server is alive without depending on its optional pong setting.
            if (Authenticated && now >= nextLivenessProbe && now - lastReceived > 12
                && !HasPending(ServerRoutes.LoginAction_getUserIp))
            {
                nextLivenessProbe = now + 15;
                Send(ServerRoutes.LoginAction_getUserIp, null, _ => LivenessReplies++);
            }
            if (now < nextHeartbeat) return;
            nextHeartbeat = now + HeartbeatInterval;
            try { channel.WriteAndFlush(new ExternalMessage().ToByteArray()); }
            catch (Exception) { Fail("心跳发送失败，请重新连接服务器。"); }
        }

        public void Disconnect()
        {
            reconnectAt = 0;
            reconnectAttempts = 0;
            reconnectUsername = reconnectPassword = null;
            restoringSession = false;
            DisconnectInternal();
            SetState(NetworkConnectionState.Offline);
        }

        public void SetSuspended(bool value)
        {
            if (suspended == value) return;
            suspended = value;
            if (value)
            {
                if (Authenticated && !string.IsNullOrEmpty(reconnectUsername))
                {
                    restoringSession = true;
                    DisconnectInternal();
                    SetState(NetworkConnectionState.Reconnecting);
                }
                return;
            }
            if (restoringSession) { reconnectAt = 0; OpenConnection(Endpoint); }
            else if (State == NetworkConnectionState.Connected)
            { lastReceived = Now; nextHeartbeat = 0; }
        }

        private bool HasPending(int route)
        {
            foreach (var item in pending.Values) if (item.Route == route) return true;
            return false;
        }

        private bool ValidCredentials(string username, string password)
        {
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrEmpty(password))
            {
                Error("请输入账号和密码。");
                return false;
            }
            if (username.Trim().Length > 64 || password.Length > 128)
            {
                Error("账号或密码过长。");
                return false;
            }
            if (Authenticated)
            {
                Error("当前账号已登录，请先断开后再切换账号。");
                return false;
            }
            return true;
        }

        private void WhenConnected(Action action)
        {
            if (afterConnect != null || pending.Count > 0)
            {
                Error("正在处理请求，请稍候。");
                return;
            }
            if (State == NetworkConnectionState.Connecting) { afterConnect = action; return; }
            if (State != NetworkConnectionState.Connected) { Error("请先连接服务器。"); return; }
            LastError = string.Empty;
            action();
        }

        private void OnOpen()
        {
            lastReceived = Now;
            nextHeartbeat = lastReceived;
            nextLivenessProbe = lastReceived + 15;
            SetState(NetworkConnectionState.Connected);
            if (restoringSession && !string.IsNullOrEmpty(reconnectUsername))
            {
                Login(new GameLoginRequest { Username = reconnectUsername, Password = reconnectPassword });
                return;
            }
            var action = afterConnect;
            afterConnect = null;
            action?.Invoke();
        }

        private void Receive(byte[] bytes)
        {
            if (State != NetworkConnectionState.Connected) return;
            try
            {
                var message = ExternalMessage.Parser.ParseFrom(bytes);
                lastReceived = Now;
                if (message.CmdCode == 0) { HeartbeatReplies++; return; }
                if (!pending.TryGetValue(message.MsgId, out var request))
                {
                    // ioGame pushes broadcasts with no matching request id.
                    // Keep unknown pushes isolated from request decoding: a
                    // newer server may add broadcasts that this client does
                    // not understand yet.
                    if (message.CmdMerge != 0 && message.Data != null && message.Data.Length != 0)
                    {
                        try { BroadcastReceived?.Invoke(message.CmdMerge, message.Data.ToByteArray()); }
                        catch (Exception) { }
                    }
                    return;
                }
                if (request.Route != message.CmdMerge) { Fail("服务器响应路由异常。"); return; }
                channel.AcceptMessage(message);
            }
            catch (Exception) { Fail("服务器消息格式异常，请重新连接。"); }
        }

        private void Send(int route, object payload, Action<ResponseResult> onSuccess, Action<string> onFailure = null)
        {
            if (channel == null || State != NetworkConnectionState.Connected)
            {
                if (onFailure != null) onFailure("连接已断开，请重新登录。"); else Error("连接已断开，请重新登录。");
                return;
            }
            if (pending.Count >= 8)
            {
                if (onFailure != null) onFailure("请求过于频繁，请稍候重试。"); else Error("请求过于频繁，请稍候重试。");
                return;
            }
            foreach (var request in pending.Values)
            {
                if (request.Route != route) continue;
                if (onFailure != null) onFailure("正在读取数据，请稍候。"); else Error("正在读取数据，请稍候。");
                return;
            }
            var connection = generation;
            var command = payload == null ? RequestCommand.Of(route) : payload is string value
                ? RequestCommand.OfString(route, value) : RequestCommand.Of(route, (IMessage)payload);
            pending.Add(command.MsgId, new PendingRequest { Route = route, Deadline = Now + RequestTimeout, Failed = onFailure });
            command.OnCallback(result => Post(connection, () => Complete(command.MsgId, result, onSuccess)));
            command.OnError(result => Post(connection, () => Complete(command.MsgId, result, onSuccess)));
            try { command.Execute(); }
            catch (Exception) { Fail("请求发送失败，请重新连接。"); }
        }

        private void Complete(int requestId, ResponseResult result, Action<ResponseResult> onSuccess)
        {
            if (!pending.TryGetValue(requestId, out var request)) return;
            pending.Remove(requestId);
            if (result.HasError())
            {
                if (restoringSession)
                {
                    reconnectUsername = reconnectPassword = null;
                    restoringSession = false;
                    Fail("登录状态已失效，请重新输入账号密码。");
                    return;
                }
                if (request.Failed != null) request.Failed(FriendlyError(result.GetResponseStatus()));
                else Error(FriendlyError(result.GetResponseStatus()));
                return;
            }
            LastError = string.Empty;
            try { onSuccess(result); }
            catch (Exception) { Fail("角色数据解析失败，请重新登录。"); }
        }

        private static string FriendlyError(int code)
        {
            switch (code)
            {
                case 1: return "当前地图暂时无法进入。";
                case 2: return "经验不足，暂时无法升级。";
                case 3: return "所需物品数量不足。";
                case 4: return "目标不可用或尚未满足操作条件。";
                case 5: return "可分配潜力不足。";
                case 6: return "宝宝尚未掌握此技能。";
                case 7: return "未找到这只宝宝，请刷新后重试。";
                case 8: return "礼包码类型无效。";
                case 9: return "礼包码已失效。";
                case 10: return "登录状态已失效，请重新连接登录。";
                case 11: return "账号已存在，请直接登录或更换账号。";
                case 12: return "账号或密码错误，请重新输入。";
                case -1001: return "提交的信息不符合服务器要求。";
                default: return "服务器未能完成请求，错误码：" + code;
            }
        }

        private void Post(int connection, Action action)
        {
            deliveries.Enqueue(() => { if (connection == generation) action(); });
        }

        private void DisconnectInternal()
        {
            generation++;
            Authenticated = false;
            userId = 0;
            nickname = null;
            afterConnect = null;
            var oldChannel = channel;
            channel = null;
            // Complete outstanding SDK commands locally, then discard their old-generation callbacks.
            foreach (var item in pending)
            {
                try
                {
                    oldChannel?.AcceptMessage(new ExternalMessage
                    {
                        CmdCode = 1, CmdMerge = item.Value.Route, MsgId = item.Key,
                        ResponseStatus = -1
                    });
                }
                catch (Exception) { }
            }
            var cancelled = new List<PendingRequest>(pending.Values);
            pending.Clear();
            if (oldChannel != null)
            {
                oldChannel.Close();
                closingChannels.Add(oldChannel);
            }
            while (deliveries.TryDequeue(out _)) { }
            if (activeSession == this) activeSession = null;
            foreach (var request in cancelled) request.Failed?.Invoke("连接已中断，请等待重新同步。");
        }

        private void Fail(string message)
        {
            bool canRestore = !string.IsNullOrEmpty(reconnectUsername) && !suspended;
            DisconnectInternal();
            if (canRestore)
            {
                restoringSession = true;
                // 1, 2, 4, 8, 16, 30 ... seconds. The counter is reset as
                // soon as the profile is restored, so a healthy session is
                // never penalised after a single network hiccup.
                int shift = Math.Min(5, reconnectAttempts++);
                reconnectAt = Now + Math.Min(30, 1 << shift);
                SetState(NetworkConnectionState.Reconnecting);
                return;
            }
            reconnectAt = 0;
            reconnectUsername = reconnectPassword = null;
            restoringSession = false;
            SetState(NetworkConnectionState.Failed);
            Error(message);
        }

        private void Error(string message)
        {
            LastError = message;
            ErrorReceived?.Invoke(message);
        }

        private void SetState(NetworkConnectionState next)
        {
            if (State == next) return;
            State = next;
            StateChanged?.Invoke(next);
        }

        private sealed class PendingRequest
        {
            public int Route;
            public double Deadline;
            public Action<string> Failed;
        }

        private sealed class SilentConsole : IGameConsole
        {
            public void Log(object value) { }
        }

        private sealed class SilentMessageListener : SimpleListenMessageCallback
        {
            public override void OnIdleCallback(ExternalMessage message) { }
            public override void OnOtherCallback(ExternalMessage message) { }
        }

        private sealed class UnityChannel : SimpleNetChannel
        {
            private readonly WebSocket socket;
            private bool closed;
            public bool Closed { get; private set; }

            public UnityChannel(string endpoint, Action opened, Action<byte[]> received, Action disconnected, Action error)
            {
                socket = new WebSocket(endpoint);
                socket.OnOpen += (_, __) => { if (!closed) opened(); };
                socket.OnMessage += (_, e) => { if (!closed) received(e.RawData); };
                socket.OnClose += (_, __) => { Closed = true; if (!closed) disconnected(); };
                socket.OnError += (_, __) => { if (!closed) error(); };
            }

            public override void Prepare() => socket.ConnectAsync();

            public override void WriteAndFlush(byte[] bytes)
            {
                if (closed || socket.ReadyState != WebSocketState.Open)
                    throw new InvalidOperationException("Socket is closed.");
                socket.SendAsync(bytes);
            }

            public void DispatchEvents()
            {
#if UNITY_EDITOR || !UNITY_WEBGL
                socket.DispatchEvents();
#endif
            }

            public void Close()
            {
                closed = true;
#if UNITY_EDITOR || !UNITY_WEBGL
                socket.Abort();
#else
                socket.CloseAsync();
#endif
            }
        }
    }
}
