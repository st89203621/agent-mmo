using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace Lunhui
{
    [DisallowMultipleComponent]
    public sealed class RealmAtmosphere : MonoBehaviour
    {
        private sealed class WaterSector
        {
            public Mesh Mesh;
            public Vector3[] Rest;
            public Vector3[] Vertices;
            public MeshRenderer Renderer;
        }

        private readonly List<Object> owned = new List<Object>();
        private readonly List<WaterSector> water = new List<WaterSector>();
        private readonly List<ParticleSystem> petals = new List<ParticleSystem>();
        private float nextUpdate;
        private Material waterMaterial;
        private Camera sceneCamera;
        private int theme;

        public void Initialize(int index)
        {
            theme = index;
            Texture2D petalTexture = RealmBotanicalArt.FallingLeaf(index == 1);
            owned.Add(petalTexture);
            var petalMaterial = new Material(Shader.Find("Sprites/Default")) { name = "Drifting garden petals", mainTexture = petalTexture };
            owned.Add(petalMaterial);
            for (int i = 0; i < 6; i++) AddPetals(new Vector3(0, 6.6f, i * 23), petalMaterial, index);
            waterMaterial = new Material(Shader.Find("Standard"))
            {
                name = "Clear moving coastal water",
                color = index == 2 ? new Color(.21f, .76f, .81f, .64f) : new Color(.28f, .72f, .7f, .72f)
            };
            waterMaterial.SetFloat("_Mode", 3);
            waterMaterial.SetFloat("_Glossiness", .86f);
            waterMaterial.SetFloat("_Metallic", .12f);
            waterMaterial.SetInt("_SrcBlend", (int)BlendMode.One);
            waterMaterial.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha);
            waterMaterial.SetInt("_ZWrite", 0);
            waterMaterial.EnableKeyword("_ALPHAPREMULTIPLY_ON");
            waterMaterial.renderQueue = (int)RenderQueue.Transparent;
            owned.Add(waterMaterial);
            var foam = new Material(Shader.Find("Sprites/Default")) { name = "Transparent shoreline foam", color = new Color(.89f, .99f, 1, .62f) };
            owned.Add(foam);
            if (index == 2)
            {
                for (int z = -24; z < 152; z += 22)
                {
                    for (int column = 0; column < 5; column++) OceanSector(z, z + 22, column);
                    ShoreFoam(z, z + 22, foam);
                }
            }
            else
            {
                for (int x = -48; x < 48; x += 16) RiverSector(x, x + 16);
                if (index == 1) SpringSector();
                if (index == 6) FlowerStream();
            }
        }

        private void FlowerStream()
        {
            const int nx = 14, nz = 20;
            var vertices = new Vector3[nx * nz];
            for (int z = 0; z < nz; z++) for (int x = 0; x < nx; x++)
            {
                float t = z / (float)(nz - 1);
                float center = Mathf.Sin(t * Mathf.PI * 3.1f) * 8.2f;
                vertices[z * nx + x] = new Vector3(center + Mathf.Lerp(-1.5f, 1.5f, x / (float)(nx - 1)), .095f, Mathf.Lerp(-12, 138, t));
            }
            AddWater("Flower valley creek", vertices, nx, nz);
        }

        private void AddPetals(Vector3 position, Material material, int index)
        {
            var go = new GameObject(index == 1 ? "Drifting maple leaves" : "Drifting cherry petals", typeof(ParticleSystem));
            go.transform.SetParent(transform, false);
            go.transform.localPosition = position;
            var system = go.GetComponent<ParticleSystem>();
            system.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var main = system.main;
            main.loop = true;
            main.playOnAwake = false;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.startLifetime = new ParticleSystem.MinMaxCurve(7, 13);
            main.startSpeed = 0;
            main.startSize = new ParticleSystem.MinMaxCurve(index == 1 ? .11f : .065f, index == 1 ? .22f : .15f);
            main.startRotation = new ParticleSystem.MinMaxCurve(0, Mathf.PI * 2);
            main.maxParticles = 105;
            main.startColor = new ParticleSystem.MinMaxGradient(Color.white, new Color(1, .91f, .93f, .9f));
            var emission = system.emission;
            emission.rateOverTime = index == 2 ? 4 : 8;
            var shape = system.shape;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.scale = new Vector3(38, 3, 20);
            var velocity = system.velocityOverLifetime;
            velocity.enabled = true;
            velocity.space = ParticleSystemSimulationSpace.World;
            velocity.x = new ParticleSystem.MinMaxCurve(.18f, .47f);
            velocity.y = new ParticleSystem.MinMaxCurve(-.68f, -.32f);
            velocity.z = new ParticleSystem.MinMaxCurve(-.1f, .17f);
            var noise = system.noise;
            noise.enabled = true;
            noise.strength = .16f;
            noise.frequency = .28f;
            noise.scrollSpeed = .1f;
            noise.quality = ParticleSystemNoiseQuality.Low;
            var rotation = system.rotationOverLifetime;
            rotation.enabled = true;
            rotation.z = new ParticleSystem.MinMaxCurve(-1.2f, 1.2f);
            var color = system.colorOverLifetime;
            color.enabled = true;
            var gradient = new Gradient();
            gradient.SetKeys(new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(Color.white, 1) }, new[] { new GradientAlphaKey(0, 0), new GradientAlphaKey(.85f, .15f), new GradientAlphaKey(.85f, .7f), new GradientAlphaKey(0, 1) });
            color.color = gradient;
            var renderer = system.GetComponent<ParticleSystemRenderer>();
            renderer.sharedMaterial = material;
            renderer.renderMode = ParticleSystemRenderMode.Billboard;
            renderer.shadowCastingMode = ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            petals.Add(system);
        }

        private void OceanSector(float near, float far, int column)
        {
            const int count = 9;
            var vertices = new Vector3[count * count];
            for (int row = 0; row < count; row++) for (int x = 0; x < count; x++)
            {
                float z = Mathf.Lerp(near, far, row / (float)(count - 1));
                float start = RealmEnvironment.Coastline(z) - .35f;
                vertices[row * count + x] = new Vector3(start + (column + x / (float)(count - 1)) * 23, -.02f, z);
            }
            AddWater("Coastal water sector", vertices, count, count);
        }

        private void RiverSector(float left, float right)
        {
            const int nx = 9, nz = 4;
            var vertices = new Vector3[nx * nz];
            for (int z = 0; z < nz; z++) for (int x = 0; x < nx; x++)
                vertices[z * nx + x] = new Vector3(Mathf.Lerp(left, right, x / (float)(nx - 1)), -.02f, Mathf.Lerp(77.3f, 80.7f, z / (float)(nz - 1)));
            AddWater("Clear garden stream sector", vertices, nx, nz);
        }

        private void SpringSector()
        {
            const int nx = 12, nz = 8;
            var vertices = new Vector3[nx * nz];
            for (int z = 0; z < nz; z++) for (int x = 0; x < nx; x++)
                vertices[z * nx + x] = new Vector3(Mathf.Lerp(-17, 17, x / (float)(nx - 1)), .14f, Mathf.Lerp(117, 133, z / (float)(nz - 1)));
            AddWater("Waterfall spring", vertices, nx, nz);
        }

        private void AddWater(string name, Vector3[] vertices, int width, int height)
        {
            var triangles = new int[(width - 1) * (height - 1) * 6];
            var uv = new Vector2[vertices.Length];
            int t = 0;
            for (int z = 0; z < height; z++) for (int x = 0; x < width; x++)
            {
                int i = z * width + x;
                uv[i] = new Vector2(vertices[i].x, vertices[i].z) * .2f;
                if (x == width - 1 || z == height - 1) continue;
                triangles[t++] = i; triangles[t++] = i + width; triangles[t++] = i + 1;
                triangles[t++] = i + 1; triangles[t++] = i + width; triangles[t++] = i + width + 1;
            }
            var mesh = new Mesh { name = name, vertices = vertices, triangles = triangles, uv = uv };
            mesh.MarkDynamic();
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            Bounds meshBounds = mesh.bounds;
            meshBounds.Expand(new Vector3(0, .5f, 0));
            mesh.bounds = meshBounds;
            var go = new GameObject(name, typeof(MeshFilter), typeof(MeshRenderer));
            go.transform.SetParent(transform, false);
            go.GetComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = go.GetComponent<MeshRenderer>();
            renderer.sharedMaterial = waterMaterial;
            renderer.shadowCastingMode = ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            owned.Add(mesh);
            water.Add(new WaterSector { Mesh = mesh, Rest = vertices, Vertices = (Vector3[])vertices.Clone(), Renderer = renderer });
        }

        private void ShoreFoam(float near, float far, Material material)
        {
            const int count = 18;
            var vertices = new Vector3[count * 2];
            var triangles = new int[(count - 1) * 6];
            var colors = new Color[vertices.Length];
            for (int i = 0; i < count; i++)
            {
                float z = Mathf.Lerp(near, far, i / (float)(count - 1));
                float x = RealmEnvironment.Coastline(z) + .72f + Mathf.Sin(z * 2.4f) * .065f;
                vertices[i * 2] = new Vector3(x, .017f, z);
                vertices[i * 2 + 1] = new Vector3(x + .13f + Mathf.Sin(z * .8f) * .07f, .017f, z);
                colors[i * 2] = colors[i * 2 + 1] = new Color(1, 1, 1, .42f + Mathf.Sin(z * 1.7f) * .23f);
                if (i == count - 1) continue;
                int t = i * 6;
                triangles[t] = i * 2; triangles[t + 1] = i * 2 + 2; triangles[t + 2] = i * 2 + 1;
                triangles[t + 3] = i * 2 + 1; triangles[t + 4] = i * 2 + 2; triangles[t + 5] = i * 2 + 3;
            }
            var mesh = new Mesh { name = "Shoreline foam sector", vertices = vertices, triangles = triangles, colors = colors };
            mesh.RecalculateBounds();
            var go = new GameObject("Shoreline foam", typeof(MeshFilter), typeof(MeshRenderer));
            go.transform.SetParent(transform, false);
            go.GetComponent<MeshFilter>().sharedMesh = mesh;
            go.GetComponent<MeshRenderer>().sharedMaterial = material;
            go.GetComponent<MeshRenderer>().shadowCastingMode = ShadowCastingMode.Off;
            owned.Add(mesh);
        }

        private void Update()
        {
            if (Time.unscaledTime < nextUpdate) return;
            nextUpdate = Time.unscaledTime + .0833f;
            if (sceneCamera == null) sceneCamera = Camera.main;
            Vector3 viewer = sceneCamera != null ? sceneCamera.transform.position : Vector3.zero;
            foreach (ParticleSystem system in petals)
            {
                bool near = Mathf.Abs(system.transform.position.z - viewer.z) < 36;
                if (near && !system.isPlaying) system.Play();
                else if (!near && system.isPlaying) system.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            }
            float time = Time.time;
            foreach (WaterSector sector in water)
            {
                if (!sector.Renderer.isVisible) continue;
                for (int i = 0; i < sector.Vertices.Length; i++)
                {
                    Vector3 p = sector.Rest[i];
                    float amplitude = theme == 2 ? .038f : .014f;
                    p.y += Mathf.Sin(p.x * 1.4f + p.z * .82f + time * 1.35f) * amplitude + Mathf.Sin(p.z * 2.1f - time * 1.7f) * amplitude * .4f;
                    sector.Vertices[i] = p;
                }
                sector.Mesh.vertices = sector.Vertices;
                sector.Mesh.RecalculateNormals();
            }
        }

        private void OnDestroy()
        {
            foreach (Object item in owned) if (item != null) Destroy(item);
        }
    }
}
