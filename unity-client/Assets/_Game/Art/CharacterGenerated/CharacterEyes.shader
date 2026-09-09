Shader "Lunhui/CharacterEyes"
{
    Properties
    {
        _MainTex ("Eye Texture", 2D) = "white" {}
        _BumpMap ("Normal Map", 2D) = "bump" {}
        _BumpScale ("Normal Strength", Range(0, 1)) = 0.25
        _Color ("Sclera Tint", Color) = (1, 1, 1, 1)
        _IrisColor ("Iris Color", Color) = (0.28, 0.14, 0.08, 1)
        _Glossiness ("Smoothness", Range(0, 1)) = 0.75
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" }
        LOD 200
        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows
        #pragma target 3.0
        #include "UnityStandardUtils.cginc"
        sampler2D _MainTex, _BumpMap;
        half4 _Color, _IrisColor;
        half _Glossiness, _BumpScale;
        struct Input { float2 uv_MainTex; float2 uv_BumpMap; };
        void surf(Input IN, inout SurfaceOutputStandard o)
        {
            half3 color = tex2D(_MainTex, IN.uv_MainTex).rgb;
            half maximum = max(color.r, max(color.g, color.b));
            half minimum = min(color.r, min(color.g, color.b));
            // The source atlas has a colored iris and neutral sclera/pupil.
            half iris = smoothstep(0.12, 0.32, (maximum - minimum) / max(maximum, 0.01));
            half luminance = dot(color, half3(0.299, 0.587, 0.114));
            o.Albedo = lerp(color * _Color.rgb, _IrisColor.rgb * luminance * 3.5, iris);
            o.Normal = UnpackScaleNormal(tex2D(_BumpMap, IN.uv_BumpMap), _BumpScale);
            o.Smoothness = _Glossiness;
            o.Alpha = 1;
        }
        ENDCG
    }
    FallBack "Standard"
}
