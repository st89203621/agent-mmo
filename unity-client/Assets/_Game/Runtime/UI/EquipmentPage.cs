using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    public static class EquipmentPage
    {
        public const string PageKey = "equipment";
        public const int MaxQuality = 21;
        public const int MaxEnchant = 10;
        public const int QualityUnlockLevel = 3;
        public const int EnchantUnlockLevel = 8;
        private static readonly Color TextColor = new Color(0.92f, 0.95f, 0.91f);

        public static void Build(RectTransform root, PrototypeApp app)
        {
            var state = app.State;
            int quality = Mathf.Clamp(state.EquipmentQuality, 1, MaxQuality);
            int enchant = Mathf.Clamp(state.EnchantLevel, 0, MaxEnchant);
            int attack = AdventureCombat.BaseAttack(state);
            var content = UiKit.PageContent(root, "EquipmentContent", "武器与灵纹", "矿石 " + state.Ore + "    灵魄 " + state.Essence);

            UiKit.Label(content, "当前装备", 48, 92, 300, 36, 23, UiKit.Muted);
            var selected = UiKit.Button(content, "CurrentWeapon", "", 48, 144, 320, 106,
                () => app.ShowDialog("霜华 · 主武器", "已装备\n基础攻击 " + attack + "\n加品每阶增加 4 点基础攻击\n附魔每级增加 6 点基础攻击"), true);
            UiKit.Label(selected.transform, "霜华 · 主武器", 20, 13, 284, 39, 27, TextColor);
            UiKit.Label(selected.transform, "已装备   /   " + quality + " 品", 20, 62, 284, 28,
                22, UiKit.Gold);
            UiKit.Label(content, "衣甲", 64, 290, 100, 36, 25, TextColor);
            UiKit.Label(content, "未装备", 218, 290, 132, 36, 23, UiKit.Muted, TextAnchor.MiddleRight);
            UiKit.Panel(content, "ArmorRule", 64, 345, 286, 1, UiKit.Muted);
            UiKit.Label(content, "饰品", 64, 367, 100, 36, 25, TextColor);
            UiKit.Label(content, "未装备", 218, 367, 132, 36, 23, UiKit.Muted, TextAnchor.MiddleRight);
            UiKit.Label(content, "鬼炉 · 最高 30 品，待开放", 48, 447, 328, 36, 20, UiKit.Muted);

            UiKit.Panel(content, "DetailRule", 402, 98, 1, 372, UiKit.Muted);
            UiKit.Label(content, "霜华", 442, 92, 380, 48, 34, TextColor);
            UiKit.Label(content, "基础攻击 " + attack, 912, 96, 314, 42, 30,
                UiKit.Gold, TextAnchor.MiddleRight);
            UiKit.Label(content, "主武器  /  加品 " + quality + " 阶  /  附魔 +" + enchant,
                442, 149, 784, 34, 23, UiKit.Muted);

            BuildQuality(content, app, quality);
            UiKit.Panel(content, "UpgradeDivider", 442, 319, 784, 1, UiKit.Muted);
            BuildEnchant(content, app, enchant);
        }

        private static void BuildQuality(RectTransform content, PrototypeApp app, int quality)
        {
            bool capped = quality >= MaxQuality;
            bool unlocked = app.State.Level >= QualityUnlockLevel;
            int coinCost = (quality + 1) * 1800;
            int oreCost = (quality + 1) * 5;
            UiKit.Label(content, "装备加品 · 3 级", 442, 206, 340, 34, 26, TextColor);
            UiKit.Label(content, !unlocked ? "3 级开放加品" : capped ? "已达原型上限 21 品" : "下阶基础攻击 +4",
                442, 245, 280, 30, 22, UiKit.Jade);
            UiKit.Label(content, "矿石 " + app.State.Ore, 960, 204, 266, 34,
                23, UiKit.Gold, TextAnchor.MiddleRight);
            UiKit.Label(content, capped ? "养成已完成" : "银两 " + coinCost.ToString("N0") + " · 矿石 " + oreCost,
                716, 247, 300, 38, 20, UiKit.Muted, TextAnchor.MiddleRight);
            Button upgrade = UiKit.Button(content, "UpgradeQuality", !unlocked ? "3 级开放" : capped ? "已满品" : "加品",
                1040, 248, 186, 54, () => app.ShowDialog("确认加品",
                    "霜华 " + quality + " 品提升至 " + (quality + 1) + " 品\n消耗 " + coinCost.ToString("N0") + " 银两、" + oreCost + " 矿石\n基础攻击 +4\n成功率 100%",
                    () => UpgradeQuality(app), "确认加品"), true);
            upgrade.interactable = unlocked && !capped;
        }

        private static void BuildEnchant(RectTransform content, PrototypeApp app, int enchant)
        {
            bool capped = enchant >= MaxEnchant;
            bool unlocked = app.State.Level >= EnchantUnlockLevel;
            int coinCost = (enchant + 1) * 1500;
            int essenceCost = (enchant + 1) * 3;
            UiKit.Label(content, "灵纹附魔 · 8 级", 442, 340, 340, 34, 26, TextColor);
            UiKit.Label(content, !unlocked ? "8 级开放附魔" : capped ? "已达最高 +10" : "下级基础攻击 +6",
                442, 381, 280, 30, 22, UiKit.Jade);
            UiKit.Label(content, "灵魄 " + app.State.Essence, 960, 338, 266, 34,
                23, UiKit.Gold, TextAnchor.MiddleRight);
            UiKit.Label(content, capped ? "养成已完成" : "银两 " + coinCost.ToString("N0") + " · 灵魄 " + essenceCost,
                716, 383, 300, 38, 20, UiKit.Muted, TextAnchor.MiddleRight);
            Button upgrade = UiKit.Button(content, "EnchantWeapon", !unlocked ? "8 级开放" : capped ? "已满级" : "附魔",
                1040, 384, 186, 54, () => app.ShowDialog("确认附魔",
                    "附魔 +" + enchant + " 提升至 +" + (enchant + 1) + "\n消耗 " + coinCost.ToString("N0") + " 银两、" + essenceCost + " 灵魄\n基础攻击 +6\n成功率 100%",
                    () => UpgradeEnchant(app), "确认附魔"), true);
            upgrade.interactable = unlocked && !capped;
            UiKit.Label(content, "矿石与灵魄来自山灵、守卫及旅途宝箱。", 442, 454, 784, 30, 21, UiKit.Muted);
        }

        private static void UpgradeQuality(PrototypeApp app)
        {
            var state = app.State;
            if (state.Level < QualityUnlockLevel) { app.Toast("3 级开放装备加品"); return; }
            int quality = Mathf.Clamp(state.EquipmentQuality, 1, MaxQuality);
            if (quality >= MaxQuality) { app.Toast("主武器已达最高品阶"); return; }
            int coinCost = (quality + 1) * 1800;
            int oreCost = (quality + 1) * 5;
            if (state.Coins < coinCost) { app.Toast("银两不足，需要 " + coinCost.ToString("N0") + " 银两"); return; }
            if (state.Ore < oreCost) { app.Toast("矿石不足，需要 " + oreCost + " 块矿石"); return; }
            state.Coins -= coinCost;
            state.Ore -= oreCost;
            state.EquipmentQuality = quality + 1;
            app.Save();
            app.ShowPage(PageKey);
            app.Toast("加品成功 · 霜华 " + state.EquipmentQuality + " 品，基础攻击 +4");
        }

        private static void UpgradeEnchant(PrototypeApp app)
        {
            var state = app.State;
            if (state.Level < EnchantUnlockLevel) { app.Toast("8 级开放装备附魔"); return; }
            int enchant = Mathf.Clamp(state.EnchantLevel, 0, MaxEnchant);
            if (enchant >= MaxEnchant) { app.Toast("主武器附魔已达最高等级"); return; }
            int coinCost = (enchant + 1) * 1500;
            int essenceCost = (enchant + 1) * 3;
            if (state.Coins < coinCost) { app.Toast("银两不足，需要 " + coinCost.ToString("N0") + " 银两"); return; }
            if (state.Essence < essenceCost) { app.Toast("灵魄不足，需要 " + essenceCost + " 份灵魄"); return; }
            state.Coins -= coinCost;
            state.Essence -= essenceCost;
            state.EnchantLevel = enchant + 1;
            app.Save();
            app.ShowPage(PageKey);
            app.Toast("附魔成功 · 灵纹 +" + state.EnchantLevel + "，基础攻击 +6");
        }
    }
}
