using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    public sealed partial class PrototypeApp
    {
        private GameServerSettings serverDraft;
        private Button[] serverButtons;
        private bool serverSettingsOpen;

        private void BuildServerSelector(Transform parent, float x, float y, float width)
        {
            serverDraft = GameServerSettings.Load();
            serverButtons = new Button[3];
            float buttonWidth = (width - 16) / 3;
            for (int i = 0; i < serverButtons.Length; i++)
            {
                int index = i;
                serverButtons[i] = UiKit.Button(parent, "ServerPreset" + i, GameServerSettings.Names[i],
                    x + i * (buttonWidth + 8), y, buttonWidth, 48, () => SelectServer(index), i == serverDraft.Selected);
            }
            endpointInput = UiKit.Input(parent, serverSettingsOpen ? "ServerConfigEndpoint" : "GameEndpoint", serverDraft.Endpoint, "ws://电脑的局域网IP:端口", x, y + 64, width, 54, 240);
            endpointInput.keyboardType = TouchScreenKeyboardType.URL;
            endpointInput.textComponent.fontSize = 22;
            endpointInput.textComponent.resizeTextMaxSize = 22;
        }

        private void SelectServer(int index)
        {
            if (loginBusy || serverDraft == null || !endpointInput) return;
            if (!string.IsNullOrWhiteSpace(endpointInput.text)
                && !GameServerSettings.TryNormalizeEndpoint(endpointInput.text, false, out _, out string error))
            { SetOnlineStatus(error, true); return; }
            serverDraft.Endpoint = endpointInput.text.Trim();
            serverDraft.Selected = index;
            endpointInput.text = serverDraft.Endpoint;
            for (int i = 0; i < serverButtons.Length; i++)
            {
                var button = serverButtons[i];
                button.GetComponent<Image>().color = i == index ? new Color32(47, 97, 80, 245) : new Color32(28, 44, 45, 242);
                button.transform.Find("Accent").GetComponent<Image>().color = i == index ? UiKit.Gold : new Color32(80, 104, 98, 190);
                var label = button.GetComponentInChildren<Text>();
                if (label) label.color = i == index ? UiKit.Paper : UiKit.Muted;
            }
            SetOnlineStatus("");
        }

        private bool SaveServerSelection(out string endpoint)
        {
            bool mobile = Application.platform == RuntimePlatform.Android || Application.platform == RuntimePlatform.IPhonePlayer;
            if (!GameServerSettings.TryNormalizeEndpoint(endpointInput.text, mobile, out endpoint, out string error))
            { SetOnlineStatus(error, true); return false; }
            serverDraft.Endpoint = endpoint;
            if (!SuppressPersistence) serverDraft.Save();
            return true;
        }

        public void OpenServerSettings()
        {
            CloseDialog();
            World.SetMove(Vector2.zero);
            World.SetInputBlocked(true);
            Combat.SetRunning(false);
            serverSettingsOpen = true;
            modal = UiKit.Panel(stage, "ServerSettingsDialog", 0, 0, 1280, 720, new Color(0, 0, 0, .76f));
            modal.GetComponent<Image>().raycastTarget = true;
            UiKit.Panel(modal, "ServerSettingsBody", 266, 80, 748, 560, UiKit.Ink);
            UiKit.Label(modal, "区服设置", 306, 104, 560, 50, 32, UiKit.Paper);
            UiKit.IconButton(modal, "CloseServerSettings", "close", "关闭", 934, 104, CloseDialog);
            UiKit.Label(modal, "下次登录区服", 306, 178, 630, 30, 20, UiKit.Muted);
            BuildServerSelector(modal, 306, 222, 668);
            UiKit.IconButton(modal, "ServerConfigReset", "reset", "恢复当前区服默认地址", 934, 174, () =>
            {
                endpointInput.text = new GameServerSettings { Selected = serverDraft.Selected }.Endpoint;
                SetOnlineStatus("");
            }, size: 40);
            string connection = OnlineMode ? "当前连接：" + Network.Endpoint : "当前为本地试玩";
            UiKit.Label(modal, connection, 306, 360, 668, 52, 20, UiKit.Muted);
            onlineStatus = UiKit.Label(modal, "", 306, 424, 668, 54, 20, UiKit.Muted);
            UiKit.Button(modal, "ServerConfigSave", "保存配置", 306, 516, 318, 60, () =>
            {
                if (!SaveServerSelection(out _)) return;
                CloseDialog();
                if (CurrentPage == "settings" || CurrentPage == "login") ShowPage(CurrentPage);
                Toast("区服配置已保存");
            });
            UiKit.Button(modal, "ServerConfigSwitch", "保存并切服登录", 644, 516, 330, 60, () =>
            {
                if (!SaveServerSelection(out _)) return;
                CloseDialog();
                Save(); LeaveOnlineSession(); DemoMode = false; State = Load(false);
                ShowPage("login"); OpenOnlineLogin();
            }, true);
        }

        private void CloseServerSettings()
        {
            if (!serverSettingsOpen) return;
            serverSettingsOpen = false;
            ClearLoginInputs();
        }
    }
}
