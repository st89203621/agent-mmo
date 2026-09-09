using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace Lunhui.Prototype
{
    [InitializeOnLoad]
    public static class FaceArtValidation
    {
        private const string Running = "Lunhui.FaceArtValidation";
        private const string Prefabs = "Assets/_Game/Resources/Art/Characters/Prefabs/";

        [Serializable]
        private sealed class Report
        {
            public List<string> checks = new List<string>();
            public List<string> errors = new List<string>();
            public bool passed;
        }

        static FaceArtValidation()
        {
            EditorApplication.playModeStateChanged += state =>
            {
                if (state == PlayModeStateChange.EnteredPlayMode && SessionState.GetBool(Running, false))
                    EditorApplication.delayCall += Validate;
            };
        }

        public static void RunBatch()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
                throw new InvalidOperationException("Face validation requires Edit Mode.");
            if (Environment.GetCommandLineArgs().Contains("-rebuildHeads")) CharacterArtSetup.RebuildHeads();
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            SessionState.SetBool(Running, true);
            EditorApplication.EnterPlaymode();
        }

        private static void Validate()
        {
            var report = new Report();
            string[] args = Environment.GetCommandLineArgs();
            int argument = Array.IndexOf(args, "-faceOutput");
            string output = argument >= 0 ? args[argument + 1] : "Artifacts/FaceReview/current";
            Directory.CreateDirectory(output);
            try
            {
                RenderSettings.ambientMode = AmbientMode.Flat;
                RenderSettings.ambientLight = new Color(.43f, .45f, .48f);
                RenderSettings.fog = false;
                Light key = new GameObject("Face review key").AddComponent<Light>();
                key.type = LightType.Directional;
                key.intensity = 1.1f;
                key.transform.rotation = Quaternion.Euler(25, 35, 0);
                Light fill = new GameObject("Face review fill").AddComponent<Light>();
                fill.type = LightType.Directional;
                fill.intensity = .35f;
                fill.transform.rotation = Quaternion.Euler(12, -40, 0);
                var camera = new GameObject("Face review camera").AddComponent<Camera>();
                camera.clearFlags = CameraClearFlags.SolidColor;
                camera.backgroundColor = new Color(.17f, .20f, .21f);
                camera.nearClipPlane = .01f;
                camera.farClipPlane = 20;
                camera.fieldOfView = 28;
                camera.allowMSAA = true;
                QualitySettings.antiAliasing = 4;

                foreach (string name in new[] { "Female0", "Female1", "Female2", "Guide", "Career0", "Career1", "Career2" })
                {
                    var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Prefabs + name + ".prefab");
                    var root = UnityEngine.Object.Instantiate(prefab);
                    var face = root.GetComponentsInChildren<MeshFilter>().Single(m => m.name.IndexOf("Superhero", StringComparison.OrdinalIgnoreCase) >= 0);
                    var animator = root.GetComponentInChildren<Animator>();
                    animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                    animator.Update(0);
                    animator.enabled = false;
                    Mesh source = face.sharedMesh;
                    int[] used = source.triangles.Distinct().ToArray();
                    Bounds visible = VisibleBounds(source);
                    Vector3[] sourceVertices = source.vertices, sourceNormals = source.normals;
                    int[] indices = source.triangles;
                    float orientation = 0;
                    for (int i = 0; i < indices.Length; i += 3)
                        orientation += Vector3.Dot(Vector3.Cross(sourceVertices[indices[i + 1]] - sourceVertices[indices[i]],
                            sourceVertices[indices[i + 2]] - sourceVertices[indices[i]]), sourceNormals[indices[i]]);
                    Check(orientation > 0, name + ": exported triangle winding agrees with outward normals", report);
                    Check(used.Length == source.vertexCount, name + ": head contains no unused body vertices", report);
                    Check(Vector3.Distance(source.bounds.size, visible.size) < .001f,
                        name + ": face bounds enclose only visible head geometry", report);
                    Check(animator.avatar != null && animator.avatar.isValid && animator.avatar.isHuman,
                        name + ": existing body avatar remains valid", report);
                    if (name == "Female0")
                    {
                        ExportHead(root, Path.Combine(output, "head-source.json"));
                        CaptureViews(camera, root, face, output, "source", report);
                    }

                    var customizer = root.AddComponent<CharacterCustomizer>();
                    var neutral = new CharacterAppearance
                    {
                        FaceWidth = .5f, JawWidth = .5f, ChinLength = .5f, EyeSize = .5f,
                        EyeSpacing = .5f, NoseSize = .5f, CheekFullness = .5f,
                        EyeHeight = .5f, LipFullness = .5f, BrowHeight = .5f
                    };
                    customizer.Apply(neutral);
                    var baseline = face.sharedMesh.vertices;
                    var raised = neutral.Copy();
                    raised.EyeHeight = .8f;
                    customizer.Apply(raised);
                    Check(face.sharedMesh.vertices.Where((p, i) => Vector3.Distance(p, baseline[i]) > .00001f).Any(),
                        name + ": moving eyes also deforms their sockets", report);
                    customizer.Apply(neutral);
                    Check(face.sharedMesh.vertices.Select((p, i) => Vector3.Distance(p, baseline[i])).Max() < .00001f,
                        name + ": resetting appearance restores original geometry without drift", report);
                    var appearance = new CharacterAppearance();
                    customizer.Apply(appearance);
                    var once = face.sharedMesh.vertices;
                    Check(once.Select((p, i) => Mathf.Abs(sourceVertices[i].x) < .00001f
                        ? Mathf.Abs(p.x - sourceVertices[i].x) : 0).Max() < .00001f,
                        name + ": eye controls preserve the facial centerline", report);
                    var eyeRenderer = root.GetComponentsInChildren<MeshRenderer>().Single(r => r.name == "Eyes");
                    var properties = new MaterialPropertyBlock();
                    eyeRenderer.GetPropertyBlock(properties);
                    Check(properties.GetColor("_Color") == Color.white,
                        name + ": iris color does not tint the sclera", report);
                    customizer.Apply(appearance);
                    Check(face.sharedMesh.vertices.Select((p, i) => Vector3.Distance(p, once[i])).Max() < .00001f,
                        name + ": repeated appearance application is idempotent", report);
                    Check(once.All(p => float.IsFinite(p.x) && float.IsFinite(p.y) && float.IsFinite(p.z)),
                        name + ": deformed vertices remain finite", report);
                    if (name == "Female0") CaptureViews(camera, root, face, output, "default", report);
                    for (int preset = 0; preset < 4; preset++)
                    {
                        customizer.Apply(CharacterAppearance.Preset(preset));
                        Check(face.sharedMesh.bounds.size.x < source.bounds.size.x * 1.25f
                            && face.sharedMesh.bounds.size.y < source.bounds.size.y * 1.25f,
                            name + ": preset " + preset + " stays within portrait bounds", report);
                        if (name == "Female0") CaptureViews(camera, root, face, output, "preset-" + preset, report);
                    }
                    customizer.Apply(neutral);
                    var brow = root.GetComponentsInChildren<MeshFilter>().Single(m => m.name == "Eyebrows");
                    var eye = root.GetComponentsInChildren<MeshFilter>().Single(m => m.name == "Eyes");
                    Vector3[] browBaseline = brow.sharedMesh.vertices;
                    var browRaised = neutral.Copy();
                    browRaised.BrowHeight = 1;
                    customizer.Apply(browRaised);
                    Check(browBaseline.Any(p => p.y < eye.sharedMesh.bounds.max.y),
                        name + ": lash geometry is present", report);
                    Check(brow.sharedMesh.vertices.Select((p, i) => browBaseline[i].y < eye.sharedMesh.bounds.max.y
                        ? Vector3.Distance(p, browBaseline[i]) : 0).Max() < .00001f,
                        name + ": brow height leaves eyelashes attached to eyelids", report);
                    foreach (var field in typeof(CharacterAppearance).GetFields()
                        .Where(f => !f.IsStatic && f.FieldType == typeof(float) && f.Name != "Height"))
                    {
                        foreach (float value in new[] { 0f, 1f })
                        {
                            var extreme = neutral.Copy();
                            field.SetValue(extreme, value);
                            customizer.Apply(extreme);
                            Vector3[] points = face.sharedMesh.vertices;
                            Check(points.All(p => float.IsFinite(p.x) && float.IsFinite(p.y) && float.IsFinite(p.z))
                                && face.sharedMesh.bounds.size.x < source.bounds.size.x * 1.3f
                                && face.sharedMesh.bounds.size.y < source.bounds.size.y * 1.3f,
                                name + ": " + field.Name + "=" + value + " remains finite and bounded", report);
                            Check(points.Select((p, i) => sourceVertices[i].y < source.bounds.min.y + .001f
                                ? Vector3.Distance(p, sourceVertices[i]) : 0).Max() < .00001f,
                                name + ": " + field.Name + "=" + value + " preserves the collar boundary", report);
                        }
                    }
                    customizer.Apply(appearance);
                    if (name != "Female0") CaptureViews(camera, root, face, output, name, report);
                    if (name == "Female0")
                    {
                        animator.enabled = true;
                        Vector3 rest = face.transform.position;
                        foreach (string state in new[] { "Locomotion", "Attack", "Skill", "Roll" })
                        {
                            animator.Play(state, 0, .35f);
                            animator.Update(.016f);
                            Check(Vector3.Distance(rest, face.transform.position) > .0001f,
                                state + ": refined head follows the original humanoid animation", report);
                            CaptureBody(camera, root, output, "motion-" + state, report);
                        }
                    }
                    root.SetActive(false);
                    UnityEngine.Object.Destroy(root);
                }
                key.gameObject.SetActive(false);
                fill.gameObject.SetActive(false);
                camera.gameObject.SetActive(false);
                ValidateCustomization(report);
            }
            catch (Exception error) { report.errors.Add(error.ToString()); }
            finally
            {
                report.passed = report.errors.Count == 0;
                File.WriteAllText(Path.Combine(output, "validation.json"), JsonUtility.ToJson(report, true));
                Debug.Log("FACE_VALIDATION " + (report.passed ? "PASS" : "FAIL") + ": " + string.Join("; ", report.errors));
                SessionState.SetBool(Running, false);
                EditorApplication.Exit(report.passed ? 0 : 1);
            }
        }

        private static void Check(bool passed, string message, Report report)
        {
            if (passed) report.checks.Add(message);
            else report.errors.Add(message);
        }

        private static void ValidateCustomization(Report report)
        {
            const string key = "Lunhui.NativePrototype.v1.new";
            string saved = PlayerPrefs.HasKey(key) ? PlayerPrefs.GetString(key) : null;
            PrototypeApp app = null;
            try
            {
                app = new GameObject("Appearance workflow validation").AddComponent<PrototypeApp>();
                app.Enter(false);
                app.State.UseMaleModel = false;
                app.State.Appearance = new CharacterAppearance();
                PrototypeInteractionChecks.RunCustomizationChecks(app, report.checks);
            }
            finally
            {
                if (app != null) app.SuppressPersistence = true;
                if (saved == null) PlayerPrefs.DeleteKey(key); else PlayerPrefs.SetString(key, saved);
                PlayerPrefs.Save();
            }
        }

        private static Bounds VisibleBounds(Mesh mesh)
        {
            Vector3[] vertices = mesh.vertices;
            int[] triangles = mesh.triangles;
            var bounds = new Bounds(vertices[triangles[0]], Vector3.zero);
            foreach (int index in triangles) bounds.Encapsulate(vertices[index]);
            return bounds;
        }

        private static void ExportHead(GameObject root, string path)
        {
            var result = new CharacterArtSetup.HeadSource();
            foreach (var filter in root.GetComponentsInChildren<MeshFilter>())
            {
                if (!filter.name.Contains("Superhero") && filter.name != "Eyes" && filter.name != "Eyebrows") continue;
                Mesh mesh = filter.sharedMesh;
                int[] used = mesh.triangles.Distinct().OrderBy(i => i).ToArray();
                var remap = used.Select((index, value) => new { index, value }).ToDictionary(p => p.index, p => p.value);
                result.parts.Add(new CharacterArtSetup.HeadPart
                {
                    name = filter.name,
                    vertices = used.Select(i => mesh.vertices[i]).ToArray(),
                    normals = used.Select(i => mesh.normals[i]).ToArray(),
                    uv = used.Select(i => mesh.uv[i]).ToArray(),
                    triangles = mesh.triangles.Select(i => remap[i]).ToArray()
                });
            }
            File.WriteAllText(path, JsonUtility.ToJson(result));
        }

        private static void CaptureViews(Camera camera, GameObject root, MeshFilter face, string output, string prefix, Report report)
        {
            Bounds bounds = VisibleBounds(face.sharedMesh);
            Vector3 focus = face.transform.TransformPoint(bounds.center);
            Vector3 forward = face.transform.TransformDirection(Vector3.forward);
            foreach (int angle in new[] { 0, 35, 80 })
            {
                Vector3 direction = Quaternion.AngleAxis(angle, Vector3.up) * forward;
                camera.transform.position = focus + direction * .95f;
                camera.transform.LookAt(focus, face.transform.up);
                Capture(camera, 960, 960, Path.Combine(output, prefix + "-" + angle + ".png"), report);
            }
            CaptureBody(camera, root, output, prefix, report);
        }

        private static void CaptureBody(Camera camera, GameObject root, string output, string prefix, Report report)
        {
            camera.transform.position = root.transform.position + new Vector3(.7f, 1.6f, 6.5f);
            camera.transform.LookAt(root.transform.position + Vector3.up * 1.25f);
            Capture(camera, 1280, 720, Path.Combine(output, prefix + "-body.png"), report);
            Capture(camera, 1920, 864, Path.Combine(output, prefix + "-body-wide.png"), report);
        }

        private static void Capture(Camera camera, int width, int height, string path, Report report)
        {
            var target = RenderTexture.GetTemporary(width, height, 24, RenderTextureFormat.ARGB32);
            var previous = RenderTexture.active;
            var texture = new Texture2D(width, height, TextureFormat.RGB24, false);
            try
            {
                camera.targetTexture = target;
                camera.Render();
                RenderTexture.active = target;
                texture.ReadPixels(new Rect(0, 0, width, height), 0, 0);
                texture.Apply();
                File.WriteAllBytes(path, texture.EncodeToPNG());
                Color32[] pixels = texture.GetPixels32();
                Check(pixels.Where((p, i) => i % 127 == 0).Select(p => (p.r << 16) | (p.g << 8) | p.b).Distinct().Count() > 80,
                    Path.GetFileName(path) + ": render contains visible geometry", report);
            }
            finally
            {
                camera.targetTexture = null;
                RenderTexture.active = previous;
                RenderTexture.ReleaseTemporary(target);
                UnityEngine.Object.Destroy(texture);
            }
        }
    }
}
