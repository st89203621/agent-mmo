using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Lunhui.Protocol;
using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    public static class NativeGrowthPages
    {
        private static long owner;
        private static string selectedEquipment, selectedPet, selectedItem;
        private static int equipmentPage, petPage, inventoryPage, inventoryFilter, titlePage;
        private static readonly Color Rule = new Color32(73, 99, 92, 180);

        public static void BuildTitles(RectTransform root, PrototypeApp app)
        {
            if (!Begin(root, app, "旅途成就", out var content, () => app.Native.RefreshTitles())) return;
            var owned = app.Native.Titles ?? new List<TitleMessage>();
            var available = app.Native.AvailableTitles ?? new List<TitleMessage>();
            UiKit.Label(content, "已拥有 " + owned.Count + " 枚", 48, 78, 420, 36, 23, UiKit.Jade);
            var source = available.Count > 0 ? available : owned;
            titlePage = ClampPage(titlePage, source.Count, 4);
            for (int i = 0; i < 4 && titlePage * 4 + i < source.Count; i++)
            {
                var title = source[titlePage * 4 + i]; bool have = owned.Any(item => item.TitleId == title.TitleId);
                float y = 136 + i * 74;
                UiKit.Label(content, title.Name, 48, y, 350, 54, 23, have ? UiKit.Gold : UiKit.Muted);
                UiKit.Label(content, "等级 " + title.RequiredLevel + "  /  " + title.Description, 430, y, 510, 58, 19, UiKit.Paper);
                UiKit.Label(content, have ? (title.Equipped ? "已装备" : "已拥有") : "未解锁", 966, y, 142, 54, 19, have ? UiKit.Jade : UiKit.Muted, TextAnchor.MiddleRight);
                if (have)
                {
                    var captured = title;
                    UiKit.IconButton(content, "TitleAction" + i, title.Equipped ? "close" : "star",
                        title.Equipped ? "卸下称号" : "装备称号", 1158, y,
                        () =>
                        {
                            if (title.Equipped)
                                app.RunOnline(async () => { await app.Native.UnequipTitle(); }, "称号已卸下");
                            else
                                app.RunOnline(async () => { await app.Native.EquipTitle(captured.TitleId); }, "称号已装备");
                        }, size: 54);
                }
                else if (Level(app) >= title.RequiredLevel)
                {
                    var captured = title;
                    UiKit.IconButton(content, "ClaimTitle" + i, "gift", "领取称号", 1158, y,
                        () => app.RunOnline(() => app.Native.ClaimTitle(captured.TitleId), "称号已领取"), size: 54);
                }
            }
            if (source.Count == 0) UiKit.Label(content, "暂无可用称号", 48, 210, 1176, 60, 27, UiKit.Muted, TextAnchor.MiddleCenter);
            Pager(content, titlePage, source.Count, 4, 1000, 450, next => { titlePage = next; app.ShowPage("titles"); });
            if (owned.Count == 0 && available.Count == 0)
                app.RunOnline(app.Native.RefreshTitles);
        }

        public static void BuildEquipment(RectTransform root, PrototypeApp app)
        {
            if (!Begin(root, app, "武器与灵纹", out var content)) return;
            var equipment = app.Native.Equipment.OrderByDescending(e => e.Equipped).ThenBy(e => e.Position).ThenBy(e => e.Id).ToList();
            if (!equipment.Any()) { Empty(content, "行囊中暂无装备"); return; }
            var selected = equipment.FirstOrDefault(e => e.Id == selectedEquipment) ?? equipment[0];
            selectedEquipment = selected.Id;
            equipmentPage = ClampPage(equipmentPage, equipment.Count, 4);
            for (int i = 0; i < 4 && equipmentPage * 4 + i < equipment.Count; i++)
            {
                var item = equipment[equipmentPage * 4 + i];
                var row = UiKit.Button(content, "EquipmentRow" + i, "", 48, 90 + i * 82, 322, 72,
                    () => { selectedEquipment = item.Id; app.ShowPage("equipment"); }, item.Id == selected.Id);
                UiKit.Label(row.transform, EquipmentName(item), 16, 7, 280, 29, 24, item.Quality > 1 ? UiKit.Gold : UiKit.Paper);
                UiKit.Label(row.transform, Slot(item.Position) + "  " + item.Grade + "品  " + (item.Equipped ? "已穿戴" : "未穿戴"), 16, 40, 280, 24, 19, UiKit.Muted);
            }
            Pager(content, equipmentPage, equipment.Count, 4, 58, 444, next => { equipmentPage = next; app.ShowPage("equipment"); });
            UiKit.Panel(content, "EquipmentDivider", 404, 90, 1, 404, Rule);
            UiKit.Label(content, EquipmentName(selected), 438, 84, 500, 44, 31, UiKit.Paper);
            UiKit.Label(content, Slot(selected.Position) + "  /  " + selected.Level + "级可用  /  " + selected.Grade + "品", 438, 132, 510, 30, 22, UiKit.Muted);
            var equip = selected;
            var wear = UiKit.Button(content, "WearEquipment", equip.Equipped ? "已穿戴" : "穿戴", 1030, 98, 194, 56,
                () => Run(app, async () => { await app.Native.List<EquipMessage>(ServerRoutes.EquipAction_wearEquip, equip.Id); }, "装备已穿戴"), true);
            wear.interactable = !equip.Equipped && Level(app) >= equip.Level;
            int attack = equip.FixedEquipProperty?.PhysicsAttack ?? 0;
            int defense = equip.FixedEquipProperty?.PhysicsDefense ?? 0;
            UiKit.Label(content, "基础攻击 " + attack + "    基础防御 " + defense + "    附加属性 " + equip.AttrTotal, 438, 172, 780, 34, 23, UiKit.Jade);
            int nextGrade = equip.Grade + 1;
            GrowthRow(content, "加品", equip.Grade + " / 21品", "银两 " + Money(nextGrade * 1800) + "  精炼矿石 " + nextGrade * 5,
                "成功率 " + Mathf.RoundToInt((22 - equip.Grade) * 4) + "%", 224,
                Level(app) < 3 ? "3级开放" : equip.Grade >= 21 ? "已满品" : "加品",
                Level(app) >= 3 && equip.Grade < 21, () => app.ShowDialog("装备加品",
                    "消耗 " + Money(nextGrade * 1800) + " 银两、" + nextGrade * 5 + " 精炼矿石\n成功率 " + (22 - equip.Grade) * 4 + "%\n未成功也会消耗材料与银两。",
                    () => app.RunOnline(async () => {
                        var result = await app.Native.Call<EquipMessage>(ServerRoutes.EquipAction_upgradeGrade, equip.Id);
                        await app.Native.RefreshGrowth();
                        app.StartCoroutine(NotifyAfterRefresh(app, result.Grade > equip.Grade ? "加品成功，当前 " + result.Grade + " 品" : "本次加品未成功"));
                    }), "开始加品"));
            EnchantMessage enchant;
            bool known = app.Native.Enchantments.TryGetValue(equip.Id, out enchant);
            int magic = known ? enchant.EnchantLevel : 0;
            bool prestige = magic >= 6;
            int enchantCost = (magic + 1) * (prestige ? 2000 : 1500);
            string enchantMaterial = prestige ? "灵魂碎片 3" : "附魔石 " + (magic + 1) * 3;
            string enchantChance = prestige ? "成功率 " + (11 - magic) * 8 + "%  失败降2级" : "成功率 30%  保底 " + (enchant?.GuaranteeCount ?? 0) + "/8";
            GrowthRow(content, "附魔", known ? "+" + magic + " / +10" : "穿戴后可附魔", "银两 " + Money(enchantCost) + "  " + enchantMaterial,
                known ? enchantChance : "", 318, !equip.Equipped ? "先穿戴" : Level(app) < 8 ? "8级开放" : magic >= 10 ? "已满级" : "附魔",
                equip.Equipped && known && Level(app) >= 8 && magic < 10, () => app.ShowDialog("装备附魔",
                    "消耗 " + Money(enchantCost) + " 银两、" + enchantMaterial + "\n" + enchantChance + "\n每次尝试均会消耗材料与银两。",
                    () => app.RunOnline(async () => {
                        var result = await app.Native.Call<EnchantMessage>(prestige ? ServerRoutes.EnchantAction_prestigeEnchant : ServerRoutes.EnchantAction_enchantEquip,
                            new EnchantMessage { EquipId = equip.Id, RuneId = "rune_small" });
                        await app.Native.RefreshGrowth();
                        app.StartCoroutine(NotifyAfterRefresh(app, result.Success ? "附魔成功，当前 +" + result.EnchantLevel : "本次附魔未成功，当前 +" + result.EnchantLevel));
                    }), "开始附魔"));
            int furnace = equip.FurnaceGrade;
            GrowthRow(content, "鬼炉", furnace + " / 30阶", "银两 " + Money((furnace + 1) * 2500) + "  鬼炉精华 1",
                "成功率 " + (31 - furnace) * 3 + "%", 412, equip.Grade < 21 ? "21品开放" : furnace >= 30 ? "已满阶" : "淬炼",
                equip.Grade >= 21 && furnace < 30, () => app.ShowDialog("鬼炉淬炼", "消耗 " + Money((furnace + 1) * 2500) + " 银两、1 鬼炉精华\n成功率 " + (31 - furnace) * 3 + "%\n未成功也会消耗材料与银两。",
                    () => app.RunOnline(async () => {
                        var result = await app.Native.Call<EquipMessage>(ServerRoutes.EquipAction_furnaceUpgrade, equip.Id);
                        await app.Native.RefreshGrowth(); app.StartCoroutine(NotifyAfterRefresh(app, result.FurnaceGrade > furnace ? "淬炼成功" : "本次淬炼未成功"));
                    }), "开始淬炼"));
        }

        public static void BuildPets(RectTransform root, PrototypeApp app)
        {
            if (!Begin(root, app, "契约与共鸣", out var content)) return;
            var pets = app.Native.Pets.OrderByDescending(p => p.Active).ThenBy(p => p.Id).ToList();
            if (!pets.Any()) { Empty(content, "尚未结下灵宠契约"); return; }
            var selected = pets.FirstOrDefault(p => p.Id == selectedPet) ?? pets[0]; selectedPet = selected.Id;
            petPage = ClampPage(petPage, pets.Count, 4);
            for (int i = 0; i < 4 && petPage * 4 + i < pets.Count; i++)
            {
                var pet = pets[petPage * 4 + i];
                var row = UiKit.Button(content, "PetRow" + i, "", 48, 92 + i * 80, 244, 70,
                    () => { selectedPet = pet.Id; app.ShowPage("pets"); }, selected.Id == pet.Id);
                UiKit.Label(row.transform, PetName(pet), 14, 7, 216, 28, 23, UiKit.Paper);
                UiKit.Label(row.transform, "共鸣 " + Math.Max(1, pet.Level) + "级  " + (pet.Active ? "出战" : "休憩"), 14, 40, 216, 24, 20, pet.Active ? UiKit.Gold : UiKit.Muted);
            }
            Pager(content, petPage, pets.Count, 4, 40, 444, next => { petPage = next; app.ShowPage("pets"); });
            bool wolf = selected.PetTemplateId == "contract_wolf", fox = selected.PetTemplateId == "contract_fox";
            if (wolf || fox) PetArtPreview.Create(content, fox ? 1 : 0, 318, 92, 420, 315);
            else UiKit.Label(content, "灵宠形象待收录", 330, 200, 390, 80, 26, UiKit.Muted, TextAnchor.MiddleCenter);
            UiKit.Label(content, PetName(selected), 770, 86, 438, 44, 32, UiKit.Paper);
            UiKit.Label(content, "共鸣 " + Math.Max(1, selected.Level) + "级  /  " + Tier(selected.Tier), 770, 139, 438, 32, 23, UiKit.Gold);
            Stat(content, "力量", selected.Power, 770, 197); Stat(content, "体质", selected.Constitution, 1000, 197);
            Stat(content, "耐力", selected.Endurance, 770, 256); Stat(content, "敏捷", selected.Agile, 1000, 256);
            UiKit.Label(content, fox ? "灵佑  /  陪伴主人恢复生命" : wolf ? "裂牙  /  协助主人攻击敌人" : "契约伙伴", 770, 316, 440, 50, 22, UiKit.Jade);
            int level = Math.Max(1, selected.Level), cost = 1200 + level * 150;
            UiKit.Label(content, "银两 " + Money(cost) + "  灵魂碎片 2", 770, 394, 438, 34, 23, UiKit.Muted);
            var train = UiKit.Button(content, "TrainNativePet", level >= 30 ? "已达30级" : "喂养共鸣", 950, 446, 274, 58,
                () => app.ShowDialog("喂养" + PetName(selected), "消耗 " + Money(cost) + " 银两、2 灵魂碎片\n共鸣等级 +1，力量 +2，体质 +2",
                    () => Run(app, async () => { await app.Native.List<PetMessage>(ServerRoutes.PetAction_trainPet, selected.Id); }, "喂养完成"), "喂养"), true);
            train.interactable = level < 30;
            var deploy = UiKit.Button(content, "DeployNativePet", selected.Active ? "正在出战" : "设为出战", 394, 432, 264, 58,
                () => Run(app, async () => { await app.Native.Call<PetMessage>(ServerRoutes.PetAction_deployPet, new DeployPetMessage { PetId = selected.Id }); }, "出战伙伴已变更"), true);
            deploy.interactable = !selected.Active;
        }

        public static void BuildInventory(RectTransform root, PrototypeApp app)
        {
            if (!Begin(root, app, "行囊", out var content)) return;
            var all = Inventory(app);
            string[] tabs = { "全部", "装备", "材料", "珍贵" };
            for (int i = 0; i < tabs.Length; i++)
            {
                int filter = i;
                UiKit.Button(content, "InventoryFilter" + i, tabs[i], 48 + i * 158, 84, 144, 46,
                    () => { inventoryFilter = filter; inventoryPage = 0; selectedItem = null; app.OpenInventory(); }, i == inventoryFilter);
            }
            var items = all.Where(i => inventoryFilter == 0 || inventoryFilter == 1 && i.Equip != null || inventoryFilter == 2 && i.Material || inventoryFilter == 3 && i.Important).ToList();
            inventoryPage = ClampPage(inventoryPage, items.Count, 5);
            var selected = items.FirstOrDefault(i => i.Id == selectedItem) ?? items.FirstOrDefault();
            selectedItem = selected?.Id;
            for (int i = 0; i < 5 && inventoryPage * 5 + i < items.Count; i++)
            {
                var item = items[inventoryPage * 5 + i];
                var row = UiKit.Button(content, "BagRow" + i, "", 48, 144 + i * 60, 692, 52,
                    () => { selectedItem = item.Id; app.OpenInventory(); }, selected?.Id == item.Id);
                if (item.Important) UiKit.Panel(row.transform, "ImportantMark", 0, 3, 5, 44, UiKit.Gold);
                UiKit.Label(row.transform, item.Name, 18, 0, 390, 52, 23, item.Important ? UiKit.Gold : UiKit.Paper);
                UiKit.Label(row.transform, item.Equip != null ? (item.Equip.Equipped ? "已穿戴" : item.Equip.Grade + "品") : item.Quantity.ToString("N0"), 486, 0, 184, 52, 23, UiKit.Muted, TextAnchor.MiddleRight);
            }
            if (!items.Any()) UiKit.Label(content, "暂无物品", 48, 232, 690, 60, 26, UiKit.Muted, TextAnchor.MiddleCenter);
            Pager(content, inventoryPage, items.Count, 5, 235, 458, next => { inventoryPage = next; app.OpenInventory(); });
            UiKit.Panel(content, "BagDivider", 770, 90, 1, 404, Rule);
            if (selected == null) return;
            UiKit.Label(content, selected.Name, 802, 98, 408, 54, 32, selected.Important ? UiKit.Gold : UiKit.Paper);
            UiKit.Label(content, selected.Important ? "珍贵物品" : selected.Equip != null ? "装备" : selected.Material ? "材料" : "道具", 802, 165, 408, 32, 22, UiKit.Muted);
            UiKit.Label(content, selected.Description, 802, 226, 408, 120, 24, UiKit.Paper);
            UiKit.Label(content, "持有 " + selected.Quantity.ToString("N0"), 802, 374, 408, 36, 25, UiKit.Gold);
            if (selected.Equip != null)
                UiKit.Button(content, "InspectBagEquipment", "查看装备", 906, 446, 310, 58,
                    () => { selectedEquipment = selected.Equip.Id; app.ShowPage("equipment"); }, true);
            else if (selected.Material)
                UiKit.Button(content, "OpenGrowthFromBag", selected.Type == "material_003" ? "前往灵宠" : "前往装备", 906, 446, 310, 58,
                    () => app.ShowPage(selected.Type == "material_003" ? "pets" : "equipment"));
        }

        public static void BuildProfile(RectTransform root, PrototypeApp app)
        {
            if (!Begin(root, app, "角色", out var content)) return;
            UiKit.Label(root, "人物信息", 48, 26, 400, 48, 28, UiKit.Muted);
            UiKit.IconButton(root, "CloseNativeProfile", "close", "关闭角色", 1172, 28, app.CloseDialog);
            var person = app.Native.Person;
            NativeCharacterPortrait.Create(content, person, 48, 86, 292, 316);
            UiKit.Button(content, "EditNativeAppearance", "容貌", 84, 428, 220, 56, app.OpenCustomization, true);
            var name = UiKit.Input(content, "NativeNickname", person.Name, "角色名", 378, 88, 358, 52, 18);
            UiKit.Label(content, "等级 " + Level(app) + "  /  " + Career(person.Profession), 378, 156, 370, 32, 23, UiKit.Gold);
            string gender = string.IsNullOrEmpty(person.Gender) ? "female" : person.Gender;
            var female = UiKit.Button(content, "NativeFemale", "女侠", 378, 210, 166, 48, null, gender == "female");
            var male = UiKit.Button(content, "NativeMale", "侠客", 562, 210, 174, 48, null, gender == "male");
            female.onClick.AddListener(() => { gender = "female"; female.interactable = false; male.interactable = true; });
            male.onClick.AddListener(() => { gender = "male"; male.interactable = false; female.interactable = true; });
            female.interactable = gender != "female"; male.interactable = gender != "male";
            string profession = string.IsNullOrEmpty(person.Profession) ? "ATTACK" : person.Profession;
            if (!person.CustomizationComplete)
            {
                var professions = new[] { "ATTACK", "DEFENSE", "AGILITY" };
                var buttons = new Button[3];
                for (int i = 0; i < 3; i++)
                {
                    string choice = professions[i]; int index = i;
                    buttons[i] = UiKit.Button(content, "NativeCareer" + i, Career(choice), 378, 282 + i * 56, 358, 46,
                        () => { profession = choice; for (int j = 0; j < 3; j++) buttons[j].interactable = j != index; }, profession == choice);
                    buttons[i].interactable = profession != choice;
                }
            }
            else UiKit.Label(content, "已定职业\n" + Career(profession), 378, 300, 358, 104, 26, UiKit.Muted);
            UiKit.Button(content, "SaveNativeIdentity", "保存角色", 378, 452, 358, 52, () => app.RunOnline(async () => {
                await app.Native.UpdatePerson(new UpdatePersonMessage { Name = name.text.Trim(), Gender = gender, Profession = profession, AppearanceJson = person.AppearanceJson });
                await app.Native.RefreshGrowth();
            }, "角色信息已保存"), true);
            UiKit.Panel(content, "ProfileDivider", 772, 90, 1, 404, Rule);
            UiKit.Label(content, "潜力 " + person.AttributePoints, 804, 91, 400, 42, 29, UiKit.Gold);
            var stats = person.BasicProperty ?? new BasicPropertyMessage();
            Potential(content, app, "气血", stats.Hp, "每点 +20", 164, 0);
            Potential(content, app, "攻击", stats.PhysicsAttack, "每点 +3", 241, 1);
            Potential(content, app, "防御", stats.PhysicsDefense, "每点 +2", 318, 2);
            Potential(content, app, "敏捷", stats.Agility, "每点 +1", 395, 3);
            UiKit.Label(content, "附攻 " + stats.BonusAttack + "  附防 " + stats.BonusDefense + "  暴击 " + stats.CritRate + "%", 804, 477, 400, 30, 20, UiKit.Jade);
        }

        private static void Potential(Transform parent, PrototypeApp app, string title, int value, string gain, int y, int index)
        {
            UiKit.Label(parent, title + "  " + value, 804, y, 284, 31, 24, UiKit.Paper);
            UiKit.Label(parent, gain, 804, y + 34, 260, 25, 19, UiKit.Muted);
            var button = UiKit.IconButton(parent, "Potential" + index, "heal", "分配1点" + title, 1148, y + 2,
                () => Run(app, async () => {
                    var request = new AllotPotentialMessage();
                    if (index == 0) request.Hp = 1; else if (index == 1) request.PhysicsAttack = 1;
                    else if (index == 2) request.PhysicsDefense = 1; else request.Agility = 1;
                    await app.Native.Call<PersonMessage>(ServerRoutes.PersonAction_allotPotential, request);
                }, title + "潜力已分配"), UiKit.Gold);
            button.interactable = app.Native.Person.AttributePoints > 0;
        }

        private static bool Begin(RectTransform root, PrototypeApp app, string title, out RectTransform content, Func<Task> refresh = null)
        {
            content = UiKit.PageContent(root, "NativeGrowthContent", title);
            UiKit.IconButton(content, "RefreshNativeGrowth", "reset", "刷新", 1178, 4,
                () => { if (app.Native != null) app.RunOnline(refresh ?? app.Native.RefreshGrowth); }, size: 48);
            if (app.Native == null || app.Native.Person == null) { Empty(content, "正在读取角色数据"); return false; }
            if (owner != app.Native.Person.UserId)
            {
                owner = app.Native.Person.UserId; selectedEquipment = selectedPet = selectedItem = null;
                equipmentPage = petPage = inventoryPage = inventoryFilter = titlePage = 0;
            }
            UiKit.Label(content, "钻石 " + Money(app.Native.Currency.Diamond), 820, 14, 320, 34, 21, UiKit.Gold, TextAnchor.MiddleRight);
            return true;
        }

        private static void Run(PrototypeApp app, Func<Task> action, string success) => app.RunOnline(async () => { await action(); await app.Native.RefreshGrowth(); }, success);
        private static IEnumerator NotifyAfterRefresh(PrototypeApp app, string message)
        {
            var native = app.Native;
            yield return null;
            if (app && app.Native == native && app.OnlineMode) app.Toast(message);
        }
        private static int Level(PrototypeApp app) => app.Native.Person.Level?.Level ?? 1;
        private static string Money(int amount) => amount.ToString("N0");
        private static string Career(string profession) => profession == "DEFENSE" ? "金刚护体" : profession == "AGILITY" ? "行动敏捷" : "无坚不摧";
        private static string Slot(int position) => new[] { "头饰", "衣甲", "武器", "手镯", "裤装", "鞋履" }[Mathf.Clamp(position, 0, 5)];
        private static string Tier(int tier) => new[] { "普通", "优秀", "精良", "稀有", "史诗", "传说" }[Mathf.Clamp(tier - 1, 0, 5)];
        private static string PetName(PetMessage pet) => string.IsNullOrWhiteSpace(pet.Nickname) ? "契约灵宠" : pet.Nickname;
        private static string EquipmentName(EquipMessage equip) => !string.IsNullOrWhiteSpace(equip.Name) ? equip.Name : ItemName(equip.ItemTypeId, Slot(equip.Position));
        private static void Empty(Transform parent, string text) => UiKit.Label(parent, text, 48, 198, 1180, 70, 28, UiKit.Muted, TextAnchor.MiddleCenter);
        private static void Stat(Transform parent, string name, int value, float x, float y) => UiKit.Label(parent, name + "  " + value, x, y, 206, 34, 24, UiKit.Paper);
        private static int ClampPage(int page, int total, int size) => Mathf.Clamp(page, 0, Math.Max(0, (total - 1) / size));

        private static void Pager(Transform parent, int page, int count, int size, float x, float y, Action<int> change)
        {
            int last = Math.Max(0, (count - 1) / size);
            var previous = UiKit.IconButton(parent, "PagePrevious", "back", "上一页", x, y, () => change(page - 1), size: 44);
            previous.interactable = page > 0;
            UiKit.Label(parent, (page + 1) + " / " + (last + 1), x + 54, y, 104, 44, 22, UiKit.Muted, TextAnchor.MiddleCenter);
            var next = UiKit.IconButton(parent, "PageNext", "dodge", "下一页", x + 168, y, () => change(page + 1), size: 44);
            next.interactable = page < last;
        }

        private static void GrowthRow(Transform parent, string title, string value, string cost, string chance, int y, string command, bool enabled, Action click)
        {
            UiKit.Panel(parent, "GrowthRule" + y, 438, y - 12, 786, 1, Rule);
            UiKit.Label(parent, title + "  " + value, 438, y, 328, 30, 23, UiKit.Paper);
            UiKit.Label(parent, cost, 438, y + 35, 546, 27, 19, UiKit.Gold);
            UiKit.Label(parent, chance, 782, y, 440, 30, 19, UiKit.Muted, TextAnchor.MiddleRight);
            var button = UiKit.Button(parent, "GrowthAction" + y, command, 1030, y + 35, 194, 46, click, true);
            button.interactable = enabled;
        }

        private sealed class InventoryItem
        {
            public string Id, Type, Name, Description;
            public int Quantity;
            public bool Important, Material;
            public EquipMessage Equip;
        }

        private static List<InventoryItem> Inventory(PrototypeApp app)
        {
            var result = new List<InventoryItem>();
            var equipmentIds = new HashSet<string>(app.Native.Equipment.Select(e => e.Id), StringComparer.Ordinal);
            foreach (var item in app.Native.Bag.ItemMap.Values)
            {
                if (item.Quantity <= 0 || equipmentIds.Contains(item.Id)) continue;
                bool important = item.ItemTypeId == "golden_bean" || item.ItemTypeId == "gold_bean";
                result.Add(new InventoryItem { Id = "bag:" + item.Id, Type = item.ItemTypeId, Name = ItemName(item.ItemTypeId, "旅途道具"),
                    Quantity = item.Quantity, Important = important, Material = item.ItemTypeId.StartsWith("material_", StringComparison.Ordinal),
                    Description = important ? "珍贵的金豆子，记录一次难忘的收获。" : ItemDescription(item.ItemTypeId) });
            }
            foreach (var equip in app.Native.Equipment)
                result.Add(new InventoryItem { Id = "equip:" + equip.Id, Type = equip.ItemTypeId, Name = EquipmentName(equip), Quantity = 1, Equip = equip,
                    Important = equip.Quality > 1, Description = Slot(equip.Position) + "\n" + equip.Level + "级可用  加品 " + equip.Grade + "品\n基础攻击 " + (equip.FixedEquipProperty?.PhysicsAttack ?? 0) + "  基础防御 " + (equip.FixedEquipProperty?.PhysicsDefense ?? 0) });
            return result.OrderByDescending(i => i.Important).ThenByDescending(i => i.Equip != null).ThenBy(i => i.Id).ToList();
        }

        private static string ItemDescription(string id)
        {
            switch (id)
            {
                case "material_001": return "用于灵纹附魔。材料附魔可将装备提升至 +6。";
                case "material_002": return "用于装备加品，提升装备的附加属性。";
                case "material_003": return "用于灵宠共鸣，也可用于高阶附魔。";
                case "material_004": return "用于鬼炉淬炼，装备达到21品后可用。";
                case "consumable_001": case "consumable_004": return "恢复生命的药水。";
                case "consumable_002": return "恢复法力的药水。";
                case "consumable_003": case "consumable_005": return "蕴含修行经验的药水。";
                default: return "旅途中获得的道具。";
            }
        }

        private static string ItemName(string id, string fallback)
        {
            switch (id)
            {
                case "golden_bean": case "gold_bean": return "金豆子";
                case "material_001": return "附魔石"; case "material_002": return "精炼矿石";
                case "material_003": return "灵魂碎片"; case "material_004": return "鬼炉精华";
                case "consumable_001": return "生命药水"; case "consumable_002": return "魔法药水";
                case "consumable_003": return "经验药水"; case "consumable_004": return "大生命药水";
                case "consumable_005": return "高级经验药水"; case "consumable_006": return "复活石";
                case "weapon_001": return "烈焰之剑"; case "weapon_002": return "冰霜法杖";
                case "weapon_003": return "雷霆之锤"; case "weapon_004": return "影月弯刀";
                case "weapon_005": return "炼狱魔杖"; case "weapon_006": return "翠竹长剑"; case "weapon_007": return "玄铁重剑";
                case "armor_001": return "龙鳞铠甲"; case "armor_002": return "魔法长袍"; case "armor_003": return "暗影皮甲";
                case "armor_004": return "圣光战铠"; case "armor_005": return "布衣"; case "armor_006": return "铁甲";
                case "accessory_001": return "龙心项链"; case "accessory_002": return "幽灵戒指"; case "accessory_003": return "疾风耳坠";
                case "accessory_004": return "不灭灵珠"; case "accessory_005": return "铜质护符";
                case "special_001": return "宠物蛋"; case "special_002": return "传送卷轴"; case "special_003": return "双倍经验卡"; case "special_004": return "洗点丹";
                default: return fallback;
            }
        }
    }

    internal sealed class NativeCharacterPortrait : MonoBehaviour
    {
        private GameObject scene;
        private RenderTexture texture;

        public static void Create(Transform parent, PersonMessage person, float x, float y, float width, float height)
        {
            var rect = UiKit.Rect(parent, "NativeCharacterPortrait", x, y, width, height);
            var preview = rect.gameObject.AddComponent<NativeCharacterPortrait>();
            var image = rect.gameObject.AddComponent<RawImage>(); image.raycastTarget = false;
            preview.texture = new RenderTexture(512, Mathf.RoundToInt(512 * height / width), 16) { antiAliasing = 2, name = "Account Character Portrait" };
            image.texture = preview.texture;
            preview.scene = new GameObject("Account Character Preview"); preview.scene.transform.position = new Vector3(2400, 0, 0);
            var visual = CharacterVisual.Create(preview.scene.transform);
            visual.SetFemale(person.Gender != "male");
            visual.SetCareer(person.Profession == "DEFENSE" ? 1 : person.Profession == "AGILITY" ? 2 : 0);
            CharacterAppearance appearance;
            try { appearance = string.IsNullOrWhiteSpace(person.AppearanceJson) ? new CharacterAppearance() : JsonUtility.FromJson<CharacterAppearance>(person.AppearanceJson); }
            catch (ArgumentException) { appearance = new CharacterAppearance(); }
            if (appearance == null) appearance = new CharacterAppearance(); appearance.Sanitize(); visual.SetAppearance(appearance);
            foreach (var part in preview.scene.GetComponentsInChildren<Transform>(true)) part.gameObject.layer = 29;
            var camera = new GameObject("Portrait Camera", typeof(Camera)).GetComponent<Camera>();
            camera.transform.SetParent(preview.scene.transform, false); camera.cullingMask = 1 << 29;
            camera.clearFlags = CameraClearFlags.SolidColor; camera.backgroundColor = new Color32(25, 42, 41, 255);
            camera.targetTexture = preview.texture; camera.fieldOfView = 31; camera.aspect = width / height; camera.nearClipPlane = .05f;
            Vector3 focus = visual.PortraitFocus - Vector3.up * .28f;
            // Match the appearance editor's front-facing camera direction.
            camera.transform.position = focus - visual.PortraitForward * 2.0f + Vector3.up * .1f;
            camera.transform.LookAt(focus);
            var light = new GameObject("Portrait Light", typeof(Light)).GetComponent<Light>();
            light.transform.SetParent(preview.scene.transform, false); light.type = LightType.Point;
            light.transform.position = focus - visual.PortraitForward * 1.4f + Vector3.up;
            light.range = 8; light.intensity = 2.2f; light.cullingMask = 1 << 29;
        }

        private void OnDestroy()
        {
            if (scene) Destroy(scene);
            if (texture) { texture.Release(); Destroy(texture); }
        }
    }
}
