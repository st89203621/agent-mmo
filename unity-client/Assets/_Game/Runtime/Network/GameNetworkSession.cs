using System;
using UnityEngine;

namespace Lunhui
{
    public enum NetworkConnectionState
    {
        Offline,
        Connecting,
        Connected,
        Reconnecting,
        Failed
    }

    [Serializable]
    public sealed class GameLoginRequest
    {
        public string Username;
        public string Password;
        public string Ticket;
        public string DeviceId;
        public string ClientVersion;
    }

    [Serializable]
    public sealed class GameRegistrationRequest
    {
        public string Username;
        public string Password;
        public string Nickname;
    }

    [Serializable]
    public sealed class GameProfileSnapshot
    {
        public long UserId;
        public string Nickname;
        public int Career;
        public int Level;
        public int Realm;
        public string AppearanceJson;
        public long Experience;
        public int MaxHealth;
        public int Attack;
        public int Defense;
        public int Speed;
        public string Profession;
    }

    [Serializable]
    public sealed class GameActionRequest
    {
        public long Sequence;
        public string Action;
        public string TargetId;
        public int Realm;
        public float ClientTime;
    }

    /// <summary>
    /// Transport-neutral boundary for the Unity client. The production
    /// implementation connects to ioGame External over Protobuf/WebSocket.
    /// Offline play uses the explicit local session below.
    /// </summary>
    public interface IGameNetworkSession
    {
        NetworkConnectionState State { get; }
        bool Authenticated { get; }
        string Endpoint { get; }
        string LastError { get; }
        event Action<NetworkConnectionState> StateChanged;
        event Action<string> ErrorReceived;
        event Action<GameProfileSnapshot> ProfileReceived;
        event Action<GameActionRequest> ActionAccepted;
        void Connect(string endpoint);
        void Register(GameRegistrationRequest request);
        void Login(GameLoginRequest request);
        void LoadProfile(long characterId);
        void SendAction(GameActionRequest request);
        void Tick();
        void Disconnect();
    }

    public sealed class OfflineGameNetworkSession : IGameNetworkSession
    {
        private NetworkConnectionState state = NetworkConnectionState.Offline;
        private long sequence;

        public NetworkConnectionState State => state;
        public bool Authenticated => false;
        public string Endpoint => "offline://prototype";
        public string LastError => string.Empty;
        public event Action<NetworkConnectionState> StateChanged;
        public event Action<string> ErrorReceived;
        public event Action<GameProfileSnapshot> ProfileReceived;
        public event Action<GameActionRequest> ActionAccepted;

        public void Connect(string endpoint)
        {
            SetState(NetworkConnectionState.Connected);
        }

        public void Login(GameLoginRequest request)
        {
            if (state != NetworkConnectionState.Connected) SetState(NetworkConnectionState.Connected);
            ProfileReceived?.Invoke(new GameProfileSnapshot { UserId = 0, Realm = 0 });
        }

        public void Register(GameRegistrationRequest request)
        {
            ErrorReceived?.Invoke("本地体验无法注册账号，请先连接服务器。");
        }

        public void Tick() { }

        public void LoadProfile(long characterId)
        {
            if (state != NetworkConnectionState.Connected) return;
            ProfileReceived?.Invoke(new GameProfileSnapshot { UserId = characterId, Realm = 0 });
        }

        public void SendAction(GameActionRequest request)
        {
            if (state != NetworkConnectionState.Connected || request == null) return;
            request.Sequence = request.Sequence > 0 ? request.Sequence : ++sequence;
            ActionAccepted?.Invoke(request);
        }

        public void Disconnect() => SetState(NetworkConnectionState.Offline);

        private void SetState(NetworkConnectionState next)
        {
            if (state == next) return;
            state = next;
            StateChanged?.Invoke(state);
        }
    }
}
