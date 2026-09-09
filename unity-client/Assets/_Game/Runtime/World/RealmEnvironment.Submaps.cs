using UnityEngine;

namespace Lunhui
{
    public sealed partial class RealmEnvironment
    {
        private void AddSubmapArt(Transform root, int realm, int submap)
        {
            if (realm == 2)
            {
                for (int i = 0; i < 10; i++)
                {
                    float z = 7 + i * 10;
                    ImportedProp(root, "tree_palmDetailedTall", new Vector3(i % 2 == 0 ? -18 : 19, .1f, z), 5.2f + i % 3 * .5f, i * 61);
                }
                ImportedProp(root, "canoe", new Vector3(23, .1f, submap == 1 ? 25 : 60), .72f, 24);
            }
            else if (realm == 5 && submap == 1)
            {
                for (int i = 0; i < 12; i++)
                    ImportedProp(root, "crops_bambooStageB", new Vector3(i % 2 == 0 ? -19 : 20, .1f, 6 + i * 10), 4.7f, i * 43);
            }
            if (realm != 2)
            {
                string[] flowers = { "flower_purpleA", "flower_yellowB", "flower_redC" };
                for (int i = 0; i < 15; i++)
                {
                    float side = i % 2 == 0 ? -1 : 1;
                    ImportedProp(root, flowers[i % flowers.Length], new Vector3(side * 17, .13f, 6 + i * 7), .65f, i * 73);
                }
            }
            if (realm == 6 && submap == 2)
            {
                for (int i = 0; i < 8; i++)
                    ImportedProp(root, i % 2 == 0 ? "lily_large" : "lily_small", new Vector3(-30 + i % 3 * 2, .19f, 34 + i / 3 * 3), .24f, i * 39);
            }
        }

        private void ImportedProp(Transform root, string asset, Vector3 position, float height, float yaw)
        {
            GameObject prefab = Resources.Load<GameObject>("Art/MapExpansion/KenneyNature/" + asset);
            if (prefab == null) return;
            Transform prop = Instantiate(prefab, root, false).transform;
            prop.name = "Nature " + asset;
            prop.localPosition = Vector3.zero;
            prop.localRotation = Quaternion.identity;
            prop.localScale = Vector3.one;
            Renderer[] renderers = prop.GetComponentsInChildren<Renderer>();
            if (renderers.Length == 0) { Destroy(prop.gameObject); return; }
            foreach (Renderer renderer in renderers)
            {
                Material[] source = renderer.sharedMaterials;
                for (int i = 0; i < source.Length; i++) source[i] = NatureMaterial(source[i]);
                renderer.sharedMaterials = source;
            }
            Bounds bounds = renderers[0].bounds;
            foreach (Renderer renderer in renderers) bounds.Encapsulate(renderer.bounds);
            float scale = height / Mathf.Max(bounds.size.y, .05f);
            prop.localScale = Vector3.one * scale;
            Vector3 origin = root.InverseTransformPoint(bounds.center);
            origin.y = root.InverseTransformPoint(new Vector3(bounds.center.x, bounds.min.y, bounds.center.z)).y;
            prop.localRotation = Quaternion.Euler(0, yaw, 0);
            prop.localPosition = position - prop.localRotation * origin * scale;
        }

        private Material NatureMaterial(Material source)
        {
            if (source == null) return materials["leaf"];
            string key = "imported-" + source.name;
            if (materials.TryGetValue(key, out Material existing)) return existing;
            Material material = new Material(source) { name = key, enableInstancing = true };
            string name = source.name.ToLowerInvariant();
            if (name.Contains("leafsgreen") || name == "grass") material.color = new Color(.3f, .49f, .24f);
            else if (name.Contains("woodbark")) material.color = new Color(.48f, .35f, .24f);
            else if (name.Contains("wood")) material.color = new Color(.63f, .46f, .3f);
            material.SetFloat("_Glossiness", .12f);
            owned.Add(material); materials.Add(key, material);
            return material;
        }

        private void BuildSubmap(Transform root, int realm, int submap)
        {
            if (realm == 5) Ground(root, "lawn", 100, 158, 58);
            else ExtendedGround(root, realm == 2 ? 2 : 0);
            SubmapRoutes(root, realm, submap);
            if (realm < 2) GardenBridge(root, new Vector3(-2, 0, 79));
            switch (realm)
            {
                case 0: BlossomSubmap(root, submap); break;
                case 1: MapleSubmap(root, submap); break;
                case 2: CoastSubmap(root, submap); break;
                case 5: CloudSubmap(root, submap); break;
                case 6: CanalSubmap(root, submap); break;
            }
            int last = realm == 5 ? 128 : 112;
            Gate(root, new Vector3(0, 0, last), realm == 2 ? 9 : 11, realm == 1 ? "darkWood" : "redWood", "blueRoof");
            Lantern(root, new Vector3(-5, 0, 4));
            Lantern(root, new Vector3(5, 0, 4));
        }

        private void SubmapRoutes(Transform root, int realm, int submap)
        {
            Vector3[] route = RealmMapCatalog.MainRoute(realm, submap);
            string material = "path";
            for (int i = 0; i < route.Length - 1; i++)
            {
                Vector3 from = route[i], to = route[i + 1];
                if (realm < 2 && from.z < 80.6f && to.z > 77.4f) continue;
                RouteBand(root, "曲折花径", new[] { from + Vector3.up * .13f, to + Vector3.up * .13f }, 5.2f, material);
            }
            if (realm == 5) RouteBand(root, "登云长阶", new[] { new Vector3(0, .13f, 112), new Vector3(0, .13f, 128) }, 6, "chalk");
            float side = submap == 1 ? -1 : 1;
            RouteBand(root, "环游支径", new[]
            {
                new Vector3(-3, .135f, 22), new Vector3(side * 18, .135f, 27),
                new Vector3(side * 20, .135f, 41), new Vector3(-4, .135f, 57)
            }, 3.3f, material);
            RouteBand(root, "观景支径", new[]
            {
                new Vector3(4, .135f, 74), new Vector3(-side * 17, .135f, 84),
                new Vector3(-side * 20, .135f, 98), new Vector3(0, .135f, 104)
            }, 3.1f, material);
        }


        private void BlossomSubmap(Transform root, int submap)
        {
            if (submap == 1)
            {
                for (int i = 0; i < 9; i++)
                {
                    float z = 9 + i * 11;
                    Tree(root, new Vector3(-26, .1f, z), 1.15f, true);
                    Tree(root, new Vector3(27, .1f, z + 4), 1.32f, true);
                    Lantern(root, new Vector3(i % 2 == 0 ? -14 : 14, .1f, z));
                    FlowerPatch(root, new Vector3(-19, .14f, z), 3.8f, 3100 + i, "flowers");
                }
                RestGarden(root, new Vector3(-24, 0, 39), true);
                RestGarden(root, new Vector3(24, 0, 98), true);
                Pond(root, new Vector3(24, 0, 24), 6.2f, "water");
                Pond(root, new Vector3(-24, 0, 96), 6.5f, "water");
                Gate(root, new Vector3(0, 0, 10), 11, "redWood", "blueRoof");
                Horizon(root, 3110, "moss", 15);
            }
            else
            {
                for (int i = 0; i < 15; i++)
                {
                    float z = -8 + i * 9;
                    for (int side = -1; side <= 1; side += 2)
                    {
                        Rock(root, new Vector3(side * (36 + i % 3 * 4), -2, z), new Vector3(6, 10 + i % 4 * 3, 6), 3300 + i * 3 + side, "moss");
                        Tree(root, new Vector3(side * (25 + i % 2 * 4), .1f, z + 2), 1.28f, true);
                    }
                }
                Waterfall(root, new Vector3(-26, 0, 57), 5, 18);
                Pond(root, new Vector3(-25, 0, 56), 5.8f, "water");
                RuinArch(root, new Vector3(22, 0, 90));
                RestGarden(root, new Vector3(24, 0, 30), false);
                MeadowEdges(root, 3390, "flowers");
                Horizon(root, 3310, "moss", 32);
            }
        }

        private void MapleSubmap(Transform root, int submap)
        {
            for (int i = 0; i < 22; i++)
            {
                float side = i % 2 == 0 ? -1 : 1;
                float z = -8 + i / 2 * 12;
                Tree(root, new Vector3(side * (25 + i % 3 * 3), .1f, z), 1.25f + i % 3 * .17f, false);
                FlowerPatch(root, new Vector3(side * 19, .13f, z + 3), 4, 3700 + i, "meadow");
            }
            if (submap == 1)
            {
                for (int i = 0; i < 11; i++)
                {
                    float side = i % 2 == 0 ? -1 : 1;
                    Rock(root, new Vector3(side * 35, -2, i * 12), new Vector3(8, 9 + i % 3 * 3, 8), 3500 + i, "stone");
                }
                RuinArch(root, new Vector3(0, 0, 8));
                RuinArch(root, new Vector3(20, 0, 55));
                RestGarden(root, new Vector3(-23, 0, 37), false);
                RestGarden(root, new Vector3(24, 0, 95), false);
                Horizon(root, 3550, "stone", 29);
            }
            else
            {
                Pond(root, new Vector3(41, 0, 65), 16, "water");
                Pond(root, new Vector3(-39, 0, 25), 13, "water");
                RestGarden(root, new Vector3(23, 0, 89), false);
                RestGarden(root, new Vector3(-24, 0, 34), true);
                CourtyardHouse(root, new Vector3(-25, 0, 108), 8, 7, "darkWood", "blueRoof");
                for (int i = 0; i < 14; i++)
                    Box(root, "湖边枫木栈道", new Vector3(25, .16f, 44 + i * .66f), new Vector3(5.2f, .12f, .59f), "wood");
                Horizon(root, 3810, "moss", 13);
            }
        }

        private void CoastSubmap(Transform root, int submap)
        {
            for (int i = 0; i < 11; i++)
            {
                float z = -5 + i * 11;
                Tree(root, new Vector3(-26 - i % 2 * 4, .1f, z), 1.06f, i % 3 != 0);
                FlowerPatch(root, new Vector3(-20, .13f, z), 3.5f, 4100 + i, "flowers");
                Rock(root, new Vector3(Coastline(z) + 1, -.25f, z + 2), new Vector3(1.7f, .8f, 2.1f), 4120 + i, "chalk");
            }
            if (submap == 1)
            {
                RestGarden(root, new Vector3(-23, 0, 29), true);
                RestGarden(root, new Vector3(20, 0, 98), true);
                Sail(root, new Vector3(18, 0, 11), 4.2f, 4.8f, "cream");
                Sail(root, new Vector3(-20, 0, 63), 4.2f, 4.8f, "tealCloth");
                for (int i = 0; i < 8; i++)
                {
                    Vector3 p = new Vector3(18 + Mathf.Sin(i * .75f) * 3, .2f, 20 + i * 10);
                    Cylinder(root, "白贝螺纹", p, .48f, .22f, .22f, "cream", 12);
                }
                Ship(root, new Vector3(73, -.5f, 63));
            }
            else
            {
                for (int i = 0; i < 8; i++)
                    Rock(root, new Vector3(31 + i % 2 * 7, -1.8f, 10 + i * 14), new Vector3(5, 6 + i % 3 * 2, 5), 4300 + i, "chalk");
                Lighthouse(root, new Vector3(21, 0, 90));
                Lighthouse(root, new Vector3(-26, 0, 28));
                CourtyardHouse(root, new Vector3(-24, 0, 98), 7.8f, 6, "wood", "blueRoof");
                Ship(root, new Vector3(63, -.5f, 111));
                for (int i = 0; i < 10; i++) Lantern(root, new Vector3(i % 2 == 0 ? 15 : -15, .1f, 10 + i * 10));
            }
        }

        private void CloudSubmap(Transform root, int submap)
        {
            if (submap == 1)
            {
                for (int i = 0; i < 28; i++)
                {
                    float side = i % 2 == 0 ? -1 : 1;
                    Bamboo(root, new Vector3(side * (24 + i % 3 * 5), .1f, -5 + i / 2 * 10), 4600 + i);
                }
                RestGarden(root, new Vector3(-25, 0, 34), true);
                RestGarden(root, new Vector3(25, 0, 91), true);
                Pond(root, new Vector3(-26, 0, 85), 6, "water");
                Waterfall(root, new Vector3(-37, 0, 86), 4.2f, 16);
            }
            else
            {
                Pond(root, new Vector3(31, 0, 33), 11, "water");
                Pond(root, new Vector3(-31, 0, 92), 11, "water");
                RestGarden(root, new Vector3(24, 0, 89), true);
                RestGarden(root, new Vector3(-25, 0, 33), true);
                for (int i = 0; i < 16; i++)
                {
                    float side = i % 2 == 0 ? -1 : 1;
                    float z = i / 2 * 17;
                    Tree(root, new Vector3(side * 35, .1f, z), 1.02f, true);
                    DragonColumn(root, new Vector3(side * 23, .1f, z + 6), (int)side);
                }
                Cylinder(root, "观星仪台", new Vector3(0, .12f, 118), 9.5f, 9.5f, .05f, "chalk", 48);
                Ring(root, new Vector3(0, .16f, 118), 8.7f, 9, "gold", 64);
            }
            Horizon(root, 4790 + submap, "stone", submap == 1 ? 28 : 37);
        }

        private void CanalSubmap(Transform root, int submap)
        {
            if (submap == 1)
            {
                for (int i = 0; i < 5; i++)
                {
                    float z = 12 + i * 24;
                    CourtyardHouse(root, new Vector3(-25, 0, z), 7.8f, 7, "darkWood", "blueRoof");
                    CourtyardHouse(root, new Vector3(26, 0, z + 10), 7.4f, 7, "redWood", "blueRoof");
                    Lantern(root, new Vector3(-15, .1f, z));
                    Lantern(root, new Vector3(16, .1f, z + 8));
                    Tree(root, new Vector3(i % 2 == 0 ? -27 : 28, .1f, z + 12), .95f, true);
                }
                Box(root, "西侧水巷", new Vector3(-36, -.02f, 59), new Vector3(6, .08f, 150), "water");
                Box(root, "东侧水巷", new Vector3(36, -.02f, 59), new Vector3(6, .08f, 150), "water");
                RestGarden(root, new Vector3(-19, 0, 39), true);
                MarketStall(root, new Vector3(20, 0, 58), "tealCloth");
            }
            else
            {
                Pond(root, new Vector3(-37, 0, 42), 14, "water");
                Pond(root, new Vector3(39, 0, 88), 16, "water");
                RestGarden(root, new Vector3(-23, 0, 35), true);
                RestGarden(root, new Vector3(24, 0, 98), false);
                for (int i = 0; i < 18; i++)
                {
                    float side = i % 2 == 0 ? -1 : 1;
                    float z = -5 + i / 2 * 15;
                    Tree(root, new Vector3(side * (26 + i % 3 * 3), .1f, z), 1.1f, i % 3 == 0);
                    FlowerPatch(root, new Vector3(side * 19, .13f, z + 5), 3.8f, 4900 + i, "flowers");
                }
                Gate(root, new Vector3(0, 0, 8), 10, "darkWood", "blueRoof");
            }
            MeadowEdges(root, 4990 + submap, "flowers");
            Horizon(root, 4980 + submap, "moss", 17);
        }

        private void Pond(Transform root, Vector3 p, float radius, string material)
        {
            Cylinder(root, "清浅湖岸", p + Vector3.up * .08f, radius + .65f, radius + .65f, .1f, "chalk", 64);
            Cylinder(root, "映景湖水", p + Vector3.up * .142f, radius, radius, .025f, material, 64);
            Ring(root, p + Vector3.up * .16f, radius - .13f, radius, "foam", 72);
            Block(p, radius * 1.42f, radius * 1.42f);
        }

        private void Lighthouse(Transform root, Vector3 p)
        {
            Cylinder(root, "星灯塔身", p + Vector3.up * 4.3f, 1.55f, 1.1f, 8.6f, "chalk", 16);
            Cylinder(root, "星灯观景台", p + Vector3.up * 8.4f, 2.1f, 2.1f, .22f, "stone", 16);
            Cylinder(root, "星灯光源", p + Vector3.up * 9.3f, .48f, .48f, 1.4f, "paper", 12);
            Roof(root, p + Vector3.up * 10.2f, 4.4f, 4.4f, 1.1f, "blueRoof");
            for (int i = 0; i < 8; i++)
            {
                float a = i * Mathf.PI / 4;
                Vector3 offset = new Vector3(Mathf.Cos(a) * 1.5f, 8.4f, Mathf.Sin(a) * 1.5f);
                Beam(root, "灯塔窗棂", p + offset, p + offset + Vector3.up * 1.8f, .07f, "wood", 6);
            }
            Block(p, 3.4f, 3.4f);
        }

        private void Bamboo(Transform root, Vector3 p, int seed)
        {
            var random = new System.Random(seed);
            for (int stem = 0; stem < 4; stem++)
            {
                Vector3 origin = p + new Vector3((float)random.NextDouble() * 2 - 1, 0, (float)random.NextDouble() * 2 - 1);
                float height = 5.4f + (float)random.NextDouble() * 3;
                Cylinder(root, "青竹", origin + Vector3.up * height / 2, .11f, .065f, height, "leaf", 7);
                for (int segment = 1; segment < 7; segment++)
                {
                    float y = segment * height / 7;
                    Cylinder(root, "竹节", origin + Vector3.up * y, .13f, .13f, .065f, "leafLight", 7);
                    if (segment > 3) Fern(root, origin + Vector3.up * y, 1.4f);
                }
            }
            Block(p, 1.5f, 1.5f);
        }
    }
}
