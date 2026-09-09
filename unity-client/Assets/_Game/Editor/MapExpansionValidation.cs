using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Lunhui.Prototype
{
    [InitializeOnLoad]
    public static class MapExpansionValidation
    {
        private const string Key = "Lunhui.MapExpansionValidation.Running";
        private static readonly Vector2Int[] Sizes = { new Vector2Int(1280, 720), new Vector2Int(1920, 864) };
        private static readonly List<string> Errors = new List<string>();
        private static readonly List<Capture> Captures = new List<Capture>();
        private static int index, phase;
        private static double nextStep;
        private static string output;
        private static PrototypeApp app;

        [Serializable]
        private sealed class Capture
        {
            public string map, image;
            public int width, height, triangles, renderers, distinctColors, residentMaps;
            public bool passed;
        }

        [Serializable]
        private sealed class Report
        {
            public bool passed;
            public string timestampUtc;
            public int romanticRegions, romanticMaps;
            public List<Capture> captures;
            public List<string> errors;
        }

        static MapExpansionValidation()
        {
            EditorApplication.playModeStateChanged += state =>
            {
                if (state == PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(Key, false))
                {
                    index = phase = 0;
                    nextStep = EditorApplication.timeSinceStartup + 1;
                    output = Path.GetFullPath(Argument("-lunhuiMapValidationOutput", "Artifacts/MapExpansionValidation"));
                    Directory.CreateDirectory(output);
                    Captures.Clear(); Errors.Clear();
                }
            };
            EditorApplication.update += Update;
            Application.logMessageReceived += (message, trace, type) =>
            {
                if (SessionState.GetBool(Key, false) && (type == LogType.Error || type == LogType.Exception)) Errors.Add(message);
            };
        }

        public static void RunBatch()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode) throw new InvalidOperationException("Map validation requires Edit Mode.");
            PrototypeSetup.CreateProject();
            EditorSceneManager.OpenScene(PrototypeSetup.BootScenePath, OpenSceneMode.Single);
            SessionState.SetBool(Key, true);
            EditorApplication.EnterPlaymode();
        }

        private static void Update()
        {
            if (!SessionState.GetBool(Key, false) || !EditorApplication.isPlaying || output == null || EditorApplication.timeSinceStartup < nextStep) return;
            try
            {
                if (app == null)
                {
                    app = UnityEngine.Object.FindObjectOfType<PrototypeApp>();
                    if (app == null) throw new InvalidOperationException("PrototypeApp did not start.");
                    app.SuppressPersistence = true;
                    app.ShowPage("home");
                    if (RealmMapCatalog.RomanticRealms.Length != 5 || RealmMapCatalog.RomanticRealms.Sum(RealmMapCatalog.Count) != 15)
                        throw new InvalidOperationException("Expected five regions with three maps each.");
                    if (RealmMapCatalog.Maps.Select(map => map.Id).Distinct().Count() != RealmMapCatalog.Maps.Length)
                        throw new InvalidOperationException("Map IDs must be unique.");
                }
                var map = RealmMapCatalog.Maps[index / Sizes.Length];
                if (phase == 0)
                {
                    app.World.SetMap(map.Realm, map.Submap);
                    app.Combat.SetRunning(false);
                    app.World.Teleport(new Vector3(0, .16f, 42));
                    app.World.ResetCamera();
                    app.World.ZoomCamera(5);
                    phase = 1;
                    nextStep = EditorApplication.timeSinceStartup + .65;
                    return;
                }
                CaptureMap(map, Sizes[index % Sizes.Length]);
                phase = 0;
                index++;
                if (index >= RealmMapCatalog.Maps.Length * Sizes.Length) Finish();
            }
            catch (Exception exception)
            {
                Errors.Add(exception.ToString());
                Finish();
            }
        }

        private static void CaptureMap(RealmMapDefinition map, Vector2Int size)
        {
            Camera camera = app.World.WorldCamera;
            RenderTexture old = camera.targetTexture;
            RenderTexture target = RenderTexture.GetTemporary(size.x, size.y, 24, RenderTextureFormat.ARGB32);
            RenderTexture previous = RenderTexture.active;
            var pixels = new Texture2D(size.x, size.y, TextureFormat.RGB24, false);
            Vector3 oldPosition = camera.transform.position;
            Quaternion oldRotation = camera.transform.rotation;
            try
            {
                camera.targetTexture = target;
                camera.transform.position = new Vector3(10, 12, 26);
                camera.transform.LookAt(new Vector3(0, 1, 53));
                camera.Render();
                RenderTexture.active = target;
                pixels.ReadPixels(new Rect(0, 0, size.x, size.y), 0, 0);
                pixels.Apply();
                string filename = map.Id + "-" + size.x + "x" + size.y + ".png";
                File.WriteAllBytes(Path.Combine(output, filename), pixels.EncodeToPNG());
                var colors = new HashSet<int>();
                for (int y = size.y / 5; y < size.y * 4 / 5; y += 9)
                    for (int x = size.x / 5; x < size.x * 4 / 5; x += 9)
                    {
                        Color32 c = pixels.GetPixel(x, y);
                        colors.Add((c.r / 12 << 16) | (c.g / 12 << 8) | c.b / 12);
                    }
                RealmEnvironment environment = UnityEngine.Object.FindObjectOfType<RealmEnvironment>();
                MeshFilter[] meshes = environment.GetComponentsInChildren<MeshFilter>();
                int triangles = meshes.Sum(mesh => mesh.sharedMesh != null ? mesh.sharedMesh.triangles.Length / 3 : 0);
                int residentMaps = 0;
                foreach (Transform child in environment.transform) if (child.GetComponentInChildren<MeshFilter>(true) != null) residentMaps++;
                bool passed = colors.Count > 30 && meshes.Length > 5 && triangles > 500 && residentMaps <= 3;
                Captures.Add(new Capture
                {
                    map = map.Name, image = filename, width = size.x, height = size.y,
                    distinctColors = colors.Count, triangles = triangles, renderers = meshes.Length,
                    residentMaps = residentMaps, passed = passed
                });
                if (!passed) Errors.Add(map.Id + " did not meet nonblank scene / cache checks.");
                if (app.World.SubmapIndex != map.Submap || app.World.RealmIndex != map.Realm) Errors.Add(map.Id + " selected wrong scene.");
                if (map.Submap > 0)
                {
                    foreach (Vector3 point in RealmMapCatalog.MainRoute(map.Realm, map.Submap))
                    {
                        Vector3 clamped = app.World.ConstrainPosition(point);
                        if (Mathf.Abs(clamped.x - point.x) + Mathf.Abs(clamped.z - point.z) > .7f)
                            Errors.Add(map.Id + " has a blocked route waypoint: " + point);
                    }
                    Vector3[] interactions = map.Realm == 5
                        ? new[] { new Vector3(-8, 0, 13), new Vector3(8, 0, 50), new Vector3(-8, 0, 87), new Vector3(0, 0, 118), new Vector3(0, 0, 123) }
                        : new[] { new Vector3(-7, 0, 14), new Vector3(7, 0, 43), new Vector3(-7, 0, 72), new Vector3(0, 0, 96), new Vector3(0, 0, 104) };
                    foreach (Vector3 point in interactions)
                    {
                        Vector3 constrained = app.World.ConstrainPosition(point);
                        if (Mathf.Abs(constrained.x - point.x) + Mathf.Abs(constrained.z - point.z) > .1f)
                            Errors.Add(map.Id + " has a blocked authoritative interaction point: " + point);
                    }
                }
            }
            finally
            {
                camera.transform.SetPositionAndRotation(oldPosition, oldRotation);
                camera.targetTexture = old;
                RenderTexture.active = previous;
                RenderTexture.ReleaseTemporary(target);
                UnityEngine.Object.Destroy(pixels);
            }
        }

        private static void Finish()
        {
            var report = new Report
            {
                passed = Errors.Count == 0 && Captures.Count == RealmMapCatalog.Maps.Length * Sizes.Length,
                timestampUtc = DateTime.UtcNow.ToString("O"), romanticRegions = 5, romanticMaps = 15,
                captures = Captures, errors = Errors
            };
            if (!string.IsNullOrEmpty(output)) File.WriteAllText(Path.Combine(output, "validation.json"), JsonUtility.ToJson(report, true));
            SessionState.SetBool(Key, false);
            EditorApplication.Exit(report.passed ? 0 : 1);
        }

        private static string Argument(string name, string fallback)
        {
            string[] arguments = Environment.GetCommandLineArgs();
            int found = Array.IndexOf(arguments, name);
            return found >= 0 && found + 1 < arguments.Length ? arguments[found + 1] : fallback;
        }
    }
}
