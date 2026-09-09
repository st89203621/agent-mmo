using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Lunhui.Protocol;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Debug = UnityEngine.Debug;

namespace Lunhui.Prototype
{
    [InitializeOnLoad]
    public static class NativeSubmapValidation
    {
        private const string Prefix = "Lunhui.NativeSubmapValidation.";
        private static readonly string[] PreferenceKeys = { "Lunhui.NativePrototype.v1.new", "Lunhui.NativePrototype.v1.demo",
            "Lunhui.Network.Endpoint", "Lunhui.Network.Username" };
        private static IoGameNetworkSession session;
        private static NativeGameClient client;
        private static GameProfileSnapshot profile;
        private static Report report;
        private static Stopwatch timer;
        private static CancellationTokenSource cancellation;
        private static Dictionary<string, string> preferences;
        private static string endpoint, output, username, password, otherPassword, networkError, stage;
        private static long userId, otherUserId;
        private static bool Running => SessionState.GetBool(Prefix + "Running", false);

        [Serializable]
        public sealed class Report
        {
            public string editorVersion, timestampUtc, endpoint, userId, otherUserId, stage;
            public bool passed;
            public double elapsedSeconds;
            public int moveRequests;
            public List<string> checks = new List<string>();
            public List<string> errors = new List<string>();
            public List<string> stateTransitions = new List<string>();
            public List<Evidence> snapshots = new List<Evidence>();
        }

        [Serializable]
        public sealed class Evidence
        {
            public string label, name;
            public int realm, submap, memoryMask, treasureMask, localMemory, localKills, unlocked, gold, enemies, players;
            public bool localBoss, localChest;
            public float x, z;
        }

        [Serializable]
        private sealed class SavedScenes { public SavedScene[] scenes; }
        [Serializable]
        private sealed class SavedScene { public string path; public bool loaded, active; }

        static NativeSubmapValidation()
        {
            EditorApplication.update += Update;
            EditorApplication.playModeStateChanged += PlayModeChanged;
        }

        [MenuItem("Lunhui/Validate Submaps With Live Server")]
        public static void Run() => Start(false);
        public static void RunBatch() => Start(true);

        private static void Start(bool quit)
        {
            if (Running || EditorApplication.isPlayingOrWillChangePlaymode
                || SessionState.GetBool("Lunhui.NativeNetworkValidation.Running", false)
                || SessionState.GetBool("Lunhui.NetworkValidation.Running", false))
                throw new InvalidOperationException("Stop Play Mode and other network validations first.");
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            var saved = new SavedScenes { scenes = EditorSceneManager.GetSceneManagerSetup()
                .Select(value => new SavedScene { path = value.path, loaded = value.isLoaded, active = value.isActive }).ToArray() };
            SessionState.SetString(Prefix + "Scenes", JsonUtility.ToJson(saved));
            SessionState.SetBool(Prefix + "Quit", quit);
            SessionState.SetBool(Prefix + "Restore", false);
            SessionState.SetBool(Prefix + "Running", true);
            SessionState.SetFloat(Prefix + "Started", (float)EditorApplication.timeSinceStartup);
            report = null;
            output = null;
            userId = otherUserId = 0;
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            EditorApplication.EnterPlaymode();
        }

        private static void PlayModeChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredEditMode && SessionState.GetBool(Prefix + "Restore", false)) RestoreScenes();
            else if (Running && state == PlayModeStateChange.EnteredPlayMode) Begin();
            else if (Running && state == PlayModeStateChange.ExitingPlayMode) Fail("Play Mode ended before validation completed.");
        }

        private static async void Begin()
        {
            try
            {
                timer = Stopwatch.StartNew();
                cancellation = new CancellationTokenSource();
                endpoint = Argument("-lunhuiNetworkEndpoint", "ws://127.0.0.1:10100/websocket");
                output = Path.GetFullPath(Argument("-lunhuiSubmapValidationOutput", "Artifacts/NativeSubmapValidation"));
                username = "submap_test_" + Guid.NewGuid().ToString("N").Substring(0, 12);
                password = Guid.NewGuid().ToString("N");
                otherPassword = Guid.NewGuid().ToString("N");
                preferences = PreferenceKeys.ToDictionary(key => key, key => PlayerPrefs.HasKey(key) ? PlayerPrefs.GetString(key) : null);
                report = new Report { editorVersion = Application.unityVersion, timestampUtc = DateTime.UtcNow.ToString("O"), endpoint = endpoint };
                session = new IoGameNetworkSession();
                session.ProfileReceived += value => profile = value;
                session.ErrorReceived += value => networkError = Sanitize(value);
                session.StateChanged += value => report.stateTransitions.Add(stage + ": " + value);
                await Validate();
                Check(PreferencesUnchanged(), "The run preserved local saves and remembered account settings.");
                Finish();
            }
            catch (Exception exception) { if (Running) Fail(exception.GetType().Name + ": " + exception.Message); }
        }

        private static void Update()
        {
            if (!Running) return;
            if (!EditorApplication.isPlaying || report == null)
            {
                if (EditorApplication.timeSinceStartup - SessionState.GetFloat(Prefix + "Started", 0) > 90)
                    Fail("Play Mode did not start within 90 seconds.");
                return;
            }
            try
            {
                session?.Tick();
                if (!string.IsNullOrEmpty(networkError)) throw new InvalidOperationException(networkError);
                if (timer.Elapsed.TotalSeconds > 120) throw new TimeoutException("Submap validation exceeded two minutes.");
            }
            catch (Exception exception) { Fail(exception.Message); }
        }

        private static async Task Validate()
        {
            Stage("Registration and locked maps");
            await Authenticate(username, password, true);
            userId = profile.UserId;
            report.userId = userId.ToString(CultureInfo.InvariantCulture);
            Check(client.Ready && client.Snapshot.Realm == 0 && client.Snapshot.Submap == 0
                && client.Snapshot.UnlockedSubmapMask == 1 && client.Snapshot.SubmapMemoryMask == 0,
                "A new account starts in the base town with only submap zero unlocked.");
            var locked = await client.Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeEnter,
                new NativeWorldRequest { Realm = 0, Submap = 1 });
            Check(!locked.Accepted && locked.Submap == 0, "Entering submap one is rejected before the previous chest is claimed.");
            var invalid = await client.Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeEnter,
                new NativeWorldRequest { Realm = 0, Submap = 3 });
            Check(!invalid.Accepted && invalid.Submap == 0, "An out-of-range submap is rejected without moving the player.");

            Stage("Complete base-town chapter");
            var guide = client.Snapshot.Landmarks.Single(value => value.Id == "guide");
            await WalkTo(guide.X, guide.Z);
            await client.Interact(guide.Id);
            for (int index = 0; index < 3; index++)
            {
                var memory = client.Snapshot.Landmarks.Single(value => value.Id == "memory-" + index);
                await WalkTo(memory.X, memory.Z);
                await client.Interact(memory.Id);
            }
            await WalkTo(0, 79);
            await WalkTo(0, 83);
            var chest = client.Snapshot.Landmarks.Single(value => value.Id == "chest");
            await WalkTo(chest.X, chest.Z);
            await client.Interact(chest.Id);
            await client.RefreshGrowth();
            Check(client.Snapshot.IntroComplete && client.Snapshot.MemoryMask == 7 && client.Snapshot.SubmapMemoryMask == 7
                && client.Snapshot.TreasureMask == 1 && client.Snapshot.SubmapTreasureCollected
                && client.Snapshot.UnlockedSubmapMask == 3, "The legal village route completes the chapter and unlocks submap one.");
            Capture("base-chapter-complete");
            int baseGold = client.Currency.Gold;
            int baseEquipment = client.Equipment.Count;
            await client.Interact(chest.Id);
            await client.RefreshGrowth();
            Check(client.Currency.Gold == baseGold && client.Equipment.Count == baseEquipment,
                "The base-town chest replay does not duplicate rewards.");

            Stage("Enter independent submap");
            await client.EnterWorld(0, false, 1);
            Check(client.Snapshot.Submap == 1 && client.Snapshot.SubmapMemoryMask == 0 && client.Snapshot.SubmapKills == 0
                && !client.Snapshot.SubmapBossDefeated && !client.Snapshot.SubmapTreasureCollected
                && client.Snapshot.MemoryMask == 7 && client.Snapshot.TreasureMask == 1,
                "Submap one starts with independent objectives and preserves the completed base-town masks.");
            Check(client.Snapshot.Enemies.Count == 5 && client.Snapshot.Enemies.Count(value => value.Boss) == 1
                && client.Snapshot.Enemies.All(value => value.Id.StartsWith("realm-0-submap-1-enemy-", StringComparison.Ordinal)),
                "The new submap supplies its own four monsters and boss.");
            locked = await client.Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeEnter,
                new NativeWorldRequest { Realm = 0, Submap = 2 });
            Check(!locked.Accepted && locked.Submap == 1, "Completing the base town does not unlock submap two prematurely.");
            Capture("new-submap-independent");

            Stage("Two-account room isolation");
            // The official SDK owns one socket per process, so accounts connect sequentially.
            await Authenticate("submap_peer_" + Guid.NewGuid().ToString("N").Substring(0, 12), otherPassword, true);
            otherUserId = profile.UserId;
            report.otherUserId = otherUserId.ToString(CultureInfo.InvariantCulture);
            Check(otherUserId != userId && client.Snapshot.Submap == 0
                && client.Snapshot.Players.All(value => value.UserId != userId),
                "A second real account in submap zero cannot see the first account in submap one.");
            await Authenticate(username, password, false);
            Check(profile.UserId == userId && client.Snapshot.Submap == 1
                && client.Snapshot.Players.All(value => value.UserId != otherUserId),
                "The first account resumes its room and cannot see the account in the base town.");

            Stage("Stale request rejection");
            var current = client.Snapshot.Clone();
            var staleMove = await client.Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeMove,
                new NativeMoveRequest { Realm = 0, Submap = 0, Sequence = current.LastMoveSequence, X = current.X, Z = current.Z + 1 });
            var staleAction = await client.Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeAction,
                new NativeCombatRequest { Realm = 0, Submap = 0, Sequence = current.LastActionSequence + 1, Action = "dodge" });
            var staleInteract = await client.Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeInteract,
                new NativeInteractRequest { Realm = 0, Submap = 0, TargetId = "memory-0" });
            Check(!staleMove.Accepted && SamePosition(current, staleMove) && staleMove.LastMoveSequence == current.LastMoveSequence,
                "An acknowledged move from the old submap is rejected before replay handling.");
            Check(!staleAction.Accepted && staleAction.LastActionSequence == current.LastActionSequence,
                "An action from the old submap cannot consume an action sequence or affect the new room.");
            Check(!staleInteract.Accepted && staleInteract.SubmapMemoryMask == 0 && staleInteract.Rewards.Count == 0,
                "An interaction from the old submap cannot change collection progress or grant rewards.");

            Stage("Collect and reconnect in new submap");
            var firstMemory = client.Snapshot.Landmarks.Single(value => value.Id == "memory-0");
            await WalkTo(firstMemory.X, firstMemory.Z);
            await client.Interact(firstMemory.Id);
            await client.RefreshGrowth();
            Check(client.Snapshot.SubmapMemoryMask == 1 && client.Snapshot.MemoryMask == 7
                && client.Snapshot.TreasureMask == 1 && !client.Snapshot.SubmapTreasureCollected && client.Currency.Gold == baseGold + 100,
                "The first new-submap memory awards 100 gold without contaminating base-town progress.");
            await client.Interact(firstMemory.Id);
            await client.RefreshGrowth();
            Check(client.Currency.Gold == baseGold + 100 && client.Snapshot.Rewards.Count == 0,
                "Replaying the new-submap memory interaction cannot award gold twice.");
            var location = client.Snapshot.Clone();
            await Authenticate(username, password, false);
            Check(client.Snapshot.Realm == 0 && client.Snapshot.Submap == 1 && SamePosition(location, client.Snapshot)
                && client.Snapshot.SubmapMemoryMask == 1 && client.Snapshot.MemoryMask == 7 && client.Currency.Gold == baseGold + 100,
                "Reconnect restores the new submap, exact location, independent memory and earned gold.");
            Capture("new-submap-reconnected");

            Stage("Return to completed base town");
            await client.Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeLeave);
            await Pause(5200);
            await client.EnterWorld(0, false, 0);
            Check(client.Snapshot.Submap == 0 && client.Snapshot.SubmapMemoryMask == 7 && client.Snapshot.SubmapTreasureCollected
                && client.Snapshot.MemoryMask == 7 && client.Snapshot.TreasureMask == 1 && client.Snapshot.Enemies.Count == 0,
                "Returning to the base town preserves its completed memories and chest with no new-submap enemies.");
            await client.EnterWorld(0, false, 1);
            Check(client.Snapshot.SubmapMemoryMask == 1 && !client.Snapshot.SubmapTreasureCollected && client.Snapshot.Enemies.Count == 5,
                "Re-entering the new submap restores its own progress independently of the base town.");
            Capture("new-submap-revisited");
            await client.Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeLeave);
        }

        private static async Task Authenticate(string account, string secret, bool register)
        {
            client?.Dispose();
            session.Disconnect();
            await Pause(250);
            profile = null;
            networkError = null;
            session.Connect(endpoint);
            await Until(() => session.State == NetworkConnectionState.Connected, "WebSocket connection");
            if (register) session.Register(new GameRegistrationRequest { Username = account, Password = secret });
            else session.Login(new GameLoginRequest { Username = account, Password = secret });
            await Until(() => profile != null && session.Authenticated, "account authentication");
            client = new NativeGameClient(session);
            await client.Initialize();
        }

        private static async Task WalkTo(float x, float z)
        {
            var destination = new Vector2(x, z);
            for (int step = 0; step < 160; step++)
            {
                Vector2 from = new Vector2(client.Snapshot.X, client.Snapshot.Z);
                if (Vector2.Distance(from, destination) < .05f) return;
                await Pause(250);
                Vector2 next = Vector2.MoveTowards(from, destination, 1.2f);
                await client.Move(client.Snapshot.Realm, next.x, next.y, Mathf.Atan2(next.x - from.x, next.y - from.y) * Mathf.Rad2Deg);
                report.moveRequests++;
                Require(client.Snapshot.Accepted && Mathf.Abs(client.Snapshot.X - next.x) < .05f && Mathf.Abs(client.Snapshot.Z - next.y) < .05f,
                    "A legal 4.8-units/second step was rejected: " + client.Snapshot.Message);
            }
            throw new TimeoutException("Walking did not reach the destination.");
        }

        private static async Task Until(Func<bool> condition, string operation)
        {
            double deadline = timer.Elapsed.TotalSeconds + 20;
            while (!condition())
            {
                Require(timer.Elapsed.TotalSeconds < deadline, "Timed out waiting for " + operation + ".");
                await Pause(25);
            }
        }

        private static async Task Pause(int milliseconds)
        {
            await Task.Delay(milliseconds, cancellation.Token);
            if (!Running) throw new OperationCanceledException();
            if (!string.IsNullOrEmpty(networkError)) throw new InvalidOperationException(networkError);
        }

        private static bool SamePosition(NativeWorldSnapshot first, NativeWorldSnapshot second) => first.Realm == second.Realm
            && first.Submap == second.Submap && Mathf.Abs(first.X - second.X) < .05f && Mathf.Abs(first.Z - second.Z) < .05f;
        private static void Stage(string value) { stage = value; Debug.Log("Native submap validation: " + value); }
        private static void Require(bool condition, string description) { if (!condition) throw new InvalidOperationException(description); }
        private static void Check(bool condition, string description) { Require(condition, description); report.checks.Add(description); }
        private static bool PreferencesUnchanged() => preferences == null || preferences.All(pair => pair.Value == null
            ? !PlayerPrefs.HasKey(pair.Key) : PlayerPrefs.HasKey(pair.Key) && PlayerPrefs.GetString(pair.Key) == pair.Value);

        private static void Capture(string label)
        {
            var value = client.Snapshot;
            report.snapshots.Add(new Evidence { label = label, name = value.SubmapName, realm = value.Realm, submap = value.Submap,
                memoryMask = value.MemoryMask, treasureMask = value.TreasureMask, localMemory = value.SubmapMemoryMask,
                localKills = value.SubmapKills, localBoss = value.SubmapBossDefeated, localChest = value.SubmapTreasureCollected,
                unlocked = value.UnlockedSubmapMask, gold = client.Currency.Gold, enemies = value.Enemies.Count,
                players = value.Players.Count, x = value.X, z = value.Z });
        }

        private static void Fail(string message)
        {
            if (!Running) return;
            if (report == null) report = new Report { editorVersion = Application.unityVersion, timestampUtc = DateTime.UtcNow.ToString("O") };
            report.errors.Add(Sanitize(stage + ": " + message));
            Finish();
        }

        private static void Finish()
        {
            SessionState.SetBool(Prefix + "Running", false);
            cancellation?.Cancel();
            client?.Dispose();
            session?.Disconnect();
            if (!PreferencesUnchanged())
            {
                report.errors.Add("Persistent preferences changed and were restored.");
                foreach (var pair in preferences)
                    if (pair.Value == null) PlayerPrefs.DeleteKey(pair.Key); else PlayerPrefs.SetString(pair.Key, pair.Value);
                PlayerPrefs.Save();
            }
            report.stage = stage;
            report.elapsedSeconds = timer?.Elapsed.TotalSeconds ?? 0;
            report.passed = report.errors.Count == 0 && userId > 0 && otherUserId > 0;
            output = output ?? Path.GetFullPath(Argument("-lunhuiSubmapValidationOutput", "Artifacts/NativeSubmapValidation"));
            Directory.CreateDirectory(output);
            File.WriteAllText(Path.Combine(output, "validation.json"), Sanitize(JsonUtility.ToJson(report, true)));
            password = otherPassword = null;
            session = null;
            SessionState.SetInt(Prefix + "ExitCode", report.passed ? 0 : 1);
            SessionState.SetBool(Prefix + "Restore", true);
            Debug.Log("Native submap validation " + (report.passed ? "passed: " : "failed: ") + output);
            if (EditorApplication.isPlaying) EditorApplication.ExitPlaymode(); else RestoreScenes();
        }

        private static void RestoreScenes()
        {
            SessionState.SetBool(Prefix + "Restore", false);
            var saved = JsonUtility.FromJson<SavedScenes>(SessionState.GetString(Prefix + "Scenes", "{}"));
            var scenes = saved?.scenes?.Where(value => !string.IsNullOrEmpty(value.path))
                .Select(value => new SceneSetup { path = value.path, isLoaded = value.loaded, isActive = value.active }).ToArray();
            if (scenes != null && scenes.Length > 0) EditorSceneManager.RestoreSceneManagerSetup(scenes);
            SessionState.EraseString(Prefix + "Scenes");
            if (SessionState.GetBool(Prefix + "Quit", false)) EditorApplication.Exit(SessionState.GetInt(Prefix + "ExitCode", 1));
        }

        private static string Sanitize(string value)
        {
            string result = value ?? "";
            if (!string.IsNullOrEmpty(password)) result = result.Replace(password, "[redacted]");
            if (!string.IsNullOrEmpty(otherPassword)) result = result.Replace(otherPassword, "[redacted]");
            return result;
        }

        private static string Argument(string name, string fallback)
        {
            string[] arguments = Environment.GetCommandLineArgs();
            int index = Array.IndexOf(arguments, name);
            return index >= 0 && index + 1 < arguments.Length ? arguments[index + 1] : fallback;
        }
    }
}
