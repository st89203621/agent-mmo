using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace Lunhui.Prototype
{
    /// <summary>Imports the two downloaded Bestiary models into mobile-friendly prefabs.</summary>
    public static class MonsterArtSetup
    {
        private const string Source = "Assets/_Game/Art/MonsterSources";
        private const string Output = "Assets/_Game/Resources/Art/Monsters";
        private static readonly string[] Models = { "Imp", "Puglin" };
        private static readonly float[] Heights = { 1.75f, 1.55f };

        public static void ValidateAssets()
        {
            for (int index = 0; index < Models.Length; index++)
            {
                string path = Output + "/Monster" + index + ".prefab";
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (!prefab) throw new InvalidOperationException("Missing monster prefab: " + path);
                var skins = prefab.GetComponentsInChildren<SkinnedMeshRenderer>(true);
                if (skins.Length == 0) throw new InvalidOperationException("Empty monster prefab: " + path);
                foreach (var skin in skins)
                    if (!skin.sharedMesh || skin.sharedMesh.vertexCount == 0 || !skin.sharedMaterial)
                        throw new InvalidOperationException("Broken mesh/material reference: " + path + "/" + skin.name + ". Run Lunhui/Build Monster Art.");
            }
        }

        [MenuItem("Lunhui/Build Monster Art")]
        public static void BuildAssets()
        {
            Directory.CreateDirectory(Output);
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            for (int i = 0; i < Models.Length; i++) BuildModel(i);
            AssetDatabase.SaveAssets();
            ValidateAssets();
            Debug.Log("MONSTER_ART_COMPLETE models=" + Models.Length + " variants=4");
        }

        private static void BuildModel(int index)
        {
            string path = Source + "/" + Models[index] + ".fbx";
            var importer = AssetImporter.GetAtPath(path) as ModelImporter;
            if (importer == null) throw new InvalidOperationException("Monster FBX is missing: " + path);
            importer.animationType = ModelImporterAnimationType.Legacy;
            importer.importAnimation = true;
            importer.importCameras = false;
            importer.importLights = false;
            importer.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
            importer.isReadable = false;
            var clips = importer.defaultClipAnimations;
            foreach (var clip in clips)
            {
                string name = clip.name.ToLowerInvariant();
                clip.loopTime = name.Contains("idle") || name.Contains("walk") || name.Contains("run") || name.Contains("move");
                clip.lockRootPositionXZ = true;
                clip.lockRootHeightY = true;
                clip.lockRootRotation = true;
                clip.keepOriginalPositionXZ = true;
                clip.keepOriginalPositionY = true;
            }
            importer.clipAnimations = clips;
            importer.SaveAndReimport();

            var source = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            if (!source) throw new InvalidOperationException("Monster source failed to import: " + path);
            var root = new GameObject("Monster" + index + " " + Models[index]);
            try
            {
                var model = UnityEngine.Object.Instantiate(source, root.transform);
                var importedClips = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>()
                    .Where(clip => !clip.name.StartsWith("__preview__", StringComparison.Ordinal)).ToArray();
                // The free Bestiary exports are intentionally small and may
                // omit animation clips.  Static models remain valid enemies;
                // MonsterVisual will use its idle fallback in that case.
                var idle = importedClips.FirstOrDefault(clip => clip.name.ToLowerInvariant().Contains("idle"));
                if (idle != null) idle.SampleAnimation(model, 0);
                Bounds bones = new Bounds();
                bool measured = false;
                foreach (var skin in model.GetComponentsInChildren<SkinnedMeshRenderer>())
                {
                    skin.updateWhenOffscreen = true;
                    foreach (var bone in skin.bones)
                    {
                        if (!bone) continue;
                        if (!measured) { bones = new Bounds(bone.position, Vector3.zero); measured = true; }
                        else bones.Encapsulate(bone.position);
                    }
                }
                if (!measured || bones.size.y < .01f) throw new InvalidOperationException("Monster skeleton is empty: " + Models[index]);
                root.transform.localScale = Vector3.one * (Heights[index] / bones.size.y);
                model.transform.localPosition -= new Vector3(bones.center.x, bones.min.y, bones.center.z);
                var animation = model.GetComponent<Animation>() ?? model.AddComponent<Animation>();
                animation.playAutomatically = false;
                animation.cullingType = AnimationCullingType.BasedOnRenderers;
                foreach (var clip in importedClips) animation.AddClip(clip, clip.name);
                if (idle != null) animation.clip = idle;
                PrefabUtility.SaveAsPrefabAsset(root, Output + "/Monster" + index + ".prefab");
                Debug.Log("MONSTER_ART " + Models[index] + " height=" + Heights[index] + " scale=" + root.transform.localScale + " clips=" + string.Join(",", importedClips.Select(clip => clip.name)));
            }
            finally { UnityEngine.Object.DestroyImmediate(root); }
        }
    }
}
