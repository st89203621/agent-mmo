using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace Lunhui.Prototype
{
    [InitializeOnLoad]
    public static class NativeUiValidation
    {
        private const string Prefix = "Lunhui.NativeUiValidation.";
        private const string Endpoint = "ws://127.0.0.1:10100/websocket";
        private const string CharacterName = "花溪听雨";
        private static readonly bool FullQuestOnly = Array.IndexOf(Environment.GetCommandLineArgs(), "-lunhuiFullQuestOnly") >= 0;
        private static readonly double DeadlineSeconds = FullQuestOnly ? 200 : 120;
        private static readonly BindingFlags PrivateInstance = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
        private static readonly Vector2Int[] Sizes = { new Vector2Int(1280, 720), new Vector2Int(1920, 1080) };
        private static readonly string[] PreferenceKeys = { "Lunhui.Network.Endpoint", "Lunhui.Network.Username", "Lunhui.NativePrototype.v1.new", "Lunhui.NativePrototype.v1.demo" };
        private static readonly Dictionary<string, string> Preferences = new Dictionary<string, string>();
        private static Report report;
        private static PrototypeApp app;
        private static EditorWindow gameView;
        private static CancellationTokenSource cancellation;
        private static string outputDirectory, username, password;
        private static double startedAt;
        private static bool monitorCombat, observedMove, observedKill, observedPostKillPose;
        private static int initialKills;
        private static Vector3 movementStart;
        private static Quaternion footPose;
        private static Transform foot;
        private static double footSampleAt;
        private static bool monitorPreview;
        private static Vector2 previewPosition;
        private static int previewRealm, previewSubmap;
        private static float maximumPreviewDrift;

        [Serializable]
        public sealed class Report
        {
            public string timestampUtc, editorVersion, stage;
            public bool passed;
            public double elapsedSeconds;
            public List<string> checks = new List<string>();
            public List<string> errors = new List<string>();
            public List<Capture> captures = new List<Capture>();
        }

        [Serializable]
        public sealed class Capture
        {
            public string page, image;
            public int width, height, distinctColors, portraitColors, textsChecked;
            public bool passed;
        }

        [Serializable]
        private sealed class SavedScenes { public SavedScene[] scenes; }

        [Serializable]
        private sealed class SavedScene { public string path; public bool active, loaded; }

        static NativeUiValidation()
        {
            EditorApplication.playModeStateChanged += PlayModeChanged;
            EditorApplication.update += Update;
            Application.logMessageReceived += OnLog;
        }

        [MenuItem("Lunhui/Validate Native Online UI")]
        public static void Run() => Start(false);

        // Omit -quit and -nographics: this runner renders the Game View and exits after cleanup.
        public static void RunBatch() => Start(true);

        private static void Start(bool quit)
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode || SessionState.GetBool(Prefix + "Running", false))
                throw new InvalidOperationException("Native UI validation requires Edit Mode.");
            for (int i = 0; i < SceneManager.sceneCount; i++)
                if (SceneManager.GetSceneAt(i).isDirty)
                    throw new InvalidOperationException("Save modified scenes before running Native UI validation.");
            if (!File.Exists(PrototypeSetup.BootScenePath))
                throw new FileNotFoundException("The prototype Boot scene is missing.", PrototypeSetup.BootScenePath);
            SessionState.SetString(Prefix + "Scenes", JsonUtility.ToJson(new SavedScenes
            {
                scenes = EditorSceneManager.GetSceneManagerSetup().Select(scene => new SavedScene
                { path = scene.path, active = scene.isActive, loaded = scene.isLoaded }).ToArray()
            }));
            SessionState.SetBool(Prefix + "Quit", quit);
            SessionState.SetBool(Prefix + "Running", true);
            SessionState.SetBool(Prefix + "Restoring", false);
            SessionState.SetInt(Prefix + "PreviousSize", -1);
            SessionState.SetString(Prefix + "Errors", "");
            EditorSceneManager.OpenScene(PrototypeSetup.BootScenePath, OpenSceneMode.Single);
            EditorApplication.EnterPlaymode();
        }

        private static void PlayModeChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredEditMode && SessionState.GetBool(Prefix + "Restoring", false))
            {
                RestoreEditor();
                return;
            }
            if (!SessionState.GetBool(Prefix + "Running", false)) return;
            if (state == PlayModeStateChange.EnteredPlayMode) Begin();
            else if (state == PlayModeStateChange.ExitingPlayMode) Finish("Play Mode ended before online UI validation completed.");
        }

        private static async void Begin()
        {
            outputDirectory = ResolveOutputDirectory();
            Directory.CreateDirectory(outputDirectory);
            SessionState.SetString(Prefix + "Output", outputDirectory);
            report = new Report { timestampUtc = DateTime.UtcNow.ToString("O"), editorVersion = Application.unityVersion, stage = "Startup" };
            string startupErrors = SessionState.GetString(Prefix + "Errors", "");
            if (!string.IsNullOrEmpty(startupErrors)) report.errors.Add(startupErrors);
            cancellation = new CancellationTokenSource();
            startedAt = EditorApplication.timeSinceStartup;
            Preferences.Clear();
            foreach (string key in PreferenceKeys) Preferences[key] = PlayerPrefs.HasKey(key) ? PlayerPrefs.GetString(key) : null;
            try
            {
                await Wait(() => (app = UnityEngine.Object.FindObjectOfType<PrototypeApp>()) != null, 15, "PrototypeApp startup");
                app.SuppressPersistence = true;
                await (FullQuestOnly ? ValidateFullQuest() : Validate());
                Finish(null);
            }
            catch (OperationCanceledException) { }
            catch (Exception exception) { Finish(exception.GetType().Name + ": " + exception.Message); }
        }

        private static async Task Validate()
        {
            app.ShowPage("login");
            app.OpenOnlineLogin();
            Input("GameEndpoint").text = Endpoint;
            Input("AccountUsername").text = "";
            Input("AccountPassword").text = "";
            await CaptureBoth("live-login");

            username = "nativeui_" + Guid.NewGuid().ToString("N").Substring(0, 14);
            password = Guid.NewGuid().ToString("N") + "Q7!";
            Input("AccountUsername").text = username;
            Input("AccountPassword").text = password;
            Click("RegisterAccount");
            await Wait(() => app.Native != null && app.Native.Ready && app.CurrentPage == "character", 25, "UI registration and account initialization");
            Check(app.OnlineMode && !app.Native.Person.CustomizationComplete, "UI signup loads a real uncustomized server character.");
            Click("FemaleAppearance");
            Input("Nickname").text = CharacterName;
            await CaptureBoth("character-creation");
            Click("CreateCharacter");
            await Wait(() => app.CurrentPage == "home" && app.Native.Person.CustomizationComplete && UiOperationIdle(), 12, "Chinese character creation");
            Check(app.Native.Person.Name == CharacterName && app.Native.Person.Gender == "female", "Chinese nickname and female appearance are stored by the server.");

            Click("OpenPlayerProfile");
            await CaptureBoth("role-profile");
            int points = app.Native.Person.AttributePoints;
            int hp = app.Native.Person.BasicProperty.Hp;
            Click("Potential0");
            await Wait(() => app.Native.Person.AttributePoints == points - 1 && Find<Button>("Potential0") != null && UiOperationIdle(), 10, "Potential allocation");
            await app.Native.RefreshGrowth();
            Check(app.Native.Person.AttributePoints == points - 1 && app.Native.Person.BasicProperty.Hp == hp + 20,
                "Allocating one potential point through the plus button persists exactly one point and 20 HP.");
            Click("CloseNativeProfile");
            Click("Inventory");
            await CaptureBoth("inventory");
            app.ShowPage("equipment");
            await CaptureBoth("equipment");
            app.ShowPage("pets");
            await CaptureBoth("pets");
            var pets = app.Native.Pets.OrderByDescending(p => p.Active).ThenBy(p => p.Id).ToList();
            int petIndex = pets.FindIndex(p => !p.Active);
            Check(petIndex >= 0 && petIndex < 4, "The account has an alternate pet available in the UI.");
            string petId = pets[petIndex].Id;
            Click("PetRow" + petIndex);
            Click("DeployNativePet");
            await Wait(() => app.Native.Pets.Any(p => p.Id == petId && p.Active) && UiOperationIdle(), 10, "Pet deployment");
            await app.Native.RefreshGrowth();
            Check(app.Native.Pets.Count(p => p.Active) == 1 && app.Native.Pets.Any(p => p.Id == petId && p.Active),
                "Changing the deployed pet through its button persists after a server refresh.");

            app.ShowPage("guild");
            await CaptureBoth("guild");
            app.ShowPage("mountains");
            Check(app.Native.Mountains.Mountains.Count == 6, "The six mountain entries are received from ioGame.");
            await CaptureBoth("six-mountains");
            Click("NativeMountain0");
            Click("EnterNativeMountain");
            await Wait(() => ActiveMountain(0) && Find<Button>("MountainChoice0") != null, 10, "Quiz entry");
            await CaptureBoth("quiz-active");
            Check(app.Native.Mountains.Run.Options.Count > 0, "The quiz displays server-provided answer choices.");
            Click("LeaveNativeMountain");
            await Wait(() => Find<Button>("NativeMountain1") != null, 10, "Quiz exit");
            Click("NativeMountain1");
            Click("EnterNativeMountain");
            await Wait(() => ActiveMountain(1) && Find<RectTransform>("MazeCell0") != null, 10, "Maze entry");
            await CaptureBoth("maze-active");
            int oldX = app.Native.Mountains.Run.CellX, oldY = app.Native.Mountains.Run.CellY;
            await Wait(() => Enumerable.Range(0, 4).Any(i => Find<Button>("MountainChoice" + i)?.interactable == true), 3, "Maze direction cooldown");
            int direction = Enumerable.Range(0, 4).First(i => Find<Button>("MountainChoice" + i)?.interactable == true);
            Click("MountainChoice" + direction);
            await Wait(() => (app.Native.Mountains.Run.CellX != oldX || app.Native.Mountains.Run.CellY != oldY) && UiOperationIdle(), 6, "Maze step");
            Check(app.Native.Mountains.Run.MazeWalls.Count == 16, "A valid maze direction moves the authoritative player cell in the 4 x 4 maze.");
            await Pause(150);
            Click("LeaveNativeMountain");
            await Wait(() => Find<Button>("NativeMountain0") != null, 8, "Maze exit");

            app.EnterRealm(1);
            await Wait(() => app.CurrentPage == "home" && app.Native.Snapshot.Realm == 1, 12, "Online battlefield entry");
            initialKills = app.Native.Snapshot.RealmKills[1];
            movementStart = app.World.HeroGroundPosition;
            observedMove = observedKill = observedPostKillPose = false;
            foot = null; footSampleAt = 0; monitorCombat = true;
            Click("Quest");
            await Wait(() => observedMove, 8, "Automatic quest locomotion");
            await CaptureBoth("automatic-quest");
            await Wait(() => app.Combat.Enemies.Any(e => e.Alive && Vector3.Distance(e.Root.position, app.World.HeroGroundPosition) < 9), 12, "Visible enemy approach");
            if (app.Combat.IsAutoQuestRunning) Click("AutoQuest");
            Check(app.Combat.Enemies.All(e => e.HealthBar && e.HealthFill && e.HealthLabel), "Both ordinary enemies and bosses have health bar, fill, and numeric label components.");
            Check(app.Combat.Enemies.Any(e => e.Boss) && app.Native.Snapshot.Enemies.Any(e => e.Boss), "The battlefield contains a server-authoritative boss and ordinary enemies.");
            await CaptureBoth("online-battlefield-hp");
            Click("Quest");
            await Wait(() => observedKill, 20, "Server-confirmed monster defeat");
            await Wait(() => observedPostKillPose, 10, "Post-kill walking animation");
            Check(observedMove, "Clicking the quest moves the hero through normal online movement with the Locomotion animator state.");
            Check(observedKill && observedPostKillPose, "After a server-confirmed kill, auto travel resumes with a moving foot bone and the Locomotion state.");
            await CaptureBoth("post-kill-locomotion");
            monitorCombat = false;
            if (app.Combat.IsAutoQuestRunning) Click("AutoQuest");
            await app.Native.RefreshGrowth();
            Check(app.Native.Ready && app.Native.Connected, "The real account remains connected after all page and gameplay interactions.");
        }

        private static async Task ValidateFullQuest()
        {
            // This mode intentionally exercises the UI route and the server's
            // complete chapter state. It does not call Native.Move/Act directly.
            app.ShowPage("login");
            app.OpenOnlineLogin();
            Input("GameEndpoint").text = Endpoint;
            username = "nativeui_full_" + Guid.NewGuid().ToString("N").Substring(0, 11);
            password = Guid.NewGuid().ToString("N") + "Q7!";
            Input("AccountUsername").text = username;
            Input("AccountPassword").text = password;
            Click("RegisterAccount");
            await Wait(() => app.Native != null && app.Native.Ready && app.CurrentPage == "character", 25, "full quest account signup");
            Click("FemaleAppearance");
            Input("Nickname").text = CharacterName;
            Click("CreateCharacter");
            await Wait(() => app.CurrentPage == "home" && app.Native.Person.CustomizationComplete && UiOperationIdle(), 12, "full quest character creation");
            Check(app.Native.Person.Name == CharacterName, "Full quest run created the Chinese named character through the UI.");

            report.stage = "village-autoquest";
            Click("Quest");
            await Wait(() => app.Native.Snapshot != null && app.Native.Snapshot.SubmapTreasureCollected, 65, "village automatic quest completion");
            Check(app.Native.Snapshot.Realm == 0 && app.Native.Snapshot.Submap == 0 && (app.Native.Snapshot.SubmapMemoryMask & 7) == 7 && app.Native.Snapshot.SubmapTreasureCollected,
                "Village auto quest reaches all three memories and its chest through the visible Quest button.");
            await CaptureBoth("village-autocompleted");
            await ValidatePreviewPosition();

            Click("WorldMap");
            await Wait(() => Find<Button>("World0") != null, 5, "world atlas from UI");
            Click("World0");
            await Wait(() => Find<Button>("EnterSubmap1") != null, 5, "village submap atlas");
            Click("EnterSubmap1");
            await Wait(() => app.CurrentPage == "home" && app.World.SubmapIndex == 1 && app.Native.Snapshot.Submap == 1 && !MapEntering(), 15, "submap one UI travel");
            await app.Native.PollWorld();
            Check(app.Combat.Enemies.Count == 5 && app.Native.Snapshot.Enemies.Count == 5,
                "Submap one loads five server enemies for the new battlefield.");
            await CaptureBoth("submap-battlefield");

            int killsBefore = app.Native.Snapshot.SubmapKills;
            initialKills = killsBefore;
            movementStart = app.World.HeroGroundPosition;
            observedMove = observedKill = observedPostKillPose = false;
            foot = null; footSampleAt = 0; monitorCombat = true;
            double submapStarted = EditorApplication.timeSinceStartup;
            report.stage = "submap-one-autoquest";
            Click("Quest");
            await Wait(() => app.Native.Snapshot.SubmapKills > killsBefore && observedMove && observedPostKillPose, 30, "submap one automatic combat and post-kill animation");
            Check(observedMove && observedKill && observedPostKillPose,
                "Quest automation defeats a submap enemy, then resumes Locomotion with an animated foot bone.");
            await Wait(() => app.Native.Snapshot.SubmapTreasureCollected, Math.Max(1, 75 - (EditorApplication.timeSinceStartup - submapStarted)), "submap one full chest route");
            monitorCombat = false;
            Check((app.Native.Snapshot.SubmapMemoryMask & 7) == 7 && app.Native.Snapshot.SubmapKills >= 4 && app.Native.Snapshot.SubmapBossDefeated,
                "Submap one automation clears memories, four mobs and its boss before opening the chest.");
            await CaptureBoth("new-submap-chest-complete");
            await ValidateMemoryAlbum();

            Click("WorldMap");
            await Wait(() => Find<Button>("World0") != null, 5, "world atlas for submap two");
            Click("World0");
            await Wait(() => Find<Button>("EnterSubmap2") != null, 5, "submap two atlas");
            Click("EnterSubmap2");
            await Wait(() => app.CurrentPage == "home" && app.World.SubmapIndex == 2 && app.Native.Snapshot.Submap == 2 && !MapEntering(), 15, "submap two UI travel");
            Check(app.Combat.Enemies.Count == 5 && app.Native.Snapshot.Enemies.Count == 5,
                "Submap two loads its own five-enemy encounter set.");
            Check(app.Native.Snapshot.SubmapMemoryMask == 0 && app.Native.Snapshot.SubmapKills == 0 && !app.Native.Snapshot.SubmapTreasureCollected && !app.Native.Snapshot.SubmapBossDefeated,
                "Submap two starts with independent authoritative memories, kills and chest state.");
            await CaptureBoth("submap-two-independent");
            Check(app.Native.Ready && app.Native.Connected, "The account remains connected after two automated chapters and both UI submap transitions.");
        }

        private static async Task ValidatePreviewPosition()
        {
            if (app.Combat.IsAutoQuestRunning) Click("AutoQuest");
            await Pause(400);
            await app.Native.PollWorld();
            Vector2 start = ServerPosition();
            previewPosition = start; previewRealm = app.Native.Snapshot.Realm; previewSubmap = app.Native.Snapshot.Submap;
            maximumPreviewDrift = 0; monitorPreview = true;
            Click("OpenPlayerProfile");
            await CaptureBoth("role-profile");
            await app.Native.PollWorld();
            Check(PreviewStable(), "Role portrait preview leaves the authoritative world coordinates unchanged.");
            Click("CloseNativeProfile");
            await Pause(400);
            await app.Native.PollWorld();
            Check(PreviewStable() && HeroNear(start), "Closing the role portrait restores the cached world position without a server movement jump.");
            Click("Nav_pets");
            await CaptureBoth("pets");
            await app.Native.PollWorld();
            Check(PreviewStable(), "Pet preview leaves the authoritative world coordinates unchanged.");
            Click("Nav_home");
            await Pause(400);
            await app.Native.PollWorld();
            Check(PreviewStable() && HeroNear(start), "Returning from pets restores the cached hero position without a server movement jump.");
            monitorPreview = false;
        }

        private static async Task ValidateMemoryAlbum()
        {
            if (app.Combat.IsAutoQuestRunning) Click("AutoQuest");
            await Pause(400);
            await app.Native.PollWorld();
            previewPosition = ServerPosition(); previewRealm = app.Native.Snapshot.Realm; previewSubmap = app.Native.Snapshot.Submap;
            maximumPreviewDrift = 0; monitorPreview = true;
            Click("Album");
            Check(Find<Text>("MemoryAlbumCount")?.text == "已珍藏 6 / 51", "The album counts all six persisted memories from both completed maps out of 51.");
            Click("MemoryPageNext");
            Check(Find<Text>("MemoryPageCounter")?.text == "2 / 3" && Find<RectTransform>("MemoryEntry_sea-harbor") != null,
                "Album page controls show the next six maps without overlapping entries from the previous page.");
            Click("MemoryPagePrevious");
            await CaptureBoth("memory-album");
            var previews = Find<RectTransform>("MemoryAlbum").GetComponentsInChildren<RawImage>();
            Check(previews.Length == 6 && previews.All(image => image.texture != null), "The album renders six actual map preview textures.");
            await app.Native.PollWorld();
            Check(PreviewStable(), "Opening and paging through the album does not move the authoritative character.");
            Click("CloseAlbum");
            await Pause(400);
            await app.Native.PollWorld();
            Check(PreviewStable() && HeroNear(previewPosition), "Closing the album restores the character at the same world coordinates.");
            monitorPreview = false;
        }

        private static Vector2 ServerPosition() => new Vector2(app.Native.Snapshot.X, app.Native.Snapshot.Z);
        private static bool PreviewStable() => app.Native.Snapshot.Realm == previewRealm && app.Native.Snapshot.Submap == previewSubmap
            && maximumPreviewDrift < .05f && Vector2.Distance(previewPosition, ServerPosition()) < .05f;
        private static bool HeroNear(Vector2 point) => Vector2.Distance(point, new Vector2(app.World.HeroGroundPosition.x, app.World.HeroGroundPosition.z)) < .05f;
        private static bool MapEntering() => (bool)typeof(PrototypeApp).GetField("enteringMap", PrivateInstance).GetValue(app);

        private static bool ActiveMountain(int index)
        {
            var run = app.Native?.Mountains?.Run;
            return run != null && run.Mountain == index && !run.Completed && !run.Failed;
        }

        private static async Task CaptureBoth(string page)
        {
            report.stage = page;
            foreach (Vector2Int size in Sizes)
            {
                SetGameViewSize(size.x, size.y);
                await Pause(450);
                if (page == "post-kill-locomotion") await Wait(IsLocomotion, 6, "Locomotion screenshot pose");
                Canvas.ForceUpdateCanvases();
                var capture = new Capture { page = page, width = size.x, height = size.y, image = page + "-" + size.x + "x" + size.y + ".png" };
                int errorsBefore = report.errors.Count;
                CheckLayout(capture);
                CheckPortrait(capture);
                string path = Path.Combine(outputDirectory, capture.image);
                if (File.Exists(path)) File.Delete(path);
                gameView.Repaint();
                ScreenCapture.CaptureScreenshot(path);
                await Wait(() => File.Exists(path) && new FileInfo(path).Length > 0, 6, "Screenshot " + page);
                await Pause(100);
                var texture = new Texture2D(2, 2, TextureFormat.RGB24, false);
                try
                {
                    if (!texture.LoadImage(File.ReadAllBytes(path))) throw new InvalidOperationException("Could not decode screenshot " + capture.image);
                    capture.distinctColors = DistinctColors(texture.GetPixels32(), 11);
                    if (texture.width != size.x || texture.height != size.y) report.errors.Add(capture.image + ": wrong screenshot dimensions " + texture.width + "x" + texture.height);
                    if (capture.distinctColors < 80) report.errors.Add(capture.image + ": screenshot appears blank or incomplete.");
                }
                finally { UnityEngine.Object.Destroy(texture); }
                capture.passed = report.errors.Count == errorsBefore;
                report.captures.Add(capture);
            }
        }

        private static void CheckLayout(Capture capture)
        {
            string rootName = capture.page == "memory-album" ? "MemoryAlbum"
                : capture.page == "guild" ? "NativeGuildContent"
                : capture.page.Contains("mountain") || capture.page == "quiz-active" || capture.page == "maze-active" ? "NativeMountainContent"
                : capture.page == "role-profile" || capture.page == "inventory" || capture.page == "equipment" || capture.page == "pets" ? "NativeGrowthContent" : null;
            if (rootName == null) return;
            var root = Find<RectTransform>(rootName);
            if (!root) { report.errors.Add(capture.page + ": missing UI content root."); return; }
            var texts = root.GetComponentsInChildren<Text>().Where(t => t.isActiveAndEnabled && !string.IsNullOrWhiteSpace(t.text) && t.color.a > .1f).ToArray();
            capture.textsChecked = texts.Length;
            Rect screen = new Rect(0, 0, Screen.width, Screen.height);
            for (int i = 0; i < texts.Length; i++)
            {
                var text = texts[i];
                Rect bounds = ScreenRect(text.rectTransform);
                Rect parent = ScreenRect((RectTransform)text.transform.parent);
                if (!Contains(screen, bounds, 2) || !Contains(parent, bounds, 2))
                    report.errors.Add(capture.page + ": text outside its parent or screen: " + Short(text.text));
                if (text.GetComponentInParent<InputField>() != null) continue;
                for (int j = 0; j < i; j++)
                {
                    if (texts[j].GetComponentInParent<InputField>() != null) continue;
                    Rect other = ScreenRect(texts[j].rectTransform);
                    float width = Mathf.Min(bounds.xMax, other.xMax) - Mathf.Max(bounds.xMin, other.xMin);
                    float height = Mathf.Min(bounds.yMax, other.yMax) - Mathf.Max(bounds.yMin, other.yMin);
                    if (width > 3 && height > 3)
                        report.errors.Add(capture.page + ": overlapping text rectangles: " + Short(text.text) + " / " + Short(texts[j].text));
                }
            }
        }

        private static void CheckPortrait(Capture capture)
        {
            string name = capture.page == "role-profile" ? "NativeCharacterPortrait" : capture.page == "pets" ? "PetModelPreview" : null;
            if (name == null) return;
            var image = Find<RawImage>(name);
            if (!image || !(image.texture is RenderTexture target)) { report.errors.Add(capture.page + ": missing portrait render texture."); return; }
            RenderTexture previous = RenderTexture.active;
            var texture = new Texture2D(target.width, target.height, TextureFormat.RGB24, false);
            try
            {
                RenderTexture.active = target;
                texture.ReadPixels(new Rect(0, 0, target.width, target.height), 0, 0);
                texture.Apply();
                capture.portraitColors = DistinctColors(texture.GetPixels32(), 3);
                if (capture.portraitColors < 24) report.errors.Add(capture.page + ": portrait is blank or has too little visible detail.");
            }
            finally { RenderTexture.active = previous; UnityEngine.Object.Destroy(texture); }
        }

        private static int DistinctColors(Color32[] pixels, int stride)
        {
            var colors = new HashSet<int>();
            for (int i = 0; i < pixels.Length; i += stride)
            {
                var c = pixels[i];
                colors.Add((c.r >> 3) << 10 | (c.g >> 3) << 5 | c.b >> 3);
            }
            return colors.Count;
        }

        private static Rect ScreenRect(RectTransform transform)
        {
            var corners = new Vector3[4]; transform.GetWorldCorners(corners);
            Vector2 a = RectTransformUtility.WorldToScreenPoint(null, corners[0]);
            Vector2 b = RectTransformUtility.WorldToScreenPoint(null, corners[2]);
            return Rect.MinMaxRect(a.x, a.y, b.x, b.y);
        }

        private static bool Contains(Rect parent, Rect child, float tolerance) => child.xMin >= parent.xMin - tolerance && child.yMin >= parent.yMin - tolerance && child.xMax <= parent.xMax + tolerance && child.yMax <= parent.yMax + tolerance;
        private static string Short(string text) => text.Replace("\n", " ").Substring(0, Math.Min(28, text.Length));
        private static T Find<T>(string name) where T : Component => UnityEngine.Object.FindObjectsOfType<T>().FirstOrDefault(c => c.name == name && c.gameObject.activeInHierarchy);
        private static InputField Input(string name) => Find<InputField>(name) ?? throw new InvalidOperationException("Missing input " + name);
        private static bool UiOperationIdle() => !(bool)typeof(PrototypeApp).GetField("onlineOperationBusy", PrivateInstance).GetValue(app);

        private static void Click(string name)
        {
            Button button = Find<Button>(name);
            if (!button || !button.IsInteractable()) throw new InvalidOperationException("Missing or disabled button " + name);
            button.onClick.Invoke();
        }

        private static void Check(bool value, string message)
        {
            if (!value) throw new InvalidOperationException(message);
            report.checks.Add(message);
        }

        private static async Task Wait(Func<bool> condition, double seconds, string description)
        {
            double until = EditorApplication.timeSinceStartup + seconds;
            while (!condition())
            {
                if (EditorApplication.timeSinceStartup > until) throw new TimeoutException(description);
                await Pause(80);
            }
            cancellation.Token.ThrowIfCancellationRequested();
        }

        private static Task Pause(int milliseconds) => Task.Delay(milliseconds, cancellation.Token);

        private static bool IsLocomotion()
        {
            if (!app || !app.World.HeroTransform) return false;
            var animator = app.World.HeroTransform.GetComponentInChildren<Animator>();
            return animator && animator.GetFloat("MoveSpeed") > .1f && animator.GetCurrentAnimatorStateInfo(0).IsName("Locomotion");
        }

        private static void Update()
        {
            if (!SessionState.GetBool(Prefix + "Running", false) || report == null) return;
            if (EditorApplication.timeSinceStartup - startedAt > DeadlineSeconds) { Finish("Online UI validation exceeded its " + DeadlineSeconds + "-second limit at " + report.stage); return; }
            if (monitorPreview && app && app.Native?.Snapshot != null)
                maximumPreviewDrift = app.Native.Snapshot.Realm != previewRealm || app.Native.Snapshot.Submap != previewSubmap
                    ? float.PositiveInfinity : Mathf.Max(maximumPreviewDrift, Vector2.Distance(previewPosition, ServerPosition()));
            if (!monitorCombat || !app || app.Native?.Snapshot == null) return;
            if (IsLocomotion() && Vector3.Distance(movementStart, app.World.HeroGroundPosition) > 1) observedMove = true;
            if ((FullQuestOnly ? app.Native.Snapshot.SubmapKills : app.Native.Snapshot.RealmKills[1]) > initialKills) observedKill = true;
            if (!observedKill || observedPostKillPose || !IsLocomotion()) return;
            var animator = app.World.HeroTransform.GetComponentInChildren<Animator>();
            if (!animator.isHuman) return;
            if (!foot) foot = animator.GetBoneTransform(HumanBodyBones.LeftFoot);
            if (!foot) return;
            if (footSampleAt == 0) { footSampleAt = EditorApplication.timeSinceStartup; footPose = foot.localRotation; }
            else if (EditorApplication.timeSinceStartup - footSampleAt >= .12)
            {
                observedPostKillPose = Quaternion.Angle(footPose, foot.localRotation) > .2f;
                if (!observedPostKillPose) footSampleAt = 0;
            }
        }

        private static void SetGameViewSize(int width, int height)
        {
            var assembly = typeof(EditorWindow).Assembly;
            Type gameViewType = assembly.GetType("UnityEditor.GameView", true);
            if (!gameView) gameView = EditorWindow.GetWindow(gameViewType);
            PropertyInfo selected = gameViewType.GetProperty("selectedSizeIndex", PrivateInstance);
            if (SessionState.GetInt(Prefix + "PreviousSize", -1) < 0) SessionState.SetInt(Prefix + "PreviousSize", (int)selected.GetValue(gameView));
            Type sizesType = assembly.GetType("UnityEditor.GameViewSizes", true);
            object sizes = typeof(ScriptableSingleton<>).MakeGenericType(sizesType).GetProperty("instance", BindingFlags.Public | BindingFlags.Static).GetValue(null);
            object groupType = sizesType.GetProperty("currentGroupType", PrivateInstance).GetValue(sizes);
            object group = sizesType.GetMethod("GetGroup", PrivateInstance).Invoke(sizes, new[] { groupType });
            Type groupClass = group.GetType();
            int count = (int)groupClass.GetMethod("GetTotalCount", PrivateInstance).Invoke(group, null), match = -1;
            for (int i = 0; i < count; i++)
            {
                object candidate = groupClass.GetMethod("GetGameViewSize", PrivateInstance).Invoke(group, new object[] { i });
                Type type = candidate.GetType();
                if ((int)type.GetProperty("width", PrivateInstance).GetValue(candidate) == width && (int)type.GetProperty("height", PrivateInstance).GetValue(candidate) == height) { match = i; break; }
            }
            if (match < 0)
            {
                Type modeType = assembly.GetType("UnityEditor.GameViewSizeType", true), sizeType = assembly.GetType("UnityEditor.GameViewSize", true);
                object size = Activator.CreateInstance(sizeType, PrivateInstance, null, new[] { Enum.Parse(modeType, "FixedResolution"), (object)width, height, "Lunhui " + width + "x" + height }, null);
                groupClass.GetMethod("AddCustomSize", PrivateInstance).Invoke(group, new[] { size });
                match = count;
            }
            selected.SetValue(gameView, match);
            gameView.Focus(); gameView.Repaint();
        }

        private static string ResolveOutputDirectory()
        {
            string[] args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++) if (args[i] == "-lunhuiNativeUiOutput") return Path.GetFullPath(args[i + 1]);
            return Path.GetFullPath("Artifacts/NativeUI/" + DateTime.Now.ToString("yyyyMMdd-HHmmss"));
        }

        private static string Redact(string message)
        {
            if (!string.IsNullOrEmpty(username)) message = message.Replace(username, "[test account]");
            if (!string.IsNullOrEmpty(password)) message = message.Replace(password, "[redacted]");
            return message;
        }

        private static void OnLog(string message, string stackTrace, LogType type)
        {
            if (!SessionState.GetBool(Prefix + "Running", false) || type != LogType.Error && type != LogType.Exception && type != LogType.Assert) return;
            string error = Redact(type + ": " + message);
            if (report != null) report.errors.Add(error);
            else SessionState.SetString(Prefix + "Errors", SessionState.GetString(Prefix + "Errors", "") + error + "\n");
        }

        private static void Finish(string error)
        {
            if (!SessionState.GetBool(Prefix + "Running", false)) return;
            SessionState.SetBool(Prefix + "Running", false);
            cancellation?.Cancel(); monitorCombat = monitorPreview = false;
            if (report == null) report = new Report { timestampUtc = DateTime.UtcNow.ToString("O"), editorVersion = Application.unityVersion };
            if (!string.IsNullOrEmpty(error)) report.errors.Add(Redact(error));
            foreach (var entry in Preferences)
            {
                string value = PlayerPrefs.HasKey(entry.Key) ? PlayerPrefs.GetString(entry.Key) : null;
                if (value != entry.Value)
                {
                    report.errors.Add("Validation unexpectedly changed a local preference: " + entry.Key);
                    if (entry.Value == null) PlayerPrefs.DeleteKey(entry.Key); else PlayerPrefs.SetString(entry.Key, entry.Value);
                }
            }
            PlayerPrefs.Save();
            if (app) { app.Combat?.StopAutoQuest(true); app.Native?.Dispose(); app.Network?.Disconnect(); }
            report.elapsedSeconds = Math.Round(EditorApplication.timeSinceStartup - startedAt, 2);
            report.passed = report.errors.Count == 0 && report.captures.Count == (FullQuestOnly ? 14 : 26);
            if (report.passed) report.checks.Add("Local account preferences and prototype saves are unchanged.");
            outputDirectory = outputDirectory ?? ResolveOutputDirectory();
            Directory.CreateDirectory(outputDirectory);
            File.WriteAllText(Path.Combine(outputDirectory, "validation.json"), JsonUtility.ToJson(report, true));
            SessionState.SetString(Prefix + "Output", outputDirectory);
            SessionState.SetInt(Prefix + "ExitCode", report.passed ? 0 : 1);
            SessionState.SetBool(Prefix + "Restoring", true);
            username = password = null;
            if (EditorApplication.isPlaying) EditorApplication.ExitPlaymode(); else RestoreEditor();
        }

        private static void RestoreEditor()
        {
            SessionState.SetBool(Prefix + "Restoring", false);
            try
            {
                int index = SessionState.GetInt(Prefix + "PreviousSize", -1);
                Type gameViewType = typeof(EditorWindow).Assembly.GetType("UnityEditor.GameView", true);
                var view = Resources.FindObjectsOfTypeAll(gameViewType).OfType<EditorWindow>().FirstOrDefault();
                if (view && index >= 0) gameViewType.GetProperty("selectedSizeIndex", PrivateInstance).SetValue(view, index);
                var saved = JsonUtility.FromJson<SavedScenes>(SessionState.GetString(Prefix + "Scenes", "{}"));
                if (saved?.scenes != null && saved.scenes.Any(s => !string.IsNullOrEmpty(s.path)))
                    EditorSceneManager.RestoreSceneManagerSetup(saved.scenes.Select(scene => new SceneSetup
                    { path = scene.path, isActive = scene.active, isLoaded = scene.loaded }).ToArray());
                else EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            }
            catch (Exception exception)
            {
                SessionState.SetInt(Prefix + "ExitCode", 1);
                string path = Path.Combine(SessionState.GetString(Prefix + "Output", ResolveOutputDirectory()), "validation.json");
                if (File.Exists(path))
                {
                    var savedReport = JsonUtility.FromJson<Report>(File.ReadAllText(path));
                    savedReport.passed = false; savedReport.errors.Add("Editor restore: " + exception.Message);
                    File.WriteAllText(path, JsonUtility.ToJson(savedReport, true));
                }
            }
            Debug.Log("Native UI validation report: " + SessionState.GetString(Prefix + "Output", ""));
            if (SessionState.GetBool(Prefix + "Quit", false)) EditorApplication.Exit(SessionState.GetInt(Prefix + "ExitCode", 1));
        }
    }
}
