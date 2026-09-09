using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace Lunhui.Prototype
{
    public static class BossArtSetup
    {
        private const string Source = "Assets/_Game/Art/BossSources";
        private const string Output = "Assets/_Game/Resources/Art/Bosses";
        private static readonly string[] Models = { "MushroomKing", "Squidle", "Goleling_Evolved", "Orc_Skull", "Dragon_Evolved" };
        private static readonly float[] Heights = { 3.7f, 3.8f, 4.1f, 3.9f, 4.4f };

        [MenuItem("Lunhui/Build Boss Art")]
        public static void BuildAssets()
        {
            Directory.CreateDirectory(Output);
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            string atlasPath = Source + "/Atlas_Monsters.png";
            var textureImporter = (TextureImporter)AssetImporter.GetAtPath(atlasPath);
            textureImporter.wrapMode = TextureWrapMode.Clamp;
            textureImporter.filterMode = FilterMode.Point;
            textureImporter.mipmapEnabled = false;
            textureImporter.SaveAndReimport();
            var atlas = AssetDatabase.LoadAssetAtPath<Texture2D>(atlasPath);
            if (!atlas) throw new InvalidOperationException("Boss palette atlas is missing.");
            for (int i = 0; i < Models.Length; i++) BuildModel(i, atlas);
            AssetDatabase.SaveAssets();
            Debug.Log("BOSS_ART_COMPLETE models=" + Models.Length);
        }

        private static void BuildModel(int index, Texture2D atlas)
        {
            string path = Source + "/" + Models[index] + ".fbx";
            var importer = AssetImporter.GetAtPath(path) as ModelImporter;
            if (importer == null) throw new InvalidOperationException("Boss FBX is missing: " + path);
            importer.animationType = ModelImporterAnimationType.Legacy;
            importer.importAnimation = true;
            importer.importCameras = false;
            importer.importLights = false;
            importer.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
            importer.isReadable = false;
            var clipSettings = importer.defaultClipAnimations;
            foreach (var clip in clipSettings)
            {
                string name = clip.name.ToLowerInvariant();
                clip.loopTime = name.Contains("idle") || name.Contains("walk") || name.Contains("run") || name.Contains("flying");
                clip.lockRootPositionXZ = true;
                clip.lockRootHeightY = true;
                clip.lockRootRotation = true;
                clip.keepOriginalPositionXZ = true;
                clip.keepOriginalPositionY = true;
            }
            importer.clipAnimations = clipSettings;
            importer.SaveAndReimport();
            string materialPath = Output + "/Boss" + (index + 1) + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
            if (!material)
            {
                material = new Material(Shader.Find("Standard"));
                AssetDatabase.CreateAsset(material, materialPath);
            }
            material.mainTexture = atlas;
            material.color = Color.white;
            material.SetFloat("_Metallic", index == 2 ? .28f : 0);
            material.SetFloat("_Glossiness", index == 2 ? .34f : .2f);
            EditorUtility.SetDirty(material);

            var root = new GameObject("Boss" + (index + 1) + " " + Models[index]);
            try
            {
                var model = UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path), root.transform);
                var clips = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>()
                    .Where(clip => !clip.name.StartsWith("__preview__", StringComparison.Ordinal)).ToArray();
                if (clips.Length == 0) throw new InvalidOperationException("Boss has no animation: " + Models[index]);
                var idle = clips.FirstOrDefault(clip => clip.name.ToLowerInvariant().Contains("idle")) ?? clips[0];
                idle.SampleAnimation(model, 0);
                var skins = model.GetComponentsInChildren<SkinnedMeshRenderer>();
                if (skins.Length == 0) throw new InvalidOperationException("Boss has no skin: " + Models[index]);
                Bounds bounds = new Bounds();
                bool measured = false;
                foreach (var skin in skins)
                {
                    skin.sharedMaterials = Enumerable.Repeat(material, skin.sharedMaterials.Length).ToArray();
                    skin.updateWhenOffscreen = true;
                    // The source FBXs use a 100x mesh transform. Bone world coordinates measure their actual animated scale.
                    foreach (var bone in skin.bones)
                    {
                        if (!bone) continue;
                        if (!measured) { bounds = new Bounds(bone.position, Vector3.zero); measured = true; }
                        else bounds.Encapsulate(bone.position);
                    }
                }
                if (!measured || bounds.size.y < .01f) throw new InvalidOperationException("Boss skeleton is empty: " + Models[index]);
                float scale = Heights[index] / bounds.size.y;
                root.transform.localScale = Vector3.one * scale;
                model.transform.localPosition -= new Vector3(bounds.center.x, bounds.min.y, bounds.center.z);
                var animation = model.GetComponent<Animation>();
                if (!animation) animation = model.AddComponent<Animation>();
                animation.playAutomatically = false;
                animation.cullingType = AnimationCullingType.BasedOnRenderers;
                foreach (var clip in clips) animation.AddClip(clip, clip.name);
                animation.clip = idle;
                PrefabUtility.SaveAsPrefabAsset(root, Output + "/Boss" + (index + 1) + ".prefab");
                Debug.Log("BOSS_ART " + (index + 1) + " " + Models[index] + " height=" + Heights[index] + " scale=" + scale + " bounds=" + bounds + " clips=" + string.Join(",", clips.Select(clip => clip.name)));
            }
            finally { UnityEngine.Object.DestroyImmediate(root); }
        }
    }
}
