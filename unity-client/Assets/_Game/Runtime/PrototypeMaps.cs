using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    public sealed partial class PrototypeApp
    {
        private void OpenRegionMap(int realm)
        {
            CloseDialog();
            World.SetMove(Vector2.zero);
            World.SetInputBlocked(true);
            Combat.SetRunning(false);
            modal = UiKit.Panel(stage, "RegionAtlas", 0, 0, 1280, 720, new Color32(11, 21, 25, 249));
            modal.GetComponent<Image>().raycastTarget = true;
            UiKit.IconButton(modal, "RegionAtlasBack", "back", "诸界", 36, 28, WorldMap);
            UiKit.Label(modal, RealmMapCatalog.RegionNames[realm], 116, 28, 850, 56, 34, UiKit.Paper);
            UiKit.IconButton(modal, "CloseRegionAtlas", "close", "关闭", 1176, 29, CloseDialog);
            bool realmUnlocked = !OnlineMode || Native?.Snapshot != null && (Native.Snapshot.UnlockedRealmMask & (1 << realm)) != 0;
            for (int i = 0; i < RealmMapCatalog.Count(realm); i++)
            {
                int submap = i;
                RealmMapDefinition map = RealmMapCatalog.Get(realm, submap);
                float y = 120 + i * 178;
                UiKit.Picture(modal, "RegionImage" + i, "Art/MapPreviews/" + map.Id, 48, y, 250, 150);
                UiKit.Label(modal, map.Name, 324, y + 4, 650, 42, 28, map.Accent);
                UiKit.Label(modal, map.Landmark, 326, y + 56, 620, 32, 22, UiKit.Paper);
                UiKit.Label(modal, map.Journey, 326, y + 99, 620, 30, 20, UiKit.Muted);
                bool current = World.RealmIndex == realm && World.SubmapIndex == submap;
                var enter = UiKit.Button(modal, "EnterSubmap" + i, current ? "继续探索" : "前往", 1012, y + 43, 204, 62, () => EnterMap(realm, submap), current);
                bool unlocked = realmUnlocked && (!OnlineMode || Native?.Snapshot != null && (Native.Snapshot.UnlockedMapMask & (1 << (realm*3+submap))) != 0);
                enter.interactable = unlocked;
                if (!unlocked) UiKit.Label(modal, realmUnlocked ? "完成上一程宝箱" : "随旅途开启", 1012, y + 112, 204, 26, 18, UiKit.Muted, TextAnchor.MiddleCenter);
                if (i < RealmMapCatalog.Count(realm) - 1) UiKit.Panel(modal, "SubmapSeparator" + i, 324, y + 158, 892, 1, new Color32(74, 96, 87, 150));
            }
        }

        private bool enteringMap;
        internal bool IsEnteringMap => enteringMap;

        public async void EnterMap(int realm, int submap, bool auto = false)
        {
            if (OnlineMode)
            {
                if (enteringMap) return;
                var client = Native;
                if (client == null || !client.Ready || !client.Connected) { Toast("连接正在恢复，请稍候"); return; }
                enteringMap = true;
                Combat.SetRunning(false);
                World.SetInputBlocked(true);
                try
                {
                    await Combat.FlushOnlineMovement();
                    await client.EnterWorld(realm, false, submap);
                    if (Native != client || !OnlineMode) return;
                    Combat.RestoreOnlineWorld();
                    ShowPage("home");
                    Toast("抵达 · " + World.MapName);
                    if (auto) Combat.StartAutoQuest();
                }
                catch (System.Exception exception) { if (Native == client) Toast(exception.Message); }
                finally
                {
                    enteringMap = false;
                    if (Native == client && CurrentPage == "home" && !modal)
                    { World.SetInputBlocked(false); Combat.SetRunning(true); }
                }
                return;
            }
            World.SetMap(realm, submap);
            ShowPage("home");
            Toast("抵达 · " + World.MapName);
            if (auto) Combat.StartAutoQuest();
        }
    }
}
