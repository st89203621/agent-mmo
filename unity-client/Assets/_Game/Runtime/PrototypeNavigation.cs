using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    public sealed partial class PrototypeApp
    {
        private static readonly Dictionary<string, (string Title, string Icon, int Tab)> PageDirectory =
            new Dictionary<string, (string, string, int)>
            {
                ["login"] = ("轮回", "home", -1),
                ["character"] = ("初入轮回", "guild", -1),
                ["home"] = ("返回世界", "back", -1),
                ["journey"] = ("旅途", "mountain", 0),
                ["equipment"] = ("装备", "sword", 1),
                ["pets"] = ("灵宠", "pet", 2),
                ["community"] = ("同游", "chat", 3),
                ["guild"] = ("盟会", "guild", 4),
                ["mountains"] = ("宝山", "mountain", -1),
                ["inventory"] = ("行囊", "book", -1),
                ["titles"] = ("称号", "star", -1),
                ["settings"] = ("设置", "settings", -1)
            };

        private void Shell(string title)
        {
            UiKit.IconButton(page, "Back", "back", "返回", 32, 26,
                () => ShowPage(CurrentPage == "settings" ? settingsReturn : CurrentPage == "journey" ? "home" : "journey"));
            UiKit.Label(page, title, 110, 27, 360, 56, 32, UiKit.Paper);
            UiKit.Label(page, string.IsNullOrEmpty(State.Nickname) ? "尚未启程" : State.Nickname + "  " + State.Level + " 级",
                518, 33, 310, 40, 22, UiKit.Muted, TextAnchor.MiddleRight);
            UiKit.Label(page, "银两  " + State.Coins.ToString("N0"), 862, 33, 370, 40, 22, UiKit.Gold, TextAnchor.MiddleRight);
            UiKit.Panel(page, "HeaderLine", 32, 103, 1216, 1, new Color32(85, 96, 96, 140));
        }

        private void Navigation()
        {
            UiKit.Panel(page, "NavigationShade", 0, 632, 1280, 88, new Color32(17, 20, 23, 255));
            NavigationButton("home", 32, 212);
            foreach (var entry in PageDirectory.Where(entry => entry.Value.Tab >= 0).OrderBy(entry => entry.Value.Tab))
                NavigationButton(entry.Key, 304 + entry.Value.Tab * 188, 176);
        }

        private void NavigationButton(string key, float x, float width)
        {
            var item = PageDirectory[key];
            bool selected = CurrentPage == key || key == "journey" && item.Tab == 0 &&
                (CurrentPage == "mountains" || CurrentPage == "titles" || CurrentPage == "settings") || key == "equipment" && CurrentPage == "inventory";
            var button = UiKit.Button(page, "Nav_" + key, "", x, 648, width, 56, () => ShowPage(key), selected);
            var icon = UiKit.Rect(button.transform, "Icon", 20, 14, 28, 28).gameObject.AddComponent<SymbolGraphic>();
            icon.Symbol = item.Icon; icon.color = selected ? UiKit.Gold : UiKit.Muted; icon.raycastTarget = false;
            UiKit.Label(button.transform, item.Title, 60, 0, width - 76, 56, 21, selected ? UiKit.Paper : UiKit.Muted);
            if (key == "community" && OnlineMode && Native != null && Native.TotalUnreadChatCount > 0)
                UiKit.Label(button.transform, Native.TotalUnreadChatCount > 99 ? "99+" : Native.TotalUnreadChatCount.ToString(),
                    width - 32, 2, 28, 20, 14, UiKit.Gold, TextAnchor.MiddleRight);
        }

        private void Journey()
        {
            var map = RealmMapCatalog.Get(World.RealmIndex, World.SubmapIndex);
            UiKit.Label(page, World.RealmName, 48, 120, 720, 38, 24, UiKit.Paper);
            UiKit.Picture(page, "JourneyLandscape", "Art/MapPreviews/" + map.Id, 48, 176, 720, 292);
            UiKit.Label(page, map.Landmark, 48, 482, 480, 36, 21, UiKit.Muted);
            UiKit.Label(page, "回忆 " + Combat.MemoryCount, 560, 482, 208, 36, 21, UiKit.Gold, TextAnchor.MiddleRight);
            UiKit.Button(page, "JourneyMap", "山海舆图", 48, 544, 224, 56, OpenWorldMap);
            UiKit.Button(page, "JourneyMemories", "旅途回忆", 296, 544, 224, 56, OpenMemories);
            UiKit.Button(page, "JourneyMountains", "宝山历练", 544, 544, 224, 56, () => ShowPage("mountains"));

            UiKit.Panel(page, "JourneyDivider", 800, 136, 1, 464, new Color32(85, 96, 96, 120));
            UiKit.Label(page, "当前旅程", 840, 122, 360, 36, 20, UiKit.Gold);
            UiKit.Label(page, Combat.QuestTitle, 840, 176, 392, 70, 30, UiKit.Paper).name = "JourneyObjective";
            UiKit.Label(page, Combat.QuestDetail, 840, 264, 392, 90, 23, UiKit.Muted, TextAnchor.UpperLeft);
            UiKit.Button(page, "ContinueJourney", "继续探索", 840, 382, 392, 58, () => ShowPage("home"), true);
            UiKit.Label(page, State.Nickname + " · " + Careers[State.Career], 840, 480, 392, 36, 21, UiKit.Muted);
            UiKit.IconButton(page, "JourneyInventory", "book", "行囊", 840, 544, () => ShowPage("inventory"));
            UiKit.IconButton(page, "JourneyTitles", "star", "称号", 924, 544, () => ShowPage("titles"));
            UiKit.IconButton(page, "JourneyAppearance", "guild", "容貌", 1008, 544, OpenCustomization);
            UiKit.IconButton(page, "JourneySettings", "settings", "设置", 1092, 544,
                () => { settingsReturn = "journey"; ShowPage("settings"); });
            UiKit.IconButton(page, "JourneyPhoto", "camera", "观景", 1176, 544,
                () => { ShowPage("home"); OpenPhotoMode(); });
        }

        private void ConnectionRequired()
        {
            UiKit.Label(page, "尚未连接账号", 256, 242, 768, 58, 30, UiKit.Paper, TextAnchor.MiddleCenter);
            UiKit.Label(page, "当前为本地旅程", 256, 316, 768, 40, 22, UiKit.Muted, TextAnchor.MiddleCenter);
            UiKit.Button(page, "ConnectForContent", "账号登录", 470, 402, 340, 60, OpenOnlineLogin, true);
        }
    }
}
