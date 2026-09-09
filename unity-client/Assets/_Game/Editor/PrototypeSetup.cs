using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Lunhui.Prototype
{
    public static class PrototypeSetup
    {
        public const string BootScenePath = "Assets/_Game/Scenes/Boot.unity";

        [MenuItem("Lunhui/Setup Mobile Prototype")]
        public static void CreateProject()
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode)
                throw new InvalidOperationException("Leave Play Mode before setting up the prototype.");

            Directory.CreateDirectory("Assets/_Game/Scenes");
            AssetDatabase.Refresh();
            EditorSettings.serializationMode = SerializationMode.ForceText;
            PlayerSettings.productName = "轮回online";
            PlayerSettings.bundleVersion = "0.10.1";
            PlayerSettings.Android.bundleVersionCode = 13;
            PlayerSettings.Android.forceInternetPermission = true;
            PlayerSettings.companyName = "Lunhui Prototype";
            PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, "com.lunhui.prototype");
            PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.iOS, "com.lunhui.prototype");
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;
            PlayerSettings.defaultScreenWidth = 1280;
            PlayerSettings.defaultScreenHeight = 720;
            PlayerSettings.runInBackground = false;
            PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;

            // Additive loading leaves other open or unsaved scenes intact.
            Scene boot = SceneManager.GetSceneByPath(BootScenePath);
            if (!boot.IsValid() || !boot.isLoaded)
            {
                Scene active = SceneManager.GetActiveScene();
                bool emptyStartup = string.IsNullOrEmpty(active.path) && !active.isDirty && active.rootCount == 0;
                if (!emptyStartup && string.IsNullOrEmpty(active.path) && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
                    throw new InvalidOperationException("Save the current untitled scene before setup.");
                boot = File.Exists(BootScenePath)
                    ? EditorSceneManager.OpenScene(BootScenePath, emptyStartup ? OpenSceneMode.Single : OpenSceneMode.Additive)
                    : EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, emptyStartup ? NewSceneMode.Single : NewSceneMode.Additive);
            }

            // Runtime-created materials need explicit shader references in native builds.
            var graphics = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/GraphicsSettings.asset")[0]);
            var shaders = graphics.FindProperty("m_AlwaysIncludedShaders");
            foreach (string shaderName in new[] { "Standard", "Sprites/Default", "Skybox/Procedural", "Unlit/Color", "Lunhui/ParticleGlow" })
            {
                Shader shader = Shader.Find(shaderName);
                if (!shader) throw new InvalidOperationException("Missing shader: " + shaderName);
                bool exists = false;
                for (int i=0; i<shaders.arraySize; i++) if (shaders.GetArrayElementAtIndex(i).objectReferenceValue == shader) exists = true;
                if (!exists) { int slot=shaders.arraySize; shaders.InsertArrayElementAtIndex(slot); shaders.GetArrayElementAtIndex(slot).objectReferenceValue=shader; }
            }
            graphics.ApplyModifiedPropertiesWithoutUndo();

            SceneManager.SetActiveScene(boot);
            PrototypeApp app = boot.GetRootGameObjects()
                .SelectMany(root => root.GetComponentsInChildren<PrototypeApp>(true))
                .FirstOrDefault();
            if (app == null)
            {
                var root = new GameObject("Lunhui Mobile Prototype");
                SceneManager.MoveGameObjectToScene(root, boot);
                root.AddComponent<PrototypeApp>();
            }

            EditorSceneManager.MarkSceneDirty(boot);
            if (!EditorSceneManager.SaveScene(boot, BootScenePath))
                throw new IOException("Could not save " + BootScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(BootScenePath, true) };
            AssetDatabase.SaveAssets();
            Debug.Log("Lunhui mobile prototype configured: " + BootScenePath);
        }

        [MenuItem("Lunhui/Build Android APK")]
        public static void BuildAndroid()
        {
            if (!BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.Android, BuildTarget.Android))
                throw new BuildFailedException(
                    "Android Build Support is not installed for this editor. Install the matching " +
                    "Android module, SDK, NDK and JDK, then retry. No APK was created.");

            CreateProject();
            MonsterArtSetup.ValidateAssets();
            ConfigureAndroidToolchain();
            PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevel35;
            var playerSettings = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset")[0]);
            playerSettings.FindProperty("useCustomGradleSettingsTemplate").boolValue = true;
            playerSettings.ApplyModifiedPropertiesWithoutUndo();
            AssetDatabase.SaveAssets();
            Directory.CreateDirectory("Builds/Android");
            EditorUserBuildSettings.buildAppBundle = false;
            EditorUserBuildSettings.exportAsGoogleAndroidProject = false;
            BuildReport report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { BootScenePath },
                locationPathName = "Builds/Android/LunhuiOnline-Prototype.apk",
                target = BuildTarget.Android,
                options = BuildOptions.Development
            });
            if (report.summary.result != BuildResult.Succeeded)
                throw new BuildFailedException("Android prototype build failed: " + report.summary.result);
            Debug.Log("Android prototype APK: " + Path.GetFullPath(report.summary.outputPath));
        }

        private static void ConfigureAndroidToolchain()
        {
            SetAndroidToolPath("LUNHUI_ANDROID_SDK", "sdkRootPath");
            SetAndroidToolPath("LUNHUI_ANDROID_NDK", "ndkRootPath");
            SetAndroidToolPath("LUNHUI_ANDROID_JDK", "jdkRootPath");
        }

        private static void SetAndroidToolPath(string environmentVariable, string propertyName)
        {
            string value = Environment.GetEnvironmentVariable(environmentVariable);
            if (string.IsNullOrWhiteSpace(value)) return;

            string path = Path.GetFullPath(value.Trim());
            if (!Directory.Exists(path))
                throw new BuildFailedException(environmentVariable + " directory does not exist: " + path);

            // The public setters validate the tool and disable its embedded-tool preference.
#if UNITY_ANDROID
            switch (propertyName)
            {
                case "sdkRootPath": UnityEditor.Android.AndroidExternalToolsSettings.sdkRootPath = path; break;
                case "ndkRootPath": UnityEditor.Android.AndroidExternalToolsSettings.ndkRootPath = path; break;
                case "jdkRootPath": UnityEditor.Android.AndroidExternalToolsSettings.jdkRootPath = path; break;
                default: throw new ArgumentOutOfRangeException(nameof(propertyName));
            }
#else
            // Build Android can also be invoked while another editor platform is active.
            Type settingsType = Type.GetType(
                "UnityEditor.Android.AndroidExternalToolsSettings, UnityEditor.Android.Extensions", true);
            var property = settingsType.GetProperty(propertyName,
                System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Static);
            if (property == null || !property.CanWrite)
                throw new BuildFailedException("Android toolchain API is unavailable: " + propertyName);
            try
            {
                property.SetValue(null, path);
            }
            catch (System.Reflection.TargetInvocationException exception)
            {
                throw new BuildFailedException(environmentVariable + ": " +
                    (exception.InnerException ?? exception).Message);
            }
#endif
            Debug.Log(environmentVariable + ": " + path);
        }
    }
}
