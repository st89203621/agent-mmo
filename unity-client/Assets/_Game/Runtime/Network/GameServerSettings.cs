using System;
using UnityEngine;

namespace Lunhui
{
    [Serializable]
    public sealed class GameServerSettings
    {
        public const string PreferenceKey = "Lunhui.Network.Servers.v1";
        public const string LegacyEndpointPreference = "Lunhui.Network.Endpoint";
        public const string DefaultCompany = "ws://192.168.74.47:9200";
        public const string DefaultHome = "ws://192.168.31.169:10100/websocket";
        public static readonly string[] Names = { "公司区服", "家里区服", "自定义" };
        public int Selected;
        public string Company = DefaultCompany;
        public string Home = DefaultHome;
        public string Custom = "";

        public string Name => Names[Mathf.Clamp(Selected, 0, 2)];
        public string Endpoint
        {
            get => Selected == 1 ? Home : Selected == 2 ? Custom : Company;
            set { if (Selected == 1) Home = value; else if (Selected == 2) Custom = value; else Company = value; }
        }

        public static GameServerSettings Load()
        {
            GameServerSettings settings = null;
            try
            {
                if (PlayerPrefs.HasKey(PreferenceKey))
                    settings = JsonUtility.FromJson<GameServerSettings>(PlayerPrefs.GetString(PreferenceKey));
            }
            catch (ArgumentException) { }
            if (settings == null)
            {
                settings = new GameServerSettings();
                // Keep a previously entered address available when upgrading to profiles.
                string legacy = PlayerPrefs.GetString(LegacyEndpointPreference, "");
                if (TryNormalizeEndpoint(legacy, false, out string saved, out _)
                    && new Uri(saved) != new Uri(DefaultCompany) && new Uri(saved) != new Uri(DefaultHome))
                    settings.Custom = saved;
            }
            settings.Selected = Mathf.Clamp(settings.Selected, 0, 2);
            if (!TryNormalizeEndpoint(settings.Company, false, out _, out _)) settings.Company = DefaultCompany;
            if (!TryNormalizeEndpoint(settings.Home, false, out _, out _)) settings.Home = DefaultHome;
            if (!TryNormalizeEndpoint(settings.Custom, false, out _, out _)) settings.Custom = "";
            return settings;
        }

        public void Save()
        {
            PlayerPrefs.SetString(PreferenceKey, JsonUtility.ToJson(this));
            PlayerPrefs.SetString(LegacyEndpointPreference, Endpoint);
            PlayerPrefs.Save();
        }

        public static bool TryNormalizeEndpoint(string value, bool rejectLoopback, out string endpoint, out string error)
        {
            endpoint = (value ?? "").Trim();
            error = "请输入有效的 ws:// 或 wss:// 游戏服地址";
            if (endpoint.Length == 0 || endpoint.Length > 240 || Array.Exists(endpoint.ToCharArray(), char.IsWhiteSpace)
                || endpoint.Contains("\\") || !Uri.TryCreate(endpoint, UriKind.Absolute, out var uri)
                || (uri.Scheme != "ws" && uri.Scheme != "wss") || string.IsNullOrEmpty(uri.Host)
                || uri.Port <= 0 || !string.IsNullOrEmpty(uri.UserInfo) || !string.IsNullOrEmpty(uri.Fragment)) return false;
            if (rejectLoopback && (uri.IsLoopback || uri.Host.Trim('[', ']') == "::" || uri.Host == "0.0.0.0"))
            {
                error = "请填写电脑的局域网 IP，手机不能连接本机回环地址";
                return false;
            }
            error = "";
            return true;
        }
    }
}
