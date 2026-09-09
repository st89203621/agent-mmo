using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    public static class PetPage
    {
        public const string PageKey = "pets";
        public const int MaxPetLevel = 30;
        public const int TrainingUnlockLevel = 1;
        private static readonly Color TextColor = new Color(0.92f, 0.95f, 0.91f);
        private static int selectedPet = -1;

        private sealed class Pet
        {
            public readonly string Name;
            public readonly string Role;
            public readonly string Skill;
            public readonly string Exploration;

            public Pet(string name, string role, string skill, string exploration)
            {
                Name = name;
                Role = role;
                Skill = skill;
                Exploration = exploration;
            }
        }

        private static readonly Pet[] Pets =
        {
            new Pet("砾灵", "岩狼 · 破势", "裂牙：攻击选定的敌人。", "旅途中随行，自动协助近身战斗。"),
            new Pet("灯灵", "灵狐 · 引路", "灵佑：攻击敌人，为主人回血并减伤。", "旅途中随行，自动协助近身战斗。")
        };

        public static void Build(RectTransform root, PrototypeApp app)
        {
            var state = app.State;
            int activePet = Mathf.Clamp(state.ActivePet, 0, Pets.Length - 1);
            if (selectedPet < 0) selectedPet = activePet;
            selectedPet = Mathf.Clamp(selectedPet, 0, Pets.Length - 1);
            int level = Mathf.Clamp(state.PetLevel, 1, MaxPetLevel);
            bool permanent = state.Level >= TrainingUnlockLevel;
            var content = UiKit.Panel(root, "PetContent", 0, 108, 1280, 516, Color.clear);

            UiKit.Label(content, "宝宝契约", 48, 12, 380, 48, 32, TextColor);
            UiKit.Label(content, "银两 " + state.Coins.ToString("N0") + "    灵魄 " + state.Essence,
                714, 18, 516, 38, 23, UiKit.Gold, TextAnchor.MiddleRight);
            UiKit.Panel(content, "HeadingRule", 48, 72, 1184, 1, UiKit.Muted);

            for (int i = 0; i < Pets.Length; i++)
            {
                int index = i;
                var button = UiKit.Button(content, "Pet" + i, "", 48, 98 + i * 124, 252, 106,
                    () => { selectedPet = index; app.ShowPage(PageKey); }, i == selectedPet);
                UiKit.Label(button.transform, Pets[i].Name, 20, 13, 150, 38, 27, TextColor);
                UiKit.Label(button.transform, Pets[i].Role, 20, 62, 212, 28, 22, UiKit.Muted);
                UiKit.Label(button.transform, i == activePet ? "出战" : "休憩", 172, 19, 60, 28, 21,
                    i == activePet ? UiKit.Gold : UiKit.Muted, TextAnchor.MiddleRight);
            }

            Pet selected = Pets[selectedPet];
            PetArtPreview.Create(content,selectedPet,330,100,400,300);
            UiKit.Label(content, selected.Name, 770, 94, 230, 46, 34, TextColor);
            UiKit.Label(content, "共鸣 " + level + " 级", 1008, 96, 218, 42, 28,
                UiKit.Gold, TextAnchor.MiddleRight);
            UiKit.Label(content, (permanent ? "已契约  /  " : "教学伙伴 · 临时借用  /  ") + selected.Role,
                770, 149, 456, 34, 21, UiKit.Muted);
            UiKit.Label(content, "战斗指令", 770, 198, 440, 32, 23, UiKit.Gold);
            UiKit.Label(content, selected.Skill, 770, 237, 456, 45, 23, TextColor);
            UiKit.Label(content, "探索天赋", 770, 293, 440, 32, 23, UiKit.Gold);
            UiKit.Label(content, selected.Exploration, 770, 332, 456, 54, 23, TextColor);
            UiKit.Panel(content, "TrainingRule", 770, 401, 456, 1, UiKit.Muted);
            UiKit.Label(content, permanent ? "已契约宝宝共享本地共鸣等级" : "临时伙伴不可培养，25 级开放领养",
                48, 374, 256, 72, 21, UiKit.Muted);

            bool capped = level >= MaxPetLevel;
            int cost = 1200 + level * 150;
            UiKit.Label(content, capped ? "已达最高 30 级" : "银两 " + cost.ToString("N0") + " · 灵魄 2",
                770, 414, 456, 30, 20, UiKit.Gold, TextAnchor.MiddleRight);
            Button train = UiKit.Button(content, "FeedPet", !permanent ? "25 级开放培养" : capped ? "已满级" : "喂养共鸣",
                928, 454, 298, 54, () => Train(app), true);
            train.interactable = permanent && !capped;
            Button deploy = UiKit.Button(content, "DeployPet", selectedPet == activePet ? "正在出战" : "设为出战",
                415, 432, 230, 56, () => Deploy(app));
            deploy.interactable = selectedPet != activePet;
        }

        private static void Deploy(PrototypeApp app)
        {
            if (selectedPet == app.State.ActivePet) return;
            app.State.ActivePet = selectedPet;
            app.Save();
            app.ShowPage(PageKey);
            app.Toast(Pets[selectedPet].Name + "已设为出战灵宠");
        }

        private static void Train(PrototypeApp app)
        {
            var state = app.State;
            if (state.Level < TrainingUnlockLevel) { app.Toast("临时教学伙伴不可培养，25 级开放领养"); return; }
            int level = Mathf.Clamp(state.PetLevel, 1, MaxPetLevel);
            if (level >= MaxPetLevel) { app.Toast("契约共鸣已达最高等级"); return; }
            int coinCost = 1200 + level * 150;
            const int essenceCost = 2;
            if (state.Coins < coinCost) { app.Toast("银两不足，需要 " + coinCost.ToString("N0") + " 银两"); return; }
            if (state.Essence < essenceCost) { app.Toast("灵魄不足，需要 2 份灵魄"); return; }
            state.Coins -= coinCost;
            state.Essence -= essenceCost;
            state.PetLevel = level + 1;
            app.Save();
            app.ShowPage(PageKey);
            app.Toast("喂养完成 · 契约共鸣提升至 " + state.PetLevel + " 级");
        }
    }
}
