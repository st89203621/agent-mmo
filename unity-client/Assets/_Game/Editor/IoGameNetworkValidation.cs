using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

namespace Lunhui.Prototype
{
    [InitializeOnLoad]
    public static class IoGameNetworkValidation
    {
        private const string RunningKey = "Lunhui.NetworkValidation.Running";
        private const string QuitKey = "Lunhui.NetworkValidation.Quit";
        private const string RestoreKey = "Lunhui.NetworkValidation.Restore";
        private const string ScenesKey = "Lunhui.NetworkValidation.Scenes";
        private const string ExitCodeKey = "Lunhui.NetworkValidation.ExitCode";
        private const string StartedKey = "Lunhui.NetworkValidation.Started";
        private const string DefaultEndpoint = "ws://127.0.0.1:10100/websocket";
        private static IoGameNetworkSession session;
        private static ValidationReport report;
        private static GameProfileSnapshot receivedProfile;
        private static Action connectedAction;
        private static Stage stage;
        private static string receivedError;
        private static string username;
        private static string password;
        private static string wrongPassword;
        private static string endpoint;
        private static string outputDirectory;
        private static long registeredUserId;
        private static double deadline;
        private static double stageStarted;
        private static bool expectsError;
        private static bool callbackOnMainThread;
        private static int mainThreadId;
        private static int profileEvents;
        private static PrototypeApp uiApp;
        private static IGameNetworkSession observedUiSession;
        private static Dictionary<string, string> originalPreferences;

        private enum Stage
        {
            Connecting,
            Registering,
            WrongPassword,
            LoggingIn,
            LoadingProfile,
            ReconnectingLogin,
            HeartbeatSoak,
            SuspendedSession,
            ResumedSession,
            InterruptedSession,
            InvalidEndpoint,
            UnavailableEndpoint,
            CancelledConnection,
            UiLoggingIn,
            UiRefreshingProfile,
            UiLoggingInAfterRefresh,
            UiConnectingToCancel,
            UiCancelledLogin,
            UiLoggingInAfterCancel
        }

        [Serializable]
        public sealed class ValidationReport
        {
            public string editorVersion;
            public string timestampUtc;
            public string endpoint;
            public string testUsername;
            public string userId;
            public bool passed;
            public List<string> checks = new List<string>();
            public List<string> stateTransitions = new List<string>();
            public List<string> expectedErrors = new List<string>();
            public List<string> errors = new List<string>();
            public ProfileResult profile;
        }

        [Serializable]
        public sealed class ProfileResult
        {
            public string userId;
            public string nickname;
            public int level;
            public int maxHealth;
            public int attack;
            public int defense;
            public int speed;
        }

        [Serializable]
        private sealed class SavedScenes
        {
            public SavedScene[] scenes;
        }

        [Serializable]
        private sealed class SavedScene
        {
            public string path;
            public bool loaded;
            public bool active;
        }

        static IoGameNetworkValidation()
        {
            EditorApplication.playModeStateChanged += OnPlayModeChanged;
            EditorApplication.update += Update;
        }

        [MenuItem("Lunhui/Validate Live ioGame Connection")]
        public static void Run() => Start(false);

        // Omit -quit: asynchronous validation exits the editor after writing its report.
        public static void RunBatch() => Start(true);

        private static void Start(bool quitWhenDone)
        {
            if (SessionState.GetBool(RunningKey, false) || EditorApplication.isPlayingOrWillChangePlaymode)
                throw new InvalidOperationException("Stop Play Mode and other validation runs first.");
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;

            var saved = new SavedScenes
            {
                scenes = EditorSceneManager.GetSceneManagerSetup().Select(scene => new SavedScene
                {
                    path = scene.path, loaded = scene.isLoaded, active = scene.isActive
                }).ToArray()
            };
            SessionState.SetString(ScenesKey, JsonUtility.ToJson(saved));
            SessionState.SetBool(QuitKey, quitWhenDone);
            SessionState.SetBool(RestoreKey, false);
            SessionState.SetBool(RunningKey, true);
            SessionState.SetFloat(StartedKey, (float)EditorApplication.timeSinceStartup);
            report = null;
            outputDirectory = null;
            registeredUserId = 0;

            // An empty scene keeps gameplay and the process-wide SDK from creating a second session.
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            EditorApplication.EnterPlaymode();
        }

        private static void OnPlayModeChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredEditMode && SessionState.GetBool(RestoreKey, false))
            {
                RestoreScenesAndExit();
                return;
            }
            if (!SessionState.GetBool(RunningKey, false)) return;
            if (state == PlayModeStateChange.EnteredPlayMode)
            {
                try { Begin(); }
                catch (Exception exception) { Fail(exception.Message); }
            }
            else if (state == PlayModeStateChange.ExitingPlayMode)
                Fail("Play Mode ended before network validation completed.");
        }

        private static void Begin()
        {
            mainThreadId = Thread.CurrentThread.ManagedThreadId;
            callbackOnMainThread = true;
            endpoint = Argument("-lunhuiNetworkEndpoint", DefaultEndpoint);
            outputDirectory = Path.GetFullPath(Argument("-lunhuiNetworkValidationOutput", "Artifacts/NetworkValidation"));
            username = "unity_sdk_" + Guid.NewGuid().ToString("N").Substring(0, 12);
            password = Guid.NewGuid().ToString("N");
            wrongPassword = Guid.NewGuid().ToString("N");
            report = new ValidationReport
            {
                editorVersion = Application.unityVersion,
                timestampUtc = DateTime.UtcNow.ToString("O"),
                endpoint = endpoint,
                testUsername = username
            };
            session = new IoGameNetworkSession();
            session.StateChanged += OnStateChanged;
            session.ProfileReceived += OnProfileReceived;
            session.ErrorReceived += OnErrorReceived;
            Connect(() =>
            {
                SetStage(Stage.Registering);
                session.Register(new GameRegistrationRequest { Username = username, Password = password });
            });
        }

        private static void Update()
        {
            if (!SessionState.GetBool(RunningKey, false)) return;
            if (!EditorApplication.isPlaying || report == null)
            {
                if (EditorApplication.timeSinceStartup - SessionState.GetFloat(StartedKey, 0) > 90)
                    Fail("Play Mode did not start within 90 seconds.");
                return;
            }
            try
            {
                session.Tick();
                if (uiApp) uiApp.Network.Tick();
                if (!callbackOnMainThread) throw new InvalidOperationException("Session callbacks ran outside the Unity main thread.");
                if (!expectsError && !string.IsNullOrEmpty(receivedError))
                    throw new InvalidOperationException(stage + ": " + receivedError);
                if (EditorApplication.timeSinceStartup > deadline)
                    throw new TimeoutException("Timed out waiting for " + stage + ". State: "
                        + (uiApp ? uiApp.Network.State : session.State));

                switch (stage)
                {
                    case Stage.Connecting:
                        if (session.State != NetworkConnectionState.Connected) return;
                        var action = connectedAction;
                        connectedAction = null;
                        action();
                        break;
                    case Stage.Registering:
                        if (receivedProfile == null) return;
                        CheckProfile(false);
                        registeredUserId = receivedProfile.UserId;
                        report.userId = registeredUserId.ToString(CultureInfo.InvariantCulture);
                        report.profile = new ProfileResult
                        {
                            userId = report.userId, nickname = receivedProfile.Nickname,
                            level = receivedProfile.Level, maxHealth = receivedProfile.MaxHealth,
                            attack = receivedProfile.Attack, defense = receivedProfile.Defense,
                            speed = receivedProfile.Speed
                        };
                        Check(true, "Registration logs into the real backend and loads a valid character.");
                        DisconnectAndCheck();
                        Connect(() =>
                        {
                            SetStage(Stage.WrongPassword, true);
                            session.Login(new GameLoginRequest { Username = username, Password = wrongPassword });
                        });
                        break;
                    case Stage.WrongPassword:
                        Check(receivedProfile == null && !session.Authenticated,
                            null, "Wrong password authenticated or exposed a character.");
                        if (string.IsNullOrEmpty(receivedError)) return;
                        Check(session.State == NetworkConnectionState.Connected,
                            "Wrong password is rejected while the connection remains usable.");
                        SetStage(Stage.LoggingIn);
                        session.Login(new GameLoginRequest { Username = username, Password = password });
                        break;
                    case Stage.LoggingIn:
                        if (receivedProfile == null) return;
                        CheckProfile(true);
                        Check(true, "Correct credentials recover from a rejected login on the same connection.");
                        SetStage(Stage.LoadingProfile);
                        session.LoadProfile(registeredUserId);
                        break;
                    case Stage.LoadingProfile:
                        if (receivedProfile == null) return;
                        CheckProfile(true);
                        Check(true, "An explicit character reload returns the same 64-bit account ID.");
                        DisconnectAndCheck();
                        Connect(() =>
                        {
                            SetStage(Stage.ReconnectingLogin);
                            session.Login(new GameLoginRequest { Username = username, Password = password });
                        });
                        break;
                    case Stage.ReconnectingLogin:
                        if (receivedProfile == null) return;
                        CheckProfile(true);
                        Check(true, "Reconnect and login restore the server character without registering again.");
                        if (double.TryParse(Argument("-lunhuiHeartbeatSeconds", "0"), NumberStyles.Float, CultureInfo.InvariantCulture, out var soakSeconds) && soakSeconds > 0)
                        {
                            SetStage(Stage.HeartbeatSoak);
                            deadline = stageStarted + soakSeconds + 20;
                            break;
                        }
                        BeginInvalidEndpointChecks();
                        break;
                    case Stage.HeartbeatSoak:
                        Check(session.Authenticated && session.State == NetworkConnectionState.Connected,
                            null, "Idle heartbeat session disconnected during the soak test.");
                        double duration = double.Parse(Argument("-lunhuiHeartbeatSeconds", "0"), CultureInfo.InvariantCulture);
                        if (EditorApplication.timeSinceStartup - stageStarted < duration) return;
                        Check(session.HeartbeatReplies + session.LivenessReplies > 0,
                            "Heartbeat or authenticated liveness responses were received during the idle test.");
                        Check(true, "Authenticated idle session remained connected for " + duration + " seconds using keepalive traffic.");
                        SetStage(Stage.SuspendedSession);
                        session.SetSuspended(true);
                        break;
                    case Stage.SuspendedSession:
                        Check(!session.Authenticated && session.State == NetworkConnectionState.Reconnecting,
                            null, "Background suspension retained a stale authenticated session.");
                        if (EditorApplication.timeSinceStartup - stageStarted < 1) return;
                        SetStage(Stage.ResumedSession);
                        session.SetSuspended(false);
                        break;
                    case Stage.ResumedSession:
                        if (receivedProfile == null) return;
                        CheckProfile(true);
                        Check(true, "Returning from background reauthenticates and restores the same server character.");
                        SetStage(Stage.InterruptedSession);
                        var channelField = typeof(IoGameNetworkSession).GetField("channel", BindingFlags.Instance | BindingFlags.NonPublic);
                        var transport = channelField.GetValue(session);
                        var socketField = transport.GetType().GetField("socket", BindingFlags.Instance | BindingFlags.NonPublic);
                        ((UnityWebSocket.WebSocket)socketField.GetValue(transport)).Abort();
                        break;
                    case Stage.InterruptedSession:
                        if (receivedProfile == null) return;
                        CheckProfile(true);
                        Check(true, "An interrupted socket automatically reconnects and restores the same account without user input.");
                        BeginInvalidEndpointChecks();
                        break;
                    case Stage.InvalidEndpoint:
                        if (string.IsNullOrEmpty(receivedError)) return;
                        Check(session.State == NetworkConnectionState.Failed && !session.Authenticated,
                            "A non-WebSocket endpoint fails with a visible error and no authenticated session.");
                        SetStage(Stage.UnavailableEndpoint, true);
                        session.Connect("ws://127.0.0.1:1/websocket");
                        break;
                    case Stage.UnavailableEndpoint:
                        if (string.IsNullOrEmpty(receivedError)) return;
                        Check(session.State == NetworkConnectionState.Failed && !session.Authenticated,
                            "An unavailable server fails within the connection timeout.");
                        SetStage(Stage.CancelledConnection);
                        session.Connect(endpoint);
                        session.Disconnect();
                        break;
                    case Stage.CancelledConnection:
                        Check(session.State == NetworkConnectionState.Offline && !session.Authenticated && receivedProfile == null,
                            null, "A callback revived a cancelled connection.");
                        if (EditorApplication.timeSinceStartup - stageStarted < 1) return;
                        Check(true, "Cancelling a connection discards delayed callbacks and clears authentication.");
                        Check(true, "All session events were delivered on the Unity main thread.");
                        BeginUiValidation();
                        break;
                    case Stage.UiLoggingIn:
                        if (receivedProfile == null) return;
                        CheckUiProfile();
                        Check(true, "The account login form authenticates and opens the home page with the registered character.");
                        uiApp.OpenOnlineProfile();
                        SetStage(Stage.UiRefreshingProfile);
                        ClickUiButton("RefreshAccountProfile");
                        break;
                    case Stage.UiRefreshingProfile:
                        if (receivedProfile == null) return;
                        CheckUiProfile();
                        Check(UiComponents<Button>().Any(button => button.name == "RefreshAccountProfile"),
                            "The role panel refresh button receives a server profile and remains usable.");
                        // Start another refresh and immediately replace its connection with the login form.
                        ClickUiButton("RefreshAccountProfile");
                        BeginUiLogin(Stage.UiLoggingInAfterRefresh);
                        break;
                    case Stage.UiLoggingInAfterRefresh:
                        if (receivedProfile == null) return;
                        CheckUiProfile();
                        Check(true, "Reopening login during an in-flight profile refresh authenticates without freezing the dialog.");
                        uiApp.Enter(true);
                        CheckLocalDemo();
                        BeginUiLogin(Stage.UiConnectingToCancel);
                        break;
                    case Stage.UiConnectingToCancel:
                        break;
                    case Stage.UiCancelledLogin:
                        Check(uiApp.Network.State == NetworkConnectionState.Offline && !uiApp.Network.Authenticated
                            && uiApp.AccountProfile == null && !uiApp.OnlineMode && receivedProfile == null
                            && !UiComponents<InputField>().Any(input => input.name == "AccountPassword"),
                            null, "Closing the pending account dialog allowed login or retained the password input.");
                        if (EditorApplication.timeSinceStartup - stageStarted < 1) return;
                        Check(true, "Closing the account dialog cancels its pending login without accepting delayed callbacks.");
                        BeginUiLogin(Stage.UiLoggingInAfterCancel);
                        break;
                    case Stage.UiLoggingInAfterCancel:
                        if (receivedProfile == null) return;
                        CheckUiProfile();
                        Check(true, "A new account login succeeds after cancelling the previous login attempt.");
                        uiApp.Enter(true);
                        CheckLocalDemo();
                        Check(PreferencesUnchanged(), "Account login, refresh and reconnect leave local new/demo saves and remembered login settings unchanged.");
                        Finish();
                        break;
                }
            }
            catch (Exception exception) { Fail(exception.Message); }
        }

        private static void Connect(Action onConnected)
        {
            SetStage(Stage.Connecting);
            connectedAction = onConnected;
            session.Connect(endpoint);
        }

        private static void BeginInvalidEndpointChecks()
        {
            DisconnectAndCheck();
            SetStage(Stage.InvalidEndpoint, true);
            session.Connect("http://127.0.0.1:10100/websocket");
        }

        private static void BeginUiValidation()
        {
            string[] keys = { "Lunhui.NativePrototype.v1.new", "Lunhui.NativePrototype.v1.demo",
                "Lunhui.Network.Endpoint", "Lunhui.Network.Username" };
            originalPreferences = keys.ToDictionary(key => key, key => PlayerPrefs.HasKey(key) ? PlayerPrefs.GetString(key) : null);
            uiApp = new GameObject("IoGameAccountUiValidation").AddComponent<PrototypeApp>();
            uiApp.SuppressPersistence = true;
            BeginUiLogin(Stage.UiLoggingIn);
        }

        private static void BeginUiLogin(Stage next)
        {
            SetStage(next);
            uiApp.OpenOnlineLogin();
            UiComponents<InputField>().Single(input => input.name == "GameEndpoint").text = endpoint;
            UiComponents<InputField>().Single(input => input.name == "AccountUsername").text = username;
            var passwordField = UiComponents<InputField>().Single(input => input.name == "AccountPassword");
            Check(passwordField.contentType == InputField.ContentType.Password,
                null, "The account password field is not masked.");
            passwordField.text = password;
            ClickUiButton("SubmitOnlineLogin");
            ObserveUiSession(uiApp.Network);
        }

        private static void ObserveUiSession(IGameNetworkSession next)
        {
            if (observedUiSession != null)
            {
                observedUiSession.StateChanged -= OnStateChanged;
                observedUiSession.ProfileReceived -= OnProfileReceived;
                observedUiSession.ErrorReceived -= OnErrorReceived;
            }
            observedUiSession = next;
            if (next == null) return;
            next.StateChanged += OnStateChanged;
            next.ProfileReceived += OnProfileReceived;
            next.ErrorReceived += OnErrorReceived;
        }

        private static void CheckUiProfile()
        {
            Check(uiApp.Network.Authenticated && uiApp.OnlineMode && uiApp.CurrentPage == "home"
                && uiApp.AccountProfile != null && uiApp.AccountProfile.UserId == registeredUserId
                && receivedProfile.UserId == registeredUserId && profileEvents == 1,
                null, "The account UI did not enter the authenticated home page with the expected server character.");
            Check(!UiComponents<InputField>().Any(input => input.name == "AccountPassword"),
                null, "A completed account login left its password dialog open.");
        }

        private static void CheckLocalDemo()
        {
            Check(!uiApp.OnlineMode && uiApp.AccountProfile == null && !uiApp.Network.Authenticated
                && uiApp.DemoMode && uiApp.CurrentPage == "character",
                "Entering the local demo clears the online account and returns to character selection.");
        }

        private static T[] UiComponents<T>() where T : Component => uiApp.GetComponentsInChildren<T>();

        private static void ClickUiButton(string name)
        {
            var button = UiComponents<Button>().Single(candidate => candidate.name == name);
            Check(button.interactable, null, "Account UI button is disabled: " + name);
            button.onClick.Invoke();
            Canvas.ForceUpdateCanvases();
        }

        private static bool PreferencesUnchanged()
        {
            return originalPreferences == null || originalPreferences.All(pair =>
                pair.Value == null ? !PlayerPrefs.HasKey(pair.Key)
                    : PlayerPrefs.HasKey(pair.Key) && PlayerPrefs.GetString(pair.Key) == pair.Value);
        }

        private static void SetStage(Stage next, bool errorExpected = false)
        {
            stage = next;
            stageStarted = EditorApplication.timeSinceStartup;
            deadline = stageStarted + 30;
            receivedProfile = null;
            profileEvents = 0;
            receivedError = null;
            expectsError = errorExpected;
        }

        private static void CheckProfile(bool requireRegisteredId)
        {
            Check(session.Authenticated && session.State == NetworkConnectionState.Connected,
                null, "Profile was returned without an authenticated connection.");
            Check(profileEvents == 1 && receivedProfile.UserId > 0 && !string.IsNullOrWhiteSpace(receivedProfile.Nickname)
                && receivedProfile.Level >= 1 && receivedProfile.MaxHealth > 0,
                null, "The backend returned an incomplete or duplicate character profile.");
            if (requireRegisteredId)
                Check(receivedProfile.UserId == registeredUserId, null, "The reloaded account ID changed.");
        }

        private static void DisconnectAndCheck()
        {
            session.Disconnect();
            Check(session.State == NetworkConnectionState.Offline && !session.Authenticated,
                "Disconnect clears the authenticated session.");
        }

        private static void OnStateChanged(NetworkConnectionState state)
        {
            CheckThread();
            report.stateTransitions.Add(stage + ": " + state);
            if (stage == Stage.UiConnectingToCancel && state == NetworkConnectionState.Connected)
            {
                // The app's earlier state listener has sent login; close before its response can be delivered.
                SetStage(Stage.UiCancelledLogin);
                ClickUiButton("CloseOnlineLogin");
            }
        }

        private static void OnProfileReceived(GameProfileSnapshot profile)
        {
            CheckThread();
            profileEvents++;
            receivedProfile = profile;
        }

        private static void OnErrorReceived(string error)
        {
            CheckThread();
            receivedError = Sanitize(error);
            if (expectsError) report.expectedErrors.Add(stage + ": " + receivedError);
        }

        private static void CheckThread()
        {
            callbackOnMainThread &= Thread.CurrentThread.ManagedThreadId == mainThreadId;
        }

        private static void Check(bool condition, string success, string failure = null)
        {
            if (!condition) throw new InvalidOperationException(failure ?? success);
            if (!string.IsNullOrEmpty(success)) report.checks.Add(success);
        }

        private static void Fail(string message)
        {
            if (!SessionState.GetBool(RunningKey, false)) return;
            if (report == null)
                report = new ValidationReport { editorVersion = Application.unityVersion, timestampUtc = DateTime.UtcNow.ToString("O") };
            report.errors.Add(Sanitize(message));
            Finish();
        }

        private static void Finish()
        {
            SessionState.SetBool(RunningKey, false);
            ObserveUiSession(null);
            if (uiApp)
            {
                uiApp.Network.Disconnect();
                UnityEngine.Object.DestroyImmediate(uiApp.gameObject);
                uiApp = null;
            }
            if (!PreferencesUnchanged())
            {
                report.errors.Add("Account UI validation unexpectedly changed persistent local preferences.");
                foreach (var pair in originalPreferences)
                {
                    if (pair.Value == null) PlayerPrefs.DeleteKey(pair.Key);
                    else PlayerPrefs.SetString(pair.Key, pair.Value);
                }
                PlayerPrefs.Save();
            }
            originalPreferences = null;
            if (session != null)
            {
                session.StateChanged -= OnStateChanged;
                session.ProfileReceived -= OnProfileReceived;
                session.ErrorReceived -= OnErrorReceived;
                session.Disconnect();
                session = null;
            }
            report.passed = report.errors.Count == 0 && registeredUserId > 0;
            outputDirectory = outputDirectory ?? Path.GetFullPath(Argument("-lunhuiNetworkValidationOutput", "Artifacts/NetworkValidation"));
            Directory.CreateDirectory(outputDirectory);
            File.WriteAllText(Path.Combine(outputDirectory, "validation.json"), Sanitize(JsonUtility.ToJson(report, true)));
            password = null;
            wrongPassword = null;
            Debug.Log("Lunhui ioGame validation " + (report.passed ? "passed: " : "failed: ") + outputDirectory);
            SessionState.SetInt(ExitCodeKey, report.passed ? 0 : 1);
            SessionState.SetBool(RestoreKey, true);
            if (EditorApplication.isPlaying) EditorApplication.ExitPlaymode();
            else RestoreScenesAndExit();
        }

        private static void RestoreScenesAndExit()
        {
            SessionState.SetBool(RestoreKey, false);
            var saved = JsonUtility.FromJson<SavedScenes>(SessionState.GetString(ScenesKey, "{}"));
            var scenes = saved?.scenes?.Where(scene => !string.IsNullOrEmpty(scene.path)).Select(scene => new SceneSetup
            {
                path = scene.path, isLoaded = scene.loaded, isActive = scene.active
            }).ToArray();
            if (scenes != null && scenes.Length > 0) EditorSceneManager.RestoreSceneManagerSetup(scenes);
            SessionState.EraseString(ScenesKey);
            if (SessionState.GetBool(QuitKey, false)) EditorApplication.Exit(SessionState.GetInt(ExitCodeKey, 1));
        }

        private static string Sanitize(string value)
        {
            string result = value ?? string.Empty;
            if (!string.IsNullOrEmpty(password)) result = result.Replace(password, "[redacted]");
            if (!string.IsNullOrEmpty(wrongPassword)) result = result.Replace(wrongPassword, "[redacted]");
            return result;
        }

        private static string Argument(string name, string fallback)
        {
            string[] args = Environment.GetCommandLineArgs();
            int index = Array.IndexOf(args, name);
            return index >= 0 && index + 1 < args.Length ? args[index + 1] : fallback;
        }
    }
}
