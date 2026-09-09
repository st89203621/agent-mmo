using System;
using UnityEngine;

namespace Lunhui
{
    internal static class RealmBotanicalArt
    {
        public static Texture2D Foliage(bool maple)
        {
            var canvas = new Raster(512, maple ? 601 : 419);
            Vector2 stem = new Vector2(248, 38);
            for (int branch = 0; branch < 12; branch++)
            {
                float angle = Mathf.Lerp(-1.28f, 1.28f, branch / 11f);
                Vector2 tip = new Vector2(256 + Mathf.Sin(angle) * (151 + branch % 3 * 12), 200 + Mathf.Cos(angle) * 228);
                Vector2 bend = Vector2.Lerp(stem, tip, .48f) + new Vector2(branch % 2 == 0 ? -13 : 13, 16);
                canvas.Line(stem, bend, 2.5f, new Color(.3f, .22f, .17f, .94f));
                canvas.Line(bend, tip, 1.5f, new Color(.36f, .27f, .21f, .92f));
                for (int i = 0; i < 19; i++)
                {
                    float t = .3f + canvas.Next() * .7f;
                    Vector2 center = Vector2.Lerp(bend, tip, t) + new Vector2((canvas.Next() - .5f) * 90, (canvas.Next() - .5f) * 67);
                    if (maple)
                    {
                        Color color = Color.Lerp(new Color(.66f, .12f, .075f), new Color(1, .56f, .16f), canvas.Next());
                        canvas.Maple(center, 12 + canvas.Next() * 13, canvas.Next() * 6.28f, color);
                    }
                    else
                    {
                        if (i % 4 == 0) canvas.Ellipse(center + new Vector2(9, -7), 9, 4, canvas.Next() * 6.28f, new Color(.53f, .66f, .3f));
                        int blossoms = i % 3 == 0 ? 3 : 2;
                        for (int flower = 0; flower < blossoms; flower++)
                        {
                            Vector2 q = center + new Vector2((canvas.Next() - .5f) * 17, (canvas.Next() - .5f) * 17);
                            Color tint = Color.Lerp(new Color(.94f, .46f, .64f), new Color(1, .91f, .93f), canvas.Next());
                            canvas.Flower(q, 5.6f + canvas.Next() * 4.5f, tint);
                        }
                    }
                }
            }
            return canvas.Texture(maple ? "Original maple branch cutout" : "Original cherry blossom branch cutout");
        }

        public static Texture2D Meadow(bool flowers)
        {
            var canvas = new Raster(256, flowers ? 177 : 146);
            for (int i = 0; i < 38; i++)
            {
                Vector2 root = new Vector2(24 + canvas.Next() * 208, 7 + canvas.Next() * 16);
                Vector2 tip = root + new Vector2((canvas.Next() - .5f) * 81, 46 + canvas.Next() * 155);
                Vector2 bend = Vector2.Lerp(root, tip, .55f) + new Vector2((canvas.Next() - .5f) * 22, 11);
                Color green = Color.Lerp(new Color(.2f, .38f, .14f), new Color(.66f, .77f, .29f), canvas.Next());
                canvas.Line(root, bend, 2.1f, green);
                canvas.Line(bend, tip, 1.1f, green);
                canvas.Ellipse(Vector2.Lerp(root, tip, .45f) + new Vector2(8, 1), 11, 3, .45f, green);
                if (flowers && i % 3 == 0)
                {
                    Color tint = i % 4 == 0 ? new Color(.94f, .96f, 1) : i % 4 == 1 ? new Color(.93f, .55f, .76f) : new Color(.72f, .72f, .98f);
                    canvas.Flower(tip, 7.4f + canvas.Next() * 2.8f, tint);
                }
            }
            return canvas.Texture(flowers ? "Original meadow flowers cutout" : "Original meadow grass cutout");
        }

        public static Texture2D FallingLeaf(bool maple)
        {
            var canvas = new Raster(64, 128);
            if (maple) canvas.Maple(new Vector2(32, 31), 25, .13f, new Color(.98f, .44f, .14f));
            else canvas.Ellipse(new Vector2(31, 32), 16, 24, -.35f, new Color(1, .81f, .87f));
            return canvas.Texture(maple ? "Maple leaf particle" : "Cherry petal particle");
        }

        private sealed class Raster
        {
            private readonly int size;
            private readonly Color[] pixels;
            private readonly System.Random random;

            public Raster(int size, int seed)
            {
                this.size = size;
                pixels = new Color[size * size];
                random = new System.Random(seed);
            }

            public float Next() => (float)random.NextDouble();

            public void Line(Vector2 from, Vector2 to, float width, Color color)
            {
                int steps = Mathf.CeilToInt(Vector2.Distance(from, to));
                for (int i = 0; i <= steps; i++) Ellipse(Vector2.Lerp(from, to, i / (float)Mathf.Max(1, steps)), width, width, 0, color);
            }

            public void Flower(Vector2 p, float radius, Color tint)
            {
                float turn = Next() * Mathf.PI * 2;
                for (int i = 0; i < 5; i++)
                {
                    float a = turn + i * Mathf.PI * .4f;
                    Vector2 q = p + new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * radius * .58f;
                    Ellipse(q, radius * .55f, radius * .42f, a, tint);
                }
                Ellipse(p, radius * .2f, radius * .2f, 0, new Color(.88f, .5f, .32f));
                Ellipse(p + Vector2.one * radius * .06f, radius * .075f, radius * .075f, 0, new Color(1, .89f, .61f));
            }

            public void Maple(Vector2 p, float radius, float angle, Color color)
            {
                Vector2[] points = new Vector2[20];
                for (int i = 0; i < points.Length; i++)
                {
                    float a = angle + i * Mathf.PI * 2 / points.Length;
                    float length = i % 4 == 0 ? 1 : i % 2 == 0 ? .59f : .37f;
                    points[i] = p + new Vector2(Mathf.Sin(a), Mathf.Cos(a)) * radius * length;
                }
                Polygon(points, color);
                for (int i = 0; i < points.Length; i += 4) Line(p, Vector2.Lerp(p, points[i], .84f), .55f, Color.Lerp(color, new Color(.75f, .45f, .2f), .48f));
            }

            public void Ellipse(Vector2 center, float rx, float ry, float angle, Color color)
            {
                float radius = Mathf.Max(rx, ry) + 1;
                int xMin = Mathf.Max(0, Mathf.FloorToInt(center.x - radius)), xMax = Mathf.Min(size - 1, Mathf.CeilToInt(center.x + radius));
                int yMin = Mathf.Max(0, Mathf.FloorToInt(center.y - radius)), yMax = Mathf.Min(size - 1, Mathf.CeilToInt(center.y + radius));
                float cos = Mathf.Cos(angle), sin = Mathf.Sin(angle);
                for (int y = yMin; y <= yMax; y++) for (int x = xMin; x <= xMax; x++)
                {
                    float dx = x - center.x, dy = y - center.y;
                    float u = (dx * cos + dy * sin) / rx, v = (dy * cos - dx * sin) / ry;
                    float d = u * u + v * v;
                    if (d > 1) continue;
                    Color shaded = color * (1 - d * .075f + v * .04f);
                    shaded.a = color.a * Mathf.Clamp01((1 - d) * Mathf.Min(rx, ry));
                    Set(x, y, shaded);
                }
            }

            private void Polygon(Vector2[] polygon, Color color)
            {
                float minX = size, minY = size, maxX = 0, maxY = 0;
                foreach (Vector2 p in polygon) { minX = Mathf.Min(minX, p.x); minY = Mathf.Min(minY, p.y); maxX = Mathf.Max(maxX, p.x); maxY = Mathf.Max(maxY, p.y); }
                for (int y = Mathf.Max(0, (int)minY); y <= Mathf.Min(size - 1, (int)maxY + 1); y++)
                    for (int x = Mathf.Max(0, (int)minX); x <= Mathf.Min(size - 1, (int)maxX + 1); x++)
                    {
                        bool inside = false;
                        for (int i = 0, j = polygon.Length - 1; i < polygon.Length; j = i++)
                        {
                            Vector2 a = polygon[i], b = polygon[j];
                            if ((a.y > y) != (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
                        }
                        if (inside) Set(x, y, color);
                    }
            }

            private void Set(int x, int y, Color color)
            {
                int index = y * size + x;
                Color previous = pixels[index];
                if (color.a >= .98f) pixels[index] = color;
                else
                {
                    float alpha = color.a + previous.a * (1 - color.a);
                    pixels[index] = alpha < .001f ? Color.clear : (color * color.a + previous * previous.a * (1 - color.a)) / alpha;
                    pixels[index].a = alpha;
                }
            }

            public Texture2D Texture(string name)
            {
                var texture = new Texture2D(size, size, TextureFormat.RGBA32, true) { name = name, wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Trilinear, anisoLevel = 2 };
                texture.SetPixels(pixels);
                texture.Apply(true, true);
                return texture;
            }
        }
    }
}
