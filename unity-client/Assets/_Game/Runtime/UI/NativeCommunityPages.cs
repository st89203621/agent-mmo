using System;
using System.Collections.Generic;
using System.Linq;
using Lunhui.Protocol;
using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    public sealed class NativeCommunityPages : MonoBehaviour
    {
        private static NativeGameClient owner;
        private static int selectedTab, tradePage;
        private static float nextRefresh;
        private PrototypeApp app;
        private NativeGameClient native;
        private RectTransform teamRoot, tradeList;
        private TeamMessage renderedTeam;

        public static void Build(RectTransform root, PrototypeApp app)
        {
            root.gameObject.AddComponent<NativeCommunityPages>().Initialize(root, app);
        }

        private void Initialize(RectTransform root, PrototypeApp application)
        {
            app = application; native = app.Native;
            if (owner != native) { owner = native; selectedTab = tradePage = 0; nextRefresh = 0; }
            var content = UiKit.Rect(root, "NativeCommunityContent", 0, 108, 1280, 516);
            var views = new RectTransform[3];
            var tabs = new Button[3];
            string[] names = { "聊天", "队伍", "集市" };
            for (int i = 0; i < views.Length; i++)
            {
                int index = i;
                views[i] = UiKit.Rect(content, "CommunityView" + i, 0, 76, 1280, 440);
                views[i].gameObject.SetActive(false);
                tabs[i] = UiKit.Button(content, "CommunityTab" + i, names[i], 48 + i * 164, 8, 148, 48,
                    () => { selectedTab = index; SelectView(views, tabs); });
            }
            UiKit.IconButton(content, "RefreshCommunity", "reset", "刷新同游", 1176, 8,
                RefreshCommunity, size: 48);
            UiKit.Label(content, app.Native != null && app.Native.Connected ? "已连接" : "连接未就绪", 850, 8, 290, 48,
                20, app.Native != null && app.Native.Connected ? UiKit.Jade : UiKit.Red, TextAnchor.MiddleRight);
            teamRoot = views[1]; renderedTeam = native?.Team;
            BuildChat(views[0], app); BuildTeam(teamRoot, app); BuildTrade(views[2], app);
            SelectView(views, tabs);
            if (native != null) native.Changed += OnDataChanged;
            if (native != null && native.Connected && Time.unscaledTime >= nextRefresh)
            { nextRefresh = Time.unscaledTime + 4; RefreshCommunity(); }
        }

        private void RefreshCommunity() => app.RunOnline(() => native.RefreshCommunity(), refreshPage: false);

        private void OnDataChanged()
        {
            if (!isActiveAndEnabled) return;
            if (renderedTeam != native.Team)
            {
                renderedTeam = native.Team; Clear(teamRoot); BuildTeam(teamRoot, app);
            }
            Clear(tradeList); BuildTradeList(tradeList, app);
        }

        private static void Clear(Transform root)
        {
            for (int i = root.childCount - 1; i >= 0; i--)
            { root.GetChild(i).gameObject.SetActive(false); Destroy(root.GetChild(i).gameObject); }
        }

        private void OnDestroy() { if (native != null) native.Changed -= OnDataChanged; }

        private static void SelectView(RectTransform[] views, Button[] tabs)
        {
            for (int i = 0; i < views.Length; i++)
            {
                views[i].gameObject.SetActive(i == selectedTab);
                tabs[i].transform.Find("Accent").GetComponent<Image>().color = i == selectedTab ? UiKit.Gold : Color.clear;
                tabs[i].GetComponentInChildren<Text>().color = i == selectedTab ? UiKit.Paper : UiKit.Muted;
            }
        }

        private static void BuildChat(RectTransform root, PrototypeApp app)
        {
            var panel = UiKit.Rect(root, "ChatPanel", 48, 0, 1184, 428);
            panel.gameObject.AddComponent<ChatPanelController>().Initialize(panel, app);
        }

        private static void BuildTeam(RectTransform root, PrototypeApp app)
        {
            UiKit.Label(root, "同行者", 48, 16, 540, 42, 28, UiKit.Paper);
            var team = app.Native?.Team;
            if (team == null || string.IsNullOrEmpty(team.TeamId))
            {
                UiKit.Label(root, "尚未加入队伍", 48, 92, 520, 44, 24, UiKit.Muted);
                UiKit.Button(root, "CreateTeam", "创建队伍", 48, 174, 300, 58,
                    () => app.RunOnline(() => app.Native.CreateTeam(), "队伍已创建"), true);
                UiKit.Panel(root, "TeamDivider", 640, 30, 1, 330, new Color32(85,96,96,120));
                UiKit.Label(root, "加入同行者", 712, 92, 480, 44, 24, UiKit.Paper);
                var teamId = UiKit.Input(root, "JoinTeamId", "", "队伍 ID", 712, 174, 480, 58, 20);
                UiKit.Button(root, "JoinTeam", "加入队伍", 892, 256, 300, 58, () =>
                {
                    if (string.IsNullOrWhiteSpace(teamId.text)) { app.Toast("请输入队伍 ID"); return; }
                    app.RunOnline(() => app.Native.JoinTeam(teamId.text.Trim()), "已加入队伍");
                }, true);
            }
            else
            {
                UiKit.Label(root, "队伍 " + team.TeamId, 48, 94, 820, 48, 28, UiKit.Gold);
                UiKit.Label(root, "队长 " + team.LeaderName + "    成员 " + team.TeamSize + "/4", 48, 160, 1100, 44, 24, UiKit.Paper);
                UiKit.Label(root, team.Status, 48, 218, 1100, 40, 21, UiKit.Muted);
                UiKit.Button(root, "LeaveTeam", "离开队伍", 48, 310, 300, 58,
                    () => app.RunOnline(() => app.Native.LeaveTeam(), "已离开队伍"));
            }
        }

        private void BuildTradeList(RectTransform root, PrototypeApp app)
        {
            UiKit.Label(root, "在售物品", 48, 8, 640, 42, 26, UiKit.Paper);
            var listings = app.Native?.Trades ?? new List<TradeMessage>();
            int last = Math.Max(0, (listings.Count - 1) / 4);
            tradePage = Mathf.Clamp(tradePage, 0, last);
            for (int i = 0; i < 4 && tradePage * 4 + i < listings.Count; i++)
            {
                var item = listings[tradePage * 4 + i]; float y = 68 + i * 70;
                UiKit.Label(root, item.ItemId + "  ·  " + item.Quantity + " 件", 48, y, 360, 30, 22, UiKit.Paper);
                UiKit.Label(root, item.Price.ToString("N0") + " 金币  ·  " + item.Status, 48, y + 30, 460, 27, 19, UiKit.Muted);
                if (item.SellerId != app.Native?.Person?.UserId && item.Status == "OPEN")
                    UiKit.Button(root, "BuyTrade" + i, "购买", 544, y, 136, 52,
                        () => app.ShowDialog("确认购买", item.ItemId + "\n数量 " + item.Quantity + "\n单价 " + item.Price.ToString("N0") + " 金币",
                            () => app.RunOnline(() => app.Native.AcceptTrade(item.TradeId), "购买请求已提交"), "购买"));
            }
            if (listings.Count == 0) UiKit.Label(root, "暂无在售物品", 48, 126, 600, 48, 23, UiKit.Muted);
            var previous = UiKit.IconButton(root, "TradePrevious", "back", "上一页", 48, 376,
                () => { tradePage--; Clear(tradeList); BuildTradeList(tradeList, app); }, size: 48);
            var next = UiKit.IconButton(root, "TradeNext", "dodge", "下一页", 248, 376,
                () => { tradePage++; Clear(tradeList); BuildTradeList(tradeList, app); }, size: 48);
            previous.interactable = tradePage > 0; next.interactable = tradePage < last;
            UiKit.Label(root, (tradePage + 1) + " / " + (last + 1), 112, 376, 120, 48, 21, UiKit.Muted, TextAnchor.MiddleCenter);
        }

        private void BuildTrade(RectTransform root, PrototypeApp app)
        {
            tradeList = UiKit.Rect(root, "TradeListings", 0, 0, 708, 440);
            BuildTradeList(tradeList, app);
            UiKit.Panel(root, "TradeDivider", 728, 8, 1, 406, new Color32(85,96,96,120));
            UiKit.Label(root, "出售物品", 776, 8, 448, 42, 26, UiKit.Paper);
            var itemId = UiKit.Input(root, "TradeItemId", "", "物品 ID", 776, 82, 448, 56, 80);
            UiKit.Label(root, "数量", 776, 164, 208, 32, 20, UiKit.Muted);
            UiKit.Label(root, "单价 / 金币", 1016, 164, 208, 32, 20, UiKit.Muted);
            var quantity = UiKit.Input(root, "TradeQuantity", "1", "数量", 776, 208, 208, 56, 9);
            var price = UiKit.Input(root, "TradePrice", "", "单价", 1016, 208, 208, 56, 9);
            quantity.contentType = price.contentType = InputField.ContentType.IntegerNumber;
            UiKit.Button(root, "CreateTrade", "上架", 776, 316, 448, 58, () =>
            {
                if (string.IsNullOrWhiteSpace(itemId.text) || !int.TryParse(quantity.text, out int count) || count <= 0 ||
                    !int.TryParse(price.text, out int unitPrice) || unitPrice <= 0)
                { app.Toast("请填写物品、正整数数量与单价"); return; }
                app.RunOnline(() => app.Native.CreateTrade(itemId.text.Trim(), count, unitPrice), "已提交集市挂单");
            }, true);
        }
    }

    public sealed class ChatPanelController : MonoBehaviour
    {
        private static readonly string[] Channels = { "世界", "私聊", "系统", "全部" };
        private PrototypeApp app;
        private NativeGameClient native;
        private RectTransform panel, messages;
        private ScrollRect scroll;
        private InputField composer, receiver;
        private Button send;
        private readonly List<Button> tabs = new List<Button>();
        private int channel;
        private float Width => panel.rect.width;
        private float ComposerY => panel.rect.height - 108;

        public void Initialize(RectTransform owner, PrototypeApp ownerApp)
        {
            panel = owner; app = ownerApp; native = app.Native;
            for (int i = 0; i < Channels.Length; i++)
            {
                int index = i;
                tabs.Add(UiKit.Button(panel, "ChatChannel" + i, Channels[i], i * 104, 0, 92, 44, () => SelectChannel(index)));
            }
            var viewport = UiKit.Panel(panel, "ChatViewport", 0, 58, Width, ComposerY - 74, new Color32(18,22,25,255));
            viewport.GetComponent<Image>().raycastTarget = true;
            viewport.gameObject.AddComponent<RectMask2D>();
            messages = UiKit.Rect(viewport, "ChatMessages", 0, 0, Width, viewport.rect.height);
            scroll = viewport.gameObject.AddComponent<ScrollRect>();
            scroll.content = messages; scroll.viewport = viewport; scroll.horizontal = false;
            scroll.movementType = ScrollRect.MovementType.Clamped; scroll.scrollSensitivity = 46;
            receiver = UiKit.Input(panel, "ChatReceiver", "", "玩家 ID", 0, ComposerY, 200, 52, 20);
            composer = UiKit.Input(panel, "ChatComposer", "", "说点什么…", 0, ComposerY, Width - 132, 52, 60);
            send = UiKit.Button(panel, "ChatSend", "发送", Width - 112, ComposerY, 112, 52, Send, true);
            string[] phrases = { "组队吗", "求组队", "谢谢", "收到" };
            for (int i = 0; i < phrases.Length; i++)
            {
                string phrase = phrases[i];
                UiKit.Button(panel, "ChatQuick" + i, phrase, i * 128, panel.rect.height - 44, 116, 44,
                    () => { composer.text = phrase; composer.ActivateInputField(); });
            }
            if (native != null) native.Changed += Refresh;
            SelectChannel(0, false);
        }

        private void SelectChannel(int index, bool markRead = true)
        {
            channel = index;
            for (int i = 0; i < tabs.Count; i++)
            {
                tabs[i].transform.Find("Accent").GetComponent<Image>().color = i == channel ? UiKit.Gold : Color.clear;
                tabs[i].GetComponentInChildren<Text>().color = i == channel ? UiKit.Paper : UiKit.Muted;
            }
            bool direct = channel == 1;
            receiver.gameObject.SetActive(direct);
            float x = direct ? 220 : 0, width = Width - 132 - x;
            composer.GetComponent<RectTransform>().anchoredPosition = new Vector2(x, -ComposerY);
            composer.GetComponent<RectTransform>().sizeDelta = new Vector2(width, 52);
            composer.textComponent.rectTransform.sizeDelta = new Vector2(width - 36, 52);
            composer.placeholder.rectTransform.sizeDelta = new Vector2(width - 36, 52);
            ((RectTransform)composer.transform.Find("InputRule")).sizeDelta = new Vector2(width, 2);
            composer.interactable = send.interactable = channel != 2;
            if (markRead) MarkRead();
            Refresh(); scroll.verticalNormalizedPosition = 0;
        }

        private void MarkRead()
        {
            if (channel == 0) native?.MarkChatRead(NativeGameClient.WorldChatType);
            else if (channel == 1) native?.MarkChatRead(NativeGameClient.PrivateChatType);
        }

        private void OnEnable() { if (native != null) { MarkRead(); Refresh(); } }

        private void Refresh()
        {
            if (!messages) return;
            bool atBottom = scroll.verticalNormalizedPosition <= .05f;
            for (int i = messages.childCount - 1; i >= 0; i--)
            { messages.GetChild(i).gameObject.SetActive(false); Destroy(messages.GetChild(i).gameObject); }
            var history = app.Native?.ChatHistory ?? new List<ChatMessage>();
            var visible = history.Where(message => channel == 3 || message.ChatType == channel + 1).TakeLast(50);
            float y = 12;
            foreach (var message in visible)
            {
                bool mine = message.SenderId == app.Native?.Person?.UserId;
                UiKit.Label(messages, (string.IsNullOrEmpty(message.SenderName) ? "旅人" : message.SenderName) + "  " + FormatTime(message.Timestamp),
                    18, y, Width - 36, 28, 18, mine ? UiKit.Gold : UiKit.Jade);
                var text = UiKit.Label(messages, message.Content ?? "", 18, y + 30, Width - 36, 30, 22, UiKit.Paper, TextAnchor.UpperLeft);
                text.resizeTextForBestFit = false;
                float height = Mathf.Max(30, text.preferredHeight);
                text.rectTransform.sizeDelta = new Vector2(Width - 36, height);
                y += height + 50;
            }
            if (y == 12) UiKit.Label(messages, "暂无消息", 18, 66, Width - 36, 44, 23, UiKit.Muted, TextAnchor.MiddleCenter);
            messages.sizeDelta = new Vector2(Width, Mathf.Max(scroll.viewport.rect.height, y));
            Canvas.ForceUpdateCanvases();
            if (atBottom) scroll.verticalNormalizedPosition = 0;
        }

        private void Send()
        {
            string content = composer.text.Trim();
            if (content.Length == 0) { app.Toast("请输入消息"); return; }
            if (channel == 2) return;
            long receiverId = 0;
            if (channel == 1 && (!long.TryParse(receiver.text.Trim(), out receiverId) || receiverId <= 0))
            { app.Toast("请输入正确的玩家 ID"); return; }
            bool direct = channel == 1;
            app.RunOnline(async () =>
            {
                send.interactable = false;
                try
                {
                    if (direct) await app.Native.SendPrivateChat(receiverId, content);
                    else await app.Native.SendWorldChat(content);
                    if (composer && composer.text.Trim() == content) composer.text = "";
                }
                finally { if (send) send.interactable = channel != 2; }
            }, refreshPage: false);
        }

        private static string FormatTime(long timestamp)
        {
            if (timestamp <= 0) return "";
            try { return DateTimeOffset.FromUnixTimeMilliseconds(timestamp < 100000000000L ? timestamp * 1000 : timestamp).ToLocalTime().ToString("HH:mm"); }
            catch (ArgumentOutOfRangeException) { return ""; }
        }

        private void OnDestroy() { if (native != null) native.Changed -= Refresh; }
    }
}
