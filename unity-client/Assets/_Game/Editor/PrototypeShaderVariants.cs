using System.Collections.Generic;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Rendering;
using UnityEngine;

namespace Lunhui.Prototype
{
    public sealed class PrototypeShaderVariants : IPreprocessShaders
    {
        public int callbackOrder => 0;
        // Imported characters and terrain require normal-map and cutout variants.
        // Only features absent from both authored assets and runtime materials are stripped.
        private static readonly HashSet<string> UnusedKeywords = new HashSet<string>
        {
            "_PARALLAXMAP", "_DETAIL_MULX2", "_SMOOTHNESS_TEXTURE_ALBEDO_CHANNEL_A",
            "_METALLICGLOSSMAP", "_OCCLUSIONMAP", "_ALPHABLEND_ON"
        };

        public void OnProcessShader(Shader shader, ShaderSnippetData snippet, IList<ShaderCompilerData> variants)
        {
            if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.Android || shader.name != "Standard") return;
            int before = variants.Count;
            for (int i = variants.Count - 1; i >= 0; i--)
            {
                foreach (var keyword in variants[i].shaderKeywordSet.GetShaderKeywords())
                {
                    if (!UnusedKeywords.Contains(keyword.name)) continue;
                    variants.RemoveAt(i);
                    break;
                }
            }
            Debug.Log($"Lunhui Standard {snippet.passName}: retained {variants.Count} of {before} shader variants.");
        }
    }
}
