using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using UnityEngine;
using UnityEngine.UI;

namespace Lunhui.Prototype
{
    public static class ServerSelectionChecks
    {
        private const BindingFlags InstanceFlags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
        private const string CompanyAddress = "ws://192.168.74.47:9200";
        private const string HomeAddress = "ws://192.168.31.169:10100/websocket";

        public static List<string> Run(PrototypeApp app)
        {
            if (app == null || app.OnlineMode || app.Native != null)
                throw new InvalidOperationException("Server selection checks require an offline prototype instance.");
            var checks = new List<string>();
            string[] keys =
            {
                GameServerSettings.PreferenceKey, GameServerSettings.LegacyEndpointPreference,
                "Lunhui.Network.Username", "Lunhui.NativePrototype.v1.new", "Lunhui.NativePrototype.v1.demo"
            };
            var originalPreferences = keys.ToDictionary(key => key,
                key => PlayerPrefs.HasKey(key) ? PlayerPrefs.GetString(key) : null);
            bool originalSuppression = app.SuppressPersistence;
            try
            {
                app.SuppressPersistence = true;
                app.CloseDialog();
                CheckEndpoints(checks);
                CheckPersistence(checks);
                CheckLoginDrafts(app, checks);
                CheckSettings(app, checks);
                CheckAccountKeys(checks);
                return checks;
            }
            finally
            {
                app.SuppressPersistence = true;
                try
                {
                    app.CloseDialog();
                    typeof(PrototypeApp).GetMethod("LeaveOnlineSession", InstanceFlags)?.Invoke(app, null);
                    app.ShowPage("login");
                }
                finally
                {
                    foreach (var pair in originalPreferences)
                    {
                        if (pair.Value == null) PlayerPrefs.DeleteKey(pair.Key);
                        else PlayerPrefs.SetString(pair.Key, pair.Value);
                    }
                    PlayerPrefs.Save();
                    app.SuppressPersistence = originalSuppression;
                }
            }
        }

        private static void CheckEndpoints(List<string> checks)
        {
            string[] valid =
            {
                CompanyAddress, HomeAddress, "wss://game.example.com:9443/game/socket?realm=2",
                "ws://game.example.com", "ws://[2001:db8::1]:9200/socket", "  ws://192.168.74.47:9200  "
            };
            foreach (string value in valid)
            {
                bool accepted = GameServerSettings.TryNormalizeEndpoint(value, true, out string endpoint, out string error);
                Require(accepted && SameEndpoint(endpoint, value.Trim()) && string.IsNullOrEmpty(error),
                    "Valid WebSocket endpoint preserves host, port, path and query: " + value.Trim(), checks);
            }
            string[] invalid =
            {
                null, "", "  ", "http://192.168.74.47:9200", "https://game.example.com",
                "ws://", "ws:///socket", "ws://game.example.com:65536", "ws://user:password@game.example.com",
                "ws://game.example.com/socket#fragment", "ws://bad host:9200"
            };
            foreach (string value in invalid)
                Require(!GameServerSettings.TryNormalizeEndpoint(value, false, out _, out string error)
                    && !string.IsNullOrEmpty(error), "Invalid server address returns a validation error: " + (value ?? "null"), checks);

            foreach (string address in new[] { "ws://127.0.0.1:9200", "ws://localhost:9200", "ws://[::1]:9200" })
            {
                Require(!GameServerSettings.TryNormalizeEndpoint(address, true, out _, out _),
                    "Android rejects a phone loopback endpoint: " + address, checks);
                Require(GameServerSettings.TryNormalizeEndpoint(address, false, out _, out _),
                    "Editor permits a local backend endpoint: " + address, checks);
            }
        }

        private static void CheckPersistence(List<string> checks)
        {
            PlayerPrefs.DeleteKey(GameServerSettings.PreferenceKey);
            PlayerPrefs.DeleteKey(GameServerSettings.LegacyEndpointPreference);
            var defaults = GameServerSettings.Load();
            Require(defaults.Selected == 0 && SameEndpoint(defaults.Company, CompanyAddress),
                "First install selects the company WebSocket server", checks);
            Require(SameEndpoint(defaults.Home, HomeAddress),
                "Home preset retains the existing LAN backend port and path", checks);

            string legacyAddress = "wss://legacy.example.com:9443/external?region=old";
            PlayerPrefs.DeleteKey(GameServerSettings.PreferenceKey);
            PlayerPrefs.SetString(GameServerSettings.LegacyEndpointPreference, legacyAddress);
            var migrated = GameServerSettings.Load();
            Require(new[] { migrated.Company, migrated.Home, migrated.Custom }.Any(value => SameEndpoint(value, legacyAddress)),
                "Migration preserves an existing custom server address", checks);
            migrated.Save();
            Require(new[] { GameServerSettings.Load().Company, GameServerSettings.Load().Home, GameServerSettings.Load().Custom }
                .Any(value => SameEndpoint(value, legacyAddress)), "Migrated server address survives persistence", checks);

            PlayerPrefs.DeleteKey(GameServerSettings.PreferenceKey);
            PlayerPrefs.SetString(GameServerSettings.LegacyEndpointPreference, HomeAddress);
            var legacyHome = GameServerSettings.Load();
            Require(new[] { legacyHome.Company, legacyHome.Home, legacyHome.Custom }.Any(value => SameEndpoint(value, HomeAddress)),
                "Migration retains the original home server", checks);

            var settings = Fixture();
            string[] expected = { settings.Company, settings.Home, settings.Custom };
            for (int index = 0; index < expected.Length; index++)
            {
                settings.Selected = index;
                settings.Save();
                var loaded = GameServerSettings.Load();
                Require(loaded.Selected == index && SameEndpoint(loaded.Endpoint, expected[index])
                    && SameEndpoint(loaded.Company, expected[0]) && SameEndpoint(loaded.Home, expected[1])
                    && SameEndpoint(loaded.Custom, expected[2]) && !string.IsNullOrEmpty(loaded.Name),
                    "Preset selection and all three independent addresses survive reload: " + index, checks);
            }
        }

        private static void CheckLoginDrafts(PrototypeApp app, List<string> checks)
        {
            var settings = Fixture();
            settings.Save();
            string saved = PlayerPrefs.GetString(GameServerSettings.PreferenceKey);
            app.ShowPage("login");
            app.OpenOnlineLogin();
            Require(SameEndpoint(EndpointInput(app).text, settings.Company),
                "Login displays the selected saved server address", checks);
            Require(Find<InputField>(app, "AccountUsername") != null && Find<InputField>(app, "AccountPassword") != null,
                "Account and password fields remain available with server presets", checks);
            var setBusy = typeof(PrototypeApp).GetMethod("SetLoginBusy", InstanceFlags);
            setBusy.Invoke(app, new object[] { true });
            Require(Enumerable.Range(0, 3).All(index => !Find<Button>(app, "ServerPreset" + index).interactable)
                && !EndpointInput(app).interactable, "Connecting locks the destination and address controls", checks);
            setBusy.Invoke(app, new object[] { false });

            const string editedCompany = "ws://192.168.74.47:9201/company";
            const string editedHome = "ws://192.168.31.171:9200/home";
            EndpointInput(app).text = editedCompany;
            Click(app, "ServerPreset1");
            Require(SameEndpoint(EndpointInput(app).text, settings.Home),
                "Changing login preset shows that preset's address", checks);
            EndpointInput(app).text = editedHome;
            Click(app, "ServerPreset0");
            Require(SameEndpoint(EndpointInput(app).text, editedCompany),
                "Switching login presets preserves the company address draft", checks);
            Click(app, "ServerPreset1");
            Require(SameEndpoint(EndpointInput(app).text, editedHome),
                "Switching login presets preserves the home address draft", checks);

            var network = app.Network;
            EndpointInput(app).text = "http://192.168.74.47:9200";
            Click(app, "ServerPreset2");
            Require(EndpointInput(app).text == "http://192.168.74.47:9200",
                "Invalid login address prevents changing presets and remains editable", checks);
            Find<InputField>(app, "AccountUsername").text = "server_check";
            Find<InputField>(app, "AccountPassword").text = "validation-password";
            Click(app, "SubmitOnlineLogin");
            Require(ReferenceEquals(network, app.Network) && app.Network.State != NetworkConnectionState.Connecting,
                "Invalid login address cannot create a connection", checks);
            app.CloseDialog();
            Require(PlayerPrefs.GetString(GameServerSettings.PreferenceKey) == saved,
                "Cancelling login leaves saved server preferences unchanged", checks);
        }

        private static void CheckSettings(PrototypeApp app, List<string> checks)
        {
            var settings = Fixture();
            settings.Save();
            string saved = PlayerPrefs.GetString(GameServerSettings.PreferenceKey);
            app.ShowPage("settings");
            app.OpenServerSettings();
            EndpointInput(app).text = "ws://192.168.74.99:9200/cancelled";
            app.CloseDialog();
            Require(PlayerPrefs.GetString(GameServerSettings.PreferenceKey) == saved,
                "Closing server settings discards address drafts", checks);

            var network = new RecordingSession(settings.Company);
            SetProperty(app, "Network", network);
            SetProperty(app, "OnlineMode", true);
            app.OpenServerSettings();
            Require(ReferenceEquals(app.Network, network) && network.DisconnectCount == 0,
                "Opening server settings preserves the active session", checks);
            Click(app, "ServerPreset1");
            const string updatedHome = "ws://192.168.31.180:9200/home/socket";
            EndpointInput(app).text = updatedHome;
            app.SuppressPersistence = false;
            Click(app, "ServerConfigSave");
            var loaded = GameServerSettings.Load();
            Require(loaded.Selected == 1 && SameEndpoint(loaded.Home, updatedHome),
                "Saving server settings persists the selected address", checks);
            Require(ReferenceEquals(app.Network, network) && app.OnlineMode && network.DisconnectCount == 0
                && SameEndpoint(network.Endpoint, settings.Company),
                "Saving a future login server does not replace or redirect the current session", checks);
            Require(Find<Button>(app, "ServerConfigSave") == null,
                "Saving server settings closes the editor", checks);

            saved = PlayerPrefs.GetString(GameServerSettings.PreferenceKey);
            app.OpenServerSettings();
            EndpointInput(app).text = "ws://user:password@example.com";
            Click(app, "ServerConfigSave");
            Require(Find<Button>(app, "ServerConfigSave") != null
                && PlayerPrefs.GetString(GameServerSettings.PreferenceKey) == saved && network.DisconnectCount == 0,
                "Invalid settings cannot be saved or disconnect the active session", checks);
            app.CloseDialog();

            app.OpenServerSettings();
            Click(app, "ServerConfigReset");
            app.CloseDialog();
            Require(PlayerPrefs.GetString(GameServerSettings.PreferenceKey) == saved,
                "Resetting a draft and cancelling preserves saved server addresses", checks);

            app.OpenServerSettings();
            Click(app, "ServerPreset2");
            Click(app, "ServerConfigSwitch");
            Require(network.DisconnectCount > 0 && !ReferenceEquals(app.Network, network) && !app.OnlineMode
                && app.CurrentPage == "login", "Explicit server switching closes the prior session and returns to login", checks);
            loaded = GameServerSettings.Load();
            Require(loaded.Selected == 2 && SameEndpoint(loaded.Endpoint, settings.Custom),
                "Explicit switching remembers the destination server", checks);
            Require(app.Network.State != NetworkConnectionState.Connecting,
                "Server switching waits for account login without contacting a backend", checks);
            app.CloseDialog();
            app.SuppressPersistence = true;
        }

        private static void CheckAccountKeys(List<string> checks)
        {
            var buildKey = typeof(PrototypeApp).GetMethod("BuildAccountSaveKey", BindingFlags.Static | BindingFlags.NonPublic);
            if (buildKey == null) throw new InvalidOperationException("Account storage key builder is missing.");
            string company = (string)buildKey.Invoke(null, new object[] { CompanyAddress, 42L });
            string home = (string)buildKey.Invoke(null, new object[] { HomeAddress, 42L });
            string otherUser = (string)buildKey.Invoke(null, new object[] { CompanyAddress, 43L });
            string normalized = (string)buildKey.Invoke(null, new object[] { CompanyAddress + "/", 42L });
            Require(company != home && company != otherUser,
                "Account cache keys isolate server address and account identifier", checks);
            Require(company == normalized, "Equivalent endpoint URLs produce the same account cache key", checks);
        }

        private static GameServerSettings Fixture() => new GameServerSettings
        {
            Selected = 0, Company = CompanyAddress, Home = HomeAddress,
            Custom = "wss://custom.example.com:9443/external?realm=3"
        };

        private static bool SameEndpoint(string left, string right) =>
            Uri.TryCreate(left, UriKind.Absolute, out var leftUri)
            && Uri.TryCreate(right, UriKind.Absolute, out var rightUri)
            && leftUri.AbsoluteUri == rightUri.AbsoluteUri;

        private static T Find<T>(PrototypeApp app, string name) where T : Component =>
            app.GetComponentsInChildren<T>().SingleOrDefault(component => component.name == name && component.gameObject.activeInHierarchy);

        private static InputField EndpointInput(PrototypeApp app)
        {
            var input = Find<InputField>(app, "GameEndpoint") ?? Find<InputField>(app, "ServerConfigEndpoint");
            if (input == null) throw new InvalidOperationException("Server endpoint input is missing.");
            return input;
        }

        private static void Click(PrototypeApp app, string name)
        {
            var button = Find<Button>(app, name);
            if (button == null || !button.interactable) throw new InvalidOperationException("Server button unavailable: " + name);
            button.onClick.Invoke();
            Canvas.ForceUpdateCanvases();
        }

        private static void SetProperty(PrototypeApp app, string name, object value) =>
            typeof(PrototypeApp).GetProperty(name, InstanceFlags).GetSetMethod(true).Invoke(app, new[] { value });

        private static void Require(bool condition, string message, List<string> checks)
        {
            if (!condition) throw new InvalidOperationException("Server selection check failed: " + message);
            checks.Add(message);
        }

        private sealed class RecordingSession : IGameNetworkSession
        {
            public RecordingSession(string endpoint) { Endpoint = endpoint; }
            public int DisconnectCount { get; private set; }
            public NetworkConnectionState State { get; private set; } = NetworkConnectionState.Connected;
            public bool Authenticated => State == NetworkConnectionState.Connected;
            public string Endpoint { get; }
            public string LastError => string.Empty;
            public event Action<NetworkConnectionState> StateChanged { add { } remove { } }
            public event Action<string> ErrorReceived { add { } remove { } }
            public event Action<GameProfileSnapshot> ProfileReceived { add { } remove { } }
            public event Action<GameActionRequest> ActionAccepted { add { } remove { } }
            public void Connect(string endpoint) => throw new InvalidOperationException("Server checks must not connect to a backend.");
            public void Register(GameRegistrationRequest request) => throw new InvalidOperationException("Unexpected registration in server checks.");
            public void Login(GameLoginRequest request) => throw new InvalidOperationException("Unexpected login in server checks.");
            public void LoadProfile(long characterId) { }
            public void SendAction(GameActionRequest request) { }
            public void Tick() { }
            public void Disconnect() { DisconnectCount++; State = NetworkConnectionState.Offline; }
        }
    }
}
