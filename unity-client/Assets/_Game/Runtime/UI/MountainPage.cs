using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    public static class MountainPage
    {
        public const string PageKey = "mountains";
        private const string FavoriteKey = "Lunhui.Prototype.MountainFavorites";
        private static readonly Color TextColor = new Color(0.92f, 0.95f, 0.91f);
        private static int selected;
        private static bool previewing;
        private static int previewStep;

        private sealed class Mountain
        {
            public readonly string Name;
            public readonly string Mode;
            public readonly string Description;
            public readonly string Goal;

            public readonly string[] Stages;
            public readonly string[] Details;

            public Mountain(string name, string mode, string description, string goal, string[] stages, string[] details)
            {
                Name = name;
                Mode = mode;
                Description = description;
                Goal = goal;
                Stages = stages;
                Details = details;
            }
        }

        private static readonly Mountain[] Mountains =
        {
            new Mountain("智宝山", "答题 · 盟会争分", "题碑立于分岔路口。\n以连续答题积累盟会分数。", "有效答题计分，争夺宝山归属",
                new[] { "题碑答题", "连续计分", "盟会争山" },
                new[] { "阅读题碑，选择对应的分岔门。\n可以独立作答，也可与盟友讨论。", "连续参与答题，为盟会累计分数。\n具体题量与占领规则待验证。", "根据活动积分结算宝山归属。\n占领奖励与采集额度待配置。" }),
            new Mountain("文宝山", "迷宫 · 求神问路", "壁画藏着迷宫的方向。\n选择岔路，探寻山门之后的秘密。", "穿过迷宫与机关，挑战山门守卫",
                new[] { "迷宫入口", "岔路机关", "山门守卫" },
                new[] { "在入口确认路线，阅读壁画线索。\n安全路与挑战路提供不同遭遇。", "观察机关，记录已经探索的岔路。\n求神问路可提供有限次数提示。", "把守卫冲击引向阵柱，抓住破绽。\n这场协作遭遇属于重制提案。" }),
            new Mountain("珍宝山", "护法 · 自愿对抗", "护法镇守山中据点。\n挑战护法，与其他盟会争夺荣誉。", "参加护法据点战，积累个人荣誉",
                new[] { "护法据点", "自愿对抗", "荣誉结算" },
                new[] { "确认活动规则，选择护法据点。\n对抗活动由玩家自愿参加。", "首轮计划验证受控四对四对抗。\n击败护法与守住据点均有贡献。", "按有效参与结算荣誉和贡献。\n当前预览中不存在真实对手。" }),
            new Mountain("藏宝山", "盟会 · 攻防争夺", "盟友集结，攻守山门。\n通过据点与守护神争夺占领权。", "参与盟会攻防，争取宝山占领权",
                new[] { "攻防集结", "据点争夺", "守山结算" },
                new[] { "活动窗口内参加一轮攻守战。\n原版约三十分钟守山仅作参考。", "据点争夺与守护神共同参与计分。\n手机短局赛制仍需试玩验证。", "占领可关联集市税收分成。\n具体赛制与分成上限尚未确定。" }),
            new Mountain("龙宝山", "屠龙 · 积分挖山", "巨龙盘踞山脊之上。\n盟友协作屠龙，争取挖山资格。", "累计有效屠龙贡献，获得挖山资格",
                new[] { "协作屠龙", "破部救援", "积分挖山" },
                new[] { "与盟友迎战巨龙，观察攻击预警。\n当前仅展示活动流程。", "重制提案包含部位破坏与救援。\n贡献评价兼顾不同职业职责。", "盟会屠龙积分决定挖山资格。\n挖山材料与额度尚未配置。" }),
            new Mountain("海盗宝山", "宝图 · 海岛寻宝", "收集宝图碎片，准备铁铲。\n沿海岛路线寻找埋藏的宝物。", "拼合宝图，挖掘宝藏并积累积分",
                new[] { "拼合宝图", "海岛探索", "挖掘宝藏" },
                new[] { "收集宝图碎片，确认寻宝路线。\n铁铲作为挖掘所需物品。", "根据宝图探索岛屿与机关。\n具体路线和遭遇尚未制作。", "使用宝图与铁铲换取宝藏、积分。\n当前预览不扣道具、不发奖励。" })
        };

        public static void Build(RectTransform root, PrototypeApp app)
        {
            selected = Mathf.Clamp(selected, 0, Mountains.Length - 1);
            var content = UiKit.Panel(root, "MountainContent", 0, 108, 1280, 516, Color.clear);
            if (previewing)
            {
                BuildPreview(content, app);
                return;
            }

            UiKit.Label(content, "本地路线预览", 48, 12, 690, 40, 22, UiKit.Muted);
            UiKit.Panel(content, "HeadingRule", 48, 72, 1184, 1, UiKit.Muted);

            int favorites = PlayerPrefs.GetInt(FavoriteKey, 0);
            for (int i = 0; i < Mountains.Length; i++)
            {
                int index = i;
                Mountain mountain = Mountains[i];
                float x = 48 + (i % 2) * 336;
                float y = 94 + (i / 2) * 124;
                var button = UiKit.Button(content, "Mountain" + i, "", x, y, 320, 108,
                    () => { selected = index; app.ShowPage(PageKey); }, i == selected);
                UiKit.Label(button.transform, mountain.Name, 18, 11, 278, 38, 26, TextColor);
                UiKit.Label(button.transform, mountain.Mode,
                    18, 57, 280, 30, 21, UiKit.Muted);
                if ((favorites & (1 << i)) != 0)
                    UiKit.Label(button.transform, "已收藏", 218, 14, 86, 28, 18,
                        UiKit.Gold, TextAnchor.MiddleRight);
            }

            Mountain chosen = Mountains[selected];
            UiKit.Panel(content, "DetailRule", 736, 94, 1, 356, UiKit.Muted);
            UiKit.Label(content, chosen.Name, 770, 92, 450, 48, 34, TextColor);
            UiKit.Label(content, chosen.Mode,
                770, 144, 454, 34, 23, UiKit.Gold);
            UiKit.Label(content, chosen.Description, 770, 194, 454, 78, 24, UiKit.Muted);
            UiKit.Label(content, "试炼目标", 770, 292, 454, 32, 22, UiKit.Gold);
            UiKit.Label(content, chosen.Goal, 770, 331, 454, 58, 24, TextColor);

            bool isFavorite = (favorites & (1 << selected)) != 0;
            UiKit.Button(content, "Favorite", isFavorite ? "取消收藏" : "收藏",
                770, 414, 148, 54, () =>
                {
                    int mask = PlayerPrefs.GetInt(FavoriteKey, 0) ^ (1 << selected);
                    PlayerPrefs.SetInt(FavoriteKey, mask);
                    PlayerPrefs.Save();
                    app.ShowPage(PageKey);
                });

            UiKit.Button(content, "EnterMountain",
                "进入预览", 934, 414, 292, 54,
                () => ConfirmEntry(app), true);
        }

        private static void ConfirmEntry(PrototypeApp app)
        {
            Mountain mountain = Mountains[selected];
            app.ShowDialog("进入" + mountain.Name,
                "即将打开本地路线预览。\n活动、联网和匹配尚未开放。\n开放门槛与奖励资格待确定。\n预览不消耗资源，也不发放奖励。",
                () => { previewing = true; previewStep = 0; app.ShowPage(PageKey); }, "进入预览");
        }

        private static void BuildPreview(RectTransform content, PrototypeApp app)
        {
            Mountain mountain = Mountains[selected];
            UiKit.Label(content, mountain.Name + " · 本地演示", 48, 12, 800, 48, 32, TextColor);
            UiKit.Button(content, "ReturnToMountains", "返回宝山", 1050, 14, 180, 48,
                () => { previewing = false; app.ShowPage(PageKey); });
            UiKit.Panel(content, "HeadingRule", 48, 80, 1184, 1, UiKit.Muted);
            UiKit.Label(content, "试炼路线", 48, 101, 600, 40, 27, UiKit.Gold);
            UiKit.Label(content, mountain.Description, 48, 155, 604, 94, 26, TextColor);

            string[] stages = mountain.Stages;
            for (int i = 0; i < stages.Length; i++)
            {
                int step = i;
                UiKit.Button(content, "RouteStep" + i, (i + 1).ToString("00") + "  " + stages[i],
                    48 + i * 213, 283, 195, 70,
                    () => { previewStep = step; app.ShowPage(PageKey); }, i == previewStep);
            }

            UiKit.Panel(content, "RouteDetailRule", 736, 107, 1, 316, UiKit.Muted);
            UiKit.Label(content, stages[previewStep], 774, 110, 446, 46, 32, TextColor);
            UiKit.Label(content, mountain.Details[previewStep], 774, 183, 446, 142, 25, UiKit.Muted);
            UiKit.Label(content, "当前为玩法路线预览，活动尚未开放。",
                48, 411, 1168, 48, 23, UiKit.Muted);
        }
    }
}
