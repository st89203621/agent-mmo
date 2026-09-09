using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Lunhui.Protocol;
using UnityEngine;
using UnityEngine.UI;

namespace Lunhui.Prototype
{
    internal static class PrototypeLayoutChecks
    {
        private static PrototypeState fixtureState;

        internal static void PrepareFixture(PrototypeApp app, string page, List<string> checks, List<string> errors)
        {
            fixtureState = JsonUtility.FromJson<PrototypeState>(JsonUtility.ToJson(app.State));
            var native = new NativeGameClient(new IoGameNetworkSession());
            Set(native, "Person", new PersonMessage { UserId = 1, Name = "测试旅人", Profession = "ATTACK", Gender = "female" });
            for (int i = 0; i < 9; i++)
            {
                var title = new TitleMessage { TitleId = "test-title-" + i, Name = "山海同行者" + i, Description = "沿着山川寻找旧时的回忆，与同行者共同完成一段旅程。", RequiredLevel = 1 };
                native.Titles.Add(title); native.AvailableTitles.Add(title);
                native.Trades.Add(new TradeMessage { TradeId = "test-trade-" + i, ItemId = "material_002", SellerId = 2, Quantity = 2, Price = 100, Status = "OPEN" });
            }
            native.ChatHistory.Add(new ChatMessage { MessageId = "fixture-message", SenderId = 2, SenderName = "山海同行者", ChatType = NativeGameClient.PrivateChatType,
                Content = "我在枫桥驿站等你。先整理装备，再沿着山路出发，看看今天能发现什么。" });
            Set(app, "Native", native); Set(app, "OnlineMode", true);
            app.ShowPage(page == "nativeTitles" ? "titles" : "community");
            if (page == "nativeTitles")
            {
                var next = app.GetComponentsInChildren<Button>().FirstOrDefault(b => b.name == "PageNext");
                if (next == null || !next.interactable) errors.Add("Native titles: all returned titles must be reachable by pagination");
                else
                {
                    next.onClick.Invoke(); Find(app, "PageNext").onClick.Invoke();
                    if (!app.GetComponentsInChildren<Text>().Any(t => t.text == "山海同行者8")) errors.Add("Native titles: final title is unreachable");
                    Find(app, "PagePrevious").onClick.Invoke(); Find(app, "PagePrevious").onClick.Invoke();
                }
                return;
            }
            int tab = page == "nativeTeam" ? 1 : page == "nativeTrade" ? 2 : 0;
            var button = app.GetComponentsInChildren<Button>().FirstOrDefault(b => b.name == "CommunityTab" + tab);
            if (button == null) errors.Add(page + ": dedicated community view is missing");
            else button.onClick.Invoke();
            if (page == "nativeTrade")
            {
                var next = app.GetComponentsInChildren<Button>().FirstOrDefault(b => b.name == "TradeNext");
                if (next == null) errors.Add("Native trade: all listings must be reachable");
                else
                {
                    var price = app.GetComponentsInChildren<InputField>().Single(f => f.name == "TradePrice"); price.text = "120";
                    next.onClick.Invoke(); Find(app, "TradeNext").onClick.Invoke();
                    if (app.GetComponentsInChildren<Button>().Count(b => b.name.StartsWith("BuyTrade")) != 1 || price.text != "120")
                        errors.Add("Native trade: pagination must reach the last item and preserve the form");
                    Find(app, "TradePrevious").onClick.Invoke(); Find(app, "TradePrevious").onClick.Invoke();
                }
            }
            if (page != "nativeChat") return;
            Find(app, "ChatChannel1").onClick.Invoke();
            var composer = app.GetComponentsInChildren<InputField>().Single(f => f.name == "ChatComposer");
            composer.text = "等我一下，一起出发";
            typeof(PrototypeApp).GetMethod("ApplyNativeGrowth", BindingFlags.NonPublic | BindingFlags.Instance).Invoke(app, null);
            (typeof(NativeGameClient).GetField("Changed", BindingFlags.NonPublic | BindingFlags.Instance).GetValue(native) as System.Action)?.Invoke();
            var current = app.GetComponentsInChildren<InputField>().Single(f => f.name == "ChatComposer");
            if (current != composer || current.text != "等我一下，一起出发") errors.Add("Native chat: background updates discard the unsent draft");
            else checks.Add("Native chat: background updates preserve the unsent draft");
            if (button != null)
            {
                Find(app, "CommunityTab1").onClick.Invoke(); Find(app, "CommunityTab0").onClick.Invoke();
                var receiver = app.GetComponentsInChildren<InputField>().FirstOrDefault(f => f.name == "ChatReceiver");
                if (receiver == null || !composer || composer.text != "等我一下，一起出发") errors.Add("Native chat: switching community views loses private conversation state");
                else checks.Add("Native chat: switching views preserves channel and draft");
            }
        }

        private static Button Find(PrototypeApp app, string name) => app.GetComponentsInChildren<Button>().Single(b => b.name == name);

        internal static void RestoreFixture(PrototypeApp app)
        {
            if (fixtureState == null) return;
            app.Native.Dispose(); Set(app, "Native", null); Set(app, "OnlineMode", false);
            Set(app, "State", fixtureState); fixtureState = null;
        }

        private static void Set(object target, string property, object value) =>
            target.GetType().GetProperty(property).SetValue(target, value);

        internal static void Validate(PrototypeApp app, string page, Vector2Int size, List<string> checks, List<string> errors)
        {
            Canvas.ForceUpdateCanvases();
            string prefix = size.x + "x" + size.y + " " + page + ": ";
            void Check(bool passed, string message)
            {
                (passed ? checks : errors).Add(prefix + message);
            }
            var labels = app.GetComponentsInChildren<Text>().Where(t => t.enabled).ToArray();
            Check(labels.All(t => !t.resizeTextForBestFit || t.resizeTextMinSize <= t.resizeTextMaxSize),
                "text sizing ranges are valid: " + string.Join(", ", labels.Where(t => t.resizeTextForBestFit && t.resizeTextMinSize > t.resizeTextMaxSize).Select(t => t.transform.parent.name)));
            var canvas = app.GetComponentInChildren<Canvas>();
            var stage = canvas.GetComponentsInChildren<RectTransform>().Single(t => t.name == "MobileStage_1280x720");
            var corners = new Vector3[4]; stage.GetWorldCorners(corners);
            Check(corners[0].x >= Screen.safeArea.xMin - 1 && corners[0].y >= Screen.safeArea.yMin - 1 &&
                corners[2].x <= Screen.safeArea.xMax + 1 && corners[2].y <= Screen.safeArea.yMax + 1, "reference canvas fits screen safe area");
            var controls = app.GetComponentsInChildren<Selectable>().Where(c => c.enabled && c.interactable).ToArray();
            foreach (var control in controls)
            {
                Rect bounds = Bounds(control.transform, stage);
                Check(bounds.xMin >= -1 && bounds.yMin >= -1 && bounds.xMax <= 1281 && bounds.yMax <= 721,
                    control.name + " stays inside the safe content area");
            }
            // Only compare controls within the active surface, never a modal against its dimmed page.
            var activeRoot = controls.LastOrDefault()?.transform;
            while (activeRoot != null && activeRoot.parent != stage) activeRoot = activeRoot.parent;
            var surface = activeRoot != null ? activeRoot.GetComponentsInChildren<Selectable>() : controls;
            bool separated = true;
            for (int i = 0; i < surface.Length; i++)
                for (int j = i + 1; j < surface.Length; j++)
                {
                    var a = surface[i];var b = surface[j];
                    if (a.transform.IsChildOf(b.transform) || b.transform.IsChildOf(a.transform)) continue;
                    Rect first = Bounds(a.transform, stage), second = Bounds(b.transform, stage);
                    float width = Mathf.Min(first.xMax, second.xMax) - Mathf.Max(first.xMin, second.xMin);
                    float height = Mathf.Min(first.yMax, second.yMax) - Mathf.Max(first.yMin, second.yMin);
                    if (width > 1 && height > 1)
                    {
                        separated = false;
                        errors.Add(prefix + a.name + " overlaps " + b.name);
                    }
                }
            Check(separated, "active controls do not overlap");
            if (page == "home")
            {
                Check(app.PageRoot.Find("NavigationShade") == null, "combat HUD has no full-width system navigation bar");
                Check(controls.Any(c => c.name == "OpenJourney"), "progression hub is reachable from the world");
                foreach (string name in new[] { "Joystick", "Attack", "Dodge", "Quest", "WorldMap", "ChatShortcut" })
                    Check(app.PageRoot.Find(name) != null, name + " remains available");
                Rect center = new Rect(390, 196, 410, 270);
                Check(controls.All(c => !center.Overlaps(Bounds(c.transform, stage))), "central play area remains unobstructed");
            }
            if (page == "journey")
            {
                Check(app.CurrentPage == "journey", "world and progression share one navigation hub");
                Check(labels.Any(t => t.name == "JourneyObjective" && t.text == app.Combat.QuestTitle), "objective comes from current gameplay state");
                Check(controls.Any(c => c.name == "ContinueJourney"), "current journey can be resumed");
                Check(app.GetComponentsInChildren<RawImage>().Any(i => i.name == "JourneyLandscape" && i.texture != null), "current map artwork is available");
            }
            if (page == "character")
            {
                Transform portrait = app.PageRoot.Find("CharacterOrbit");
                if (portrait != null)
                    Check(controls.All(c => !Bounds(portrait, stage).Overlaps(Bounds(c.transform, stage))),
                        "character preview is separate from editing controls");
                var feet = app.World.WorldCamera.WorldToScreenPoint(app.World.HeroGroundPosition);
                float footer = stage.TransformPoint(new Vector3(0, stage.rect.height * .5f - 548)).y;
                Check(feet.y >= footer, "character framing leaves the footer unobstructed");
            }
            if (page == "community" || page == "titles")
                Check(app.OnlineMode || controls.Any(c => c.name == "ConnectForContent"), "offline system has an actionable empty state");
        }

        private static Rect Bounds(Transform transform, RectTransform stage)
        {
            var corners = new Vector3[4];
            ((RectTransform)transform).GetWorldCorners(corners);
            Vector3 min = stage.InverseTransformPoint(corners[0]), max = stage.InverseTransformPoint(corners[2]);
            return new Rect(min.x + stage.rect.width * .5f, stage.rect.height * .5f - max.y, max.x - min.x, max.y - min.y);
        }
    }
}
