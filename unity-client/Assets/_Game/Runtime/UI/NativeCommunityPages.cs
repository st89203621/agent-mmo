using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    public static class NativeCommunityPages
    {
        private static float nextRefresh;

        public static void Build(RectTransform root, PrototypeApp app)
        {
            var content = UiKit.Panel(root, "NativeCommunityContent", 0, 108, 1280, 516, Color.clear);
            UiKit.Label(content, "同游 · 交流与集市", 48, 10, 650, 52, 34, UiKit.Paper);
            UiKit.Label(content, "在线状态：" + (app.Native != null && app.Native.Connected ? "已连接" : "未连接"), 860, 18, 370, 34, 20,
                app.Native != null && app.Native.Connected ? UiKit.Jade : UiKit.Red, TextAnchor.MiddleRight);
            UiKit.Panel(content, "Rule", 48, 72, 1184, 1, UiKit.Muted);
            BuildChat(content, app); BuildTeam(content, app); BuildTrade(content, app);
            if (Time.unscaledTime >= nextRefresh && app.Native != null && app.Native.Connected)
            { nextRefresh = Time.unscaledTime + 4; app.RunOnline(() => app.Native.RefreshCommunity()); }
        }

        private static void BuildChat(RectTransform root, PrototypeApp app)
        {
            var panel = UiKit.Panel(root, "ChatPanel", 48, 98, 620, 314, new Color32(13, 30, 30, 244));
            panel.GetComponent<Image>().raycastTarget = true;
            panel.gameObject.AddComponent<ChatPanelController>().Initialize(panel, app);
        }

        private static void BuildTeam(RectTransform root, PrototypeApp app)
        {
            UiKit.Label(root, "组队冒险", 700, 98, 340, 38, 27, UiKit.Gold);
            var team = app.Native?.Team;
            if (team == null || string.IsNullOrEmpty(team.TeamId))
            {
                UiKit.Label(root, "和朋友组成小队，再进入同一张地图并肩作战。", 700, 148, 500, 34, 19, UiKit.Muted);
                UiKit.Button(root, "CreateTeam", "创建队伍", 700, 200, 180, 52, () => app.RunOnline(() => app.Native.CreateTeam(), "队伍已创建"), true);
                var teamId = UiKit.Input(root, "JoinTeamId", "", "输入队伍 ID", 700, 270, 300, 52, 20);
                UiKit.Button(root, "JoinTeam", "加入队伍", 1018, 270, 180, 52, () => app.RunOnline(() => app.Native.JoinTeam(teamId.text), "已加入队伍"), true);
            }
            else
            {
                UiKit.Label(root, "队伍 " + team.TeamId + "\n队长：" + team.LeaderName + "    成员：" + team.TeamSize + "/4\n状态：" + team.Status,
                    700, 148, 500, 116, 21, UiKit.Paper);
                UiKit.Label(root, "把队伍 ID 发给朋友，他们可在此加入。", 700, 276, 500, 30, 18, UiKit.Muted);
                UiKit.Button(root, "LeaveTeam", "离开队伍", 700, 322, 180, 52, () => app.RunOnline(() => app.Native.LeaveTeam(), "已离开队伍"));
            }
        }

        private static void BuildTrade(RectTransform root, PrototypeApp app)
        {
            UiKit.Label(root, "玩家集市", 48, 428, 250, 34, 25, UiKit.Gold);
            var listings = app.Native?.Trades;
            if (listings != null && listings.Count > 0)
                for (int i = 0; i < Mathf.Min(3, listings.Count); i++)
                {
                    var item = listings[i]; float y = 466 + i * 28;
                    UiKit.Label(root, item.ItemId + "  ·  " + item.Quantity + " 件  ·  " + item.Price + " 金币  ·  " + item.Status, 48, y, 500, 26, 18, UiKit.Paper);
                    if (item.SellerId != app.Native?.Person?.UserId && item.Status == "OPEN")
                        UiKit.Button(root, "BuyTrade" + i, "购买", 560, y - 2, 78, 28, () => app.RunOnline(() => app.Native.AcceptTrade(item.TradeId), "购买请求已提交"), true);
                }
            else UiKit.Label(root, "暂无在售物品。", 48, 466, 590, 28, 18, UiKit.Muted);
            var itemId = UiKit.Input(root, "TradeItemId", "", "物品 ID", 700, 420, 190, 48, 18);
            var quantity = UiKit.Input(root, "TradeQuantity", "1", "数量", 900, 420, 100, 48, 18);
            var price = UiKit.Input(root, "TradePrice", "100", "单价", 1010, 420, 100, 48, 18);
            UiKit.Button(root, "CreateTrade", "上架", 1120, 420, 110, 48, () =>
            { int.TryParse(quantity.text, out int count); int.TryParse(price.text, out int unitPrice); app.RunOnline(() => app.Native.CreateTrade(itemId.text, count, unitPrice), "已提交集市挂单"); }, true);
            UiKit.Label(root, "交易由服务器校验；购买、扣款与到账以服务端结果为准。", 700, 480, 530, 28, 17, UiKit.Muted);
        }
    }

    /// <summary>
    /// Mobile chat surface used by the community page. The page is rebuilt when
    /// a request finishes, while this controller keeps broadcast messages live
    /// when the player remains on the page.
    /// </summary>
    public sealed class ChatPanelController : MonoBehaviour
    {
        private static readonly string[] ChannelNames = { "世界", "私聊", "系统", "全部" };
        private PrototypeApp app;
        private RectTransform panel;
        private RectTransform viewport;
        private RectTransform messageContent;
        private ScrollRect scroll;
        private InputField composer;
        private InputField receiver;
        private Button sendButton;
        private Text channelTitle;
        private Text unreadText;
        private Text collapsedPreview;
        private readonly List<Button> channelButtons = new List<Button>();
        private readonly HashSet<string> knownMessages = new HashSet<string>();
        private int channel;
        private int unread;
        private bool collapsed;
        private bool rendering;

        public void Initialize(RectTransform owner, PrototypeApp ownerApp)
        {
            panel = owner;
            app = ownerApp;
            BuildHeader();
            BuildChannels();
            BuildMessageViewport();
            BuildComposer();
            PrimeKnownMessages();
            if (app.Native != null)
            {
                app.Native.ChatReceived += OnChatReceived;
                app.Native.Changed += OnNativeChanged;
            }
            RenderMessages(true);
        }

        private void BuildHeader()
        {
            UiKit.Label(panel, "即时聊天", 16, 5, 160, 30, 22, UiKit.Paper);
            channelTitle = UiKit.Label(panel, "世界频道", 174, 7, 190, 26, 17, UiKit.Muted);
            collapsedPreview = UiKit.Label(panel, "", 16, 38, 500, 30, 16, UiKit.Muted);
            collapsedPreview.gameObject.SetActive(false);
            var collapse = UiKit.Button(panel, "ChatCollapse", "收起", 542, 5, 62, 31, ToggleCollapsed);
            collapse.GetComponent<Image>().color = new Color32(30, 55, 53, 245);
            unreadText = UiKit.Label(collapse.transform, "", 0, -6, 62, 20, 13, UiKit.Gold, TextAnchor.MiddleCenter);
            unreadText.gameObject.SetActive(false);
        }

        private void BuildChannels()
        {
            for (int i = 0; i < ChannelNames.Length; i++)
            {
                int selected = i;
                var button = UiKit.Button(panel, "ChatChannel" + i, ChannelNames[i], 14 + i * 76, 42, 68, 31,
                    () => SelectChannel(selected), i == channel);
                channelButtons.Add(button);
            }
        }

        private void BuildMessageViewport()
        {
            viewport = UiKit.Panel(panel, "ChatViewport", 14, 78, 592, 155, new Color32(9, 22, 23, 220));
            viewport.GetComponent<Image>().raycastTarget = true;
            viewport.gameObject.AddComponent<RectMask2D>();
            messageContent = UiKit.Rect(viewport, "ChatMessages", 0, 0, 580, 155);
            scroll = viewport.gameObject.AddComponent<ScrollRect>();
            scroll.content = messageContent;
            scroll.viewport = viewport;
            scroll.horizontal = false;
            scroll.vertical = true;
            scroll.movementType = ScrollRect.MovementType.Clamped;
            scroll.scrollSensitivity = 46;
            scroll.inertia = true;
            scroll.decelerationRate = .16f;
        }

        private void BuildComposer()
        {
            receiver = UiKit.Input(panel, "ChatReceiver", "", "玩家 ID", 14, 241, 150, 45, 12);
            receiver.gameObject.SetActive(false);
            composer = UiKit.Input(panel, "ChatComposer", "", "说点什么…", 14, 241, 512, 45, 60);
            sendButton = UiKit.Button(panel, "ChatSend", "发送", 532, 241, 74, 45, Send, true);
            var quick = new[] { "组队吗", "求组队", "谢谢", "收到" };
            for (int i = 0; i < quick.Length; i++)
            {
                string phrase = quick[i];
                UiKit.Button(panel, "ChatQuick" + i, phrase, 14 + i * 72, 290, 66, 20,
                    () => { composer.text = phrase; composer.ActivateInputField(); });
            }
            UiKit.Label(panel, "点击频道可切换消息范围", 340, 290, 264, 20, 14, UiKit.Muted, TextAnchor.MiddleRight);
        }

        private void PrimeKnownMessages()
        {
            knownMessages.Clear();
            var history = app.Native?.ChatHistory;
            if (history == null) return;
            foreach (var message in history) knownMessages.Add(MessageKey(message));
        }

        private void SelectChannel(int selected)
        {
            if (channel == selected) return;
            channel = selected;
            unread = 0;
            MarkNativeChannelRead();
            UpdateChannelUi();
            RenderMessages(true);
        }

        private void ToggleCollapsed()
        {
            collapsed = !collapsed;
            unread = collapsed ? unread : 0;
            if (!collapsed) MarkNativeChannelRead();
            UpdateChannelUi();
            if (!collapsed) RenderMessages(true);
        }

        private void MarkNativeChannelRead()
        {
            if (app?.Native == null) return;
            if (channel == 0) app.Native.MarkChatRead(NativeGameClient.WorldChatType);
            else if (channel == 1) app.Native.MarkChatRead(NativeGameClient.PrivateChatType);
        }

        private void UpdateChannelUi()
        {
            channelTitle.text = ChannelNames[channel] + "频道";
            for (int i = 0; i < channelButtons.Count; i++)
            {
                var image = channelButtons[i].GetComponent<Image>();
                image.color = i == channel ? new Color32(60, 111, 89, 255) : new Color32(28, 48, 47, 242);
                var text = channelButtons[i].GetComponentInChildren<Text>();
                if (text != null) text.color = i == channel ? UiKit.Paper : UiKit.Muted;
            }
            bool privateChannel = channel == 1;
            receiver.gameObject.SetActive(!collapsed && privateChannel);
            composer.gameObject.SetActive(!collapsed);
            sendButton.gameObject.SetActive(!collapsed);
            var composerRect = composer.GetComponent<RectTransform>();
            var sendRect = sendButton.GetComponent<RectTransform>();
            composerRect.anchoredPosition = new Vector2(privateChannel ? 172 : 14, -241);
            composerRect.sizeDelta = new Vector2(privateChannel ? 354 : 512, 45);
            sendRect.anchoredPosition = new Vector2(privateChannel ? 532 : 532, -241);
            if (composer.textComponent != null)
            {
                composer.textComponent.rectTransform.sizeDelta = new Vector2(composerRect.sizeDelta.x - 36, 45);
                composer.textComponent.rectTransform.anchoredPosition = new Vector2(18, -0);
            }
            if (composer.placeholder != null)
            {
                composer.placeholder.rectTransform.sizeDelta = new Vector2(composerRect.sizeDelta.x - 36, 45);
                composer.placeholder.rectTransform.anchoredPosition = new Vector2(18, -0);
            }
            var inputRule = composer.transform.Find("InputRule");
            if (inputRule != null) inputRule.GetComponent<RectTransform>().sizeDelta = new Vector2(composerRect.sizeDelta.x, 2);
            panel.sizeDelta = new Vector2(620, collapsed ? 76 : 314);
            for (int i = 0; i < 4; i++)
            {
                var quick = panel.Find("ChatQuick" + i);
                if (quick != null) quick.gameObject.SetActive(!collapsed);
            }
            viewport.gameObject.SetActive(!collapsed);
            if (collapsed)
            {
                collapsedPreview.gameObject.SetActive(true);
                collapsedPreview.text = LastPreview();
                collapseCaption("展开");
            }
            else
            {
                collapsedPreview.gameObject.SetActive(false);
                collapseCaption("收起");
            }
            unreadText.text = unread > 0 ? (unread > 99 ? "99+" : unread.ToString()) : "";
            unreadText.gameObject.SetActive(unread > 0);
        }

        private void collapseCaption(string caption)
        {
            var button = panel.Find("ChatCollapse");
            if (button == null) return;
            var label = button.GetComponentInChildren<Text>();
            if (label != null) label.text = caption;
        }

        private void Send()
        {
            string content = composer == null ? "" : composer.text.Trim();
            if (content.Length == 0) { app.Toast("先写点内容吧"); return; }
            if (channel == 2) { app.Toast("系统频道仅用于查看公告"); return; }
            if (channel == 1)
            {
                if (!long.TryParse(receiver.text.Trim(), out long receiverId) || receiverId <= 0)
                { app.Toast("请输入正确的玩家 ID"); return; }
                app.RunOnline(async () =>
                {
                    try { await app.Native.SendPrivateChat(receiverId, content); }
                    finally { if (sendButton != null) sendButton.interactable = true; }
                }, "私聊已发送");
            }
            else
            {
                app.RunOnline(async () =>
                {
                    try { await app.Native.SendWorldChat(content); }
                    finally { if (sendButton != null) sendButton.interactable = true; }
                }, "消息已发送");
            }
            composer.text = "";
        }

        private void OnChatReceived(Lunhui.Protocol.ChatMessage message)
        {
            if (message == null || !knownMessages.Add(MessageKey(message))) return;
            if (collapsed || !MatchesChannel(message)) unread++;
            UpdateChannelUi();
            if (!collapsed && MatchesChannel(message)) RenderMessages(true);
        }

        private void OnNativeChanged()
        {
            var history = app.Native?.ChatHistory;
            if (history == null) return;
            bool changed = false;
            foreach (var message in history)
                if (knownMessages.Add(MessageKey(message)))
                {
                    changed = true;
                    if (collapsed || !MatchesChannel(message)) unread++;
                }
            if (changed) UpdateChannelUi();
            if (!collapsed) RenderMessages(false);
        }

        private void RenderMessages(bool jumpToLatest)
        {
            if (rendering || messageContent == null) return;
            rendering = true;
            for (int i = messageContent.childCount - 1; i >= 0; i--) Destroy(messageContent.GetChild(i).gameObject);
            var history = app.Native?.ChatHistory;
            var visible = new List<Lunhui.Protocol.ChatMessage>();
            if (history != null)
                foreach (var message in history)
                    if (MatchesChannel(message)) visible.Add(message);
            int first = Mathf.Max(0, visible.Count - 8);
            float y = 4;
            for (int i = first; i < visible.Count; i++)
            {
                var message = visible[i];
                bool mine = IsMine(message);
                string body = message.Content ?? "";
                int lines = Mathf.Clamp(Mathf.CeilToInt(Mathf.Max(1, body.Length) / 24f), 1, 4);
                float height = 38 + lines * 20;
                float width = 414;
                float x = mine ? 580 - width - 8 : 8;
                Color tint = mine ? new Color32(43, 89, 73, 245) : new Color32(31, 48, 49, 245);
                var bubble = UiKit.Panel(messageContent, "Bubble" + i, x, y, width, height, tint);
                var bubbleImage = bubble.GetComponent<Image>();
                bubbleImage.enabled = false;
                var bubbleGraphic = bubble.gameObject.AddComponent<ChatBubbleGraphic>();
                bubbleGraphic.color = tint;
                bubbleGraphic.raycastTarget = false;
                string sender = string.IsNullOrEmpty(message.SenderName) ? "玩家" : message.SenderName;
                string stamp = FormatTime(message.Timestamp);
                UiKit.Label(bubble, sender + (string.IsNullOrEmpty(stamp) ? "" : "  " + stamp), 12, 4, width - 24, 19, 14, mine ? UiKit.Gold : UiKit.Muted);
                var text = UiKit.Label(bubble, body, 12, 22, width - 24, height - 24, 17, UiKit.Paper, TextAnchor.UpperLeft);
                text.resizeTextForBestFit = false;
                text.verticalOverflow = VerticalWrapMode.Overflow;
                y += height + 5;
            }
            if (visible.Count == 0)
            {
                UiKit.Label(messageContent, channel == 2 ? "这里会出现系统公告" : "还没有消息，和在线玩家打个招呼吧。", 12, 50, 550, 32, 17, UiKit.Muted, TextAnchor.MiddleCenter);
                y = 155;
            }
            messageContent.sizeDelta = new Vector2(580, Mathf.Max(155, y + 4));
            if (jumpToLatest && scroll != null) scroll.verticalNormalizedPosition = 0;
            rendering = false;
        }

        private bool MatchesChannel(Lunhui.Protocol.ChatMessage message)
        {
            if (message == null) return false;
            if (channel == 3) return true;
            return message.ChatType == channel + 1;
        }

        private bool IsMine(Lunhui.Protocol.ChatMessage message)
        {
            long ownId = app.Native?.Person?.UserId ?? 0;
            return ownId != 0 && message != null && message.SenderId == ownId;
        }

        private string LastPreview()
        {
            var history = app.Native?.ChatHistory;
            if (history == null || history.Count == 0) return "暂无新消息";
            var message = history[history.Count - 1];
            string sender = string.IsNullOrEmpty(message.SenderName) ? "玩家" : message.SenderName;
            return sender + "：" + (message.Content ?? "");
        }

        private static string MessageKey(Lunhui.Protocol.ChatMessage message)
        {
            if (message == null) return "";
            if (!string.IsNullOrEmpty(message.MessageId)) return message.MessageId;
            return message.SenderId + "|" + message.Timestamp + "|" + message.Content;
        }

        private static string FormatTime(long timestamp)
        {
            if (timestamp <= 0) return "";
            try
            {
                long milliseconds = timestamp < 100000000000L ? timestamp * 1000L : timestamp;
                return DateTimeOffset.FromUnixTimeMilliseconds(milliseconds).ToLocalTime().ToString("HH:mm");
            }
            catch (ArgumentOutOfRangeException) { return ""; }
        }

        private void OnDestroy()
        {
            if (app?.Native != null)
            {
                app.Native.ChatReceived -= OnChatReceived;
                app.Native.Changed -= OnNativeChanged;
            }
        }
    }

    [RequireComponent(typeof(CanvasRenderer))]
    public sealed class ChatBubbleGraphic : MaskableGraphic
    {
        private const int CornerSegments = 5;

        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear();
            Rect rect = rectTransform.rect;
            float radius = Mathf.Min(14f, Mathf.Min(rect.width, rect.height) * .25f);
            var points = new List<Vector2>(CornerSegments * 4);
            AddCorner(points, new Vector2(rect.xMin + radius, rect.yMin + radius), radius, 180f, 270f);
            AddCorner(points, new Vector2(rect.xMax - radius, rect.yMin + radius), radius, 270f, 360f);
            AddCorner(points, new Vector2(rect.xMax - radius, rect.yMax - radius), radius, 0f, 90f);
            AddCorner(points, new Vector2(rect.xMin + radius, rect.yMax - radius), radius, 90f, 180f);
            int center = vh.currentVertCount;
            vh.AddVert(rect.center, color, Vector2.zero);
            for (int i = 0; i < points.Count; i++) vh.AddVert(points[i], color, Vector2.zero);
            for (int i = 0; i < points.Count; i++)
                vh.AddTriangle(center, center + 1 + i, center + 1 + (i + 1) % points.Count);
        }

        private static void AddCorner(List<Vector2> points, Vector2 center, float radius, float from, float to)
        {
            for (int i = 0; i <= CornerSegments; i++)
            {
                float angle = Mathf.Lerp(from, to, i / (float)CornerSegments) * Mathf.Deg2Rad;
                points.Add(center + new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * radius);
            }
        }
    }
}
