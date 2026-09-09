using System;
using UnityEditor;
using UnityEngine;

namespace Lunhui.Prototype
{
    public sealed class EnvironmentArtImport : AssetPostprocessor
    {
        private void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith("Assets/_Game/Resources/Art/", StringComparison.Ordinal)) return;
            var importer = (TextureImporter)assetImporter;
            bool mapArt = assetPath.Contains("/MapExpansion/");
            bool normal = assetPath.IndexOf("_normal", StringComparison.OrdinalIgnoreCase) >= 0 || mapArt && assetPath.Contains("_nor_gl_");
            bool data = normal || assetPath.IndexOf("_roughness", StringComparison.OrdinalIgnoreCase) >= 0 || mapArt && assetPath.Contains("_rough_");
            importer.textureType = normal ? TextureImporterType.NormalMap : TextureImporterType.Default;
            importer.sRGBTexture = !data;
            importer.mipmapEnabled = assetPath.Contains("/Textures/") || mapArt;
            importer.wrapMode = importer.mipmapEnabled ? TextureWrapMode.Repeat : TextureWrapMode.Clamp;
            importer.maxTextureSize = 1024;
            importer.isReadable = false;
            importer.anisoLevel = importer.mipmapEnabled ? 4 : 1;
            importer.textureCompression = TextureImporterCompression.Compressed;
            importer.SetPlatformTextureSettings(new TextureImporterPlatformSettings
            {
                name = "Android", overridden = true, maxTextureSize = 1024,
                format = TextureImporterFormat.ASTC_6x6, compressionQuality = 50
            });
        }

        [MenuItem("Lunhui/Reimport Environment Art")]
        public static void Reimport()
        {
            foreach (string guid in AssetDatabase.FindAssets("t:Texture2D", new[] { "Assets/_Game/Resources/Art/Textures" }))
                AssetDatabase.ImportAsset(AssetDatabase.GUIDToAssetPath(guid), ImportAssetOptions.ForceUpdate);
        }
    }
}
