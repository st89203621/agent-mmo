using UnityEngine;

namespace Lunhui
{
    public sealed class RealmMapDefinition
    {
        public readonly int Realm;
        public readonly int Submap;
        public readonly string Id;
        public readonly string Name;
        public readonly string Landmark;
        public readonly string Journey;
        public readonly Color Accent;

        public RealmMapDefinition(int realm, int submap, string id, string name, string landmark, string journey, Color accent)
        {
            Realm = realm; Submap = submap; Id = id; Name = name;
            Landmark = landmark; Journey = journey; Accent = accent;
        }
    }

    public static class RealmMapCatalog
    {
        public const int MaxSubmaps = 3;
        public static readonly string[] RegionNames = { "樱花花谷", "晚照枫林", "晴岚海岸", "天枢基地", "赤壁城寨", "云海仙境", "秋海水乡" };
        public static readonly int[] RomanticRealms = { 0, 1, 2, 5, 6 };
        public static readonly RealmMapDefinition[] Maps =
        {
            Map(0, 0, "sakura-town", "花溪小镇", "情花树下", "花与海的约定", .94f, .64f, .76f),
            Map(0, 1, "sakura-embankment", "落樱长堤", "双樱望月亭", "寄往春天的信", .94f, .64f, .76f),
            Map(0, 2, "sakura-valley", "蝶梦深谷", "蝶梦瀑布", "循着花香入梦", .94f, .64f, .76f),
            Map(1, 0, "maple-post", "枫桥驿站", "红枫石拱门", "留住一片晚霞", .95f, .58f, .39f),
            Map(1, 1, "maple-trail", "红叶山径", "千枫古道", "山风中的回音", .95f, .58f, .39f),
            Map(1, 2, "maple-lake", "晚霞湖畔", "临湖听风台", "把秋天赠予你", .95f, .58f, .39f),
            Map(2, 0, "sea-harbor", "贝风渔港", "归航码头", "来自远方的帆", .38f, .82f, .9f),
            Map(2, 1, "sea-bay", "白沙浅湾", "贝壳月牙湾", "海浪写下的诗", .38f, .82f, .9f),
            Map(2, 2, "sea-cape", "星潮海岬", "星灯守望塔", "等一场星海潮汐", .38f, .82f, .9f),
            Map(3, 0, "mech-base", "天枢基地", "天枢作战甲板", "失落的星核", .42f, .82f, .86f),
            Map(4, 0, "kingdom-redcliff", "赤壁城寨", "赤壁古城门", "渡江的烽火", .9f, .69f, .44f),
            Map(5, 0, "cloud-terrace", "云上花台", "云海登天台", "云端重逢", .58f, .82f, .76f),
            Map(5, 1, "cloud-bamboo", "霁月竹林", "月下竹亭", "一叶知清风", .58f, .82f, .76f),
            Map(5, 2, "cloud-pool", "流星天池", "环星天池", "许愿的人与流星", .58f, .82f, .76f),
            Map(6, 0, "water-ferry", "芙蓉渡口", "花溪芙蓉台", "花溪再会", .85f, .66f, .9f),
            Map(6, 1, "water-lanes", "灯影水巷", "千灯长廊", "灯火为谁而明", .85f, .66f, .9f),
            Map(6, 2, "water-mirror", "秋水镜湖", "镜湖双月亭", "相逢终有归处", .85f, .66f, .9f)
        };

        private static RealmMapDefinition Map(int realm, int submap, string id, string name, string landmark, string journey, float r, float g, float b)
            => new RealmMapDefinition(realm, submap, id, name, landmark, journey, new Color(r, g, b));

        public static int Count(int realm) => realm == 3 || realm == 4 ? 1 : 3;

        public static RealmMapDefinition Get(int realm, int submap = 0)
        {
            realm = Mathf.Clamp(realm, 0, RegionNames.Length - 1);
            submap = Mathf.Clamp(submap, 0, Count(realm) - 1);
            foreach (var map in Maps) if (map.Realm == realm && map.Submap == submap) return map;
            return Maps[0];
        }

        public static Vector3[] MainRoute(int realm, int submap)
        {
            float direction = submap == 1 ? 1 : -1;
            float reach = realm == 2 ? 9 : realm == 5 ? 14 : 12;
            return new[]
            {
                new Vector3(0, 0, -16), new Vector3(0, 0, 0), new Vector3(-3, 0, 22),
                new Vector3(direction * reach, 0, 31), new Vector3(4, 0, 38),
                new Vector3(-direction * reach, 0, 48), new Vector3(-4, 0, 57),
                new Vector3(direction * reach, 0, 65), new Vector3(4, 0, 74),
                new Vector3(-2, 0, 79), new Vector3(-direction * reach, 0, 87),
                new Vector3(0, 0, 96), new Vector3(0, 0, 112)
            };
        }
    }
}
