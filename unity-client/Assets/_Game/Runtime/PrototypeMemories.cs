using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    public sealed partial class PrototypeApp
    {
        private const int MemoriesPerPage = 6;
        private static readonly string[,] BaseMemoryNames =
        {
            { "樱花书签", "风中信笺", "相逢约定" },
            { "红枫叶片", "林间回声", "晚照札记" },
            { "珍珠贝壳", "远方来信", "潮汐之歌" },
            { "星轨残页", "回响芯片", "黎明信标" },
            { "江上灯火", "故人佩玉", "东风旧信" },
            { "云间铃音", "流星许愿", "长空誓言" },
            { "花溪拾梦", "秋海来信", "重逢花笺" }
        };
        private static readonly string[] SubmapMemoryNames = { "书签", "来信", "约定" };

        private void BuildMemoryAlbum(int pageIndex)
        {
            CloseDialog();
            World.SetMove(Vector2.zero);
            World.SetInputBlocked(true);
            Combat.SetRunning(false);
            var maps = RealmMapCatalog.Maps;
            int pageCount = Mathf.Max(1, (maps.Length + MemoriesPerPage - 1) / MemoriesPerPage);
            pageIndex = Mathf.Clamp(pageIndex, 0, pageCount - 1);
            int count = 0;
            foreach (var map in maps)
            {
                int bits = AlbumMemoryBits(map);
                for (int i = 0; i < 3; i++) if ((bits & (1 << i)) != 0) count++;
            }

            modal = UiKit.Panel(stage, "MemoryAlbum", 0, 0, 1280, 720, new Color32(16, 29, 39, 248));
            modal.GetComponent<Image>().raycastTarget = true;
            UiKit.Label(modal, "花与海的回忆", 48, 26, 660, 62, 35, UiKit.Paper);
            var total = UiKit.Label(modal, "已珍藏 " + count + " / " + maps.Length * 3, 790, 40, 344, 38, 23, UiKit.Gold, TextAnchor.MiddleRight);
            total.name = "MemoryAlbumCount";
            UiKit.IconButton(modal, "CloseAlbum", "close", "关闭", 1176, 29, CloseDialog);
            var content = UiKit.Rect(modal, "MemoryAlbumContent", 0, 104, 1280, 516);

            for (int i = 0; i < MemoriesPerPage && pageIndex * MemoriesPerPage + i < maps.Length; i++)
            {
                var map = maps[pageIndex * MemoriesPerPage + i];
                var entry = UiKit.Rect(content, "MemoryEntry_" + map.Id, 48 + (i % 3) * 400, 8 + (i / 3) * 252, 380, 240);
                UiKit.Picture(entry, "MemoryScene_" + map.Id, "Art/MapPreviews/" + map.Id, 0, 0, 380, 108);
                UiKit.Label(entry, map.Name, 0, 118, 276, 34, 23, map.Accent);
                int bits = AlbumMemoryBits(map), found = 0;
                for (int memory = 0; memory < 3; memory++) if ((bits & (1 << memory)) != 0) found++;
                UiKit.Label(entry, found + " / 3", 288, 118, 92, 34, 21, found == 3 ? UiKit.Jade : UiKit.Muted, TextAnchor.MiddleRight);
                for (int memory = 0; memory < 3; memory++)
                {
                    bool collected = (bits & (1 << memory)) != 0;
                    string title = map.Submap == 0 ? BaseMemoryNames[map.Realm, memory] : map.Name + SubmapMemoryNames[memory];
                    UiKit.Label(entry, collected ? title : "尚未发现", 0, 157 + memory * 26, 380, 24, 19, collected ? UiKit.Paper : UiKit.Muted);
                }
            }

            UiKit.Panel(modal, "AlbumFooterRule", 48, 632, 1184, 1, new Color32(73, 99, 92, 180));
            UiKit.IconButton(modal, "MemoryPagePrevious", "back", "上一页", 488, 650, () => BuildMemoryAlbum(pageIndex - 1), size: 48).interactable = pageIndex > 0;
            var number = UiKit.Label(modal, (pageIndex + 1) + " / " + pageCount, 554, 650, 172, 48, 23, UiKit.Paper, TextAnchor.MiddleCenter);
            number.name = "MemoryPageCounter";
            UiKit.IconButton(modal, "MemoryPageNext", "dodge", "下一页", 744, 650, () => BuildMemoryAlbum(pageIndex + 1), size: 48).interactable = pageIndex + 1 < pageCount;
        }

        private int AlbumMemoryBits(RealmMapDefinition map)
        {
            int key = map.Realm * RealmMapCatalog.MaxSubmaps + map.Submap;
            if (OnlineMode)
            {
                var masks = Native?.Snapshot?.MapMemoryMasks;
                return masks != null && key < masks.Count ? masks[key] & 7 : 0;
            }
            if (State == null) return 0;
            if (map.Submap == 0) return (State.MemoryMask >> (map.Realm * 3)) & 7;
            return State.SubmapMemories != null && key < State.SubmapMemories.Length ? State.SubmapMemories[key] & 7 : 0;
        }
    }
}
