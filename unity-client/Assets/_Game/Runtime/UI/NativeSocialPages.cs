using System;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;
using Lunhui.Protocol;
using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    /// <summary>
    /// Online-only social surfaces. Every state-changing button calls the native
    /// client; the local prototype pages remain separate when offline.
    /// </summary>
    public static class NativeSocialPages
    {
        private static int selectedMountain;
        private static string dismissedRun;
        private static int guildPage, memberPage;
        private static NativeGameClient currentOwner;

        private static void ResetOwner(PrototypeApp app)
        {
            if (currentOwner == app.Native) return;
            currentOwner = app.Native;
            guildPage = memberPage = selectedMountain = 0;
            dismissedRun = null;
        }

        public static void BuildGuild(RectTransform root, PrototypeApp app)
        {
            ResetOwner(app);
            NativeGuildState state = app.Native?.Guild;
            var content = UiKit.Panel(root, "NativeGuildContent", 0, 108, 1280, 516, Color.clear);
            if (state == null)
            {
                UiKit.Label(content, "正在同步盟会……", 48, 110, 1184, 52, 27, UiKit.Muted);
                return;
            }
            UiKit.Label(content, "盟会 · 同赴山海", 48, 10, 580, 52, 34, UiKit.Paper);
            UiKit.Label(content, "金币 " + (app.Native?.Currency.Gold ?? 0).ToString("N0"), 850, 18, 380, 36, 21, UiKit.Gold, TextAnchor.MiddleRight);
            UiKit.Panel(content, "Rule", 48, 72, 1184, 1, UiKit.Muted);

            GuildMessage guild = state?.Guild;
            if (guild == null)
            {
                UiKit.Label(content, "你尚未加入盟会", 48, 104, 550, 42, 28, UiKit.Gold);
                UiKit.Label(content, "创建需要 " + (state?.CreateCost ?? 5000000L).ToString("N0") + " 金币，加入已有盟会不消耗金币。",
                    48, 152, 630, 38, 21, UiKit.Muted);
                var name = UiKit.Input(content, "NativeGuildName", "", "输入盟会名称", 48, 216, 390, 56, 12);
                UiKit.Button(content, "CreateNativeGuild", "创建盟会", 458, 216, 190, 56, () =>
                {
                    app.RunOnline(() => app.Native.MutateGuild(new NativeGuildRequest { Operation = "CREATE", Name = name.text }), "盟会创建成功");
                }, true);
                UiKit.Label(content, "可加入的盟会", 738, 90, 494, 36, 26, UiKit.Paper);
                BuildGuildRoster(content, app, state?.Guilds);
            }
            else
            {
                UiKit.Label(content, guild.Name, 48, 104, 600, 44, 30, UiKit.Gold);
                UiKit.Label(content, "盟主：" + guild.LeaderName + "    等级：" + guild.Level + "    成员：" + guild.MemberCount + "/" + guild.MaxMembers,
                    48, 150, 630, 34, 21, UiKit.Muted);
                UiKit.Label(content, string.IsNullOrEmpty(guild.Notice) ? "盟会公告：同赴山海，共守盟约" : guild.Notice,
                    48, 188, 630, 38, 21, UiKit.Paper);
                UiKit.Label(content, "贡献 " + (state?.Contribution ?? 0).ToString("N0") + "    建设 " + (state?.Construction ?? 0).ToString("N0")
                    + "    荣誉 " + (state?.Honor ?? 0).ToString("N0"), 48, 240, 630, 40, 23, UiKit.Jade);
                UiKit.Button(content, "DonateNativeGuild", "捐献 1,000 金币", 48, 300, 230, 56, () =>
                {
                    app.RunOnline(async () =>
                    {
                        await app.Native.MutateGuild(new NativeGuildRequest { Operation = "DONATE" });
                        app.Toast(app.Native.Guild.Message);
                    });
                }, true);
                if (guild.LeaderId != app.Native.Person.UserId)
                {
                    UiKit.Button(content, "LeaveNativeGuild", "退出盟会", 296, 300, 180, 56, () =>
                    {
                        app.RunOnline(() => app.Native.MutateGuild(new NativeGuildRequest { Operation = "LEAVE" }), "已退出盟会");
                    });
                }
                UiKit.Label(content, "盟会成员", 738, 90, 494, 34, 25, UiKit.Paper);
                BuildMembers(content, app, state?.Members);
            }
            UiKit.Picture(content, "GuildLandscape", "Art/Realms/realm1", 48, 382, 630, 104);
            UiKit.Panel(content, "GuildDivider", 708, 94, 1, 382, UiKit.Muted);
        }

        private static void BuildGuildRoster(RectTransform content, PrototypeApp app, Google.Protobuf.Collections.RepeatedField<GuildMessage> guilds)
        {
            if (guilds == null || guilds.Count == 0)
            {
                UiKit.Label(content, "暂无可加入的盟会。", 738, 156, 494, 44, 21, UiKit.Muted);
                return;
            }
            int pages = Math.Max(1, (guilds.Count + 4) / 5);
            guildPage = Mathf.Clamp(guildPage, 0, pages - 1);
            int count = Mathf.Min(5, guilds.Count - guildPage * 5);
            for (int i = 0; i < count; i++)
            {
                GuildMessage item = guilds[guildPage * 5 + i];
                float y = 140 + i * 56;
                UiKit.Label(content, item.Name + "  ·  " + item.MemberCount + "/" + item.MaxMembers + "  ·  " + item.LeaderName,
                    738, y, 366, 46, 20, UiKit.Paper);
                UiKit.Button(content, "JoinGuild" + i, "加入", 1116, y, 116, 44, () =>
                {
                    app.RunOnline(() => app.Native.MutateGuild(new NativeGuildRequest { Operation = "JOIN", GuildId = item.GuildId }), "已加入盟会");
                }).interactable = item.MemberCount < item.MaxMembers;
            }
            Pager(content, "Guild", guildPage, pages, page => { guildPage = page; app.ShowPage("guild"); });
        }

        private static void BuildMembers(RectTransform content, PrototypeApp app, Google.Protobuf.Collections.RepeatedField<GuildMemberMessage> members)
        {
            if (members == null || members.Count == 0)
            {
                UiKit.Label(content, "成员列表暂为空。", 738, 156, 494, 44, 21, UiKit.Muted);
                return;
            }
            int pages = Math.Max(1, (members.Count + 4) / 5);
            memberPage = Mathf.Clamp(memberPage, 0, pages - 1);
            int count = Mathf.Min(5, members.Count - memberPage * 5);
            for (int i = 0; i < count; i++)
            {
                GuildMemberMessage member = members[memberPage * 5 + i];
                string rank = member.Position == "LEADER" ? "盟主" : member.Position == "MEMBER" ? "成员" : "执事";
                float y = 140 + i * 56;
                UiKit.Label(content, member.PlayerName + " · " + rank + "\n贡献 " + member.Contribution + "    荣誉 " + member.Honor,
                    738, y, 494, 52, 20, member.Position == "LEADER" ? UiKit.Gold : UiKit.Muted);
            }
            Pager(content, "Member", memberPage, pages, page => { memberPage = page; app.ShowPage("guild"); });
        }

        private static void Pager(RectTransform content, string name, int page, int pages, Action<int> change)
        {
            UiKit.IconButton(content, name + "Previous", "back", "上一页", 1016, 448, () => change(page - 1), size: 48).interactable = page > 0;
            UiKit.Label(content, (page + 1) + "/" + pages, 1072, 448, 88, 48, 20, UiKit.Muted, TextAnchor.MiddleCenter);
            UiKit.IconButton(content, name + "Next", "dodge", "下一页", 1184, 448, () => change(page + 1), size: 48).interactable = page + 1 < pages;
        }

        public static void BuildMountains(RectTransform root, PrototypeApp app)
        {
            ResetOwner(app);
            NativeMountainState state = app.Native?.Mountains;
            var content = UiKit.Panel(root, "NativeMountainContent", 0, 108, 1280, 516, Color.clear);
            if (state == null || state.Mountains.Count == 0)
            {
                UiKit.Label(content, "正在读取宝山状态……", 48, 30, 700, 48, 28, UiKit.Muted);
                return;
            }
            selectedMountain = Mathf.Clamp(selectedMountain, 0, Mathf.Max(0, state.Mountains.Count - 1));
            NativeMountainRun run = state.Run;
            string title = state.Mountains.FirstOrDefault(m => m.Mountain == run?.Mountain)?.Name ?? "宝山";
            UiKit.Label(content, run != null && !run.Claimed && run.SessionId != dismissedRun ? "宝山挑战 · " + title : "六大宝山",
                48, 10, 650, 52, 34, UiKit.Paper);
            UiKit.Label(content, "今日已完成 " + state.Mountains.Count(m => m.ClaimedToday) + "/" + state.Mountains.Count, 720, 18, 510, 36, 20, UiKit.Jade, TextAnchor.MiddleRight);
            UiKit.Panel(content, "Rule", 48, 72, 1184, 1, UiKit.Muted);

            if (run != null && !run.Claimed && run.SessionId != dismissedRun)
            {
                BuildActiveMountain(content, app, state, run);
                return;
            }
            BuildMountainMenu(content, app, state);
        }

        private static void BuildMountainMenu(RectTransform content, PrototypeApp app, NativeMountainState state)
        {
            int count = Mathf.Min(6, state.Mountains.Count);
            for (int i = 0; i < count; i++)
            {
                NativeMountainEntry mountain = state.Mountains[i];
                int index = i;
                float x = 48 + (i % 3) * 226;
                float y = 104 + (i / 3) * 138;
                var button = UiKit.Button(content, "NativeMountain" + i, "", x, y, 210, 120, () =>
                {
                    selectedMountain = index;
                    app.ShowPage("mountains");
                }, index == selectedMountain && mountain.Active);
                UiKit.Label(button.transform, mountain.Name, 12, 10, 186, 32, 24, UiKit.Paper, TextAnchor.MiddleCenter);
                UiKit.Label(button.transform, mountain.Description, 12, 46, 186, 42, 17, UiKit.Muted, TextAnchor.MiddleCenter);
                UiKit.Label(button.transform, mountain.ClaimedToday ? "今日已领取" : "金币 " + mountain.RewardCoins + (mountain.RewardGoldenBeans > 0 ? "  · 金豆子" : ""),
                    12, 88, 186, 24, 15, mountain.ClaimedToday ? UiKit.Muted : UiKit.Gold, TextAnchor.MiddleCenter);
            }
            NativeMountainEntry selected = state.Mountains[selectedMountain];
            UiKit.Picture(content, "MountainLandscape", "Art/Realms/realm" + (selected.Mountain == 5 ? 2 : selected.Mountain), 720, 90, 510, 166);
            UiKit.Label(content, selected.Name + "  ·  " + selected.Description, 720, 270, 474, 60, 22, UiKit.Paper);
            UiKit.Label(content, "完成挑战奖励：" + selected.RewardCoins + " 金币" + (selected.RewardGoldenBeans > 0 ? " + 金豆子" : ""),
                720, 342, 474, 40, 20, UiKit.Gold);
            if (!selected.ClaimedToday)
            {
                UiKit.Button(content, "EnterNativeMountain", "进入挑战", 720, 414, 510, 58, () =>
                {
                    app.RunOnline(async () =>
                    {
                        await app.Native.ActMountain(new NativeMountainRequest { Operation = "ENTER", Mountain = selected.Mountain });
                        dismissedRun = null;
                    });
                }, true);
            }
        }

        private static void BuildActiveMountain(RectTransform content, PrototypeApp app, NativeMountainState state, NativeMountainRun run)
        {
            UiKit.Label(content, run.Completed ? "挑战已完成，山门为你敞开。" : run.Prompt, 48, 98, 670, 70, 25, UiKit.Gold);
            Text timeLabel = UiKit.Label(content, "", 48, 174, 670, 36, 20, UiKit.Muted);
            var poller = content.gameObject.AddComponent<NativeMountainPoller>();
            poller.Bind(app, run, timeLabel);
            if (run.EnemyMaxHp > 0 && (run.Mountain == 2 || run.Mountain == 3 || run.Mountain == 4))
            {
                UiKit.Label(content, "守卫 " + run.EnemyHp + "/" + run.EnemyMaxHp, 48, 224, 320, 28, 19, UiKit.Red);
                UiKit.Bar(content, "EnemyHealth", 48, 254, 320, 10, run.EnemyHp / (float)run.EnemyMaxHp, UiKit.Red);
                UiKit.Label(content, "角色 " + run.PlayerHp + "/" + run.PlayerMaxHp, 390, 224, 320, 28, 19, UiKit.Jade);
                UiKit.Bar(content, "PlayerHealth", 390, 254, 320, 10, run.PlayerHp / (float)Mathf.Max(1, run.PlayerMaxHp), UiKit.Jade);
            }
            else if (run.Mountain == 5)
            {
                UiKit.Label(content, "船体 " + run.PlayerHp + "/" + run.PlayerMaxHp, 48, 224, 670, 28, 19, UiKit.Jade);
                UiKit.Bar(content, "ShipHealth", 48, 254, 670, 10, run.PlayerHp / (float)Math.Max(1, run.PlayerMaxHp), UiKit.Jade);
            }
            if (run.Mountain == 1) BuildMaze(content, run);
            else
            {
                UiKit.Picture(content, "RunLandscape", "Art/Realms/realm" + (run.Mountain == 5 ? 2 : run.Mountain), 760, 104, 450, 180);
                string reward = "金币 " + run.RewardCoins + (run.RewardGoldenBeans > 0 ? "    金豆子 " + run.RewardGoldenBeans : "");
                if (app.Native.Guild?.Guild != null && !string.IsNullOrEmpty(app.Native.Guild.Guild.GuildId))
                    reward += "\n盟会荣誉 " + run.RewardHonor;
                UiKit.Label(content, reward, 760, 310, 450, 84, 22, UiKit.Gold);
            }
            if (run.Completed)
            {
                UiKit.Label(content, "挑战完成，宝藏已经准备好。", 48, 332, 670, 42, 28, UiKit.Gold);
                UiKit.Button(content, "ClaimNativeMountain", "领取宝藏", 48, 404, 280, 58, () =>
                {
                    poller.Act(new NativeMountainRequest { Operation = "CLAIM", SessionId = run.SessionId });
                }, true);
                return;
            }
            if (run.Failed || run.RemainingMs <= 0)
            {
                UiKit.Label(content, "挑战失败，可以重新进入。", 48, 332, 670, 42, 28, UiKit.Red);
                UiKit.Button(content, "RetryNativeMountain", "重新挑战", 48, 404, 280, 58, () =>
                {
                    poller.Act(new NativeMountainRequest { Operation = "ENTER", Mountain = run.Mountain });
                }, true);
                UiKit.Button(content, "ReturnNativeMountains", "返回宝山", 350, 404, 280, 58,
                    () => { dismissedRun = run.SessionId; app.ShowPage("mountains"); });
                return;
            }
            int optionCount = Mathf.Min(run.Options.Count, 4);
            for (int i = 0; i < optionCount; i++)
            {
                int choice = i;
                Button choiceButton = UiKit.Button(content, "MountainChoice" + i, run.Options[i], 48 + (i % 2) * 346, 312 + (i / 2) * 68, 328, 58, () =>
                {
                    poller.Act(new NativeMountainRequest { Operation = "ACT", SessionId = run.SessionId, Choice = choice });
                }, true);
                poller.AddChoice(choiceButton);
            }
            UiKit.Button(content, "LeaveNativeMountain", "离开挑战", 48, 448, 180, 50, () =>
            {
                poller.Act(new NativeMountainRequest { Operation = "LEAVE", SessionId = run.SessionId }, () => dismissedRun = run.SessionId);
            });
            UiKit.Label(content, state.Message, 250, 448, 468, 50, 19, state.Success ? UiKit.Muted : UiKit.Red);
        }

        private static void BuildMaze(RectTransform content, NativeMountainRun run)
        {
            UiKit.Label(content, "迷宫位置 " + (run.CellX + 1) + "," + (run.CellY + 1), 760, 98, 380, 30, 21, UiKit.Gold);
            for (int y = 0; y < 4; y++)
                for (int x = 0; x < 4; x++)
                {
                    int cell = y * 4 + x;
                    bool current = x == run.CellX && y == run.CellY;
                    float left = 818 + x * 70, top = 140 + y * 70;
                    UiKit.Panel(content, "MazeCell" + cell, left + 2, top + 2, 66, 66,
                        current ? new Color32(74, 148, 119, 230) : new Color32(28, 51, 49, 230));
                    int walls = run.MazeWalls.Count > cell ? run.MazeWalls[cell] : 15;
                    if ((walls & 1) != 0) UiKit.Panel(content, "MazeNorth" + cell, left, top, 70, 3, UiKit.Muted);
                    if ((walls & 2) != 0) UiKit.Panel(content, "MazeEast" + cell, left + 67, top, 3, 70, UiKit.Muted);
                    if ((walls & 4) != 0) UiKit.Panel(content, "MazeSouth" + cell, left, top + 67, 70, 3, UiKit.Muted);
                    if ((walls & 8) != 0) UiKit.Panel(content, "MazeWest" + cell, left, top, 3, 70, UiKit.Muted);
                    if (x == 3 && y == 3 && !current)
                        UiKit.Label(content, "出口", left + 5, top + 5, 60, 60, 18, UiKit.Gold, TextAnchor.MiddleCenter);
                    if (current)
                    {
                        var marker = UiKit.Rect(content, "MazePlayer", left + 19, top + 19, 32, 32).gameObject.AddComponent<SymbolGraphic>();
                        marker.Symbol = "target"; marker.color = UiKit.Jade; marker.raycastTarget = false;
                    }
                }
            UiKit.Label(content, "东南出口", 760, 424, 430, 28, 20, UiKit.Gold, TextAnchor.MiddleCenter);
        }

    }

    public sealed class NativeMountainPoller : MonoBehaviour
    {
        private PrototypeApp app;
        private NativeGameClient native;
        private NativeMountainRun run;
        private Text clock;
        private float sampledAt;
        private float nextPoll;
        private bool mutating, ended, stopped;
        private Task poll;
        private readonly List<Button> choices = new List<Button>();

        public void Bind(PrototypeApp owner, NativeMountainRun snapshot, Text label)
        {
            app = owner; native = app.Native; run = snapshot; clock = label;
            sampledAt = Time.unscaledTime; nextPoll = sampledAt + 1;
            ended = snapshot.Completed || snapshot.Failed || snapshot.RemainingMs <= 0;
            UpdateLabels();
        }

        public void AddChoice(Button button)
        {
            choices.Add(button);
            UpdateLabels();
        }

        public void Act(NativeMountainRequest request, Action complete = null)
        {
            if (!app || mutating) return;
            app.RunOnline(async () =>
            {
                mutating = true;
                try
                {
                    if (poll != null) await poll;
                    await native.ActMountain(request);
                    complete?.Invoke();
                }
                finally { mutating = false; }
            });
        }

        private void Update()
        {
            if (!app || app.Native != native || app.CurrentPage != "mountains") return;
            UpdateLabels();
            if (!ended && (run.Completed || run.Failed || run.RemainingMs <= 0)
                && !mutating && (poll == null || poll.IsCompleted))
            {
                var modal = app.PageRoot.parent.Find("Modal");
                if (modal && modal.gameObject.activeInHierarchy) return;
                ended = true;
                app.ShowPage("mountains");
                return;
            }
            if (ended || stopped || mutating || !native.Ready || !native.Connected || Time.unscaledTime < nextPoll || poll != null && !poll.IsCompleted) return;
            nextPoll = Time.unscaledTime + 1;
            poll = Refresh();
        }

        private async Task Refresh()
        {
            try
            {
                await native.RefreshMountains();
                if (!this || !app || app.Native != native || !gameObject.activeInHierarchy) return;
                var updated = native.Mountains?.Run;
                if (updated == null || updated.SessionId != run.SessionId) return;
                run = updated;
                sampledAt = Time.unscaledTime;
            }
            catch (Exception)
            {
                stopped = true;
                if (clock) clock.text = "同步中断，请重新连接账号";
            }
        }

        private void UpdateLabels()
        {
            if (run == null) return;
            long elapsed = (long)((Time.unscaledTime - sampledAt) * 1000);
            long remaining = Math.Max(0, run.RemainingMs - elapsed), cooldown = Math.Max(0, run.CooldownMs - elapsed);
            if (clock && !stopped)
                clock.text = !native.Connected ? "账号已断线" : ended ? run.Completed ? "挑战完成" : "挑战结束"
                    : (run.Mountain == 1 ? "已行 " + run.Progress + " 步" : "进度 " + run.Progress + "/" + run.Goal)
                        + "    剩余 " + TimeSpan.FromMilliseconds(remaining).ToString(@"mm\:ss")
                        + (cooldown > 0 ? "    冷却 " + (cooldown / 1000f).ToString("0.0") + " 秒" : "");
            for (int i = 0; i < choices.Count; i++)
            {
                bool open = run.Mountain != 1 || run.MazeWalls.Count != 16 || (run.MazeWalls[Mathf.Clamp(run.CellY * 4 + run.CellX, 0, 15)] & (1 << i)) == 0;
                if (choices[i]) choices[i].interactable = native.Ready && native.Connected && !stopped && !mutating && !ended && remaining > 0 && cooldown == 0 && open;
            }
        }
    }
}
