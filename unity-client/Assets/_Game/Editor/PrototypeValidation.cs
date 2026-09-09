using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

namespace Lunhui.Prototype
{
    [InitializeOnLoad]
    public static class PrototypeValidation
    {
        const string RunningKey = "Lunhui.Validation.Running";
        const string QuitKey = "Lunhui.Validation.Quit";
        const string PendingErrorsKey = "Lunhui.Validation.PendingErrors";
        const string PreviousSizeKey = "Lunhui.Validation.PreviousGameViewSize";
        const string OutputArgument = "-lunhuiValidationOutput";
        static readonly bool LoginOnly = Array.IndexOf(Environment.GetCommandLineArgs(), "-lunhuiLoginOnly") >= 0;
        static readonly bool ServersOnly = Array.IndexOf(Environment.GetCommandLineArgs(), "-lunhuiServersOnly") >= 0;
        static readonly string[] Pages = ServersOnly ? new[] { "login", "onlineLogin", "settings", "serverSettings" }
            : LoginOnly ? new[] { "login", "onlineLogin" } : Array.IndexOf(Environment.GetCommandLineArgs(), "-lunhuiPetsOnly") >= 0
            ? new[] { "pet0", "pet1" }
            : new[] { "login", "onlineLogin", "character", "home", "mountains", "equipment", "pets", "guild", "settings",
                "realm0", "realm1", "realm2", "realm3", "realm4", "realm5", "realm6", "pet0", "pet1",
                "journey0", "journey1", "journey2", "combat", "zoom", "photo", "appearance", "boss" };
        static readonly Vector2Int[] Sizes = { new Vector2Int(1280, 720), new Vector2Int(1920, 864) };
        static readonly BindingFlags InstanceFlags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
        static ValidationReport report;
        static int captureIndex;
        static int stage;
        static double deadline;
        static string outputDirectory;
        static string pendingImage;
        static EditorWindow gameView;

        [Serializable]
        public class CaptureResult
        {
            public string page;
            public int width;
            public int height;
            public string image;
            public int distinctSampleColors;
            public bool passed;
        }

        [Serializable]
        public class ValidationReport
        {
            public string editorVersion;
            public string timestampUtc;
            public bool passed;
            public List<CaptureResult> captures = new List<CaptureResult>();
            public List<string> errors = new List<string>();
            public List<string> interactionChecks = new List<string>();
        }

        static PrototypeValidation()
        {
            EditorApplication.playModeStateChanged += OnPlayModeChanged;
            EditorApplication.update += Update;
            Application.logMessageReceived += OnLog;
        }

        [MenuItem("Lunhui/Validate Mobile UI Screenshots")]
        public static void Run()
        {
            Start(false);
        }

        // Batch invocation must omit -quit and -nographics; completion exits the editor.
        public static void RunBatch()
        {
            Start(true);
        }

        static void Start(bool quitWhenDone)
        {
            if (SessionState.GetBool(RunningKey, false) || EditorApplication.isPlayingOrWillChangePlaymode)
                throw new InvalidOperationException("Stop the current Play Mode or validation run first.");
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
                return;
            PrototypeSetup.CreateProject();
            EditorSceneManager.OpenScene(PrototypeSetup.BootScenePath, OpenSceneMode.Single);
            report = null;
            SessionState.SetBool(QuitKey, quitWhenDone);
            SessionState.SetBool(RunningKey, true);
            SessionState.SetInt(PreviousSizeKey, -1);
            SessionState.SetString(PendingErrorsKey, "");
            Application.logMessageReceived -= OnLog;
            Application.logMessageReceived += OnLog;
            EditorApplication.EnterPlaymode();
        }

        static void OnPlayModeChanged(PlayModeStateChange state)
        {
            if (!SessionState.GetBool(RunningKey, false))
                return;
            if (state == PlayModeStateChange.EnteredPlayMode)
            {
                outputDirectory = ResolveOutputDirectory();
                Directory.CreateDirectory(outputDirectory);
                report = new ValidationReport
                {
                    editorVersion = Application.unityVersion,
                    timestampUtc = DateTime.UtcNow.ToString("O")
                };
                string startupErrors = SessionState.GetString(PendingErrorsKey, "");
                if (!string.IsNullOrEmpty(startupErrors)) report.errors.Add(startupErrors);
                captureIndex = 0;
                stage = 0;
                deadline = EditorApplication.timeSinceStartup + 30;
                Application.logMessageReceived -= OnLog;
                Application.logMessageReceived += OnLog;
            }
            else if (state == PlayModeStateChange.ExitingPlayMode)
            {
                Fail("Play Mode ended before validation completed.");
            }
        }

        static void Update()
        {
            if (!SessionState.GetBool(RunningKey, false) || !EditorApplication.isPlaying || report == null)
                return;
            try
            {
                double now = EditorApplication.timeSinceStartup;
                if (stage == 0)
                {
                    PrototypeApp app = UnityEngine.Object.FindObjectOfType<PrototypeApp>();
                    if (app == null)
                    {
                        if (now > deadline) Fail("PrototypeApp was not created within 30 seconds.");
                        return;
                    }
                    Vector2Int size = Sizes[captureIndex / Pages.Length];
                    if (captureIndex == 0 && ServersOnly)
                        report.interactionChecks = ServerSelectionChecks.Run(app);
                    if(captureIndex == 0 && !LoginOnly && !ServersOnly)
                    {
                        report.interactionChecks = PrototypeInteractionChecks.Run(app);
                        ArtReviewSetup.CaptureRuntime(app);
                    }
                    SetGameViewSize(size.x, size.y);
                    string capturePage = Pages[captureIndex % Pages.Length];
                    if (capturePage.StartsWith("journey",StringComparison.Ordinal) || capturePage=="combat" || capturePage=="zoom" || capturePage=="photo")
                    {
                        int realm=capturePage.StartsWith("journey",StringComparison.Ordinal)?int.Parse(capturePage.Substring(7)):capturePage=="combat"?1:capturePage=="photo"?2:0;
                        app.World.SetRealm(realm);app.ShowPage("home");app.World.ResetCamera();
                        app.World.Teleport(new Vector3(0,.16f,capturePage=="zoom"?7:42));
                        if(capturePage=="zoom"){app.World.OrbitCamera(new Vector2(12,-7));app.World.ZoomCamera(-4.8f);}
                        if(capturePage=="photo"){app.World.OrbitCamera(new Vector2(40,-8));app.OpenPhotoMode();}
                        if(capturePage=="combat")
                        {
                            var enemy=app.Combat.Enemies[1];app.World.Teleport(enemy.Root.position+Vector3.back*3);
                            enemy.Windup=10;enemy.StrikeCenter=app.World.HeroGroundPosition+Vector3.forward;
                            enemy.Warning.position=enemy.StrikeCenter+Vector3.up*.04f;enemy.Warning.gameObject.SetActive(true);
                        }
                    }
                    else if (capturePage == "onlineLogin")
                    {
                        app.ShowPage("login");app.OpenOnlineLogin();
                    }
                    else if (capturePage == "serverSettings")
                    {
                        app.ShowPage("settings");app.OpenServerSettings();
                        UnityEngine.Object.FindObjectsOfType<Button>().Single(button => button.name == "ServerPreset1").onClick.Invoke();
                    }
                    else if (capturePage == "appearance")
                    {
                        app.World.SetRealm(0);app.ShowPage("home");app.OpenCustomization();
                    }
                    else if (capturePage == "boss")
                    {
                        app.World.SetRealm(5);app.ShowPage("home");app.World.ResetCamera();
                        var boss=app.Combat.Enemies.FirstOrDefault(x=>x.Boss);
                        if(boss!=null)
                        {
                            app.World.Teleport(boss.Root.position+Vector3.back*5f);
                            var begin=typeof(AdventureCombat).GetMethod("BeginBossAttack",BindingFlags.Instance|BindingFlags.NonPublic);
                            begin?.Invoke(app.Combat,new object[]{boss});
                            boss.Health=boss.Maximum*.4f;
                        }
                    }
                    else if (capturePage == "pet0" || capturePage == "pet1")
                    {
                        app.ShowPage("pets");
                        foreach (var button in UnityEngine.Object.FindObjectsOfType<Button>())
                            if (button.name == "Pet" + capturePage.Substring(3)) { button.onClick.Invoke(); break; }
                    }
                    else if (capturePage.StartsWith("realm", StringComparison.Ordinal))
                    {
                        app.World.SetRealm(int.Parse(capturePage.Substring(5)));
                        app.ShowPage("home");
                    }
                    else
                    {
                        app.World.SetRealm(0);
                        app.ShowPage(capturePage);
                    }
                    Canvas.ForceUpdateCanvases();
                    deadline = now + (captureIndex == 0 ? 8 : 1.5);
                    stage = 1;
                }
                else if (stage == 1 && now >= deadline)
                {
                    if (UnityEngine.Object.FindObjectOfType<Canvas>() == null)
                        throw new InvalidOperationException("No active Canvas was found.");
                    Vector2Int size = Sizes[captureIndex / Pages.Length];
                    string page = Pages[captureIndex % Pages.Length];
                    pendingImage = Path.Combine(outputDirectory, size.x + "x" + size.y + "-" + page + ".png");
                    if (File.Exists(pendingImage)) File.Delete(pendingImage);
                    ScreenCapture.CaptureScreenshot(pendingImage);
                    gameView.Repaint();
                    deadline = now + 15;
                    stage = 2;
                }
                else if (stage == 2)
                {
                    if (File.Exists(pendingImage) && new FileInfo(pendingImage).Length > 0)
                    {
                        VerifyImage();
                        captureIndex++;
                        if (captureIndex == Pages.Length * Sizes.Length)
                            Finish();
                        else
                        {
                            stage = 0;
                            deadline = now + 30;
                        }
                    }
                    else if (now > deadline)
                        Fail("Screenshot timed out. Keep a graphics-enabled Game View available; omit -nographics.");
                }
            }
            catch (Exception exception)
            {
                Fail(exception.ToString());
            }
        }

        static void VerifyImage()
        {
            var texture = new Texture2D(2, 2, TextureFormat.RGBA32, false);
            try
            {
                if (!texture.LoadImage(File.ReadAllBytes(pendingImage)))
                    throw new IOException("Could not decode screenshot: " + pendingImage);
                Vector2Int expected = Sizes[captureIndex / Pages.Length];
                Color32[] pixels = texture.GetPixels32();
                var colors = new HashSet<int>();
                int stride = Math.Max(1, pixels.Length / 10000);
                for (int i = 0; i < pixels.Length; i += stride)
                {
                    Color32 pixel = pixels[i];
                    colors.Add((pixel.r >> 3) << 10 | (pixel.g >> 3) << 5 | (pixel.b >> 3));
                }
                bool passed = texture.width == expected.x && texture.height == expected.y && colors.Count >= 8;
                string capturePage = Pages[captureIndex % Pages.Length];
                if (capturePage == "pets" || capturePage == "pet0" || capturePage == "pet1")
                {
                    float scale = Mathf.Min(texture.width / 1280f, texture.height / 720f);
                    float offsetX = (texture.width - 1280 * scale) * .5f;
                    float offsetY = (texture.height - 720 * scale) * .5f;
                    var petColors = new HashSet<int>();
                    for (int y = 226; y < 488; y += 3)
                    for (int x = 345; x < 715; x += 3)
                    {
                        int px = Mathf.Clamp(Mathf.RoundToInt(offsetX + x * scale), 0, texture.width - 1);
                        int py = Mathf.Clamp(texture.height - 1 - Mathf.RoundToInt(offsetY + y * scale), 0, texture.height - 1);
                        Color32 pixel = pixels[py * texture.width + px];
                        petColors.Add((pixel.r >> 3) << 10 | (pixel.g >> 3) << 5 | (pixel.b >> 3));
                    }
                    if (petColors.Count < 24)
                    {
                        passed = false;
                        report.errors.Add("Pet model preview is blank or too small: " + Path.GetFileName(pendingImage));
                    }
                }
                report.captures.Add(new CaptureResult
                {
                    page = Pages[captureIndex % Pages.Length],
                    width = texture.width,
                    height = texture.height,
                    image = Path.GetFileName(pendingImage),
                    distinctSampleColors = colors.Count,
                    passed = passed
                });
                if (!passed)
                    report.errors.Add("Blank or incorrectly sized screenshot: " + Path.GetFileName(pendingImage));
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(texture);
            }
        }

        static void SetGameViewSize(int width, int height)
        {
            // Unity exposes fixed Game View sizes only through editor-internal APIs.
            Assembly assembly = typeof(EditorWindow).Assembly;
            Type viewType = assembly.GetType("UnityEditor.GameView", true);
            gameView = EditorWindow.GetWindow(viewType);
            gameView.Show();
            PropertyInfo selected = viewType.GetProperty("selectedSizeIndex", InstanceFlags);
            if (SessionState.GetInt(PreviousSizeKey, -1) < 0)
                SessionState.SetInt(PreviousSizeKey, (int)selected.GetValue(gameView));
            Type sizesType = assembly.GetType("UnityEditor.GameViewSizes", true);
            Type singletonType = typeof(ScriptableSingleton<>).MakeGenericType(sizesType);
            object sizes = singletonType.GetProperty("instance", BindingFlags.Public | BindingFlags.Static).GetValue(null);
            object groupType = sizesType.GetProperty("currentGroupType", InstanceFlags).GetValue(sizes);
            object group = sizesType.GetMethod("GetGroup", InstanceFlags).Invoke(sizes, new[] { groupType });
            Type groupClass = group.GetType();
            int count = (int)groupClass.GetMethod("GetTotalCount", InstanceFlags).Invoke(group, null);
            int match = -1;
            for (int i = 0; i < count; i++)
            {
                object candidate = groupClass.GetMethod("GetGameViewSize", InstanceFlags).Invoke(group, new object[] { i });
                Type candidateType = candidate.GetType();
                if ((int)candidateType.GetProperty("width", InstanceFlags).GetValue(candidate) == width &&
                    (int)candidateType.GetProperty("height", InstanceFlags).GetValue(candidate) == height)
                {
                    match = i;
                    break;
                }
            }
            if (match < 0)
            {
                Type modeType = assembly.GetType("UnityEditor.GameViewSizeType", true);
                Type sizeType = assembly.GetType("UnityEditor.GameViewSize", true);
                object mode = Enum.Parse(modeType, "FixedResolution");
                object size = Activator.CreateInstance(sizeType, InstanceFlags, null,
                    new[] { mode, (object)width, height, "Lunhui " + width + "x" + height }, null);
                groupClass.GetMethod("AddCustomSize", InstanceFlags).Invoke(group, new[] { size });
                match = count;
            }
            selected.SetValue(gameView, match);
            gameView.Focus();
            gameView.Repaint();
        }

        static string ResolveOutputDirectory()
        {
            string[] arguments = Environment.GetCommandLineArgs();
            for (int i = 0; i < arguments.Length - 1; i++)
                if (arguments[i] == OutputArgument)
                    return Path.GetFullPath(arguments[i + 1]);
            return Path.GetFullPath("Artifacts/UIValidation/" + DateTime.Now.ToString("yyyyMMdd-HHmmss"));
        }

        static void OnLog(string message, string stackTrace, LogType type)
        {
            if (!SessionState.GetBool(RunningKey, false) ||
                (type != LogType.Error && type != LogType.Exception && type != LogType.Assert)) return;
            string error = message + "\n" + stackTrace;
            if (report != null) report.errors.Add(error);
            else SessionState.SetString(PendingErrorsKey, SessionState.GetString(PendingErrorsKey, "") + error + "\n");
        }

        static void Fail(string message)
        {
            if (report == null)
            {
                report = new ValidationReport { editorVersion = Application.unityVersion };
                outputDirectory = ResolveOutputDirectory();
            }
            report.errors.Add(message);
            Finish();
        }

        static void Finish()
        {
            SessionState.SetBool(RunningKey, false);
            Application.logMessageReceived -= OnLog;
            report.passed = report.errors.Count == 0 && report.captures.Count == Pages.Length * Sizes.Length;
            Directory.CreateDirectory(outputDirectory);
            File.WriteAllText(Path.Combine(outputDirectory, "validation.json"), JsonUtility.ToJson(report, true));
            try
            {
                int previous = SessionState.GetInt(PreviousSizeKey, -1);
                if (gameView != null && previous >= 0)
                    gameView.GetType().GetProperty("selectedSizeIndex", InstanceFlags).SetValue(gameView, previous);
            }
            catch (Exception exception)
            {
                Debug.LogWarning("Could not restore Game View size: " + exception.Message);
            }
            Debug.Log("Lunhui UI validation " + (report.passed ? "passed: " : "failed: ") + outputDirectory);
            if (SessionState.GetBool(QuitKey, false))
                EditorApplication.Exit(report.passed ? 0 : 1);
            else if (EditorApplication.isPlaying)
                EditorApplication.ExitPlaymode();
        }
    }
}


