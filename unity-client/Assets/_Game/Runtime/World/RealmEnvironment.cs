using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace Lunhui
{
    [DisallowMultipleComponent]
    public sealed partial class RealmEnvironment : MonoBehaviour
    {
        private readonly Transform[] realms = new Transform[21];
        private readonly List<Rect>[] obstacles = new List<Rect>[21];
        private readonly List<UnityEngine.Object> owned = new List<UnityEngine.Object>();
        private readonly Dictionary<string, Material> materials = new Dictionary<string, Material>();
        private readonly List<int> residentMaps = new List<int>();
        private readonly Rect[] bounds =
        {
            new Rect(-32, -16, 64, 131), new Rect(-32, -16, 64, 131),
            new Rect(-32, -16, 64, 131), new Rect(-35, -16, 70, 144),
            new Rect(-40, -16, 80, 144), new Rect(-42, -16, 84, 144),
            new Rect(-32, -16, 64, 131)
        };
        private readonly Color[] fogColors =
        {
            new Color(.79f, .87f, .9f), new Color(.84f, .87f, .81f),
            new Color(.72f, .88f, .95f), new Color(.28f, .34f, .4f),
            new Color(.76f, .7f, .62f), new Color(.7f, .81f, .89f), new Color(.9f, .76f, .82f)
        };
        private int buildingRealm;
        private int buildingMap;
        private int buildingSubmap;

        public int CurrentRealm { get; private set; } = -1;
        public int CurrentSubmap { get; private set; }
        public Vector3 SpawnPosition => new Vector3(-.65f, .16f, 0);
        public Vector3 GuidePosition => new Vector3(1.9f, .16f, 5.1f);
        public Rect GetBounds(int index) => bounds[Mathf.Clamp(index, 0, bounds.Length - 1)];
        public float TerrainHeight(Vector3 position) => .16f;

        public void SetRealm(int index) => SetMap(index, 0);

        public void SetMap(int index, int submap)
        {
            index = Mathf.Clamp(index, 0, 6);
            submap = Mathf.Clamp(submap, 0, RealmMapCatalog.Count(index) - 1);
            int mapKey = index * RealmMapCatalog.MaxSubmaps + submap;
            if (materials.Count == 0) CreateMaterials();
            if (realms[mapKey] == null)
            {
                buildingRealm = index;
                buildingMap = mapKey;
                buildingSubmap = submap;
                obstacles[mapKey] = new List<Rect>();
                Transform root = Group(RealmMapCatalog.Get(index, submap).Name, transform);
                realms[mapKey] = root;
                if (submap > 0) BuildSubmap(root, index, submap);
                else switch (index)
                {
                    case 0: Town(root); break;
                    case 1: Adventure(root); break;
                    case 2: Pirate(root); break;
                    case 3: Mech(root); break;
                    case 4: Kingdoms(root); break;
                    case 5: Martial(root); break;
                    case 6: FlowerValley(root); break;
                }
                Combine(root);
                if (submap > 0) AddSubmapArt(root, index, submap);
                if (index < 3 || index == 6) root.gameObject.AddComponent<RealmAtmosphere>().Initialize(index);
            }
            for (int i = 0; i < realms.Length; i++)
                if (realms[i] != null) realms[i].gameObject.SetActive(i == mapKey);
            CurrentRealm = index;
            CurrentSubmap = submap;
            residentMaps.Remove(mapKey);
            residentMaps.Add(mapKey);
            TrimMapCache();
            RenderSettings.fogColor = fogColors[index];
            RenderSettings.fogDensity = index < 3 ? .0038f : index == 3 ? .009f : index == 4 ? .0065f : index == 5 ? .0075f : index == 6 ? .0032f : .012f;
            if (RenderSettings.sun != null)
            {
                RenderSettings.sun.color = index == 3 ? new Color(.73f, .87f, 1) : index == 6 ? new Color(1f, .82f, .9f) : new Color(1, .97f, .92f);
                RenderSettings.sun.intensity = index == 3 ? .82f : index == 6 ? 1.28f : 1.18f;
                RenderSettings.sun.shadowStrength = index < 3 ? .52f : .64f;
            }
            RenderSettings.ambientSkyColor = index == 3 ? new Color(.46f, .56f, .67f) : index == 6 ? new Color(.95f, .78f, .86f) : new Color(.77f, .84f, .89f);
            RenderSettings.ambientEquatorColor = index == 3 ? new Color(.32f, .39f, .43f) : new Color(.68f, .73f, .64f);
            if (RenderSettings.skybox != null && RenderSettings.skybox.HasProperty("_GroundColor"))
            {
                RenderSettings.skybox.SetColor("_GroundColor", index == 2 ? new Color(.43f, .73f, .8f) : new Color(.62f, .75f, .76f));
                RenderSettings.skybox.SetColor("_SkyTint", new Color(.65f, .76f, .81f));
            }
        }

        private void TrimMapCache()
        {
            while (residentMaps.Count > 3)
            {
                int key = residentMaps[0];
                residentMaps.RemoveAt(0);
                Transform old = realms[key];
                if (old == null) continue;
                foreach (MeshFilter filter in old.GetComponentsInChildren<MeshFilter>(true))
                {
                    Mesh mesh = filter.sharedMesh;
                    if (mesh != null && owned.Remove(mesh)) Destroy(mesh);
                }
                old.gameObject.SetActive(false);
                Destroy(old.gameObject);
                realms[key] = null;
                obstacles[key] = null;
            }
        }

        public Vector3 ConstrainPosition(Vector3 position)
        {
            int index = Mathf.Clamp(CurrentRealm, 0, 6);
            Rect region = bounds[index];
            position.x = Mathf.Clamp(position.x, region.xMin, region.xMax);
            position.z = Mathf.Clamp(position.z, region.yMin, region.yMax);
            position.y = .16f;
            List<Rect> blocked = obstacles[index * RealmMapCatalog.MaxSubmaps + CurrentSubmap];
            if (blocked == null) return position;
            // Resolve expanded footprints so a character's body cannot clip into architecture.
            for (int iteration = 0; iteration < 3; iteration++)
            {
                bool moved = false;
                foreach (Rect rect in blocked)
                {
                    if (position.x <= rect.xMin || position.x >= rect.xMax || position.z <= rect.yMin || position.z >= rect.yMax) continue;
                    float left = rect.xMin >= region.xMin ? position.x - rect.xMin : float.PositiveInfinity;
                    float right = rect.xMax <= region.xMax ? rect.xMax - position.x : float.PositiveInfinity;
                    float back = rect.yMin >= region.yMin ? position.z - rect.yMin : float.PositiveInfinity;
                    float front = rect.yMax <= region.yMax ? rect.yMax - position.z : float.PositiveInfinity;
                    float minimum = Mathf.Min(left, right, back, front);
                    if (minimum == left) position.x = rect.xMin;
                    else if (minimum == right) position.x = rect.xMax;
                    else if (minimum == back) position.z = rect.yMin;
                    else position.z = rect.yMax;
                    moved = true;
                }
                if (!moved) break;
            }
            position.x = Mathf.Clamp(position.x, region.xMin, region.xMax);
            position.z = Mathf.Clamp(position.z, region.yMin, region.yMax);
            if (index == 2) position.x = Mathf.Min(position.x, Coastline(position.z) - .65f);
            if (index < 2 && position.z > 77.4f && position.z < 80.6f && (position.x < -10.3f || position.x > 6.3f))
                position.z = position.z < 79 ? 77.4f : 80.6f;
            return position;
        }

        private void CreateMaterials()
        {
            Mat("stone", new Color(.69f, .73f, .73f), "stone", .2f);
            Mat("chalk", new Color(.88f, .87f, .81f), "stone", .16f);
            Mat("moss", new Color(.53f, .66f, .53f), "ground", .12f);
            Mat("earth", new Color(.59f, .63f, .48f), "ground", .08f);
            Mat("wood", new Color(.49f, .36f, .24f), "wood", .19f);
            Mat("darkWood", new Color(.26f, .22f, .2f), "wood", .15f);
            Mat("redWood", new Color(.46f, .15f, .12f), "wood", .22f);
            Mat("roof", new Color(.24f, .32f, .33f), "stone", .31f);
            Mat("blueRoof", new Color(.19f, .39f, .47f), "stone", .34f);
            Mat("metal", new Color(.46f, .52f, .55f), "metal", .56f, .65f);
            Mat("darkMetal", new Color(.16f, .21f, .25f), "metal", .42f, .65f);
            Mat("gold", new Color(.68f, .54f, .25f), "metal", .45f, .68f);
            Mat("cream", new Color(.88f, .85f, .73f), null, .12f);
            Mat("redCloth", new Color(.65f, .14f, .15f), null, .1f);
            Mat("tealCloth", new Color(.13f, .46f, .47f), null, .1f);
            Mat("leaf", new Color(.2f, .34f, .23f), "ground", .07f);
            Mat("leafLight", new Color(.38f, .49f, .27f), "ground", .08f);
            Mat("petal", new Color(.82f, .58f, .64f), null, .14f);
            Mat("water", new Color(.11f, .42f, .5f), null, .82f, .4f);
            Mat("foam", new Color(.69f, .88f, .9f), null, .56f);
            Mat("horizonSea", new Color(.22f, .59f, .72f), null, .18f);
            Mat("waterfall", new Color(.77f, .93f, .96f), null, .48f, 0, new Color(.16f, .22f, .24f));
            var fallTexture = new Texture2D(64, 128, TextureFormat.RGB24, true) { name = "Flowing waterfall texture", wrapMode = TextureWrapMode.Repeat };
            for (int y = 0; y < 128; y++) for (int x = 0; x < 64; x++)
            {
                float value = .55f + Mathf.PerlinNoise(x * .24f, y * .036f) * .45f;
                fallTexture.SetPixel(x, y, new Color(value * .81f, value * .95f, value));
            }
            fallTexture.Apply(true, true); owned.Add(fallTexture); materials["waterfall"].mainTexture = fallTexture;
            Mat("cyan", new Color(.13f, .7f, .86f), null, .45f, .25f, new Color(.05f, .56f, .8f));
            Mat("amber", new Color(1, .62f, .22f), null, .3f, 0, new Color(.86f, .36f, .06f));
            Mat("paper", new Color(1, .84f, .5f), null, .14f, 0, new Color(.5f, .24f, .06f));
            Mat("lawn", new Color(.91f, 1.3f, .79f), "ground", .06f);
            Mat("path", new Color(1.4f, 1.6f, 1.85f), "stone", .16f);
            Mat("sand", new Color(1.6f, 1.75f, 1.6f), "ground", .08f);
            Mat("bark", new Color(.48f, .39f, .34f), "wood", .12f);
            Cutout("blossom", RealmBotanicalArt.Foliage(false));
            Cutout("maple", RealmBotanicalArt.Foliage(true));
            Cutout("meadow", RealmBotanicalArt.Meadow(false));
            Cutout("flowers", RealmBotanicalArt.Meadow(true));
            MapTerrainTexture("sand", "coast_sand_01", new Color(.94f, .95f, .9f));
            MapTerrainTexture("lawn", "grass_path_2", new Color(.83f, 1f, .8f));
        }

        private void MapTerrainTexture(string material, string texture, Color tint)
        {
            Texture2D diffuse = Resources.Load<Texture2D>("Art/MapExpansion/PolyHaven/" + texture + "/" + texture + "_diff_1k");
            if (diffuse == null) return;
            Material target = materials[material];
            diffuse.wrapMode = TextureWrapMode.Repeat;
            diffuse.anisoLevel = 4;
            target.mainTexture = diffuse;
            target.color = tint;
            target.mainTextureScale = new Vector2(.38f, .38f);
            target.SetTexture("_BumpMap", null);
            target.DisableKeyword("_NORMALMAP");
            target.SetFloat("_Glossiness", .04f);
        }

        private void Town(Transform root)
        {
            ExtendedGround(root, 0);
            Route(root, "path");
            CourtyardHouse(root, new Vector3(-18, 0, 8), 8.8f, 7.2f, "redWood", "blueRoof");
            CourtyardHouse(root, new Vector3(18, 0, 12), 8.8f, 7.2f, "darkWood", "blueRoof");
            Gate(root, new Vector3(0, 0, 13.2f), 10.5f, "redWood", "blueRoof");
            CourtyardHouse(root, new Vector3(-25, 0, 33), 6.8f, 6.2f, "darkWood", "blueRoof");
            CourtyardHouse(root, new Vector3(25, 0, 65), 6.8f, 6.2f, "redWood", "blueRoof");
            CourtyardHouse(root, new Vector3(0, 0, 121), 13, 7, "redWood", "blueRoof");
            Gate(root, new Vector3(0, 0, 111), 9, "redWood", "blueRoof");
            GardenBridge(root, new Vector3(-2, 0, 79));
            RestGarden(root, new Vector3(-23, 0, 43), false);
            RestGarden(root, new Vector3(23, 0, 85), true);
            for (int side = -1; side <= 1; side += 2)
            {
                Tree(root, new Vector3(side * 9.7f, .1f, -3), 1.36f, true);
                Lantern(root, new Vector3(side * 6.2f, 0, 6.5f));
                MarketStall(root, new Vector3(side * 11, .1f, 8.3f), side < 0 ? "tealCloth" : "redCloth");
                for (int i = 0; i < 10; i++)
                {
                    float z = 20 + i * 10.3f;
                    float x = side * (20.5f + (i % 3) * 4.1f);
                    Tree(root, new Vector3(x, .1f, z), 1.1f + (i % 3) * .17f, true);
                    FlowerPatch(root, new Vector3(x - side * 2.5f, .12f, z - 1), 4, 23 + i * 7 + side, "flowers");
                    if (i % 2 == 0) Tree(root, new Vector3(side * 13.5f, .1f, z + 5.5f), .95f, true);
                }
                Tree(root, new Vector3(side * 10.5f, .1f, 107), 1.65f, true);
            }
            Well(root, new Vector3(-11.5f, .1f, 1.9f));
            MeadowEdges(root, 21, "flowers");
            Horizon(root, 101, "moss", 16);
        }

        private void Adventure(Transform root)
        {
            ExtendedGround(root, 1);
            Route(root, "sand");
            RuinArch(root, new Vector3(0, 0, 11.5f));
            GardenBridge(root, new Vector3(-2, 0, 79));
            RestGarden(root, new Vector3(-23, 0, 44), false);
            RestGarden(root, new Vector3(24, 0, 86), false);
            for (int side = -1; side <= 1; side += 2)
            {
                for (int i = 0; i < 13; i++)
                {
                    float z = -5 + i * 9.2f;
                    float x = side * (21.2f + (i % 3) * 3.9f);
                    Tree(root, new Vector3(x, .1f, z), 1.26f + (i % 3) * .16f, false);
                    Tree(root, new Vector3(side * 35, .1f, z + 4), 1.58f, false);
                    FlowerPatch(root, new Vector3(x - side * 2.2f, .12f, z + 2.5f), 3.6f, 71 + i * 11 + side, "meadow");
                    if (i % 2 == 0) Rock(root, new Vector3(side * 34.8f, -1, z + 4), new Vector3(4, 5.5f + i * .3f, 4.8f), i + 53, "moss");
                }
                Tree(root, new Vector3(side * 10, .1f, -2), 1.34f, false);
                Tree(root, new Vector3(side * 12, .1f, 106), 1.55f, false);
                for (int i = 0; i < 4; i++)
                {
                    var p = new Vector3(side * 21.5f, 0, 22 + i * 24);
                    Cylinder(root, "Ruined garden column", p + Vector3.up * 1.4f, .6f, .44f, 2.8f, "moss", 12);
                    Block(p, 1.4f, 1.4f);
                }
            }
            RuinArch(root, new Vector3(0, 0, 111.5f));
            Rock(root, new Vector3(-8, -1, 132), new Vector3(12, 19, 7), 191, "moss");
            Rock(root, new Vector3(10, -1, 135), new Vector3(13, 23, 8), 193, "moss");
            Waterfall(root, new Vector3(0, -.1f, 127), 4.3f, 19);
            MeadowEdges(root, 65, "meadow");
            Horizon(root, 208, "moss", 25);
        }

        private void Pirate(Transform root)
        {
            ExtendedGround(root, 2);
            Route(root, "path");
            CourtyardHouse(root, new Vector3(-23, 0, 7), 8, 7, "wood", "blueRoof");
            CourtyardHouse(root, new Vector3(-24, 0, 105), 8, 7, "redWood", "blueRoof");
            RestGarden(root, new Vector3(-24, 0, 40), true);
            RestGarden(root, new Vector3(19, 0, 69), true);
            Ship(root, new Vector3(42, -.55f, 18));
            Ship(root, new Vector3(72, -.55f, 85));
            for (int i = 0; i < 7; i++)
            {
                float z = -5 + i * 17.4f;
                Tree(root, new Vector3(-16.8f - (i % 2) * 8, .1f, z), 1.15f + (i % 3) * .13f, true);
                Tree(root, new Vector3(-33, .1f, z + 8.5f), 1.35f, true);
                FlowerPatch(root, new Vector3(-12, .12f, z), 4.5f, 601 + i * 8, "flowers");
                FlowerPatch(root, new Vector3(-26, .12f, z + 6), 5, 612 + i * 9, "meadow");
                Rock(root, new Vector3(Coastline(z) + 2.4f, -.65f, z + 7), new Vector3(1.6f, .9f, 1.7f), 913 + i, "chalk");
            }
            for (int i = 0; i < 22; i++)
                Box(root, "Seaside boardwalk", new Vector3(0, .13f, -12 + i * .6f), new Vector3(7.8f, .05f, .55f), "wood");
            Gate(root, new Vector3(0, 0, 111), 9.8f, "chalk", "blueRoof");
            for (int side = -1; side <= 1; side += 2)
            {
                Tree(root, new Vector3(side * 12, .1f, 113), 1.36f, true);
                Lantern(root, new Vector3(side * 6, .1f, 8));
                Flag(root, new Vector3(side * 7.5f, .1f, 104.5f), 4.5f, "tealCloth");
            }
            for (int i = 0; i < 6; i++) Rock(root, new Vector3(80 + (i % 3) * 16, -2, 92 + i * 12), new Vector3(8, 10 + i * 2, 7), 450 + i, "moss");
            MeadowEdges(root, 94, "flowers");
        }

        public static float Coastline(float z) => 25.5f + Mathf.Sin(z * .055f) * 3.3f + Mathf.Sin(z * .13f) * 1.1f;

        private void ExtendedGround(Transform root, int theme)
        {
            float[] rows = { -24, -8, 8, 24, 40, 56, 72, 77.4f, 80.6f, 88, 104, 120, 136, 152 };
            for (int row = 0; row < rows.Length - 1; row++)
            {
                float near = rows[row], far = rows[row + 1];
                if (theme < 2 && near >= 77.4f && far <= 80.6f) continue;
                for (int column = 0; column < 6; column++)
                {
                    float left = -48 + column * 16;
                    float rightNear = Mathf.Min(left + 16, theme == 2 ? Coastline(near) : 48);
                    float rightFar = Mathf.Min(left + 16, theme == 2 ? Coastline(far) : 48);
                    if (left >= rightNear && left >= rightFar) continue;
                    var v = new[] { new Vector3(left, .1f, near), new Vector3(left, .1f, far), new Vector3(rightFar, .1f, far), new Vector3(rightNear, .1f, near) };
                    var uv = new Vector2[4];
                    for (int i = 0; i < 4; i++) uv[i] = new Vector2(v[i].x, v[i].z) * .24f;
                    string material = theme == 2 && column >= 2 ? "sand" : "lawn";
                    MeshObject(root, "Garden terrain sector", Mesh("Terrain sector", v, new[] { 0, 1, 2, 0, 2, 3 }, uv), material);
                }
                if (theme == 2)
                {
                    var sand = new[] { new Vector3(Coastline(near), .1f, near), new Vector3(Coastline(far), .1f, far), new Vector3(Coastline(far) + 18, -2.4f, far), new Vector3(Coastline(near) + 18, -2.4f, near) };
                    var uv = new Vector2[4];
                    for (int i = 0; i < 4; i++) uv[i] = new Vector2(sand[i].x, sand[i].z) * .12f;
                    MeshObject(root, "Visible submerged beach", Mesh("Shallow seabed", sand, new[] { 0, 1, 2, 0, 2, 3 }, uv), "sand");
                }
            }
            if (theme < 2)
            {
                for (int i = 0; i < 6; i++)
                    Box(root, "Pebble stream bed", new Vector3(-40 + i * 16, -.7f, 79), new Vector3(16, .1f, 3.3f), "stone");
            }
            else if (theme == 2)
            {
                Box(root, "Open sea to the horizon", new Vector3(655, -.22f, 330), new Vector3(1230, .05f, 1000), "horizonSea");
                Box(root, "Far sea beyond the cape", new Vector3(-320, -.25f, 651), new Vector3(720, .05f, 1000), "horizonSea");
            }
        }

        private static readonly Vector3[] RouteStops =
        {
            new Vector3(0, 0, -16), new Vector3(0, 0, 0), new Vector3(0, 0, 25),
            new Vector3(8, 0, 44), new Vector3(-6, 0, 66), new Vector3(-2, 0, 79),
            new Vector3(0, 0, 92), new Vector3(0, 0, 115)
        };

        private void Route(Transform root, string material)
        {
            for (int section = 0; section < RouteStops.Length - 1; section++)
            {
                Vector3 from = RouteStops[section], to = RouteStops[section + 1];
                int steps = Mathf.CeilToInt(Vector3.Distance(from, to) / 4);
                for (int step = 0; step < steps; step++)
                {
                    Vector3 a = Vector3.Lerp(from, to, step / (float)steps);
                    Vector3 b = Vector3.Lerp(from, to, (step + 1) / (float)steps);
                    if (buildingRealm < 2 && a.z < 80.6f && b.z > 77.4f) continue;
                    Vector3 side = Vector3.Cross((b - a).normalized, Vector3.up) * 3.6f;
                    var vertices = new[] { a + side, b + side, b - side, a - side };
                    var uv = new Vector2[4];
                    for (int i = 0; i < 4; i++) { vertices[i].y = .128f; uv[i] = new Vector2(vertices[i].x, vertices[i].z) * .32f; }
                    MeshObject(root, "Winding garden walkway", Mesh("Walkway sector", vertices, new[] { 0, 1, 2, 0, 2, 3 }, uv), material);
                }
            }
            foreach (Vector3 p in new[] { new Vector3(0, 0, 25), new Vector3(8, 0, 44), new Vector3(-6, 0, 66), new Vector3(0, 0, 92) })
            {
                Cylinder(root, "Open encounter clearing", p + Vector3.up * .109f, 9.3f, 9.3f, .028f, buildingRealm == 2 ? "sand" : "path", 48);
                Ring(root, p + Vector3.up * .129f, 9.23f, 9.32f, buildingRealm == 0 ? "chalk" : "sand", 64);
            }
        }

        private static bool InClearing(Vector3 point, float margin = 0)
        {
            Vector3[] centers = { new Vector3(0, 0, 25), new Vector3(8, 0, 44), new Vector3(-6, 0, 66), new Vector3(0, 0, 92) };
            foreach (Vector3 center in centers)
                if (new Vector2(point.x - center.x, point.z - center.z).sqrMagnitude < (9 + margin) * (9 + margin)) return true;
            return false;
        }

        private void GardenBridge(Transform root, Vector3 p)
        {
            for (int i = 0; i < 16; i++) Box(root, "Bridge deck plank", p + new Vector3(0, .12f, -4 + i * .52f), new Vector3(18, .06f, .49f), "wood");
            for (int side = -1; side <= 1; side += 2)
            {
                for (int i = 0; i < 9; i++)
                {
                    float z = -4 + i;
                    float rise = Mathf.Sin((z + 4) / 8 * Mathf.PI) * .3f;
                    Cylinder(root, "Bridge carved rail post", p + new Vector3(side * 8.8f, .78f + rise * .5f, z), .13f, .1f, 1.3f + rise, "chalk", 8);
                    if (i < 8)
                    {
                        float nextRise = Mathf.Sin((z + 5) / 8 * Mathf.PI) * .3f;
                        Beam(root, "Arched bridge handrail", p + new Vector3(side * 8.8f, 1.45f + rise, z), p + new Vector3(side * 8.8f, 1.45f + nextRise, z + 1), .1f, "redWood");
                    }
                }
                Lantern(root, p + new Vector3(side * 10.1f, 0, -5.1f));
                Lantern(root, p + new Vector3(side * 10.1f, 0, 5.1f));
            }
        }

        private void RestGarden(Transform root, Vector3 p, bool blue)
        {
            Cylinder(root, "Quiet garden terrace", p + Vector3.up * .08f, 4.5f, 4.5f, .06f, "path", 32);
            for (int i = -1; i <= 1; i += 2)
            {
                Vector3 seat = p + new Vector3(i * 3, .1f, 0);
                Box(root, "Garden bench seat", seat + Vector3.up * .54f, new Vector3(.8f, .15f, 2.6f), "wood");
                for (int leg = -1; leg <= 1; leg += 2) Box(root, "Bench stone leg", seat + new Vector3(0, .25f, leg * .85f), new Vector3(.58f, .45f, .36f), "chalk");
                Block(seat, 1, 2.8f);
            }
            for (int x = -1; x <= 1; x += 2) for (int z = -1; z <= 1; z += 2)
            {
                Vector3 foot = p + new Vector3(x * 3.4f, 0, z * 3.4f);
                Cylinder(root, "Garden pergola post", foot + Vector3.up * 2.1f, .1f, .08f, 4.2f, "chalk", 10);
                Block(foot, .35f, .35f);
            }
            Roof(root, p + Vector3.up * 4.25f, 8.2f, 8.2f, 1.35f, blue ? "blueRoof" : "roof");
            FlowerPatch(root, p + new Vector3(0, .12f, 4.9f), 3.5f, 408 + (int)p.z, "flowers");
        }

        private void MeadowEdges(Transform root, int seed, string material)
        {
            var random = new System.Random(seed);
            for (int i = 0; i < 90; i++)
            {
                float x = (float)random.NextDouble() * 61 - 30.5f;
                float z = (float)random.NextDouble() * 125 - 13;
                var p = new Vector3(x, .14f, z);
                if (InClearing(p, 2) || Mathf.Abs(x) < 5 || (z > 74 && z < 84) || (buildingRealm == 2 && x > 13)) continue;
                FlowerPatch(root, p, 1.6f + (float)random.NextDouble() * 1.8f, seed + i * 31, i % 3 == 0 ? "meadow" : material);
            }
        }

        private void FlowerPatch(Transform root, Vector3 p, float radius, int seed, string material)
        {
            var random = new System.Random(seed);
            for (int i = 0; i < 15; i++)
            {
                float angle = (float)random.NextDouble() * Mathf.PI * 2;
                float distance = Mathf.Sqrt((float)random.NextDouble()) * radius;
                Vector3 center = p + new Vector3(Mathf.Cos(angle) * distance, .3f, Mathf.Sin(angle) * distance);
                float size = .52f + (float)random.NextDouble() * .45f;
                LeafCard(root, center, new Vector2(size * 1.1f, size), Quaternion.Euler(0, i * 67, 0), material);
                LeafCard(root, center, new Vector2(size * 1.1f, size), Quaternion.Euler(0, i * 67 + 90, 0), material);
            }
        }

        private void LeafCard(Transform root, Vector3 center, Vector2 size, Quaternion rotation, string material)
        {
            var v = new Vector3[8];
            var uv = new Vector2[8];
            var corners = new[] { new Vector3(-.5f, -.5f, 0), new Vector3(-.5f, .5f, 0), new Vector3(.5f, .5f, 0), new Vector3(.5f, -.5f, 0) };
            for (int i = 0; i < 4; i++)
            {
                v[i] = center + rotation * new Vector3(corners[i].x * size.x, corners[i].y * size.y, 0);
                v[i + 4] = v[i];
            }
            uv[0] = uv[4] = Vector2.zero; uv[1] = uv[5] = Vector2.up;
            uv[2] = uv[6] = Vector2.one; uv[3] = uv[7] = Vector2.right;
            Mesh mesh = Mesh("Botanical cutout", v, new[] { 0, 1, 2, 0, 2, 3, 6, 5, 4, 7, 6, 4 }, uv);
            Vector3 normal = (rotation * Vector3.back + Vector3.up * .85f).normalized;
            var normals = new Vector3[8];
            for (int i = 0; i < 4; i++) { normals[i] = normal; normals[i + 4] = (-(rotation * Vector3.back) + Vector3.up * .85f).normalized; }
            mesh.normals = normals;
            MeshObject(root, "Layered botanical foliage", mesh, material);
        }

        private void Horizon(Transform root, int seed, string material, float height)
        {
            for (int i = 0; i < 16; i++)
            {
                float z = -10 + (i % 8) * 24;
                float x = i < 8 ? -65 : 65;
                Rock(root, new Vector3(x, -4, z), new Vector3(12, height * (.72f + i % 3 * .13f), 14), seed + i, material);
            }
            for (int i = 0; i < 7; i++) Rock(root, new Vector3(-60 + i * 20, -3, 170 + i % 2 * 15), new Vector3(14, height, 14), seed + 20 + i, material);
        }

        /// <summary>Romantic seventh realm: a branching flower creek valley with a sunset sea overlook.</summary>
        private void FlowerValley(Transform root)
        {
            ExtendedGround(root, 0);
            // Three connected paths create a non-linear flower garden instead of a straight corridor.
            Route(root, "path");
            Vector3[] ponds = { new Vector3(-16, 0, 18), new Vector3(17, 0, 54), new Vector3(-14, 0, 94) };
            foreach (var pond in ponds)
            {
                Cylinder(root, "Moonlit flower pond", pond + Vector3.up * .11f, 5.2f, 5.2f, .055f, "water", 48);
                Ring(root, pond + Vector3.up * .14f, 4.9f, 5.08f, "foam", 64);
                FlowerPatch(root, pond + new Vector3(0, .14f, 5.2f), 3.2f, 1700 + (int)pond.z, "flowers");
            }
            // Meandering creek and stepping stones through the valley.
            for (int i = 0; i < 15; i++)
            {
                float z = -8 + i * 10.4f;
                float x = Mathf.Sin(i * .78f) * 9.5f;
                Cylinder(root, "Flower creek", new Vector3(x, .105f, z), 1.6f, 1.6f, .035f, "water", 28);
                for (int s = -1; s <= 1; s += 2) Rock(root, new Vector3(x + s * 2.1f, .14f, z + .7f), new Vector3(.7f, .3f, .9f), 1800 + i * 3 + s, "chalk");
            }
            // Dense blossom and maple groves frame the walkable clearings.
            for (int i = 0; i < 34; i++)
            {
                float z = -8 + (i % 17) * 9.4f;
                float side = i % 2 == 0 ? -1 : 1;
                float x = side * (18 + (i % 3) * 5.2f);
                Tree(root, new Vector3(x, .1f, z), 1.15f + (i % 4) * .14f, i % 3 != 0);
            }
            RestGarden(root, new Vector3(0, 0, 119), true);
            Gate(root, new Vector3(0, 0, 110), 10.5f, "redWood", "blueRoof");
            MeadowEdges(root, 2701, "flowers");
            Horizon(root, 2720, "moss", 18);
        }

        private void Mech(Transform root)
        {
            // A sequence of six open hangar districts replaces the former single room.
            Ground(root, "darkMetal", 76, 145, 56);
            RouteBand(root, "天枢主航线", new[]
            {
                new Vector3(0, .12f, -14), new Vector3(0, .12f, 15), new Vector3(-4, .12f, 36),
                new Vector3(4, .12f, 58), new Vector3(-2, .12f, 81), new Vector3(4, .12f, 103), new Vector3(0, .12f, 125)
            }, 11.2f, "metal");
            int[] pads = { 1, 20, 44, 70, 96, 118 };
            foreach (int z in pads)
            {
                Cylinder(root, "天枢作战甲板", new Vector3(0, .126f, z), 7.8f, 7.8f, .026f, "darkMetal", 40);
                Ring(root, new Vector3(0, .145f, z), 6.8f, 7.02f, "cyan", 48);
                Ring(root, new Vector3(0, .147f, z), 8.1f, 8.22f, "amber", 48);
            }
            for (int side = -1; side <= 1; side += 2)
            {
                Box(root, "基地外甲板", new Vector3(side * 37.3f, 3.8f, 56), new Vector3(1.4f, 7.4f, 145), "darkMetal");
                Box(root, "基地导光带", new Vector3(side * 36.5f, 5.8f, 56), new Vector3(.12f, .16f, 139), "cyan");
                for (int district = 0; district < 6; district++)
                {
                    float z = 8 + district * 21.7f;
                    float x = side * (22.5f + district % 2 * 3.5f);
                    Box(root, "装甲维修舱", new Vector3(x, 2.15f, z), new Vector3(9.6f, 4.1f, 10.5f), "metal");
                    Box(root, "维修舱能量窗", new Vector3(x - side * 4.86f, 2.25f, z), new Vector3(.08f, 1.6f, 6.6f), "cyan");
                    Beam(root, "机库吊臂", new Vector3(x - side * 4.2f, 4.6f, z - 4.3f), new Vector3(x - side * 1.3f, 5.8f, z - 4.3f), .18f, "metal", 6);
                    for (int rib = -1; rib <= 1; rib++)
                        Beam(root, "机库承重骨架", new Vector3(side * 32.6f, .2f, z + rib * 3.2f), new Vector3(side * 32.6f, 8.2f, z + rib * 3.2f), .28f, "metal", 6);
                    Console(root, new Vector3(side * 13.4f, .1f, z - 2.4f), -side * 28);
                    Crate(root, new Vector3(side * 16.3f, .72f, z + 2.4f), 1.25f, "metal");
                    Block(new Vector3(x, 0, z), 10.2f, 11f);
                }
            }
            MechDock(root, new Vector3(-23, .1f, 28));
            MechDock(root, new Vector3(23, .1f, 83));
            Block(new Vector3(-23, 0, 28), 10.5f, 7.5f);
            Block(new Vector3(23, 0, 83), 10.5f, 7.5f);
            Gate(root, new Vector3(0, 0, 128), 12, "metal", "darkMetal");
        }

        private void Kingdoms(Transform root)
        {
            Terrain(root, "earth", 412, 48, 76, 56);
            Ground(root, "earth", 88, 145, 56);
            RouteBand(root, "赤壁驿道", new[]
            {
                new Vector3(0, .12f, -14), new Vector3(-2, .12f, 16), new Vector3(5, .12f, 39),
                new Vector3(-4, .12f, 62), new Vector3(3, .12f, 86), new Vector3(-3, .12f, 107), new Vector3(0, .12f, 126)
            }, 7.6f, "stone");
            int[] plazas = { 3, 23, 48, 74, 101, 120 };
            foreach (int z in plazas)
            {
                Cylinder(root, "赤壁行军广场", new Vector3(0, .126f, z), 7.1f, 7.1f, .025f, "earth", 36);
                Ring(root, new Vector3(0, .146f, z), 6.5f, 6.68f, "gold", 48);
            }
            for (int side = -1; side <= 1; side += 2)
            {
                LowWall(root, new Vector3(side * 42.2f, 0, 56), 0, 140, "stone");
                for (int camp = 0; camp < 5; camp++)
                {
                    float z = 9 + camp * 26.4f;
                    float x = side * (19 + camp % 2 * 5);
                    Tent(root, new Vector3(x, .1f, z), 6.3f, 7.2f);
                    Watchtower(root, new Vector3(side * 32.8f, 0, z + 4.3f));
                    Flag(root, new Vector3(side * 12.2f, .1f, z + 5.2f), 5.6f, camp % 2 == 0 ? "redCloth" : "tealCloth");
                    for (int stake = 0; stake < 5; stake++)
                    {
                        Vector3 p = new Vector3(side * 35.8f, .1f, z - 4 + stake * 2);
                        Beam(root, "营寨拒马", p, p + new Vector3(side * -.32f, 2.35f, 0), .12f, "wood");
                        Beam(root, "营寨横撑", p + Vector3.up * .8f, p + new Vector3(0, .8f, 2f), .08f, "wood");
                    }
                    Block(new Vector3(x, 0, z), 7.1f, 8f);
                    Block(new Vector3(side * 32.8f, 0, z + 4.3f), 4.8f, 4.8f);
                }
            }
            for (int i = 0; i < 4; i++)
            {
                float z = 19 + i * 27;
                SiegeEngine(root, new Vector3(i % 2 == 0 ? -12 : 12, .1f, z));
                WeaponRack(root, new Vector3(i % 2 == 0 ? 14.4f : -14.4f, .1f, z + 4));
                Barrel(root, new Vector3(i % 2 == 0 ? -15.6f : 15.6f, .1f, z + 5), .9f);
                Block(new Vector3(i % 2 == 0 ? -12 : 12, 0, z), 3.4f, 4.8f);
            }
            Gate(root, new Vector3(0, 0, 78), 12.5f, "redWood", "roof");
            Gate(root, new Vector3(0, 0, 128), 14, "redWood", "roof");
            Horizon(root, 429, "stone", 14);
        }

        private void Martial(Transform root)
        {
            Terrain(root, "stone", 590, 52, 76, 56);
            Ground(root, "chalk", 94, 145, 56);
            RouteBand(root, "云海登天阶", new[]
            {
                new Vector3(0, .12f, -14), new Vector3(0, .12f, 13), new Vector3(7, .12f, 36),
                new Vector3(-8, .12f, 60), new Vector3(6, .12f, 84), new Vector3(-4, .12f, 107), new Vector3(0, .12f, 126)
            }, 7.2f, "stone");
            Vector3[] courts = { new Vector3(0, .075f, 6), new Vector3(8, .075f, 37), new Vector3(-9, .075f, 67), new Vector3(4, .075f, 98), new Vector3(0, .075f, 120) };
            for (int court = 0; court < courts.Length; court++)
            {
                Vector3 center = courts[court];
                Cylinder(root, "云海武道台", center, 8.2f, 8.2f, .08f, court % 2 == 0 ? "stone" : "chalk", 48);
                Ring(root, center + Vector3.up * .047f, 7.2f, 7.4f, "gold", 64);
                Ring(root, center + Vector3.up * .049f, 4.8f, 4.96f, "cyan", 56);
                for (int i = 0; i < 8; i++)
                {
                    float angle = i * Mathf.PI / 4;
                    Vector3 p = center + new Vector3(Mathf.Sin(angle) * 6.15f, .124f, Mathf.Cos(angle) * 6.15f);
                    Transform marker = Box(root, "八方星纹", p, new Vector3(.16f, .018f, 1.05f), "gold");
                    marker.localRotation = Quaternion.Euler(0, i * 45, 0);
                }
            }
            for (int side = -1; side <= 1; side += 2)
            {
                LowWall(root, new Vector3(side * 45.2f, 0, 56), 0, 141, "chalk");
                for (int terrace = 0; terrace < 5; terrace++)
                {
                    float z = 17 + terrace * 24.5f;
                    float x = side * (23 + terrace % 2 * 4.5f);
                    CourtyardHouse(root, new Vector3(x, 0, z), 9.2f, 6.2f, "redWood", terrace % 2 == 0 ? "blueRoof" : "roof");
                    DragonColumn(root, new Vector3(side * 15.5f, .1f, z + 5.2f), side);
                    Tree(root, new Vector3(side * 35.2f, .1f, z - 2.4f), 1.1f + terrace * .06f, terrace % 2 == 0);
                    Flag(root, new Vector3(side * 12.2f, .1f, z + 8), 5.5f, terrace % 2 == 0 ? "tealCloth" : "redCloth");
                    TrainingDummy(root, new Vector3(side * 14.6f, .1f, z - 5));
                    Block(new Vector3(side * 15.5f, 0, z + 5.2f), 3.7f, 3.7f);
                }
            }
            Gate(root, new Vector3(0, 0, 27), 12, "redWood", "blueRoof");
            Gate(root, new Vector3(0, 0, 91), 12, "redWood", "blueRoof");
            Gate(root, new Vector3(0, 0, 128), 14, "redWood", "blueRoof");
            Horizon(root, 599, "stone", 28);
        }

        private void RouteBand(Transform root, string name, Vector3[] stops, float width, string material)
        {
            for (int i = 0; i < stops.Length - 1; i++)
            {
                Vector3 from = stops[i];
                Vector3 to = stops[i + 1];
                Vector3 delta = to - from;
                delta.y = 0;
                Transform strip = Box(root, name, (from + to) * .5f + Vector3.up * .01f, new Vector3(width, .032f, delta.magnitude + .25f), material);
                strip.localRotation = Quaternion.LookRotation(delta.normalized, Vector3.up);
            }
        }

        private void CourtyardHouse(Transform root, Vector3 p, float width, float depth, string wood, string roof)
        {
            Transform house = Group("Timber courtyard house", root, p);
            Box(house, "Foundation plinth", new Vector3(0, -.03f, 0), new Vector3(width + .3f, .26f, depth + .3f), "stone");
            Box(house, "Plaster walls", new Vector3(0, 1.9f, .25f), new Vector3(width - .4f, 3.6f, depth - .7f), "chalk");
            for (int side = -1; side <= 1; side += 2)
            {
                for (int i = 0; i < 4; i++)
                {
                    float x = (i / 3f - .5f) * (width - .5f);
                    Cylinder(house, "Veranda column", new Vector3(x, 1.95f, side * depth * .49f), .13f, .115f, 3.7f, wood, 12);
                    Box(house, "Window wooden frame", new Vector3(x, 2.05f, side * (depth * .5f - .08f)), new Vector3(width * .2f, 1.65f, .12f), wood);
                    Box(house, "Window paper", new Vector3(x, 2.05f, side * (depth * .5f + .005f)), new Vector3(width * .17f, 1.4f, .05f), "cream");
                    for (int bar = -2; bar <= 2; bar++) Box(house, "Lattice upright", new Vector3(x + bar * width * .031f, 2.05f, side * (depth * .5f + .04f)), new Vector3(.035f, 1.46f, .05f), wood);
                    for (int bar = -2; bar <= 2; bar++) Box(house, "Lattice crossbar", new Vector3(x, 2.05f + bar * .25f, side * (depth * .5f + .055f)), new Vector3(width * .18f, .035f, .05f), wood);
                }
                Box(house, "Eave bracket beam", new Vector3(0, 3.75f, side * depth * .46f), new Vector3(width + .15f, .25f, .24f), wood);
            }
            Box(house, "Timber door", new Vector3(0, 1.45f, -depth * .5f - .04f), new Vector3(1.1f, 2.55f, .14f), wood);
            Roof(house, new Vector3(0, 3.85f, 0), width + 1.3f, depth + 1.4f, 1.8f, roof);
            Block(p, width + .15f, depth + .15f);
        }

        private void Gate(Transform root, Vector3 p, float width, string wood, string roof)
        {
            Transform gate = Group("Sweeping roof gateway", root, p);
            for (int side = -1; side <= 1; side += 2)
            {
                Vector3 foot = new Vector3(side * width * .43f, 0, 0);
                Cylinder(gate, "Carved stone pedestal", foot + Vector3.up * .38f, .55f, .42f, .65f, "stone", 12);
                Cylinder(gate, "Gateway column", foot + Vector3.up * 2.8f, .22f, .18f, 5, wood, 16);
                Block(p + foot, .8f, .8f);
            }
            Box(gate, "Lintel", new Vector3(0, 4.7f, 0), new Vector3(width, .4f, .45f), wood);
            Box(gate, "Carved gateway plaque", new Vector3(0, 4.35f, -.3f), new Vector3(2.4f, .78f, .16f), "darkWood");
            Box(gate, "Plaque inset", new Vector3(0, 4.35f, -.395f), new Vector3(2.08f, .51f, .03f), "gold");
            Roof(gate, new Vector3(0, 5, 0), width + 2, 3.8f, 1.4f, roof);
        }

        private void Roof(Transform root, Vector3 p, float width, float depth, float height, string material)
        {
            const int nx = 16, nz = 12;
            var vertices = new Vector3[(nx + 1) * (nz + 1)];
            var triangles = new int[nx * nz * 6];
            var uv = new Vector2[vertices.Length];
            int t = 0;
            for (int z = 0; z <= nz; z++) for (int x = 0; x <= nx; x++)
            {
                int i = z * (nx + 1) + x;
                vertices[i] = RoofPoint(x / (float)nx, z / (float)nz, width, depth, height);
                uv[i] = new Vector2(x / (float)nx * width * .55f, z / (float)nz * depth * .55f);
                if (x == nx || z == nz) continue;
                triangles[t++] = i; triangles[t++] = i + nx + 1; triangles[t++] = i + 1;
                triangles[t++] = i + 1; triangles[t++] = i + nx + 1; triangles[t++] = i + nx + 2;
            }
            Transform roof = Group("Curved tiled roof", root, p);
            MeshObject(roof, "Tiled roof surface", Mesh("Sweeping roof", vertices, triangles, uv), material);
            Box(roof, "Dark roof underside", new Vector3(0, .25f, 0), new Vector3(width * .85f, .18f, depth * .7f), "darkWood");
            for (int side = 0; side <= 1; side++)
            {
                for (int x = 0; x < nx; x++) Beam(roof, "Rolled eave tile", RoofPoint(x / (float)nx, side, width, depth, height), RoofPoint((x + 1f) / nx, side, width, depth, height), .08f, "stone");
                for (int z = 0; z < nz; z++) Beam(roof, "Swept verge", RoofPoint(side, z / (float)nz, width, depth, height), RoofPoint(side, (z + 1f) / nz, width, depth, height), .075f, "stone");
            }
            for (int x = 1; x < nx; x++) for (int z = 0; z < 6; z++)
                Beam(roof, "Roof tile channel", RoofPoint(x / (float)nx, z / 6f, width, depth, height) + Vector3.up * .025f, RoofPoint(x / (float)nx, (z + 1) / 6f, width, depth, height) + Vector3.up * .025f, .025f, material);
            Beam(roof, "Crest ridge", new Vector3(-width * .49f, height + .04f, 0), new Vector3(width * .49f, height + .04f, 0), .105f, "gold");
        }

        private static Vector3 RoofPoint(float u, float v, float width, float depth, float height)
        {
            float x = u * 2 - 1, z = v * 2 - 1, edge = Mathf.Abs(z);
            return new Vector3(x * width * .5f, height * Mathf.Pow(1 - edge, 1.5f) + height * .2f * Mathf.Pow(edge, 5) + .42f * Mathf.Pow(Mathf.Abs(x), 6) * edge * edge, z * depth * .5f);
        }

        private void RuinArch(Transform root, Vector3 p)
        {
            for (int side = -1; side <= 1; side += 2)
            {
                for (int i = 0; i < 5; i++) Box(root, "Weathered portal pier", p + new Vector3(side * 3.3f, .45f + i * .82f, 0), new Vector3(1.05f - (i % 2) * .06f, .79f, 1.4f), "moss");
                Block(p + new Vector3(side * 3.3f, 0, 0), 1.2f, 1.5f);
            }
            for (int i = 0; i < 17; i++)
            {
                float angle = i * Mathf.PI / 16;
                Vector3 q = p + new Vector3(Mathf.Cos(angle) * 3.3f, 4.2f + Mathf.Sin(angle) * 2.5f, 0);
                Transform voussoir = Box(root, "Ancient arch voussoir", q, new Vector3(.7f, .85f, 1.55f), i % 3 == 0 ? "chalk" : "moss");
                voussoir.localRotation = Quaternion.Euler(0, 0, angle * Mathf.Rad2Deg - 90);
            }
        }

        private void Ship(Transform root, Vector3 p)
        {
            Transform ship = Group("Harbor sailing ship", root, p);
            const int sections = 12;
            var vertices = new Vector3[(sections + 1) * 4];
            var uv = new Vector2[vertices.Length];
            var triangles = new List<int>();
            for (int i = 0; i <= sections; i++)
            {
                float z = i / (float)sections * 14 - 7;
                float width = Mathf.Pow(Mathf.Max(0, Mathf.Sin(i / (float)sections * Mathf.PI)), .52f) * 2.45f + .13f;
                float rise = Mathf.Pow(Mathf.Abs(z) / 7, 3) * .85f;
                vertices[i * 4] = new Vector3(-width, 1.3f + rise, z);
                vertices[i * 4 + 1] = new Vector3(-width * .45f, -.5f + rise, z);
                vertices[i * 4 + 2] = new Vector3(width * .45f, -.5f + rise, z);
                vertices[i * 4 + 3] = new Vector3(width, 1.3f + rise, z);
                for (int j = 0; j < 4; j++) uv[i * 4 + j] = new Vector2(j * 1.2f, i * .5f);
                if (i == sections) continue;
                for (int j = 0; j < 3; j++) Quad(triangles, i * 4 + j, i * 4 + j + 1, (i + 1) * 4 + j + 1, (i + 1) * 4 + j, true);
                Quad(triangles, i * 4, (i + 1) * 4, (i + 1) * 4 + 3, i * 4 + 3, true);
            }
            MeshObject(ship, "Carvel planked hull", Mesh("Ship hull", vertices, triangles.ToArray(), uv), "wood");
            for (int i = 0; i < sections; i++)
            {
                Beam(ship, "Port gunwale", vertices[i * 4], vertices[(i + 1) * 4], .11f, "darkWood");
                Beam(ship, "Starboard gunwale", vertices[i * 4 + 3], vertices[(i + 1) * 4 + 3], .11f, "darkWood");
            }
            for (int i = 0; i < 2; i++)
            {
                float z = -2.1f + i * 5.2f;
                Cylinder(ship, "Timber mast", new Vector3(0, 5.4f, z), .19f, .12f, 8.2f, "darkWood", 12);
                Beam(ship, "Sail yard", new Vector3(-2.5f, 8.4f, z), new Vector3(2.5f, 8.4f, z), .1f, "wood");
                Sail(ship, new Vector3(0, 5.1f, z), 4.7f, 3.1f, "cream");
                Rope(ship, new Vector3(-2.2f, 1.7f, z - 1.8f), new Vector3(0, 9.4f, z), .08f);
                Rope(ship, new Vector3(2.2f, 1.7f, z + 1.8f), new Vector3(0, 9.4f, z), .08f);
            }
            Roof(ship, new Vector3(0, 2.4f, 4.8f), 3.3f, 2.8f, .8f, "blueRoof");
        }

        private void Crane(Transform root, Vector3 p)
        {
            Cylinder(root, "Harbor crane base", p + Vector3.up * .3f, .9f, .8f, .6f, "darkMetal");
            Beam(root, "Crane mast", p, p + Vector3.up * 5.5f, .23f, "wood");
            Beam(root, "Crane boom", p + new Vector3(0, 5.5f, 0), p + new Vector3(3, 4.8f, 0), .2f, "wood");
            Beam(root, "Crane diagonal brace", p + new Vector3(0, 2.5f, 0), p + new Vector3(2.7f, 4.8f, 0), .15f, "wood");
            Beam(root, "Crane suspension rope", p + new Vector3(2.9f, 4.8f, 0), p + new Vector3(2.9f, 2, 0), .033f, "darkWood");
            Crate(root, p + new Vector3(2.9f, 1.45f, 0), 1);
            Block(p + new Vector3(2.9f, 0, 0), 1.2f, 1.2f);
        }

        private void MechDock(Transform root, Vector3 p)
        {
            Transform dock = Group("Maintenance titan and gantry", root, p);
            for (int side = -1; side <= 1; side += 2)
            {
                Beam(dock, "Dock gantry pillar", new Vector3(side * 4.4f, 0, 1), new Vector3(side * 4.4f, 9.6f, 1), .32f, "metal", 6);
                for (int j = 0; j < 4; j++) Beam(dock, "Gantry diagonal", new Vector3(side * 4.4f, j * 2.2f, 1), new Vector3(side * 3.5f, j * 2.2f + 2, 1), .1f, "darkMetal");
                Box(dock, "Titan foot", new Vector3(side * 1.25f, .45f, -.55f), new Vector3(1.4f, .7f, 2.5f), "darkMetal");
                Cylinder(dock, "Knee hydraulic joint", new Vector3(side * 1.25f, 2.5f, 0), .55f, .55f, 1.2f, "metal", 16).localRotation = Quaternion.Euler(0, 0, 90);
                Box(dock, "Shin armor", new Vector3(side * 1.25f, 1.45f, -.18f), new Vector3(.96f, 1.9f, 1.05f), "metal");
                Beam(dock, "Thigh piston", new Vector3(side * 1.25f, 2.6f, 0), new Vector3(side * .8f, 4.1f, .15f), .38f, "darkMetal", 8);
                Box(dock, "Shoulder carapace", new Vector3(side * 1.9f, 5.7f, 0), new Vector3(1.7f, 1.5f, 1.8f), "metal").localRotation = Quaternion.Euler(0, 0, side * -16);
                Beam(dock, "Arm actuator", new Vector3(side * 2.15f, 5.3f, 0), new Vector3(side * 2.6f, 3.3f, -.35f), .4f, "darkMetal", 8);
                Box(dock, "Forearm armor", new Vector3(side * 2.6f, 3.5f, -.3f), new Vector3(.9f, 1.6f, 1), "metal");
                Box(dock, "Hydraulic status light", new Vector3(side * 1.25f, 1.7f, -.73f), new Vector3(.2f, .85f, .045f), "cyan");
            }
            Box(dock, "Armored torso", new Vector3(0, 5, 0), new Vector3(2.4f, 2.45f, 1.65f), "darkMetal");
            Box(dock, "Angled chest plate", new Vector3(0, 5.2f, -.98f), new Vector3(2.6f, 1.1f, .32f), "metal").localRotation = Quaternion.Euler(-13, 0, 0);
            Cylinder(dock, "Reactor core", new Vector3(0, 4.65f, -1.14f), .36f, .36f, .09f, "cyan", 24).localRotation = Quaternion.Euler(90, 0, 0);
            Box(dock, "Sensor head", new Vector3(0, 6.75f, -.04f), new Vector3(1.03f, 1.1f, 1.15f), "metal");
            Box(dock, "Sensor visor", new Vector3(0, 6.87f, -.63f), new Vector3(.9f, .15f, .05f), "cyan");
            Beam(dock, "Overhead maintenance rail", new Vector3(-4.4f, 9.6f, 1), new Vector3(4.4f, 9.6f, 1), .31f, "metal", 6);
        }

        private void Watchtower(Transform root, Vector3 p)
        {
            for (int x = -1; x <= 1; x += 2) for (int z = -1; z <= 1; z += 2)
                Beam(root, "Tower support", p + new Vector3(x * 1.7f, 0, z * 1.7f), p + new Vector3(x * 1.5f, 6.5f, z * 1.5f), .18f, "wood");
            Box(root, "Watchtower deck", p + Vector3.up * 4.5f, new Vector3(4, .25f, 4), "wood");
            Roof(root, p + Vector3.up * 6.7f, 5.2f, 5.2f, 1.5f, "roof");
            for (int i = 0; i < 5; i++) Box(root, "Tower balustrade", p + new Vector3(-1.7f + i * .85f, 5, -1.8f), new Vector3(.09f, .9f, .09f), "wood");
            Beam(root, "Tower handrail", p + new Vector3(-1.9f, 5.5f, -1.8f), p + new Vector3(1.9f, 5.5f, -1.8f), .08f, "wood");
        }

        private void Tent(Transform root, Vector3 p, float width, float depth)
        {
            var vertices = new[] { new Vector3(-width / 2, 0, -depth / 2), new Vector3(0, 3.6f, -depth / 2), new Vector3(width / 2, 0, -depth / 2), new Vector3(-width / 2, 0, depth / 2), new Vector3(0, 3.6f, depth / 2), new Vector3(width / 2, 0, depth / 2) };
            var triangles = new List<int>();
            Quad(triangles, 0, 3, 4, 1, true); Quad(triangles, 1, 4, 5, 2, true);
            triangles.AddRange(new[] { 3, 5, 4 });
            Transform tent = Group("Campaign command tent", root, p);
            MeshObject(tent, "Canvas roof", Mesh("Campaign canvas", vertices, triangles.ToArray(), null), "cream");
            Beam(tent, "Tent ridge", new Vector3(0, 3.7f, -depth * .6f), new Vector3(0, 3.7f, depth * .6f), .085f, "wood");
            for (int side = -1; side <= 1; side += 2)
            {
                Beam(tent, "Tent center pole", new Vector3(0, 0, side * depth * .48f), new Vector3(0, 3.7f, side * depth * .48f), .095f, "wood");
                Sail(tent, new Vector3(side * width * .24f, .05f, -depth * .5f - .01f), width * .4f, 2.2f, "redCloth");
            }
        }

        private void SiegeEngine(Transform root, Vector3 p)
        {
            Transform engine = Group("Counterweight siege engine", root, p);
            Box(engine, "Siege chassis", Vector3.up * .6f, new Vector3(2.6f, .35f, 3.8f), "wood");
            for (int side = -1; side <= 1; side += 2)
            {
                Beam(engine, "Siege support A", new Vector3(side, .5f, -1.4f), new Vector3(side, 3.5f, 0), .14f, "darkWood");
                Beam(engine, "Siege support B", new Vector3(side, .5f, 1.4f), new Vector3(side, 3.5f, 0), .14f, "darkWood");
                for (int i = -1; i <= 1; i += 2) Cylinder(engine, "Siege wheel", new Vector3(side * 1.45f, .58f, i * 1.25f), .55f, .55f, .17f, "darkWood", 16).localRotation = Quaternion.Euler(0, 0, 90);
            }
            Beam(engine, "Siege axle", new Vector3(-1.2f, 3.5f, 0), new Vector3(1.2f, 3.5f, 0), .18f, "darkMetal");
            Beam(engine, "Throwing arm", new Vector3(0, 2.5f, 1.3f), new Vector3(0, 5.4f, -3), .17f, "wood");
            Box(engine, "Stone counterweight", new Vector3(0, 1.75f, 1.3f), new Vector3(1.2f, 1.5f, 1.1f), "stone");
        }

        private void DragonColumn(Transform root, Vector3 p, int side)
        {
            Cylinder(root, "Dragon pedestal", p + Vector3.up * .32f, 1.7f, 1.5f, .6f, "stone", 12);
            Cylinder(root, "Carved jade pillar", p + Vector3.up * 3.3f, .63f, .55f, 6.4f, "moss", 16);
            Vector3 previous = Vector3.zero;
            for (int i = 0; i <= 36; i++)
            {
                float a = i / 36f * Mathf.PI * 3.8f;
                Vector3 point = p + new Vector3(Mathf.Cos(a) * .9f, .75f + i * .155f, Mathf.Sin(a) * .9f);
                if (i > 0) Beam(root, "Spiraling carved dragon", previous, point, .17f + i * .002f, "gold", 8);
                if (i % 2 == 0) Beam(root, "Dorsal stone crest", point, point + new Vector3(Mathf.Cos(a) * .2f, .24f, Mathf.Sin(a) * .2f), .075f, "chalk", 6);
                previous = point;
            }
            Vector3 head = p + new Vector3(side * .4f, 6.5f, -.7f);
            Rock(root, head, new Vector3(.7f, .45f, .8f), 704 + side, "gold");
            Beam(root, "Dragon snout", head, head + new Vector3(0, -.12f, -.85f), .22f, "gold", 8);
            for (int s = -1; s <= 1; s += 2)
            {
                Beam(root, "Antler carving", head + new Vector3(s * .35f, .22f, .1f), head + new Vector3(s * .65f, 1.1f, .48f), .1f, "chalk", 8);
                Beam(root, "Carved whisker", head + new Vector3(s * .24f, -.12f, -.55f), head + new Vector3(s * 1.1f, .05f, -.7f), .038f, "gold");
            }
        }

        private void Tree(Transform root, Vector3 p, float scale, bool flowering)
        {
            if (buildingRealm < 3 && InClearing(p, 1.2f)) return;
            foreach (Rect obstacle in obstacles[buildingMap])
                if (obstacle.Contains(new Vector2(p.x, p.z))) return;
            Transform tree = Group(flowering ? "Layered cherry blossom tree" : "Layered autumn maple", root, p);
            tree.localScale = Vector3.one * scale;
            Cylinder(tree, "Tapered bark trunk", new Vector3(0, 1.45f, 0), .22f, .11f, 2.9f, "bark", 10);
            Beam(tree, "Upper crooked leader", new Vector3(0, 2.7f, 0), new Vector3(.38f, 4.65f, .16f), .095f, "bark", 8);
            var random = new System.Random((int)(p.x * 71 + p.z * 139) + 1907);
            for (int i = 0; i < 7; i++)
            {
                float angle = i * 2.399f;
                float reach = 1.65f - i * .13f;
                Vector3 branch = new Vector3(Mathf.Cos(angle) * reach, 2.65f + i * .31f, Mathf.Sin(angle) * reach);
                Vector3 elbow = new Vector3(branch.x * .46f, 2.2f + i * .22f, branch.z * .46f);
                Beam(tree, "Natural branch fork", new Vector3(.06f, 1.6f + i * .24f, 0), elbow, .065f, "bark", 8);
                Beam(tree, "Tapered outer branch", elbow, branch, .038f, "bark", 6);
                for (int j = 0; j < 5; j++)
                {
                    float a = angle + j * 2.1f;
                    Vector3 tip = branch + new Vector3(Mathf.Cos(a) * .68f, .25f + j % 3 * .28f, Mathf.Sin(a) * .68f);
                    float yaw = (float)random.NextDouble() * 360;
                    float tilt = -38 + (float)random.NextDouble() * 70;
                    LeafCard(tree, tip, new Vector2(2.15f + j % 2 * .25f, 1.8f), Quaternion.Euler(tilt, yaw, j * 23), flowering ? "blossom" : "maple");
                    if (j < 2) LeafCard(tree, tip + Vector3.up * .2f, new Vector2(2.1f, 1.7f), Quaternion.Euler(78, yaw + 45, 0), flowering ? "blossom" : "maple");
                }
            }
            Block(p, .8f * scale, .8f * scale);
        }

        private void Fern(Transform root, Vector3 p, float scale)
        {
            for (int i = 0; i < 7; i++)
            {
                float a = i * Mathf.PI * 2 / 7;
                Vector3 tip = p + new Vector3(Mathf.Cos(a) * .8f, .48f, Mathf.Sin(a) * .8f) * scale;
                Beam(root, "Fern stem", p, tip, .015f, "leaf");
                for (int j = 1; j < 5; j++)
                {
                    Vector3 q = Vector3.Lerp(p, tip, j / 5f);
                    float span = Mathf.Sin(j / 5f * Mathf.PI) * .24f * scale;
                    Vector3 off = new Vector3(-Mathf.Sin(a), .15f, Mathf.Cos(a)) * span;
                    var v = new[] { q, q + off + (tip - p) * .17f, q + (tip - p) * .16f, q - off + (tip - p) * .17f };
                    MeshObject(root, "Fern frond", Mesh("Frond", v, new[] { 0, 1, 2, 2, 1, 0, 0, 2, 3, 3, 2, 0 }, null), "leafLight");
                }
            }
        }

        private void MarketStall(Transform root, Vector3 p, string cloth)
        {
            Box(root, "Vendor counter", p + Vector3.up * .85f, new Vector3(2.5f, .35f, 1.2f), "wood");
            for (int side = -1; side <= 1; side += 2) Beam(root, "Canopy post", p + new Vector3(side * 1.25f, 0, .4f), p + new Vector3(side * 1.25f, 2.7f, .4f), .065f, "wood");
            Transform canopy = Group("Market canopy", root, p + new Vector3(0, 2.4f, -.1f));
            canopy.localRotation = Quaternion.Euler(72, 0, 0);
            Sail(canopy, Vector3.zero, 2.95f, 1.7f, cloth);
            for (int i = 0; i < 4; i++) Cylinder(root, "Merchant vessel", p + new Vector3(-.85f + i * .56f, 1.18f, -.04f), .18f, .13f, .5f, i % 2 == 0 ? "blueRoof" : "cream", 12);
            Block(p, 2.7f, 1.5f);
        }

        private void Well(Transform root, Vector3 p)
        {
            Ring(root, p + Vector3.up * .76f, .57f, .94f, "stone", 24);
            for (int i = 0; i < 14; i++)
            {
                float a = i * Mathf.PI * 2 / 14;
                Transform part = Box(root, "Well masonry", p + new Vector3(Mathf.Cos(a) * .78f, .38f, Mathf.Sin(a) * .78f), new Vector3(.37f, .76f, .34f), "stone");
                part.localRotation = Quaternion.Euler(0, -a * Mathf.Rad2Deg, 0);
            }
            for (int side = -1; side <= 1; side += 2) Beam(root, "Well frame post", p + new Vector3(side * 1.1f, 0, 0), p + new Vector3(side * 1.1f, 2.5f, 0), .085f, "wood");
            Beam(root, "Well crossbeam", p + new Vector3(-1.1f, 2.4f, 0), p + new Vector3(1.1f, 2.4f, 0), .1f, "wood");
            Beam(root, "Well bucket rope", p + new Vector3(0, 2.4f, 0), p + new Vector3(0, .45f, 0), .018f, "darkWood");
            Block(p, 2.5f, 2);
        }

        private void Lantern(Transform root, Vector3 p)
        {
            Cylinder(root, "Lantern foot", p + Vector3.up * .2f, .45f, .32f, .4f, "stone", 8);
            Cylinder(root, "Lantern shaft", p + Vector3.up * 1.4f, .09f, .065f, 2.4f, "darkWood");
            Cylinder(root, "Paper lantern", p + Vector3.up * 2.65f, .35f, .29f, .72f, "paper", 12);
            Cylinder(root, "Lantern crown", p + Vector3.up * 3.04f, .43f, .04f, .23f, "darkMetal", 8);
            for (int i = 0; i < 8; i++)
            {
                float a = i * Mathf.PI / 4;
                Beam(root, "Lantern frame rib", p + new Vector3(Mathf.Cos(a) * .34f, 2.3f, Mathf.Sin(a) * .34f), p + new Vector3(Mathf.Cos(a) * .29f, 3, Mathf.Sin(a) * .29f), .016f, "wood");
            }
            Block(p, .7f, .7f);
        }

        private void LowWall(Transform root, Vector3 p, float angle, float length, string material)
        {
            Transform wall = Group("Carved terrace balustrade", root, p);
            wall.localRotation = Quaternion.Euler(0, angle, 0);
            Box(wall, "Wall plinth", new Vector3(0, .23f, 0), new Vector3(.53f, .45f, length), material);
            for (int i = 0; i <= Mathf.FloorToInt(length / 1.65f); i++)
            {
                float z = -length * .5f + i * 1.65f;
                Cylinder(wall, "Stone baluster", new Vector3(0, .78f, z), .16f, .12f, .8f, material, 8);
                Cylinder(wall, "Baluster capital", new Vector3(0, 1.25f, z), .23f, .14f, .16f, material, 8);
            }
            Box(wall, "Stone handrail", new Vector3(0, 1.16f, 0), new Vector3(.31f, .17f, length), material);
        }

        private void Barrel(Transform root, Vector3 p, float scale)
        {
            Cylinder(root, "Coopered barrel", p + Vector3.up * .55f * scale, .45f * scale, .45f * scale, 1.1f * scale, "wood", 16);
            for (int i = 0; i < 3; i++) Cylinder(root, "Iron barrel hoop", p + Vector3.up * (.15f + i * .4f) * scale, .47f * scale, .47f * scale, .075f * scale, "darkMetal", 16);
            Block(p, scale, scale);
        }

        private void Crate(Transform root, Vector3 p, float size, string material = "wood")
        {
            Box(root, "Cargo crate", p, Vector3.one * size, material);
            for (int side = -1; side <= 1; side += 2)
            {
                Box(root, "Cargo edge strap", p + new Vector3(side * size * .35f, 0, -size * .515f), new Vector3(size * .09f, size, .035f), "darkMetal");
                Box(root, "Cargo top strap", p + new Vector3(side * size * .35f, size * .515f, 0), new Vector3(size * .09f, .035f, size), "darkMetal");
            }
        }

        private void Console(Transform root, Vector3 p, float rotation)
        {
            Transform console = Group("Dock service terminal", root, p);
            console.localRotation = Quaternion.Euler(0, rotation, 0);
            Box(console, "Terminal pedestal", Vector3.up * .65f, new Vector3(1.15f, 1.3f, .75f), "darkMetal");
            var screen = Box(console, "Terminal display", new Vector3(0, 1.6f, -.12f), new Vector3(1.25f, .75f, .1f), "cyan");
            screen.localRotation = Quaternion.Euler(18, 0, 0);
            for (int i = 0; i < 4; i++) Box(console, "Interface status line", new Vector3(-.06f, 1.39f + i * .12f, -.24f), new Vector3(.79f - i * .08f, .025f, .02f), "darkMetal");
            Block(p, 1.7f, 1.4f);
        }

        private void Flag(Transform root, Vector3 p, float height, string material)
        {
            Beam(root, "Banner pole", p, p + Vector3.up * height, .06f, "darkWood");
            Cylinder(root, "Banner finial", p + Vector3.up * (height + .1f), .12f, 0, .4f, "gold", 8);
            Beam(root, "Banner yard", p + new Vector3(-.85f, height - .35f, 0), p + new Vector3(.85f, height - .35f, 0), .045f, "wood");
            Sail(root, p + Vector3.up * (height - 2.7f), 1.55f, 2.4f, material);
            Block(p, .4f, .4f);
        }

        private void Sail(Transform root, Vector3 p, float width, float height, string material)
        {
            const int nx = 8, ny = 8;
            var vertices = new Vector3[(nx + 1) * (ny + 1)];
            var uv = new Vector2[vertices.Length];
            var triangles = new List<int>();
            for (int y = 0; y <= ny; y++) for (int x = 0; x <= nx; x++)
            {
                int i = y * (nx + 1) + x;
                float u = x / (float)nx, v = y / (float)ny;
                vertices[i] = p + new Vector3((u - .5f) * width * (.9f + v * .1f), v * height, Mathf.Sin(u * Mathf.PI) * Mathf.Sin(v * Mathf.PI) * width * .12f + Mathf.Sin(v * 9 + u * 3) * .04f);
                uv[i] = new Vector2(u, v);
                if (x < nx && y < ny) Quad(triangles, i, i + 1, i + nx + 2, i + nx + 1, true);
            }
            MeshObject(root, "Wind curved fabric", Mesh("Canvas", vertices, triangles.ToArray(), uv), material);
        }

        private void WeaponRack(Transform root, Vector3 p)
        {
            for (int side = -1; side <= 1; side += 2) Beam(root, "Weapon rack upright", p + new Vector3(side * 1.3f, 0, 0), p + new Vector3(side * 1.3f, 2.15f, 0), .095f, "wood");
            Beam(root, "Weapon rack beam", p + new Vector3(-1.5f, 1.65f, 0), p + new Vector3(1.5f, 1.65f, 0), .09f, "wood");
            for (int i = 0; i < 5; i++)
            {
                Vector3 basePoint = p + new Vector3(-1 + i * .5f, .1f, -.22f);
                Beam(root, "Spear shaft", basePoint, basePoint + new Vector3(.1f, 2.8f, .22f), .033f, "darkWood");
                Cylinder(root, "Spearhead", basePoint + new Vector3(.1f, 2.94f, .22f), .13f, 0, .45f, "metal", 4);
            }
        }

        private void TrainingDummy(Transform root, Vector3 p)
        {
            Cylinder(root, "Training dummy upright", p + Vector3.up * 1.3f, .25f, .2f, 2.3f, "wood");
            for (int i = 0; i < 3; i++) Beam(root, "Practice striking arm", p + new Vector3(0, .9f + i * .4f, 0), p + new Vector3(i % 2 == 0 ? -.72f : .72f, 1.02f + i * .4f, -.38f), .08f, "darkWood");
            Block(p, 1.5f, 1.3f);
        }

        private void Waterfall(Transform root, Vector3 p, float width, float height)
        {
            const int columns = 9, rows = 5;
            var vertices = new Vector3[(columns + 1) * (rows + 1)];
            var uv = new Vector2[vertices.Length];
            var indices = new int[columns * rows * 6];
            for (int row = 0; row <= rows; row++)
                for (int column = 0; column <= columns; column++)
                {
                    float u = column / (float)columns;
                    float v = row / (float)rows;
                    float edge = Mathf.Sin(u * Mathf.PI);
                    float ripple = Mathf.Sin(u * 17 + row * .7f) * .12f * edge;
                    int vertex = row * (columns + 1) + column;
                    vertices[vertex] = p + new Vector3((u - .5f) * width * (.8f + Mathf.Sin(v * 8) * .06f + (1 - v) * .2f) + ripple, v * height, .08f + Mathf.Sin(v * 4 + u * 3) * .08f);
                    uv[vertex] = new Vector2(u * 2, v * 3);
                }
            int cursor = 0;
            for (int row = 0; row < rows; row++) for (int column = 0; column < columns; column++)
            {
                int current = row * (columns + 1) + column, next = current + columns + 1;
                indices[cursor++] = current; indices[cursor++] = next; indices[cursor++] = current + 1;
                indices[cursor++] = current + 1; indices[cursor++] = next; indices[cursor++] = next + 1;
            }
            MeshObject(root, "Falling water sheet", Mesh("Irregular waterfall", vertices, indices, uv), "waterfall");
            for (int i = 0; i < 4; i++)
                Wave(root, p + new Vector3(0, .06f, .2f + i * .36f), width * (1.1f - i * .12f), .35f);
            Ring(root, p + Vector3.up * .11f, 1.4f, 1.49f, "foam", 32);
            Ring(root, p + Vector3.up * .115f, 2.3f, 2.35f, "foam", 40);
        }

        private void Update()
        {
            if (materials.TryGetValue("waterfall", out Material waterfall))
                waterfall.mainTextureOffset = new Vector2(0, Time.time * .18f);
        }

        private void Wave(Transform root, Vector3 p, float width, float depth)
        {
            Vector3 last = p + Vector3.left * width * .5f;
            for (int i = 1; i <= 12; i++)
            {
                Vector3 next = p + new Vector3((i / 12f - .5f) * width, 0, Mathf.Sin(i / 12f * Mathf.PI) * depth);
                Beam(root, "Sea ripple crest", last, next, .012f, "foam", 4);
                last = next;
            }
        }

        private void Rope(Transform root, Vector3 a, Vector3 b, float sag)
        {
            Vector3 previous = a;
            for (int i = 1; i <= 8; i++)
            {
                float u = i / 8f;
                Vector3 next = Vector3.Lerp(a, b, u) + Vector3.down * (Mathf.Sin(u * Mathf.PI) * sag);
                Beam(root, "Twisted hemp rope", previous, next, .027f, "cream", 6);
                previous = next;
            }
        }

        private void Ground(Transform root, string material, float width, float depth, float centerZ)
        {
            var v = new[] { new Vector3(-width / 2, .1f, centerZ - depth / 2), new Vector3(-width / 2, .1f, centerZ + depth / 2), new Vector3(width / 2, .1f, centerZ + depth / 2), new Vector3(width / 2, .1f, centerZ - depth / 2) };
            var uv = new[] { Vector2.zero, new Vector2(0, depth * .4f), new Vector2(width * .4f, depth * .4f), new Vector2(width * .4f, 0) };
            MeshObject(root, "Traversable realm floor", Mesh("Ground", v, new[] { 0, 1, 2, 0, 2, 3 }, uv), material);
            Box(root, "Realm foundation", new Vector3(0, -.23f, centerZ), new Vector3(width, .65f, depth), material);
        }

        private void Path(Transform root, float minX, float maxX, float minZ, float maxZ, string material)
        {
            for (float z = minZ; z < maxZ; z += 1.5f) for (float x = minX; x < maxX; x += 1.45f)
                Box(root, "Dressed paving slab", new Vector3(x + .7f, .114f, z + .72f), new Vector3(1.39f, .026f, 1.44f), material);
        }

        private void Terrain(Transform root, string material, int seed, float safeHalfWidth = 15, float safeHalfDepth = 15, float safeCenterZ = 5)
        {
            const int n = 32;
            var vertices = new Vector3[(n + 1) * (n + 1)];
            var uv = new Vector2[vertices.Length];
            var triangles = new List<int>();
            for (int z = 0; z <= n; z++) for (int x = 0; x <= n; x++)
            {
                int i = z * (n + 1) + x;
                float px = (x / (float)n - .5f) * 140;
                float pz = (z / (float)n - .5f) * 190 + safeCenterZ;
                float distance = Mathf.Max(Mathf.Abs(px) - safeHalfWidth, Mathf.Abs(pz - safeCenterZ) - safeHalfDepth);
                float h = Mathf.PerlinNoise(px * .052f + seed, pz * .054f + seed) * Mathf.Max(0, distance) * .28f - .8f;
                vertices[i] = new Vector3(px, h, pz); uv[i] = new Vector2(px, pz) * .2f;
                if (x < n && z < n) Quad(triangles, i, i + n + 1, i + n + 2, i + 1, false);
            }
            MeshObject(root, "Distant terrain relief", Mesh("Terrain relief", vertices, triangles.ToArray(), uv), material);
        }

        private void BackgroundPeaks(Transform root, int seed, string material, float height)
        {
            var random = new System.Random(seed);
            for (int i = 0; i < 13; i++)
            {
                float x = -49 + i * 8.3f;
                float z = 37 + (i % 3) * 10;
                Rock(root, new Vector3(x, -2, z), new Vector3(6.5f + (float)random.NextDouble() * 4, height * (.7f + (float)random.NextDouble() * .7f), 6.5f), seed + i, material);
            }
        }

        private void Rock(Transform root, Vector3 p, Vector3 scale, int seed, string material)
        {
            const int sides = 12, rings = 7;
            var vertices = new Vector3[(rings + 1) * sides];
            var uv = new Vector2[vertices.Length];
            var triangles = new List<int>();
            var random = new System.Random(seed);
            float[] radii = new float[sides];
            for (int i = 0; i < sides; i++) radii[i] = .82f + (float)random.NextDouble() * .3f;
            for (int y = 0; y <= rings; y++) for (int i = 0; i < sides; i++)
            {
                float h = y / (float)rings, a = i * Mathf.PI * 2 / sides;
                float radius = Mathf.Pow(Mathf.Sin((h * .88f + .1f) * Mathf.PI), .53f) * (y % 2 == 0 ? 1 : .94f);
                int n = y * sides + i;
                vertices[n] = new Vector3(Mathf.Cos(a) * radii[i] * radius, h, Mathf.Sin(a) * radii[i] * radius);
                uv[n] = new Vector2(i / (float)sides * 3, h * 3);
                if (y < rings) Quad(triangles, n, n + sides, (y + 1) * sides + (i + 1) % sides, y * sides + (i + 1) % sides, false);
            }
            Transform rock = MeshObject(root, "Weathered rock formation", Mesh("Rock relief", vertices, triangles.ToArray(), uv), material).transform;
            rock.localPosition = p;
            rock.localScale = scale;
        }

        private Transform Cylinder(Transform root, string name, Vector3 p, float radius, float topRadius, float height, string material, int sides = 12)
        {
            var vertices = new Vector3[(sides + 1) * 2 + 2];
            var uv = new Vector2[vertices.Length];
            var triangles = new List<int>();
            for (int i = 0; i <= sides; i++)
            {
                float a = i * Mathf.PI * 2 / sides;
                vertices[i * 2] = new Vector3(Mathf.Cos(a) * radius, -height * .5f, Mathf.Sin(a) * radius);
                vertices[i * 2 + 1] = new Vector3(Mathf.Cos(a) * topRadius, height * .5f, Mathf.Sin(a) * topRadius);
                uv[i * 2] = new Vector2(i / (float)sides * Mathf.Max(1, radius * 2), 0);
                uv[i * 2 + 1] = new Vector2(i / (float)sides * Mathf.Max(1, radius * 2), height * .4f);
                if (i == sides) continue;
                Quad(triangles, i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2, false);
                triangles.AddRange(new[] { (sides + 1) * 2, i * 2, i * 2 + 2, (sides + 1) * 2 + 1, i * 2 + 3, i * 2 + 1 });
            }
            vertices[vertices.Length - 2] = Vector3.down * height * .5f;
            vertices[vertices.Length - 1] = Vector3.up * height * .5f;
            if (height <= .12f)
                for (int i = 0; i < vertices.Length; i++) uv[i] = new Vector2(vertices[i].x + p.x, vertices[i].z + p.z) * .28f;
            Transform part = MeshObject(root, name, Mesh(name, vertices, triangles.ToArray(), uv), material).transform;
            part.localPosition = p;
            return part;
        }

        private Transform Beam(Transform root, string name, Vector3 a, Vector3 b, float radius, string material, int sides = 6)
        {
            Transform beam = Cylinder(root, name, (a + b) * .5f, radius, radius, Vector3.Distance(a, b), material, sides);
            beam.localRotation = Quaternion.FromToRotation(Vector3.up, b - a);
            return beam;
        }

        private void Ring(Transform root, Vector3 p, float inner, float outer, string material, int sides = 48)
        {
            var vertices = new Vector3[sides * 2];
            var triangles = new List<int>();
            for (int i = 0; i < sides; i++)
            {
                float a = i * Mathf.PI * 2 / sides;
                vertices[i * 2] = p + new Vector3(Mathf.Cos(a) * inner, 0, Mathf.Sin(a) * inner);
                vertices[i * 2 + 1] = p + new Vector3(Mathf.Cos(a) * outer, 0, Mathf.Sin(a) * outer);
                int next = ((i + 1) % sides) * 2;
                Quad(triangles, i * 2, next, next + 1, i * 2 + 1, false);
            }
            MeshObject(root, "Inlaid circular detail", Mesh("Ring", vertices, triangles.ToArray(), null), material);
        }

        private static void Quad(List<int> indices, int a, int b, int c, int d, bool doubleSided)
        {
            indices.Add(a); indices.Add(b); indices.Add(c); indices.Add(a); indices.Add(c); indices.Add(d);
            if (!doubleSided) return;
            indices.Add(c); indices.Add(b); indices.Add(a); indices.Add(d); indices.Add(c); indices.Add(a);
        }

        private static Transform Group(string name, Transform parent, Vector3 position = default(Vector3))
        {
            var result = new GameObject(name).transform;
            result.SetParent(parent, false);
            result.localPosition = position;
            return result;
        }

        private Transform Box(Transform root, string name, Vector3 p, Vector3 size, string material)
        {
            float x = size.x * .5f, y = size.y * .5f, z = size.z * .5f;
            var vertices = new[]
            {
                new Vector3(-x,-y,-z), new Vector3(-x,y,-z), new Vector3(x,y,-z), new Vector3(x,-y,-z),
                new Vector3(x,-y,z), new Vector3(x,y,z), new Vector3(-x,y,z), new Vector3(-x,-y,z),
                new Vector3(-x,-y,z), new Vector3(-x,y,z), new Vector3(-x,y,-z), new Vector3(-x,-y,-z),
                new Vector3(x,-y,-z), new Vector3(x,y,-z), new Vector3(x,y,z), new Vector3(x,-y,z),
                new Vector3(-x,y,-z), new Vector3(-x,y,z), new Vector3(x,y,z), new Vector3(x,y,-z),
                new Vector3(-x,-y,z), new Vector3(-x,-y,-z), new Vector3(x,-y,-z), new Vector3(x,-y,z)
            };
            var uv = new Vector2[24];
            var triangles = new List<int>(36);
            for (int face = 0; face < 6; face++)
            {
                float w = face < 2 || face > 3 ? size.x : size.z;
                float h = face < 4 ? size.y : size.z;
                int a = face * 4;
                uv[a] = Vector2.zero; uv[a + 1] = new Vector2(0, h * .4f);
                uv[a + 2] = new Vector2(w * .4f, h * .4f); uv[a + 3] = new Vector2(w * .4f, 0);
                Quad(triangles, a, a + 1, a + 2, a + 3, false);
            }
            var go = MeshObject(root, name, Mesh(name, vertices, triangles.ToArray(), uv), material);
            go.transform.localPosition = p;
            return go.transform;
        }

        private GameObject MeshObject(Transform parent, string name, Mesh mesh, string material)
        {
            var go = new GameObject(name, typeof(MeshFilter), typeof(MeshRenderer));
            go.transform.SetParent(parent, false);
            go.GetComponent<MeshFilter>().sharedMesh = mesh;
            go.GetComponent<MeshRenderer>().sharedMaterial = materials[material];
            return go;
        }

        private Mesh Mesh(string name, Vector3[] vertices, int[] indices, Vector2[] uv)
        {
            var mesh = new Mesh { name = name };
            if (vertices.Length > 65535) mesh.indexFormat = IndexFormat.UInt32;
            mesh.vertices = vertices;
            mesh.triangles = indices;
            if (uv == null)
            {
                uv = new Vector2[vertices.Length];
                for (int i = 0; i < vertices.Length; i++) uv[i] = new Vector2(vertices[i].x, vertices[i].z) * .3f;
            }
            mesh.uv = uv;
            mesh.RecalculateNormals();
            mesh.RecalculateTangents();
            mesh.RecalculateBounds();
            owned.Add(mesh);
            return mesh;
        }

        private void Mat(string name, Color tint, string textureName, float smoothness, float metal = 0, Color emission = default(Color))
        {
            var material = new Material(Shader.Find("Standard")) { name = "Realm " + name, color = tint, enableInstancing = true };
            material.SetFloat("_Glossiness", smoothness);
            material.SetFloat("_Metallic", metal);
            if (!string.IsNullOrEmpty(textureName))
            {
                Texture2D texture = Resources.Load<Texture2D>("Art/Textures/" + textureName);
                if (texture != null) material.mainTexture = texture;
                Texture2D normal = Resources.Load<Texture2D>("Art/Textures/" + textureName + "_normal");
                if (normal != null)
                {
                    material.SetTexture("_BumpMap", normal);
                    material.SetFloat("_BumpScale", .55f);
                    material.EnableKeyword("_NORMALMAP");
                }
            }
            if (emission.maxColorComponent > 0)
            {
                material.SetColor("_EmissionColor", emission);
                material.EnableKeyword("_EMISSION");
            }
            materials.Add(name, material);
            owned.Add(material);
        }

        private void Cutout(string name, Texture2D texture)
        {
            var material = new Material(Shader.Find("Standard")) { name = "Botanical " + name, color = Color.white, mainTexture = texture, enableInstancing = true };
            material.SetFloat("_Mode", 1);
            material.SetFloat("_Cutoff", .36f);
            material.SetFloat("_Glossiness", .08f);
            material.SetInt("_SrcBlend", (int)BlendMode.One);
            material.SetInt("_DstBlend", (int)BlendMode.Zero);
            material.SetInt("_ZWrite", 1);
            material.EnableKeyword("_ALPHATEST_ON");
            material.SetOverrideTag("RenderType", "TransparentCutout");
            material.renderQueue = (int)RenderQueue.AlphaTest;
            materials.Add(name, material);
            owned.Add(material);
            owned.Add(texture);
        }

        private void Block(Vector3 p, float width, float depth)
        {
            const float radius = .35f;
            obstacles[buildingMap].Add(new Rect(p.x - width * .5f - radius, p.z - depth * .5f - radius, width + radius * 2, depth + radius * 2));
        }

        private void Combine(Transform root)
        {
            // Spatial batches preserve frustum culling throughout the extended mobile maps.
            var batches = new Dictionary<Tuple<Material, int, int>, List<CombineInstance>>();
            MeshFilter[] filters = root.GetComponentsInChildren<MeshFilter>();
            var sourceChildren = new List<Transform>();
            foreach (Transform child in root) sourceChildren.Add(child);
            foreach (MeshFilter filter in filters)
            {
                var renderer = filter.GetComponent<MeshRenderer>();
                if (renderer == null || filter.sharedMesh == null) continue;
                Vector3 center = root.InverseTransformPoint(renderer.bounds.center);
                var key = Tuple.Create(renderer.sharedMaterial, Mathf.FloorToInt(center.x / 24), Mathf.FloorToInt(center.z / 24));
                if (!batches.TryGetValue(key, out List<CombineInstance> instances))
                {
                    instances = new List<CombineInstance>();
                    batches.Add(key, instances);
                }
                instances.Add(new CombineInstance { mesh = filter.sharedMesh, transform = root.worldToLocalMatrix * filter.transform.localToWorldMatrix });
                renderer.enabled = false;
            }
            foreach (var batch in batches)
            {
                var mesh = new Mesh { name = "Sector " + batch.Key.Item2 + ":" + batch.Key.Item3 + " " + batch.Key.Item1.name, indexFormat = IndexFormat.UInt32 };
                mesh.CombineMeshes(batch.Value.ToArray(), true, true);
                owned.Add(mesh);
                var go = new GameObject(mesh.name, typeof(MeshFilter), typeof(MeshRenderer));
                go.transform.SetParent(root, false);
                go.GetComponent<MeshFilter>().sharedMesh = mesh;
                go.GetComponent<MeshRenderer>().sharedMaterial = batch.Key.Item1;
            }
            foreach (Transform child in sourceChildren)
            {
                child.gameObject.SetActive(false);
                Destroy(child.gameObject);
            }
            var sourceMeshes = new HashSet<Mesh>();
            foreach (MeshFilter source in filters) if (source.sharedMesh != null) sourceMeshes.Add(source.sharedMesh);
            owned.RemoveAll(resource => resource is Mesh && sourceMeshes.Contains((Mesh)resource));
            foreach (Mesh source in sourceMeshes) Destroy(source);
        }

        private void OnDestroy()
        {
            foreach (UnityEngine.Object resource in owned) if (resource != null) Destroy(resource);
            owned.Clear();
        }
    }
}


