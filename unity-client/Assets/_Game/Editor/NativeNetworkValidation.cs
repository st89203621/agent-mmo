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
    public static class NativeNetworkValidation
    {
        private const string Prefix = "Lunhui.NativeNetworkValidation.";
        private const string DefaultEndpoint = "ws://127.0.0.1:10100/websocket";
        private static readonly string[] PreferenceKeys = { "Lunhui.NativePrototype.v1.new",
            "Lunhui.NativePrototype.v1.demo", "Lunhui.Network.Endpoint", "Lunhui.Network.Username" };
        private static IoGameNetworkSession session;
        private static NativeGameClient client;
        private static ValidationReport report;
        private static GameProfileSnapshot profile;
        private static Stopwatch timer;
        private static CancellationTokenSource cancellation;
        private static Dictionary<string, string> preferences;
        private static string endpoint, output, username, password, secondPassword, stage, networkError;
        private static long userId;
        private static bool Running => SessionState.GetBool(Prefix + "Running", false);

        [Serializable]
        public sealed class ValidationReport
        {
            public string editorVersion, timestampUtc, endpoint, testUsername, userId, stage;
            public bool passed;
            public double elapsedSeconds;
            public int finalGold, finalLevel, moveRequests, heartbeatReplies, livenessReplies;
            public List<string> checks = new List<string>();
            public List<string> errors = new List<string>();
            public List<string> expectedErrors = new List<string>();
            public List<string> stateTransitions = new List<string>();
        }

        [Serializable]
        private sealed class SavedScenes { public SavedScene[] scenes; }
        [Serializable]
        private sealed class SavedScene { public string path; public bool loaded, active; }
        [Serializable]
        private sealed class Appearance { public int Hair; public float EyeSize; }

        static NativeNetworkValidation()
        {
            EditorApplication.playModeStateChanged += PlayModeChanged;
            EditorApplication.update += Update;
        }

        [MenuItem("Lunhui/Validate Native Gameplay With Live Server")]
        public static void Run() => Start(false);

        // Do not pass -quit: the asynchronous runner restores the scene before exiting.
        public static void RunBatch() => Start(true);

        private static void Start(bool quit)
        {
            if (Running || EditorApplication.isPlayingOrWillChangePlaymode
                || SessionState.GetBool("Lunhui.NetworkValidation.Running", false))
                throw new InvalidOperationException("Stop Play Mode and other validation runs first.");
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            var scenes = new SavedScenes { scenes = EditorSceneManager.GetSceneManagerSetup()
                .Select(value => new SavedScene { path = value.path, loaded = value.isLoaded, active = value.isActive }).ToArray() };
            SessionState.SetString(Prefix + "Scenes", JsonUtility.ToJson(scenes));
            SessionState.SetBool(Prefix + "Quit", quit);
            SessionState.SetBool(Prefix + "Restore", false);
            SessionState.SetBool(Prefix + "Running", true);
            SessionState.SetFloat(Prefix + "Started", (float)EditorApplication.timeSinceStartup);
            report = null;
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            EditorApplication.EnterPlaymode();
        }

        private static void PlayModeChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredEditMode && SessionState.GetBool(Prefix + "Restore", false))
                RestoreScenes();
            else if (Running && state == PlayModeStateChange.EnteredPlayMode) Begin();
            else if (Running && state == PlayModeStateChange.ExitingPlayMode) Fail("Play Mode ended during validation.");
        }

        private static async void Begin()
        {
            try
            {
                timer = Stopwatch.StartNew();
                cancellation = new CancellationTokenSource();
                endpoint = Argument("-lunhuiNetworkEndpoint", DefaultEndpoint);
                output = Path.GetFullPath(Argument("-lunhuiNativeValidationOutput", "Artifacts/NativeNetworkValidation"));
                username = "native_test_" + Guid.NewGuid().ToString("N").Substring(0, 12);
                password = Guid.NewGuid().ToString("N");
                secondPassword = Guid.NewGuid().ToString("N");
                preferences = PreferenceKeys.ToDictionary(key => key, key => PlayerPrefs.HasKey(key) ? PlayerPrefs.GetString(key) : null);
                report = new ValidationReport { editorVersion = Application.unityVersion,
                    timestampUtc = DateTime.UtcNow.ToString("O"), endpoint = endpoint, testUsername = username };
                session = new IoGameNetworkSession();
                session.ProfileReceived += value => profile = value;
                session.ErrorReceived += value => networkError = Sanitize(value);
                session.StateChanged += value => report.stateTransitions.Add(stage + ": " + value);
                await Validate();
                Check(PreferencesUnchanged(), "The integration run preserved local saves and remembered login preferences.");
                report.finalGold = client.Currency.Gold;
                report.finalLevel = client.Person.Level.Level;
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
                if (timer.Elapsed.TotalSeconds > 240) throw new TimeoutException("The live validation exceeded four minutes.");
            }
            catch (Exception exception) { Fail(stage + ": " + exception.Message); }
        }

        private static async Task Validate()
        {
            Stage("Register and initialize");
            await Authenticate(username, password, true);
            userId = profile.UserId;
            report.userId = userId.ToString(CultureInfo.InvariantCulture);
            Check(client.Ready && client.Person.UserId == userId && userId > 0 && client.Person.Level.Level >= 1,
                "Registration and NativeGameClient.Initialize load one authoritative account.");
            Check(client.Snapshot.Accepted && client.Snapshot.Realm == 0 && client.Snapshot.Health > 0
                && client.Snapshot.Landmarks.Count == 5 && client.Mountains.Mountains.Count == 6,
                "World landmarks, health, six mountains and account state load through the SDK.");
            Check(client.Currency.Gold >= 300 && client.Currency.Diamond >= 0
                && client.Bag.ItemMap.Values.All(item => item.Quantity >= 0), "Initial currency and bag quantities are valid.");
            Check(client.Equipment.Any(item => item.Equipped) && client.Equipment.All(item => item.UserId == userId)
                && client.Pets.Count >= 2 && client.Pets.Select(item => item.Id).Distinct().Count() == client.Pets.Count,
                "Starter equipment is owned and equipped; contract pets have distinct server identities.");

            Stage("Customization and potential");
            await client.UpdatePerson(new UpdatePersonMessage { Name = "LiveValidation", Profession = "ATTACK", Gender = "female",
                AppearanceJson = "{\"Hair\":2,\"HairColor\":1,\"SkinColor\":2,\"EyeColor\":3,\"OutfitColor\":4,\"FaceWidth\":0.42,\"JawWidth\":0.38,\"ChinLength\":0.46,\"EyeSize\":0.64,\"EyeSpacing\":0.51,\"NoseSize\":0.43,\"Height\":0.58}" });
            var appearance = JsonUtility.FromJson<Appearance>(client.Person.AppearanceJson);
            Check(client.Person.CustomizationComplete && client.Person.Name == "LiveValidation"
                && client.Person.Profession == "ATTACK" && client.Person.Gender == "female"
                && appearance.Hair == 2 && Mathf.Abs(appearance.EyeSize - .64f) < .001f,
                "Name, profession, gender and face customization are persisted by the server.");
            int points = client.Person.AttributePoints, hp = client.Person.BasicProperty.Hp;
            var allocated = await client.Call<PersonMessage>(ServerRoutes.PersonAction_allotPotential, new AllotPotentialMessage { Hp = 1 });
            Check(allocated.AttributePoints == points - 1 && allocated.BasicProperty.Hp == hp + 20
                && allocated.AllocatedPoints["hp"] == 1, "Allocating one potential point updates the budget and authoritative attributes.");
            await ExpectRejected(() => client.Call<PersonMessage>(ServerRoutes.PersonAction_allotPotential,
                new AllotPotentialMessage { Hp = points + 1 }), "Over-budget potential allocation is rejected.");
            await client.RefreshGrowth();
            Check(client.Person.AttributePoints == points - 1 && client.Person.BasicProperty.Hp == hp + 20,
                "Rejected potential allocation leaves the saved attributes unchanged.");

            Stage("Shop and pet");
            int gold = client.Currency.Gold, materials = Quantity("material_001");
            var purchase = await client.Call<PurchaseResponse>(ServerRoutes.ShopAction_purchaseItem,
                new PurchaseRequest { ItemId = "material_001", Quantity = 1 });
            await client.RefreshGrowth();
            Check(purchase.Success && client.Currency.Gold == gold - 300 && Quantity("material_001") == materials + 1
                && purchase.RemainingGold == client.Currency.Gold, "A shop purchase deducts gold and delivers the material to the real bag.");
            string petId = client.Pets.Last().Id;
            var deployed = await client.Call<PetMessage>(ServerRoutes.PetAction_deployPet, new DeployPetMessage { PetId = petId });
            await client.RefreshGrowth();
            Check(deployed.Id == petId && deployed.Active && client.Pets.Count(item => item.Active) == 1
                && client.Pets.Single(item => item.Active).Id == petId, "Pet deployment updates the unique active server pet.");
            string ownEquip = client.Equipment.First(item => item.Equipped).Id;
            string savedAppearance = client.Person.AppearanceJson;
            int savedGold = client.Currency.Gold;

            Stage("Cross-account equipment ownership");
            await Authenticate("native_owner_" + Guid.NewGuid().ToString("N").Substring(0, 12), secondPassword, true);
            long otherUserId = profile.UserId;
            string foreignEquip = client.Equipment.First(item => item.Equipped).Id;
            Check(otherUserId != userId && foreignEquip != ownEquip, "A second real account has separate starter equipment.");
            await Authenticate(username, password, false);
            Check(profile.UserId == userId && client.Currency.Gold == savedGold && client.Person.AppearanceJson == savedAppearance
                && client.Person.AttributePoints == points - 1 && client.Pets.Single(item => item.Active).Id == petId,
                "Login restores customization, potential, purchased inventory, currency and active pet.");
            await ExpectRejected(() => client.List<EquipMessage>(ServerRoutes.EquipAction_wearEquip, foreignEquip),
                "Equipping another registered account's real equipment is rejected.");
            await client.RefreshGrowth();
            Check(client.Equipment.All(item => item.UserId == userId) && client.Equipment.Any(item => item.Id == ownEquip && item.Equipped),
                "An ownership rejection preserves the original equipment loadout.");

            await ValidateJourney();
            await ValidateMountains();
            await ValidateCombat();

            Stage("Idle connection stability");
            await client.Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeLeave);
            int replies = session.HeartbeatReplies + session.LivenessReplies;
            double idleUntil = timer.Elapsed.TotalSeconds + 45;
            while (timer.Elapsed.TotalSeconds < idleUntil)
            {
                await Pause(100);
                Require(session.Authenticated && session.State == NetworkConnectionState.Connected,
                    "The authenticated session disconnected during the 45-second idle check.");
            }
            Check(session.HeartbeatReplies + session.LivenessReplies > replies,
                "An idle authenticated connection stays online for 45 seconds and receives keepalive responses.");
            report.heartbeatReplies = session.HeartbeatReplies;
            report.livenessReplies = session.LivenessReplies;
            await client.RefreshGrowth();
        }

        private static async Task ValidateJourney()
        {
            Stage("Authoritative exploration and replay protection");
            var guide = client.Snapshot.Landmarks.Single(item => item.Id == "guide");
            await WalkTo(guide.X, guide.Z);
            await client.Interact(guide.Id);
            Check(client.Snapshot.IntroComplete, "The main story begins by reaching and speaking to the guide.");

            var before = client.Snapshot;
            var invalid = await client.Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeMove,
                new NativeMoveRequest { Realm = before.Realm, Sequence = before.LastMoveSequence + 1, X = 31, Z = 110 });
            Check(!invalid.Accepted && PositionEqual(before, invalid), "The server rejects an impossible movement jump.");
            var replay = await client.Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeMove,
                new NativeMoveRequest { Realm = before.Realm, Sequence = before.LastMoveSequence, X = before.X + 1, Z = before.Z });
            Check(replay.Accepted && PositionEqual(before, replay) && replay.LastMoveSequence == before.LastMoveSequence,
                "Replaying an acknowledged move does not move the character again.");
            await client.PollWorld();

            for (int i = 0; i < 3; i++)
            {
                var landmark = client.Snapshot.Landmarks.Single(item => item.Id == "memory-" + i);
                await WalkTo(landmark.X, landmark.Z);
                await client.RefreshGrowth();
                int beforeGold = client.Currency.Gold;
                await client.Interact(landmark.Id);
                await client.RefreshGrowth();
                Check(client.Currency.Gold == beforeGold + 100 && (client.Snapshot.MemoryMask & (1 << i)) != 0,
                    "Memory " + i + " advances the quest and grants exactly 100 gold.");
                var repeated = await client.Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeInteract,
                    new NativeInteractRequest { Realm = 0, TargetId = landmark.Id });
                await client.RefreshGrowth();
                Check(repeated.Accepted && repeated.Rewards.Count == 0 && client.Currency.Gold == beforeGold + 100,
                    "Memory " + i + " cannot be collected twice.");
                if (i == 0)
                {
                    var location = client.Snapshot.Clone();
                    await Authenticate(username, password, false);
                    Check(client.Currency.Gold == beforeGold + 100 && (client.Snapshot.MemoryMask & 1) != 0
                        && PositionEqual(location, client.Snapshot), "Reconnect restores the collected memory, gold and world position.");
                }
            }

            await WalkTo(0, 79);
            await WalkTo(0, 83);
            var chest = client.Snapshot.Landmarks.Single(item => item.Id == "chest");
            await WalkTo(chest.X, chest.Z);
            int coins = client.Currency.Gold, ore = Quantity("material_002"), beans = Quantity("golden_bean");
            int equipmentCount = client.Equipment.Count;
            await client.Interact(chest.Id);
            var chestReward = client.Snapshot.Rewards.Single(item => !string.IsNullOrEmpty(item.EquipmentId));
            Check(chestReward.Items.Any(item => item.ItemTypeId == "golden_bean" && item.Important),
                "The world chest marks golden beans as important loot.");
            await client.RefreshGrowth();
            Check(client.Currency.Gold == coins + 800 && Quantity("material_002") == ore + 20 && Quantity("golden_bean") == beans + 1
                && client.Equipment.Count == equipmentCount + 1 && client.Equipment.Any(item => item.Id == chestReward.EquipmentId)
                && client.Bag.ItemMap.Values.Any(item => item.Id == chestReward.EquipmentId && item.Quantity == 1),
                "The extended village route grants persisted gold, materials, equipment and a golden bean.");
            await client.Interact(chest.Id);
            await client.RefreshGrowth();
            Check(client.Currency.Gold == coins + 800 && client.Equipment.Count == equipmentCount + 1 && Quantity("golden_bean") == beans + 1,
                "Reopening the world chest cannot duplicate equipment or currency.");
            var worn = await client.List<EquipMessage>(ServerRoutes.EquipAction_wearEquip, chestReward.EquipmentId);
            Check(worn.Any(item => item.Id == chestReward.EquipmentId && item.Equipped), "Looted equipment can be worn through the real equipment route.");
            await client.RefreshGrowth();
        }

        private static async Task ValidateMountains()
        {
            Stage("Quiz mountain");
            await client.ActMountain(new NativeMountainRequest { Mountain = 0, Operation = "ENTER" });
            string quizId = client.Mountains.Run.SessionId;
            int progress = client.Mountains.Run.Progress;
            var invalid = await client.Call<NativeMountainState>(ServerRoutes.TreasureMountainAction_nativeAct,
                new NativeMountainRequest { Mountain = 0, Operation = "ACT", SessionId = Guid.NewGuid().ToString("N"), Choice = 0 });
            Check(!invalid.Success, "A mountain action with an unrelated run ID is rejected.");
            await client.RefreshMountains();
            Require(client.Mountains.Run.SessionId == quizId && client.Mountains.Run.Progress == progress,
                "Invalid mountain session changed the active run.");
            for (int answers = 0; answers < 4; answers++)
            {
                var run = client.Mountains.Run;
                int choice = QuizChoice(run);
                await Pause((int)Math.Max(650, run.CooldownMs + 50));
                await client.ActMountain(new NativeMountainRequest { Mountain = 0, Operation = "ACT", SessionId = quizId, Choice = choice });
                Require(client.Mountains.Run.Progress == answers + 1 && !client.Mountains.Run.Failed, "Correct quiz answer did not advance the run.");
            }
            Check(client.Mountains.Run.Completed, "Four correct answers complete the quiz mountain on the server.");
            await ClaimMountain(0, 1200);

            Stage("Maze mountain");
            await client.ActMountain(new NativeMountainRequest { Mountain = 1, Operation = "ENTER" });
            var maze = client.Mountains.Run;
            var path = MazePath(maze);
            Require(path.Count > 0, "The public maze has no path to its exit.");
            foreach (int direction in path)
            {
                await Pause((int)Math.Max(650, client.Mountains.Run.CooldownMs + 50));
                await client.ActMountain(new NativeMountainRequest { Mountain = 1, Operation = "ACT", SessionId = maze.SessionId, Choice = direction });
                Require(!client.Mountains.Run.Failed, "The valid maze route failed.");
            }
            Check(client.Mountains.Run.Completed && client.Mountains.Run.CellX == 3 && client.Mountains.Run.CellY == 3,
                "Following the public maze walls reaches the server's exit cell.");
            await ClaimMountain(1, 1500);
        }

        private static async Task ClaimMountain(int mountain, int reward)
        {
            await client.RefreshGrowth();
            int gold = client.Currency.Gold;
            string id = client.Mountains.Run.SessionId;
            Require(client.Mountains.Run.RewardCoins == reward, "Unexpected mountain reward contract.");
            await client.ActMountain(new NativeMountainRequest { Mountain = mountain, Operation = "CLAIM", SessionId = id });
            Check(client.Mountains.Run.Claimed && client.Currency.Gold == gold + reward,
                "Mountain " + mountain + " awards its published gold amount.");
            await client.ActMountain(new NativeMountainRequest { Mountain = mountain, Operation = "CLAIM", SessionId = id });
            Check(client.Mountains.Run.Claimed && client.Currency.Gold == gold + reward,
                "Mountain " + mountain + " claim replay cannot award gold twice.");
        }

        private static async Task ValidateCombat()
        {
            Stage("Authoritative combat and loot");
            await client.EnterWorld(1);
            Check(client.Snapshot.Enemies.Any(item => item.Boss && item.MaxHealth > 0)
                && client.Snapshot.Enemies.Count(item => !item.Boss && item.MaxHealth > 0) == 4,
                "The combat world supplies boss and normal-enemy HP with distinct identities.");
            string target = "realm-1-enemy-0";
            await WaitForEnemy(target);
            int gold = client.Currency.Gold, ore = Quantity("material_002"), kills = client.Snapshot.RealmKills[1];
            int initialHealth = client.Snapshot.Enemies.Single(item => item.Id == target).Health;
            for (int step = 0; step < 55; step++)
            {
                var enemy = client.Snapshot.Enemies.Single(item => item.Id == target);
                if (Vector2.Distance(new Vector2(client.Snapshot.X, client.Snapshot.Z), new Vector2(enemy.X, enemy.Z)) <= 3.4f) break;
                await WalkStep(enemy.X, enemy.Z);
                Require(step < 54, "Failed to approach the live enemy.");
            }
            await client.Act("attack", target);
            var after = client.Snapshot;
            Check(after.Enemies.Single(item => item.Id == target).Health < initialHealth,
                "An SDK attack reduces the authoritative enemy HP.");
            var replay = await client.Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeAction,
                new NativeCombatRequest { Realm = 1, Sequence = after.LastActionSequence, Action = "attack", TargetId = target });
            Check(replay.Accepted && replay.Enemies.Single(item => item.Id == target).Health == after.Enemies.Single(item => item.Id == target).Health
                && replay.Rewards.Count == 0, "Replaying an attack sequence causes no additional damage or loot.");
            await client.PollWorld();
            for (int attack = 0; client.Snapshot.Enemies.Single(item => item.Id == target).Health > 0 && attack < 6; attack++)
            {
                await Pause(600);
                await client.Act("attack", target);
            }
            Check(client.Snapshot.Enemies.Single(item => item.Id == target).Health == 0 && client.Snapshot.RealmKills[1] == kills + 1,
                "Defeating an ordinary enemy updates its death state and main-story kill count.");
            await client.RefreshGrowth();
            Check(client.Currency.Gold == gold + 60 && Quantity("material_002") == ore + 2,
                "An enemy kill grants persisted gold and ore through the authoritative reward system.");
            int finalGold = client.Currency.Gold;
            int finalMemory = client.Snapshot.MemoryMask, finalTreasure = client.Snapshot.TreasureMask;
            await client.Call<NativeWorldSnapshot>(ServerRoutes.NativeAdventureAction_nativeLeave);
            await Authenticate(username, password, false);
            Check(client.Currency.Gold == finalGold && client.Snapshot.MemoryMask == finalMemory
                && client.Snapshot.TreasureMask == finalTreasure && client.Snapshot.RealmKills[1] == kills + 1
                && client.Mountains.Run.Claimed && client.Mountains.Run.Mountain == 1,
                "Reconnect preserves world progress, combat loot and the claimed mountain run.");
        }

        private static async Task WaitForEnemy(string id)
        {
            double until = timer.Elapsed.TotalSeconds + 35;
            while (client.Snapshot.Enemies.Single(item => item.Id == id).Health <= 0)
            {
                Require(timer.Elapsed.TotalSeconds < until, "The shared enemy did not respawn in time.");
                await Pause(500);
                await client.PollWorld();
            }
        }

        private static async Task WalkTo(float x, float z)
        {
            for (int step = 0; step < 200; step++)
            {
                if (Vector2.Distance(new Vector2(client.Snapshot.X, client.Snapshot.Z), new Vector2(x, z)) < .05f) return;
                await WalkStep(x, z);
            }
            throw new TimeoutException("The walking route did not reach its destination.");
        }

        private static async Task WalkStep(float x, float z)
        {
            await Pause(250);
            Vector2 from = new Vector2(client.Snapshot.X, client.Snapshot.Z);
            Vector2 destination = new Vector2(x, z);
            Vector2 next = Vector2.MoveTowards(from, destination, 1);
            float yaw = Mathf.Atan2(next.x - from.x, next.y - from.y) * Mathf.Rad2Deg;
            await client.Move(client.Snapshot.Realm, next.x, next.y, yaw);
            report.moveRequests++;
            Require(client.Snapshot.Accepted && Mathf.Abs(client.Snapshot.X - next.x) < .05f && Mathf.Abs(client.Snapshot.Z - next.y) < .05f,
                "A legal walking step was rejected: " + client.Snapshot.Message);
        }

        private static int QuizChoice(NativeMountainRun run)
        {
            // Known public trivia answers; the server does not reveal a correct-answer field.
            var answers = new Dictionary<string, string>
            {
                { "月亮本身会发光吗？", "不会，月光来自反射太阳光" },
                { "枫叶在秋天变红，主要与哪种色素有关？", "花青素" },
                { "海水涨潮和退潮主要受到什么影响？", "月球和太阳的引力" },
                { "指南针的指针依靠什么辨别方向？", "地磁场" },
                { "樱花开放后通常结出什么？", "果实" },
                { "中国古代四大发明不包括哪一项？", "望远镜" },
                { "北斗七星位于哪个星座？", "大熊座" },
                { "一刻钟相当于多少分钟？", "十五分钟" }
            };
            Require(answers.TryGetValue(run.Prompt, out string answer), "Unknown public quiz question: " + run.Prompt);
            int index = run.Options.IndexOf(answer);
            Require(index >= 0, "The quiz answer was absent from its options.");
            return index;
        }

        private static List<int> MazePath(NativeMountainRun run)
        {
            Require(run.MazeWalls.Count == 16, "The maze must expose sixteen wall cells.");
            int start = run.CellY * 4 + run.CellX;
            var previous = Enumerable.Repeat(-1, 16).ToArray();
            var directions = new int[16];
            var queue = new Queue<int>();
            int[] dx = { 0, 1, 0, -1 }, dy = { -1, 0, 1, 0 };
            previous[start] = start;
            queue.Enqueue(start);
            while (queue.Count > 0)
            {
                int cell = queue.Dequeue();
                for (int direction = 0; direction < 4; direction++)
                {
                    int x = cell % 4 + dx[direction], y = cell / 4 + dy[direction];
                    if ((run.MazeWalls[cell] & (1 << direction)) != 0 || x < 0 || x >= 4 || y < 0 || y >= 4) continue;
                    int next = y * 4 + x;
                    if (previous[next] >= 0) continue;
                    previous[next] = cell;
                    directions[next] = direction;
                    queue.Enqueue(next);
                }
            }
            Require(previous[15] >= 0, "The maze exit is unreachable through the supplied walls.");
            var path = new List<int>();
            for (int cell = 15; cell != start; cell = previous[cell]) path.Add(directions[cell]);
            path.Reverse();
            return path;
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
            await Until(() => profile != null && session.Authenticated, register ? "account registration" : "account login");
            client = new NativeGameClient(session);
            await client.Initialize();
        }

        private static async Task Until(Func<bool> predicate, string operation)
        {
            double deadline = timer.Elapsed.TotalSeconds + 25;
            while (!predicate())
            {
                Require(timer.Elapsed.TotalSeconds < deadline, "Timed out waiting for " + operation + ".");
                await Pause(25);
            }
        }

        private static async Task ExpectRejected(Func<Task> action, string description)
        {
            bool rejected = false;
            try { await action(); }
            catch (Exception exception)
            {
                rejected = true;
                report.expectedErrors.Add(Sanitize(description + " " + exception.Message));
            }
            Check(rejected && session.Authenticated && session.State == NetworkConnectionState.Connected, description);
        }

        private static async Task Pause(int milliseconds)
        {
            await Task.Delay(milliseconds, cancellation.Token);
            if (!Running) throw new OperationCanceledException();
            if (!string.IsNullOrEmpty(networkError)) throw new InvalidOperationException(networkError);
        }

        private static int Quantity(string type) => client.Bag.ItemMap.Values.Where(item => item.ItemTypeId == type || item.Id == type).Sum(item => item.Quantity);
        private static bool PositionEqual(NativeWorldSnapshot first, NativeWorldSnapshot second) => first.Realm == second.Realm
            && Mathf.Abs(first.X - second.X) < .05f && Mathf.Abs(first.Z - second.Z) < .05f;
        private static void Stage(string value) { stage = value; Debug.Log("Native live validation: " + stage); }
        private static void Require(bool condition, string description) { if (!condition) throw new InvalidOperationException(description); }
        private static void Check(bool condition, string description) { Require(condition, description); report.checks.Add(description); }
        private static bool PreferencesUnchanged() => preferences == null || preferences.All(pair => pair.Value == null
            ? !PlayerPrefs.HasKey(pair.Key) : PlayerPrefs.HasKey(pair.Key) && PlayerPrefs.GetString(pair.Key) == pair.Value);

        private static void Fail(string message)
        {
            if (!Running) return;
            if (report == null) report = new ValidationReport { editorVersion = Application.unityVersion, timestampUtc = DateTime.UtcNow.ToString("O") };
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
                report.errors.Add("Local preferences changed during validation and were restored.");
                foreach (var pair in preferences)
                    if (pair.Value == null) PlayerPrefs.DeleteKey(pair.Key); else PlayerPrefs.SetString(pair.Key, pair.Value);
                PlayerPrefs.Save();
            }
            report.stage = stage;
            report.elapsedSeconds = timer?.Elapsed.TotalSeconds ?? 0;
            report.passed = report.errors.Count == 0 && userId > 0;
            output = output ?? Path.GetFullPath(Argument("-lunhuiNativeValidationOutput", "Artifacts/NativeNetworkValidation"));
            Directory.CreateDirectory(output);
            File.WriteAllText(Path.Combine(output, "validation.json"), Sanitize(JsonUtility.ToJson(report, true)));
            password = secondPassword = null;
            session = null;
            Debug.Log("Native live validation " + (report.passed ? "passed: " : "failed: ") + output);
            SessionState.SetInt(Prefix + "ExitCode", report.passed ? 0 : 1);
            SessionState.SetBool(Prefix + "Restore", true);
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
            if (!string.IsNullOrEmpty(secondPassword)) result = result.Replace(secondPassword, "[redacted]");
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
