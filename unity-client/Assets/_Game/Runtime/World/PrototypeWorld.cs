using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace Lunhui
{
    [DisallowMultipleComponent]
    [DefaultExecutionOrder(100)]
    public sealed class PrototypeWorld : MonoBehaviour
    {
        private readonly List<UnityEngine.Object> ownedAssets = new List<UnityEngine.Object>();
        private readonly List<Transform> lanterns = new List<Transform>();
        private readonly List<Vector3> lanternOrigins = new List<Vector3>();
        private readonly Dictionary<string, Material> palette = new Dictionary<string, Material>();
        private Transform architecture;
        private Transform ambience;
        private Transform hero;
        private Transform body;
        private Transform leftArm;
        private Transform rightArm;
        private Transform leftLeg;
        private Transform rightLeg;
        private Transform weapon;
        private Transform offhandWeapon;
        private readonly Transform[] careerWeapons = new Transform[3];
        private readonly Transform[] careerOffhands = new Transform[3];
        private Transform companion;
        private readonly Transform[] petModels = new Transform[2];
        private readonly PetVisual[] petArt = new PetVisual[2];
        private Transform petPulse;
        private Transform guide;
        private CharacterVisual heroArt;
        private CharacterVisual guideArt;
        private RealmEnvironment realms;
        private Transform slash;
        private Transform offhandSlash;
        private Camera sceneCamera;
        private Material costume;
        private Material slashMaterial;
        private Material petPulseMaterial;
        private Mesh waterMesh;
        private Vector3[] waterVertices;
        private Vector3[] waterOriginal;
        private Vector2 moveInput;
        // Automated quest travel feeds the same per-frame movement/animation
        // pipeline as the virtual joystick.  Keeping this as a velocity avoids
        // teleporting the transform (which looked like sliding after combat).
        private Vector3 scriptedMotion;
        private Vector3 cameraVelocity;
        private Vector3 cameraGoal;
        private Vector3 focusGoal;
        private Vector3 cameraFocus;
        private Vector3 facing = Vector3.back;
        private Vector3 dodgeDirection;
        private float lensGoal;
        private float actionTime;
        private float actionDuration;
        private float dodgeTime;
        private float gait;
        private float nextWaterFrame;
        private float petActionTime;
        private int careerIndex = -1;
        private int petIndex = -1;
        private string currentMode = "home";
        private bool ready;
        private float cameraYaw;
        private float cameraPitch = 25;
        private float cameraDistance = 8.5f;
        private Vector3 travelPosition;
        private Quaternion travelRotation;
        private bool hasTravelPosition;
        private bool inputBlocked;
        private bool movementDisabled;
        private bool portraitCloseup;
        public CharacterCustomizer HeroCustomizer => heroArt?heroArt.Customizer:null;
        public void SetAppearance(CharacterAppearance appearance) { if(!ready)Build();heroArt?.SetAppearance(appearance); }
        public void SetPortraitCloseup(bool value){portraitCloseup=value;}

        public static readonly string[] RealmNames = { "樱花 · 相逢小镇", "枫林 · 晚照山谷", "大海 · 晴岚海岸", "机战 · 天枢基地", "三国 · 赤壁城寨", "龙珠 · 云海武道场", "花溪 · 花谷秋海" };
        public int RealmIndex => realms != null ? Mathf.Max(0, realms.CurrentRealm) : 0;
        public int SubmapIndex => realms != null ? realms.CurrentSubmap : 0;
        public string MapName => RealmMapCatalog.Get(RealmIndex, SubmapIndex).Name;
        public string RealmName => RealmMapCatalog.RegionNames[RealmIndex] + " · " + MapName;
        public Camera WorldCamera => sceneCamera;
        public Rect CurrentRealmBounds => realms != null ? realms.GetBounds(RealmIndex) : new Rect(-6, -5, 12, 16);
        public Vector3 HeroGroundPosition => hero ? hero.position : Vector3.zero;
        public Transform HeroTransform => hero;
        public bool IsDodging => dodgeTime > 0;
        public float CameraDistance => cameraDistance;
        public bool IsExploring => currentMode == "home" && !inputBlocked;
        public void SetFemale(bool female) { if (!ready) Build(); heroArt?.SetFemale(female); }
        public Vector3 ConstrainPosition(Vector3 value) => realms != null ? realms.ConstrainPosition(value) : value;

        public void SetInputBlocked(bool blocked) { inputBlocked = blocked; if (blocked) SetMove(Vector2.zero); }
        public void SetMovementDisabled(bool disabled) { movementDisabled = disabled; if(disabled)SetMove(Vector2.zero); }
        public void OrbitCamera(Vector2 delta)
        {
            if (!IsExploring) return;
            cameraYaw += delta.x;
            cameraPitch = Mathf.Clamp(cameraPitch + delta.y, 8, 65);
        }
        public void ZoomCamera(float amount) { cameraDistance = Mathf.Clamp(cameraDistance + amount, 3.2f, 17); }
        public void ResetCamera() { cameraYaw = 0; cameraPitch = 25; cameraDistance = 8.5f; }
        public void FacePoint(Vector3 point)
        {
            Vector3 direction = point - hero.position; direction.y = 0;
            if (direction.sqrMagnitude < .001f) return;
            facing = direction.normalized;
            hero.rotation = Quaternion.LookRotation(-facing, Vector3.up);
        }
        public void Teleport(Vector3 position)
        {
            hero.position = ConstrainPosition(position);
            companion.position = hero.position + Vector3.right * 1.5f;
            travelPosition = hero.position; travelRotation = hero.rotation; hasTravelPosition = true;
            moveInput = Vector2.zero;
            scriptedMotion = Vector3.zero;
        }

        public void SetRealm(int index) => SetMap(index, 0);

        public void SetMap(int index, int submap)
        {
            if (!ready) Build();
            realms.SetMap(index, submap);
            hero.localPosition = realms.SpawnPosition;
            guide.localPosition = realms.GuidePosition;
            companion.localPosition = hero.localPosition + new Vector3(1.5f, .03f, .45f);
            moveInput = Vector2.zero;
            scriptedMotion = Vector3.zero;
            facing = Vector3.back;
            hero.localRotation = Quaternion.Euler(0, -12, 0);
            actionTime = dodgeTime = 0;
            travelPosition = hero.position; travelRotation = hero.rotation; hasTravelPosition = true;
            if (sceneCamera != null && currentMode == "home")
            {
                cameraFocus = hero.position + Vector3.up * 1.35f;
                sceneCamera.transform.position = cameraFocus + Quaternion.Euler(cameraPitch, cameraYaw, 0) * new Vector3(0, 0, -cameraDistance);
            }
            if (currentMode == "home") guide.gameObject.SetActive(RealmIndex == 0 && SubmapIndex == 0);
        }

        public void RotateHero(float degrees)
        {
            if (currentMode == "character" || currentMode == "equipment") hero.Rotate(0, degrees, 0, Space.World);
        }

        public Vector3 GuidePosition => guide != null ? guide.TransformPoint(new Vector3(0, 2.94f, 0)) : transform.position;
        public Vector3 PetPosition => companion != null ? companion.TransformPoint(new Vector3(0, petIndex == 0 ? 1.4f : 1.2f, 0)) : transform.position;
        public Vector3 HeroPosition => hero != null ? hero.TransformPoint(new Vector3(0, 2.98f, 0)) : transform.position;

        public static PrototypeWorld Create()
        {
            var existing = FindObjectOfType<PrototypeWorld>();
            return existing != null ? existing : new GameObject("Lunhui Prototype World").AddComponent<PrototypeWorld>();
        }

        public void SetMode(string mode, int career)
        {
            if (!ready) Build();
            var nextMode = string.IsNullOrEmpty(mode) ? "home" : mode.ToLowerInvariant();
            bool changed = currentMode != nextMode;
            if (changed && currentMode == "home")
            { travelPosition = hero.position; travelRotation = hero.rotation; hasTravelPosition = true; }
            currentMode = nextMode;
            SetCareer(career);
            moveInput = Vector2.zero;
            scriptedMotion = Vector3.zero;
            if (changed)
            {
                hero.localPosition = new Vector3(-0.65f, 0.16f, 0);
                facing = Vector3.back;
                hero.localRotation = Quaternion.Euler(0, -12, 0);
                actionTime = dodgeTime = petActionTime = 0;
                slash.gameObject.SetActive(false);
                offhandSlash.gameObject.SetActive(false);
                petPulse.gameObject.SetActive(false);
                companion.localPosition = hero.localPosition + new Vector3(1.5f, 0.03f, 0.45f);
                if (currentMode == "home" && hasTravelPosition)
                { hero.position = travelPosition; hero.rotation = travelRotation; companion.position = hero.position + Vector3.right * 1.5f; }
            }

            hero.gameObject.SetActive(currentMode != "login" && currentMode != "guild" && currentMode != "settings");
            companion.gameObject.SetActive(currentMode == "pets" || currentMode == "home" || currentMode == "mountains");
            guide.gameObject.SetActive(currentMode == "home" && RealmIndex == 0 && SubmapIndex == 0);
            switch (currentMode)
            {
                case "character":
                    cameraGoal = new Vector3(1.15f, 1.9f, -3.3f);
                    focusGoal = new Vector3(0.1f, .93f, 0);
                    lensGoal = 42;
                    break;
                case "equipment":
                    cameraGoal = new Vector3(1.15f, 1.9f, -3.3f);
                    focusGoal = new Vector3(0.1f, 1.22f, 0);
                    lensGoal = 38;
                    break;
                case "pets":
                    cameraGoal = new Vector3(5.9f, 4.2f, -7.7f);
                    focusGoal = new Vector3(0.35f, 1.05f, 0.45f);
                    lensGoal = 46;
                    break;
                case "login":
                    cameraGoal = new Vector3(11.5f, 8.8f, -14.6f);
                    focusGoal = new Vector3(0, 2.45f, 10.5f);
                    lensGoal = 48;
                    break;
                case "mountains":
                    cameraGoal = new Vector3(8.7f, 7.6f, -12.5f);
                    focusGoal = new Vector3(-1.4f, 1.1f, 7.6f);
                    lensGoal = 49;
                    break;
                case "guild":
                    cameraGoal = new Vector3(8.8f, 7.3f, -7.8f);
                    focusGoal = new Vector3(0, 2.8f, 13.7f);
                    lensGoal = 48;
                    break;
                case "settings":
                    cameraGoal = new Vector3(-12, 8, -7);
                    focusGoal = new Vector3(0, 1.5f, 8);
                    lensGoal = 50;
                    break;
                default:
                    cameraGoal = new Vector3(2.4f, 6.4f, -10.2f);
                    focusGoal = new Vector3(0, 1.3f, 3.4f);
                    lensGoal = 47;
                    break;
            }
        }

        public void SetMove(Vector2 input)
        {
            moveInput = Vector2.ClampMagnitude(input, 1);
            scriptedMotion = Vector3.zero;
        }

        /// <summary>
        /// Moves the hero toward a world-space point for automated quest travel.
        /// Keeping this in the world component makes the autopilot use the same
        /// constraints, animation and facing rules as the mobile joystick.
        /// </summary>
        public bool MoveTowardsWorld(Vector3 destination, float speed = 4.2f)
        {
            if (!ready || !hero || !IsExploring || movementDisabled) return true;
            Vector3 delta = destination - hero.position;
            delta.y = 0;
            if (delta.sqrMagnitude < .18f * .18f)
            {
                SetMove(Vector2.zero);
                return true;
            }
            moveInput = Vector2.zero;
            float dt = Mathf.Max(.0001f, Mathf.Min(Time.deltaTime, .05f));
            scriptedMotion = delta.normalized * Mathf.Min(Mathf.Max(0, speed), delta.magnitude / dt);
            return false;
        }

        public void SetPet(int index)
        {
            if (!ready) Build();
            int nextPet = Mathf.Clamp(index, 0, petModels.Length - 1);
            bool changed = petIndex != nextPet;
            petIndex = nextPet;
            if (changed)
            {
                petActionTime = 0;
                petPulse.gameObject.SetActive(false);
            }
            for (int i = 0; i < petModels.Length; i++)
            {
                petModels[i].gameObject.SetActive(i == petIndex && (petArt[i] == null || !petArt[i].HasModel));
                if (petArt[i] != null) petArt[i].gameObject.SetActive(i == petIndex);
                petModels[i].localPosition = Vector3.zero;
                petModels[i].localRotation = Quaternion.identity;
                petModels[i].localScale = Vector3.one;
            }
        }

        public void PerformAction(string action)
        {
            if (!ready) return;
            string command = (action ?? string.Empty).ToLowerInvariant();
            if (command == "pet")
            {
                if (!companion.gameObject.activeSelf) return;
                petActionTime = 0.95f;
                petPulse.gameObject.SetActive(true);
                petArt[petIndex]?.Command();
                return;
            }
            if (!hero.gameObject.activeSelf) return;
            heroArt?.PerformAction(command);
            if (command == "dodge" || command == "dash")
            {
                if (dodgeTime > 0) return;
                dodgeDirection = MoveDirection();
                if (dodgeDirection.sqrMagnitude < 0.01f) dodgeDirection = facing;
                dodgeTime = 0.3f;
                return;
            }
            actionDuration = command == "ultimate" || command == "skill" ? 0.85f : 0.52f;
            actionTime = actionDuration;
            slash.gameObject.SetActive(true);
            offhandSlash.gameObject.SetActive(careerIndex == 2);
        }

        private void Awake()
        {
            Build();
        }

        private void Build()
        {
            if (ready) return;
            ready = true;
            architecture = Group("Static Plaza", transform);
            ambience = Group("Living Details", transform);
            MakePalette();
            BuildLighting();
            BuildHero();
            BuildCompanion();
            for (int i = 0; i < petArt.Length; i++)
            {
                petArt[i] = PetVisual.Create(companion, i);
                if (petArt[i].HasModel) petModels[i].gameObject.SetActive(false);
            }
            BuildGuide();
            heroArt = CharacterVisual.Create(hero);
            if (heroArt.HasModel) body.gameObject.SetActive(false);
            guideArt = CharacterVisual.Create(guide, true);
            if (guideArt.HasModel)
                foreach (Transform child in guide)
                    if (child != guideArt.transform) child.gameObject.SetActive(false);
            architecture.gameObject.SetActive(false);
            ambience.gameObject.SetActive(false);
            realms = new GameObject("World Environments").AddComponent<RealmEnvironment>();
            realms.transform.SetParent(transform, false);
            realms.SetRealm(0);
            guide.localPosition = realms.GuidePosition;
            SetPet(0);
            SetMode("home", 0);
            sceneCamera.transform.position = cameraGoal;
            cameraFocus = focusGoal;
            sceneCamera.transform.LookAt(cameraFocus);
            sceneCamera.fieldOfView = lensGoal;
        }

        private void MakePalette()
        {
            AddMaterial("stone", new Color(0.77f, 0.76f, 0.67f), 0.2f);
            AddMaterial("stoneLight", new Color(0.88f, 0.87f, 0.76f), 0.23f);
            AddMaterial("stoneDark", new Color(0.53f, 0.59f, 0.51f), 0.18f);
            AddMaterial("tile", new Color(0.64f, 0.69f, 0.59f), 0.24f);
            AddMaterial("jade", new Color(0.16f, 0.42f, 0.35f), 0.6f);
            AddMaterial("roof", new Color(0.15f, 0.27f, 0.25f), 0.34f);
            AddMaterial("roofEdge", new Color(0.31f, 0.48f, 0.39f), 0.4f);
            AddMaterial("red", new Color(0.61f, 0.17f, 0.13f), 0.34f);
            AddMaterial("wood", new Color(0.3f, 0.24f, 0.19f), 0.15f);
            AddMaterial("gold", new Color(0.9f, 0.65f, 0.27f), 0.65f, 0.45f);
            AddMaterial("leaves", new Color(0.26f, 0.46f, 0.27f), 0.05f);
            AddMaterial("leavesLight", new Color(0.44f, 0.59f, 0.3f), 0.06f);
            AddMaterial("rock", new Color(0.46f, 0.56f, 0.49f), 0.08f);
            AddMaterial("mountain", new Color(0.39f, 0.53f, 0.49f), 0.06f);
            AddMaterial("mountainFar", new Color(0.59f, 0.7f, 0.65f), 0.02f);
            AddMaterial("skin", new Color(0.94f, 0.77f, 0.6f), 0.25f);
            AddMaterial("hair", new Color(0.085f, 0.12f, 0.11f), 0.27f);
            AddMaterial("white", new Color(0.91f, 0.93f, 0.84f), 0.36f);
            AddMaterial("steel", new Color(0.65f, 0.82f, 0.8f), 0.7f, 0.55f);
            AddMaterial("lantern", new Color(0.91f, 0.32f, 0.15f), 0.25f);
            AddMaterial("guideSilk", new Color(0.76f, 0.43f, 0.42f), 0.28f);
            palette["lantern"].EnableKeyword("_EMISSION");
            palette["lantern"].SetColor("_EmissionColor", new Color(0.38f, 0.12f, 0.035f));
            costume = NewMaterial("Hero Silk", new Color(0.12f, 0.42f, 0.4f), 0.32f, 0.08f);
            slashMaterial = TransparentMaterial("Jade Sword Trail", new Color(0.64f, 1f, 0.79f, 0), true);
            petPulseMaterial = TransparentMaterial("Companion Command Pulse", new Color(0.68f, 0.96f, 0.75f, 0), true);
        }

        private void BuildLighting()
        {
            sceneCamera = Camera.main;
            if (sceneCamera == null)
            {
                var cameraObject = new GameObject("World Camera", typeof(Camera));
                cameraObject.transform.SetParent(transform, false);
                cameraObject.tag = "MainCamera";
                sceneCamera = cameraObject.GetComponent<Camera>();
            }
            sceneCamera.clearFlags = CameraClearFlags.Skybox;
            sceneCamera.backgroundColor = new Color(0.66f, 0.77f, 0.72f);
            sceneCamera.nearClipPlane = 0.1f;
            sceneCamera.farClipPlane = 160;
            sceneCamera.allowHDR = true;
            sceneCamera.allowMSAA = true;
            sceneCamera.depth = -10;

            var sunObject = new GameObject("Afternoon Sun", typeof(Light));
            sunObject.transform.SetParent(transform, false);
            sunObject.transform.rotation = Quaternion.Euler(43, -33, 0);
            var sun = sunObject.GetComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(1f, 0.92f, 0.76f);
            sun.intensity = 1.15f;
            sun.shadows = LightShadows.Soft;
            sun.shadowStrength = 0.64f;
            sun.shadowBias = 0.035f;
            RenderSettings.sun = sun;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.57f, 0.7f, 0.7f);
            RenderSettings.ambientEquatorColor = new Color(0.52f, 0.62f, 0.5f);
            RenderSettings.ambientGroundColor = new Color(0.38f, 0.37f, 0.29f);
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogColor = new Color(0.65f, 0.76f, 0.7f);
            RenderSettings.fogDensity = 0.012f;
            RenderSettings.reflectionIntensity = 0.65f;

            Shader skyShader = Shader.Find("Skybox/Procedural");
            if (skyShader != null)
            {
                var sky = new Material(skyShader) { name = "Jade Valley Sky" };
                ownedAssets.Add(sky);
                sky.SetColor("_SkyTint", new Color(0.58f, 0.7f, 0.68f));
                sky.SetColor("_GroundColor", new Color(0.67f, 0.72f, 0.59f));
                sky.SetFloat("_Exposure", 1.14f);
                sky.SetFloat("_AtmosphereThickness", 0.8f);
                sky.SetFloat("_SunSize", 0.026f);
                RenderSettings.skybox = sky;
            }
        }

        private void BuildGround()
        {
            Box("Plaza Foundation", architecture, new Vector3(0, -0.65f, 6), new Vector3(17.4f, 1.15f, 29), palette["stoneDark"]);
            Box("Terrace Rim", architecture, new Vector3(0, -0.1f, 6), new Vector3(17.7f, 0.28f, 29.3f), palette["stoneLight"]);
            for (int row = 0; row < 15; row++)
            {
                for (int column = 0; column < 9; column++)
                {
                    string material = (row + column * 3) % 9 == 0 ? "stoneLight" : ((row * 7 + column) % 6 == 0 ? "tile" : "stone");
                    Box("Paving", architecture, new Vector3((column - 4) * 1.91f, 0.052f, -7.2f + row * 1.93f), new Vector3(1.875f, 0.08f, 1.895f), palette[material]);
                }
            }
            for (int i = 0; i < 5; i++)
            {
                Box("Arrival Step", architecture, new Vector3(0, -0.16f - i * 0.18f, -8.25f - i * 0.44f), new Vector3(10.8f + i * 0.32f, 0.22f, 0.54f), palette["stoneLight"]);
            }
            Cylinder("Jade Medallion Base", architecture, new Vector3(-0.65f, 0.098f, 0), 2.3f, 0.08f, palette["stoneDark"], 48);
            Cylinder("Jade Medallion", architecture, new Vector3(-0.65f, 0.143f, 0), 2.12f, 0.015f, palette["jade"], 48);
            Ring("Inlaid Outer Ring", architecture, new Vector3(-0.65f, 0.155f, 0), 1.94f, 2.02f, palette["gold"], 64);
            Ring("Inlaid Inner Ring", architecture, new Vector3(-0.65f, 0.156f, 0), 1.56f, 1.59f, palette["stoneLight"], 64);
            for (int i = 0; i < 8; i++)
            {
                float a = i * Mathf.PI / 4;
                var mark = Box("Compass Inlay", architecture, new Vector3(-0.65f + Mathf.Sin(a) * 1.75f, 0.16f, Mathf.Cos(a) * 1.75f), new Vector3(0.14f, 0.008f, 0.29f), palette["gold"]);
                mark.localRotation = Quaternion.Euler(0, i * 45, 0);
            }
            for (int side = -1; side <= 1; side += 2)
            {
                Box("Garden Margin", architecture, new Vector3(side * 8.3f, 0.1f, 6), new Vector3(0.38f, 0.12f, 28), palette["jade"]);
                for (int i = 0; i < 9; i++)
                {
                    float z = -6.3f + i * 3.15f;
                    Box("Balustrade Post", architecture, new Vector3(side * 8.65f, 0.65f, z), new Vector3(0.28f, 1.2f, 0.28f), palette["stoneLight"]);
                    Cylinder("Post Crown", architecture, new Vector3(side * 8.65f, 1.3f, z), 0.23f, 0.15f, palette["jade"], 8);
                    if (i < 8)
                    {
                        Box("Balustrade Rail", architecture, new Vector3(side * 8.65f, 1.02f, z + 1.56f), new Vector3(0.17f, 0.15f, 3), palette["stoneLight"]);
                        Box("Balustrade Rail", architecture, new Vector3(side * 8.65f, 0.5f, z + 1.56f), new Vector3(0.13f, 0.13f, 3), palette["stoneLight"]);
                    }
                }
            }
        }

        private void BuildGate(Vector3 position)
        {
            Transform gate = Group("Cloud Gate", architecture, position);
            for (int side = -1; side <= 1; side += 2)
            {
                for (int depth = -1; depth <= 1; depth += 2)
                {
                    Vector3 p = new Vector3(side * 3.45f, 2.8f, depth * 0.82f);
                    Cylinder("Cinnabar Pillar", gate, p, 0.28f, 5.4f, palette["red"], 12);
                    Cylinder("Carved Foot", gate, new Vector3(p.x, 0.35f, p.z), 0.43f, 0.65f, palette["stoneLight"], 8);
                    Cylinder("Pillar Collar", gate, new Vector3(p.x, 4.92f, p.z), 0.31f, 0.15f, palette["gold"], 12);
                }
                Box("Side Wall", gate, new Vector3(side * 6, 1.43f, 0.65f), new Vector3(4.4f, 2.72f, 0.45f), palette["stoneLight"]);
                Box("Wall Foot", gate, new Vector3(side * 6, 0.4f, 0.65f), new Vector3(4.5f, 0.52f, 0.62f), palette["stoneDark"]);
                Roof(gate, new Vector3(side * 6, 2.82f, 0.65f), 4.6f, 1.1f, 0.22f);
                for (int bar = 0; bar < 5; bar++)
                    Box("Wall Lattice", gate, new Vector3(side * 6 + (bar - 2) * 0.41f, 1.65f, 0.39f), new Vector3(0.065f, 1.2f, 0.04f), palette["jade"]);
                Box("Wall Lattice Top", gate, new Vector3(side * 6, 2.2f, 0.38f), new Vector3(1.75f, 0.09f, 0.05f), palette["jade"]);
                Box("Wall Lattice Bottom", gate, new Vector3(side * 6, 1.12f, 0.38f), new Vector3(1.75f, 0.09f, 0.05f), palette["jade"]);
                BuildLantern(new Vector3(position.x + side * 3.2f, position.y + 4.13f, position.z - 1.12f), 0.72f);
            }
            Box("Lower Crossbeam", gate, new Vector3(0, 4.46f, 0), new Vector3(7.9f, 0.26f, 1.65f), palette["red"]);
            Box("Golden Fascia", gate, new Vector3(0, 4.7f, -0.95f), new Vector3(8.5f, 0.13f, 0.12f), palette["gold"]);
            Box("Upper Crossbeam", gate, new Vector3(0, 5.23f, 0), new Vector3(8.5f, 0.35f, 1.9f), palette["jade"]);
            for (int i = -4; i <= 4; i++)
            {
                Box("Dougong Bracket", gate, new Vector3(i * 0.9f, 5.36f, -0.91f), new Vector3(0.16f, 0.42f, 0.54f), palette["red"]);
                Box("Bracket Tip", gate, new Vector3(i * 0.9f, 5.51f, -1.07f), new Vector3(0.46f, 0.12f, 0.48f), palette["gold"]);
            }
            Roof(gate, new Vector3(0, 5.6f, 0), 10.9f, 4.45f, 1.13f);
            Box("Gate Plaque", gate, new Vector3(0, 4.84f, -1.06f), new Vector3(2.36f, 0.76f, 0.18f), palette["gold"]);
            Box("Gate Plaque Inset", gate, new Vector3(0, 4.84f, -1.17f), new Vector3(2.18f, 0.59f, 0.04f), palette["jade"]);
            for (int i = -1; i <= 1; i++)
            {
                Transform emblem = Box("Cloud Seal", gate, new Vector3(i * 0.65f, 4.84f, -1.205f), new Vector3(0.25f, 0.25f, 0.028f), palette["gold"]);
                emblem.localRotation = Quaternion.Euler(0, 0, 45);
            }
        }

        private void BuildPavilion(Vector3 position, float yaw, float size)
        {
            var pavilion = Group("Waterside Pavilion", architecture, position);
            pavilion.localRotation = Quaternion.Euler(0, yaw, 0);
            pavilion.localScale = Vector3.one * size;
            Cylinder("Octagonal Terrace", pavilion, new Vector3(0, -0.18f, 0), 3.25f, 0.65f, palette["stoneDark"], 8);
            Cylinder("Terrace Cap", pavilion, new Vector3(0, 0.17f, 0), 3.12f, 0.13f, palette["stoneLight"], 8);
            for (int x = -1; x <= 1; x += 2)
            {
                for (int z = -1; z <= 1; z += 2)
                {
                    Cylinder("Pavilion Pillar", pavilion, new Vector3(x * 1.8f, 1.95f, z * 1.8f), 0.16f, 3.5f, palette["red"], 10);
                    Cylinder("Pavilion Pillar Base", pavilion, new Vector3(x * 1.8f, 0.38f, z * 1.8f), 0.29f, 0.34f, palette["stoneLight"], 8);
                }
                Box("Pavilion Beam", pavilion, new Vector3(0, 3.55f, x * 1.8f), new Vector3(4.35f, 0.22f, 0.24f), palette["red"]);
                Box("Pavilion Beam", pavilion, new Vector3(x * 1.8f, 3.55f, 0), new Vector3(0.24f, 0.22f, 4.35f), palette["red"]);
                Box("Pavilion Bench", pavilion, new Vector3(x * 1.8f, 0.8f, 0), new Vector3(0.48f, 0.16f, 3.7f), palette["wood"]);
                Box("Pavilion Rail", pavilion, new Vector3(x * 1.82f, 1.23f, 0), new Vector3(0.12f, 0.14f, 3.7f), palette["jade"]);
            }
            Roof(pavilion, new Vector3(0, 3.65f, 0), 5.5f, 5.15f, 1.08f);
            Roof(pavilion, new Vector3(0, 4.8f, 0), 3.5f, 3.1f, 0.82f);
            Cylinder("Roof Finial", pavilion, new Vector3(0, 5.95f, 0), 0.1f, 0.5f, palette["gold"], 8);
            Cylinder("Tea Table", pavilion, new Vector3(0, 0.87f, 0), 0.75f, 0.14f, palette["stoneLight"], 12);
            Cylinder("Table Pedestal", pavilion, new Vector3(0, 0.58f, 0), 0.24f, 0.54f, palette["stoneDark"], 8);
        }

        private void BuildGarden()
        {
            BuildPine(new Vector3(-7.1f, 0.1f, 2.1f), 1.12f, 23);
            BuildPine(new Vector3(6.9f, 0.1f, 5.6f), 0.92f, -45);
            BuildPine(new Vector3(-7, 0.1f, 19.5f), 1.3f, 80);
            BuildPine(new Vector3(7.3f, 0.1f, 19.3f), 1.4f, -10);
            for (int side = -1; side <= 1; side += 2)
            {
                for (int i = 0; i < 3; i++)
                {
                    var p = new Vector3(side * (11.3f + i * 2.4f), -0.2f, -2.8f + i * 9.6f);
                    Mountain(architecture, p, new Vector3(2.1f, 1.65f + i * 0.35f, 1.65f), 15 + i * 9 + side, palette["rock"]);
                    Sphere("Island Moss", architecture, p + Vector3.up * 0.53f, new Vector3(2.7f, 0.4f, 1.75f), palette["leaves"]);
                }
                for (int i = 0; i < 2; i++)
                {
                    var p = new Vector3(side * 6.6f, 0.1f, -3.6f + i * 12);
                    Cylinder("Lantern Pedestal", architecture, p + Vector3.up * 0.2f, 0.48f, 0.4f, palette["stoneLight"], 8);
                    Cylinder("Lantern Standard", architecture, p + Vector3.up * 1.64f, 0.1f, 2.9f, palette["wood"], 8);
                    Box("Lantern Bracket", architecture, p + new Vector3(-side * 0.36f, 3, 0), new Vector3(0.87f, 0.1f, 0.11f), palette["gold"]);
                    BuildLantern(p + new Vector3(-side * 0.66f, 2.44f, 0), 0.5f);
                }
                Box("Incense Plinth", architecture, new Vector3(side * 4.7f, 0.2f, 11.2f), new Vector3(1.2f, 0.3f, 1.2f), palette["stoneLight"]);
                Cylinder("Bronze Incense Bowl", architecture, new Vector3(side * 4.7f, 0.7f, 11.2f), 0.46f, 0.56f, palette["jade"], 12);
                Cylinder("Incense Rim", architecture, new Vector3(side * 4.7f, 1, 11.2f), 0.54f, 0.09f, palette["gold"], 12);
                for (int stick = -1; stick <= 1; stick++)
                    Cylinder("Incense", architecture, new Vector3(side * 4.7f + stick * 0.16f, 1.26f, 11.2f), 0.015f, 0.5f, palette["red"], 5);
            }
        }

        private void BuildPine(Vector3 position, float size, float angle)
        {
            var tree = Group("Sculpted Pine", architecture, position);
            tree.localScale = Vector3.one * size;
            tree.localRotation = Quaternion.Euler(0, angle, 0);
            Cylinder("Tree Bed", tree, new Vector3(0, 0.13f, 0), 1.08f, 0.26f, palette["stoneDark"], 10);
            Cylinder("Moss Bed", tree, new Vector3(0, 0.275f, 0), 0.92f, 0.05f, palette["leaves"], 10);
            Beam("Pine Trunk", tree, new Vector3(0, 0.25f, 0), new Vector3(0.28f, 2.75f, 0), 0.32f, palette["wood"]);
            Beam("Pine Trunk", tree, new Vector3(0.28f, 2.65f, 0), new Vector3(0.08f, 4.1f, 0.2f), 0.2f, palette["wood"]);
            Vector3[] tips = { new Vector3(-1.3f, 2.9f, 0.15f), new Vector3(1.5f, 3.4f, 0), new Vector3(-0.1f, 3.8f, 1.2f), new Vector3(0.1f, 4.25f, 0) };
            for (int i = 0; i < tips.Length; i++)
            {
                Beam("Pine Bough", tree, new Vector3(0.2f, 2.3f + i * 0.37f, 0), tips[i], 0.15f, palette["wood"]);
                Sphere("Pine Canopy", tree, tips[i], new Vector3(2.7f - i * 0.28f, 0.82f, 1.8f), palette["leaves"]);
                Sphere("Sunlit Needles", tree, tips[i] + new Vector3(-0.2f, 0.23f, -0.16f), new Vector3(2.3f - i * 0.25f, 0.55f, 1.48f), palette["leavesLight"]);
            }
        }

        private void BuildMountains()
        {
            for (int i = 0; i < 11; i++)
            {
                Mountain(architecture, new Vector3(-57 + i * 11.6f, -3.5f, 65 + (i % 3) * 7), new Vector3(10 + i % 3 * 2, 20 + (i * 7 % 15), 11), i + 73, palette["mountainFar"]);
            }
            for (int i = 0; i < 9; i++)
            {
                float x = -41 + i * 10.4f;
                float height = 14 + (i * 11 % 13);
                Mountain(architecture, new Vector3(x, -2.6f, 38 + Mathf.Abs(x) * 0.18f), new Vector3(6.7f, height, 7), i + 11, palette["mountain"]);
                if (i % 2 == 0)
                    Mountain(architecture, new Vector3(x + 4, -2.4f, 34), new Vector3(4.3f, height * 0.61f, 6), i + 27, palette["rock"]);
            }
        }

        private void BuildWater()
        {
            Box("River Bed", architecture, new Vector3(0, -2.1f, 13), new Vector3(74, 0.4f, 64), palette["jade"]);
            const int nx = 34;
            const int nz = 30;
            waterVertices = new Vector3[(nx + 1) * (nz + 1)];
            var triangles = new int[nx * nz * 6];
            var uv = new Vector2[waterVertices.Length];
            int t = 0;
            for (int z = 0; z <= nz; z++)
            {
                for (int x = 0; x <= nx; x++)
                {
                    int index = z * (nx + 1) + x;
                    waterVertices[index] = new Vector3(-35 + 70f * x / nx, -0.65f, -13 + 61f * z / nz);
                    uv[index] = new Vector2(x / (float)nx, z / (float)nz);
                    if (x == nx || z == nz) continue;
                    triangles[t++] = index;
                    triangles[t++] = index + nx + 1;
                    triangles[t++] = index + 1;
                    triangles[t++] = index + 1;
                    triangles[t++] = index + nx + 1;
                    triangles[t++] = index + nx + 2;
                }
            }
            waterOriginal = (Vector3[])waterVertices.Clone();
            waterMesh = MakeMesh("Jade Water Surface", waterVertices, triangles, uv);
            waterMesh.MarkDynamic();
            Material water = TransparentMaterial("Jade Water", new Color(0.2f, 0.55f, 0.45f, 0.87f), false);
            water.SetFloat("_Glossiness", 0.83f);
            water.SetFloat("_Metallic", 0.18f);
            MeshObject("Jade River", ambience, waterMesh, water).GetComponent<MeshRenderer>().shadowCastingMode = ShadowCastingMode.Off;
            Material ripple = TransparentMaterial("Water Glints", new Color(0.72f, 0.89f, 0.7f, 0.28f), true);
            for (int side = -1; side <= 1; side += 2)
            {
                for (int i = 0; i < 11; i++)
                {
                    var lineObject = new GameObject("Water Glint", typeof(LineRenderer));
                    lineObject.transform.SetParent(ambience, false);
                    var line = lineObject.GetComponent<LineRenderer>();
                    line.sharedMaterial = ripple;
                    line.useWorldSpace = false;
                    line.widthMultiplier = 0.028f;
                    line.positionCount = 7;
                    line.shadowCastingMode = ShadowCastingMode.Off;
                    line.receiveShadows = false;
                    for (int p = 0; p < 7; p++)
                        line.SetPosition(p, new Vector3(side * (10.3f + i % 4 * 2.3f) + p * 0.45f, -0.57f, -4 + i * 2.7f + Mathf.Sin(p * 0.75f) * 0.08f));
                }
            }
        }

        private void BuildLantern(Vector3 position, float size)
        {
            var lantern = Group("Hanging Lantern", ambience, position);
            lantern.localScale = Vector3.one * size;
            Cylinder("Lantern Cord", lantern, new Vector3(0, 0.7f, 0), 0.025f, 0.55f, palette["gold"], 6);
            Sphere("Silk Lantern", lantern, Vector3.zero, new Vector3(0.83f, 1.12f, 0.83f), palette["lantern"]);
            Cylinder("Lantern Cap", lantern, new Vector3(0, 0.49f, 0), 0.3f, 0.12f, palette["gold"], 10);
            Cylinder("Lantern Foot", lantern, new Vector3(0, -0.48f, 0), 0.26f, 0.12f, palette["gold"], 10);
            for (int i = 0; i < 6; i++)
            {
                float a = i * Mathf.PI / 3;
                Beam("Lantern Rib", lantern, new Vector3(Mathf.Cos(a) * 0.23f, -0.45f, Mathf.Sin(a) * 0.23f), new Vector3(Mathf.Cos(a) * 0.35f, 0.35f, Mathf.Sin(a) * 0.35f), 0.018f, palette["gold"]);
            }
            Cylinder("Silk Tassel", lantern, new Vector3(0, -0.83f, 0), 0.075f, 0.55f, palette["red"], 7);
            lanterns.Add(lantern);
            lanternOrigins.Add(position);
        }

        private void BuildHero()
        {
            hero = Group("Wandering Hero", transform, new Vector3(-0.65f, 0.16f, 0));
            body = Group("Animated Body", hero);
            leftLeg = Group("Left Leg", body, new Vector3(-0.17f, 0.92f, 0));
            rightLeg = Group("Right Leg", body, new Vector3(0.17f, 0.92f, 0));
            foreach (Transform leg in new[] { leftLeg, rightLeg })
            {
                Taper("Silk Trouser", leg, new Vector3(0, -0.26f, 0), 0.15f, 0.1f, 0.57f, 7, palette["white"]);
                Box("Boot", leg, new Vector3(0, -0.72f, -0.065f), new Vector3(0.25f, 0.37f, 0.4f), palette["hair"]);
                Box("Boot Trim", leg, new Vector3(0, -0.565f, -0.02f), new Vector3(0.26f, 0.07f, 0.31f), palette["gold"]);
            }
            Taper("Outer Robe", body, new Vector3(0, 0.96f, 0), 0.57f, 0.31f, 0.92f, 8, costume);
            Taper("Silk Torso", body, new Vector3(0, 1.59f, 0), 0.3f, 0.43f, 0.66f, 8, costume);
            Box("Inner Robe Panel", body, new Vector3(0, 1.03f, -0.4f), new Vector3(0.25f, 0.81f, 0.07f), palette["white"]);
            var lapel = Box("Crossed Silk Lapel", body, new Vector3(-0.09f, 1.64f, -0.32f), new Vector3(0.12f, 0.62f, 0.065f), palette["white"]);
            lapel.localRotation = Quaternion.Euler(0, 0, -29);
            var otherLapel = Box("Gold Collar", body, new Vector3(0.12f, 1.69f, -0.32f), new Vector3(0.065f, 0.55f, 0.075f), palette["gold"]);
            otherLapel.localRotation = Quaternion.Euler(0, 0, 29);
            Taper("Waist Belt", body, new Vector3(0, 1.32f, 0), 0.34f, 0.34f, 0.14f, 8, palette["hair"]);
            Box("Jade Belt Seal", body, new Vector3(0, 1.32f, -0.335f), new Vector3(0.19f, 0.19f, 0.075f), palette["gold"]);
            Box("Belt Jade", body, new Vector3(0, 1.32f, -0.385f), new Vector3(0.1f, 0.12f, 0.025f), palette["jade"]);
            var sash = Box("Long Cinnabar Sash", body, new Vector3(0.33f, 0.97f, -0.33f), new Vector3(0.12f, 0.83f, 0.04f), palette["red"]);
            sash.localRotation = Quaternion.Euler(0, 0, 10);

            leftArm = Group("Left Shoulder", body, new Vector3(-0.43f, 1.77f, 0));
            rightArm = Group("Right Shoulder", body, new Vector3(0.43f, 1.77f, 0));
            for (int side = 0; side < 2; side++)
            {
                Transform arm = side == 0 ? leftArm : rightArm;
                Taper("Wide Sleeve", arm, new Vector3(0, -0.28f, 0), 0.2f, 0.23f, 0.56f, 7, costume);
                Taper("Sleeve Cuff", arm, new Vector3(0, -0.54f, 0), 0.18f, 0.2f, 0.12f, 7, palette["white"]);
                Box("Bracer", arm, new Vector3(0, -0.57f, -0.12f), new Vector3(0.2f, 0.24f, 0.11f), palette["gold"]);
                Sphere("Hand", arm, new Vector3(0, -0.73f, -0.015f), new Vector3(0.19f, 0.23f, 0.19f), palette["skin"]);
                Taper("Layered Shoulder Guard", arm, new Vector3(0, 0.02f, 0), 0.32f, 0.16f, 0.18f, 6, palette["gold"]);
                Taper("Jade Shoulder Plate", arm, new Vector3(0, 0.095f, 0), 0.26f, 0.13f, 0.11f, 6, palette["jade"]);
            }
            Cylinder("Neck", body, new Vector3(0, 1.98f, 0), 0.12f, 0.22f, palette["skin"], 10);
            Sphere("Head", body, new Vector3(0, 2.22f, -0.01f), new Vector3(0.44f, 0.54f, 0.43f), palette["skin"]);
            Sphere("Swept Hair", body, new Vector3(0, 2.39f, 0.045f), new Vector3(0.47f, 0.33f, 0.42f), palette["hair"]);
            Sphere("Hair Knot", body, new Vector3(0, 2.62f, 0.055f), new Vector3(0.23f, 0.3f, 0.22f), palette["hair"]);
            Cylinder("Jade Hair Band", body, new Vector3(0, 2.54f, 0.06f), 0.13f, 0.08f, palette["gold"], 10);
            Beam("Hair Pin", body, new Vector3(-0.24f, 2.57f, 0.06f), new Vector3(0.24f, 2.57f, 0.06f), 0.035f, palette["jade"]);
            Box("Back Hair", body, new Vector3(0, 2.06f, 0.185f), new Vector3(0.3f, 0.54f, 0.08f), palette["hair"]);
            for (int side = -1; side <= 1; side += 2)
            {
                var brow = Box("Eyebrow", body, new Vector3(side * 0.095f, 2.27f, -0.207f), new Vector3(0.115f, 0.027f, 0.025f), palette["hair"]);
                brow.localRotation = Quaternion.Euler(0, 0, side * -9);
                Box("Eye", body, new Vector3(side * 0.093f, 2.224f, -0.219f), new Vector3(0.06f, 0.029f, 0.022f), palette["hair"]);
            }
            Box("Nose", body, new Vector3(0, 2.19f, -0.236f), new Vector3(0.052f, 0.08f, 0.046f), palette["skin"]);
            Box("Mouth", body, new Vector3(0, 2.095f, -0.211f), new Vector3(0.075f, 0.015f, 0.017f), palette["red"]);
            weapon = Group("Career Weapon", rightArm, new Vector3(0, -0.69f, -0.06f));
            offhandWeapon = Group("Career Offhand", leftArm, new Vector3(0, -0.69f, -0.06f));
            slash = MeshObject("Sword Arc", hero, CrescentMesh(), slashMaterial).transform;
            slash.localPosition = new Vector3(0, 1.1f, -0.46f);
            slash.gameObject.SetActive(false);
            offhandSlash = MeshObject("Offhand Sword Arc", hero, CrescentMesh(), slashMaterial).transform;
            offhandSlash.localPosition = new Vector3(0, 1.14f, -0.48f);
            offhandSlash.localScale = new Vector3(-1, 1, 1);
            offhandSlash.gameObject.SetActive(false);
            BuildCareerWeapons();
        }

        private void BuildCareerWeapons()
        {
            careerWeapons[0] = Group("Long Blade", weapon);
            Cylinder("Long Grip", careerWeapons[0], new Vector3(0, 0.03f, 0), 0.055f, 0.4f, palette["hair"], 8);
            Box("Long Guard", careerWeapons[0], new Vector3(0, 0.27f, 0), new Vector3(0.44f, 0.095f, 0.12f), palette["gold"]);
            Taper("Long Jade Blade", careerWeapons[0], new Vector3(0, 1.02f, 0), 0.1f, 0.025f, 1.52f, 4, palette["steel"]);
            Cylinder("Long Pommel", careerWeapons[0], new Vector3(0, -0.18f, 0), 0.08f, 0.1f, palette["gold"], 8);
            Box("Long Tassel", careerWeapons[0], new Vector3(0.05f, -0.43f, 0), new Vector3(0.05f, 0.48f, 0.035f), palette["red"]);

            careerWeapons[1] = Group("Shield Blade", weapon);
            Cylinder("Shield Grip", careerWeapons[1], new Vector3(0, 0.13f, 0), 0.05f, 0.62f, palette["hair"], 8);
            Taper("Shield Edge", careerWeapons[1], new Vector3(0, 0.92f, 0), 0.45f, 0.32f, 0.83f, 8, palette["steel"]);
            Taper("Shield Face", careerWeapons[1], new Vector3(0, 0.96f, -0.08f), 0.35f, 0.21f, 0.64f, 8, palette["jade"]);
            Cylinder("Shield Boss", careerWeapons[1], new Vector3(0, 1.04f, -0.36f), 0.13f, 0.12f, palette["gold"], 10);
            Box("Shield Cinnabar Mark", careerWeapons[1], new Vector3(0, 1.05f, -0.45f), new Vector3(0.1f, 0.3f, 0.035f), palette["red"]);
            careerOffhands[1] = Group("Shield Companion Blade", offhandWeapon);
            Cylinder("Shield Blade Grip", careerOffhands[1], new Vector3(0, 0.03f, 0), 0.05f, 0.34f, palette["hair"], 8);
            Taper("Shield Short Blade", careerOffhands[1], new Vector3(0, 0.6f, 0), 0.08f, 0.02f, 0.84f, 4, palette["steel"]);

            careerWeapons[2] = Group("Twin Blade Right", weapon);
            Cylinder("Twin Right Grip", careerWeapons[2], new Vector3(0, 0.03f, 0), 0.052f, 0.34f, palette["hair"], 8);
            Box("Twin Right Guard", careerWeapons[2], new Vector3(0, 0.22f, 0), new Vector3(0.34f, 0.075f, 0.1f), palette["gold"]);
            Taper("Twin Right Blade", careerWeapons[2], new Vector3(0, 0.69f, 0), 0.09f, 0.022f, 0.92f, 4, palette["steel"]);
            careerOffhands[2] = Group("Twin Blade Left", offhandWeapon);
            Cylinder("Twin Left Grip", careerOffhands[2], new Vector3(0, 0.03f, 0), 0.052f, 0.34f, palette["hair"], 8);
            Box("Twin Left Guard", careerOffhands[2], new Vector3(0, 0.22f, 0), new Vector3(0.34f, 0.075f, 0.1f), palette["gold"]);
            Taper("Twin Left Blade", careerOffhands[2], new Vector3(0, 0.69f, 0), 0.09f, 0.022f, 0.92f, 4, palette["steel"]);
        }

        private void SetCareer(int career)
        {
            heroArt?.SetCareer(career);
            int nextCareer = ((career % 3) + 3) % 3;
            bool changed = careerIndex != nextCareer;
            careerIndex = nextCareer;
            if (changed)
            {
                actionTime = 0;
                slash.gameObject.SetActive(false);
                offhandSlash.gameObject.SetActive(false);
            }
            costume.color = careerIndex == 0 ? new Color(0.13f, 0.44f, 0.43f) : careerIndex == 1 ? new Color(0.71f, 0.29f, 0.22f) : new Color(0.4f, 0.5f, 0.71f);
            for (int i = 0; i < careerWeapons.Length; i++) if (careerWeapons[i] != null) careerWeapons[i].gameObject.SetActive(i == careerIndex);
            for (int i = 0; i < careerOffhands.Length; i++) if (careerOffhands[i] != null) careerOffhands[i].gameObject.SetActive(i == careerIndex);
        }

        private void BuildCompanion()
        {
            companion = Group("Active Spirit Companion", transform, new Vector3(1.05f, 0.2f, 0.25f));
            petModels[0] = Group("砾灵", companion);
            Sphere("砾灵 Core", petModels[0], new Vector3(0, 0.66f, 0), new Vector3(0.62f, 0.66f, 0.62f), palette["rock"]);
            Sphere("砾灵 Facet", petModels[0], new Vector3(-0.18f, 0.91f, -0.24f), new Vector3(0.35f, 0.38f, 0.28f), palette["stoneLight"]);
            Taper("砾灵 Crown", petModels[0], new Vector3(0, 1.32f, 0), 0.34f, 0.09f, 0.46f, 5, palette["jade"]);
            for (int side = -1; side <= 1; side += 2)
            {
                var eye = Sphere("砾灵 Eye", petModels[0], new Vector3(side * 0.19f, 0.94f, -0.46f), new Vector3(0.095f, 0.1f, 0.045f), palette["gold"]);
                eye.localScale = new Vector3(0.075f, 0.12f, 0.04f);
                Box("砾灵 Arm", petModels[0], new Vector3(side * 0.57f, 0.63f, -0.01f), new Vector3(0.22f, 0.48f, 0.25f), palette["rock"]);
            }
            var stoneFoot = Taper("砾灵 Foot", petModels[0], new Vector3(0, 0.12f, 0), 0.5f, 0.36f, 0.2f, 6, palette["stoneDark"]);
            stoneFoot.localScale = new Vector3(1.1f, 1, 0.85f);
            Ring("砾灵 Rune", petModels[0], new Vector3(0, 0.67f, -0.5f), 0.17f, 0.22f, palette["gold"], 16).localRotation = Quaternion.Euler(90, 0, 0);

            petModels[1] = Group("灯灵", companion);
            Cylinder("灯灵 Base", petModels[1], new Vector3(0, 0.26f, 0), 0.37f, 0.32f, palette["red"], 10);
            Cylinder("灯灵 Stem", petModels[1], new Vector3(0, 0.78f, 0), 0.13f, 0.9f, palette["gold"], 8);
            Sphere("灯灵 Flame", petModels[1], new Vector3(0, 1.48f, 0), new Vector3(0.34f, 0.62f, 0.34f), palette["lantern"]);
            Taper("灯灵 Flame Tip", petModels[1], new Vector3(0, 1.96f, 0), 0.2f, 0, 0.48f, 5, palette["gold"]);
            Sphere("灯灵 Jade Halo", petModels[1], new Vector3(0, 1.48f, 0), new Vector3(0.57f, 0.18f, 0.57f), palette["jade"]);
            Cylinder("灯灵 Cap", petModels[1], new Vector3(0, 2.04f, 0), 0.29f, 0.1f, palette["gold"], 10);
            var tassel = Box("灯灵 Tassel", petModels[1], new Vector3(0, -0.06f, -0.25f), new Vector3(0.06f, 0.55f, 0.045f), palette["red"]);
            tassel.localRotation = Quaternion.Euler(14, 0, 0);
            petPulse = Ring("Companion Command Pulse", companion, new Vector3(0, 0.64f, 0), 0.55f, 0.64f, petPulseMaterial, 32);
            petPulse.localRotation = Quaternion.Euler(90, 0, 0);
            petPulse.localScale = Vector3.zero;
            petPulse.gameObject.SetActive(false);
        }

        private void BuildGuide()
        {
            guide = Group("情花", transform, new Vector3(-3.55f, 0.2f, 8.65f));
            Taper("Guide Robe", guide, new Vector3(0, 0.95f, 0), 0.48f, 0.27f, 1.05f, 8, palette["guideSilk"]);
            Box("Guide Sash", guide, new Vector3(0, 1.18f, -0.31f), new Vector3(0.11f, 0.72f, 0.04f), palette["gold"]);
            Sphere("Guide Head", guide, new Vector3(0, 1.78f, 0), new Vector3(0.4f, 0.5f, 0.39f), palette["skin"]);
            Sphere("Guide Hair", guide, new Vector3(0, 1.97f, 0.03f), new Vector3(0.44f, 0.31f, 0.4f), palette["hair"]);
            Taper("Guide Flower Hairpin", guide, new Vector3(0, 2.24f, -0.02f), 0.13f, 0, 0.36f, 5, palette["red"]);
            Ring("Guide Flower", guide, new Vector3(0, 2.23f, -0.06f), 0.1f, 0.25f, palette["gold"], 12).localRotation = Quaternion.Euler(90, 0, 0);
            for (int side = -1; side <= 1; side += 2)
            {
                Sphere("Guide Eye", guide, new Vector3(side * 0.095f, 1.82f, -0.188f), new Vector3(0.05f, 0.06f, 0.025f), palette["hair"]);
                Box("Guide Sleeve", guide, new Vector3(side * 0.42f, 1.32f, 0), new Vector3(0.22f, 0.58f, 0.24f), palette["guideSilk"]);
            }
            Sphere("Guide Lantern", guide, new Vector3(0.48f, 0.7f, -0.12f), new Vector3(0.18f, 0.29f, 0.18f), palette["lantern"]);
        }

        private void BuildPetals()
        {
            var particleObject = new GameObject("Windblown Leaves", typeof(ParticleSystem));
            particleObject.transform.SetParent(ambience, false);
            particleObject.transform.localPosition = new Vector3(-5, 4.5f, 5);
            var particles = particleObject.GetComponent<ParticleSystem>();
            particles.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var main = particles.main;
            main.startLifetime = 8;
            main.startSpeed = 0;
            main.startSize = new ParticleSystem.MinMaxCurve(0.035f, 0.085f);
            main.startColor = new Color(0.8f, 0.72f, 0.35f, 0.67f);
            main.maxParticles = 45;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            var emission = particles.emission;
            emission.rateOverTime = 4;
            var shape = particles.shape;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.scale = new Vector3(17, 3, 20);
            var velocity = particles.velocityOverLifetime;
            velocity.enabled = true;
            velocity.space = ParticleSystemSimulationSpace.World;
            velocity.x = 0.48f;
            velocity.y = -0.37f;
            velocity.z = -0.18f;
            var rotation = particles.rotationOverLifetime;
            rotation.enabled = true;
            rotation.z = new ParticleSystem.MinMaxCurve(-1.6f, 1.6f);
            var color = particles.colorOverLifetime;
            color.enabled = true;
            var gradient = new Gradient();
            gradient.SetKeys(new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(Color.white, 1) }, new[] { new GradientAlphaKey(0, 0), new GradientAlphaKey(0.6f, 0.15f), new GradientAlphaKey(0.5f, 0.8f), new GradientAlphaKey(0, 1) });
            color.color = gradient;
            var renderer = particles.GetComponent<ParticleSystemRenderer>();
            renderer.sharedMaterial = TransparentMaterial("Falling Leaves", new Color(0.76f, 0.7f, 0.4f, 0.6f), true);
            renderer.shadowCastingMode = ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            particles.Play();
        }

        private void Update()
        {
            if (!ready) return;
            float dt = Mathf.Min(Time.deltaTime, 0.05f);
            float time = Time.time;
            bool walkingMode = IsExploring && !movementDisabled;
            Vector3 motion = walkingMode ? (scriptedMotion.sqrMagnitude > 0.0001f ? scriptedMotion : MoveDirection() * 5.2f) : Vector3.zero;
            float speed = Mathf.Clamp01(motion.magnitude / 5.2f);
            heroArt?.Move(speed);
            if (motion.sqrMagnitude > 0.001f)
            {
                facing = motion.normalized;
                hero.localPosition += motion * dt;
                hero.rotation = Quaternion.Slerp(hero.rotation, Quaternion.LookRotation(-facing, Vector3.up), 10 * dt);
            }
            // Scripted motion is consumed once per frame.  The combat system
            // will provide the next waypoint velocity on its next update.
            scriptedMotion = Vector3.zero;
            if (dodgeTime > 0)
            {
                dodgeTime = Mathf.Max(0, dodgeTime - dt);
                if (walkingMode) hero.localPosition += dodgeDirection * (9.5f * dt);
            }
            Vector3 heroPosition = hero.localPosition;
            if (realms != null) heroPosition = realms.ConstrainPosition(heroPosition);
            else
            {
                heroPosition.x = Mathf.Clamp(heroPosition.x, -5.5f, 5.5f);
                heroPosition.z = Mathf.Clamp(heroPosition.z, -4.5f, 10);
                heroPosition.y = 0.16f;
            }
            hero.localPosition = heroPosition;
            gait += dt * (speed > 0.01f ? 10 : 1.6f);
            float stride = Mathf.Sin(gait) * speed * 24;
            body.localPosition = new Vector3(0, Mathf.Sin(gait * 2) * speed * 0.035f + Mathf.Sin(time * 1.7f) * 0.008f, 0);
            body.localRotation = Quaternion.Euler(dodgeTime > 0 ? -23 : 0, 0, dodgeTime > 0 ? -16 : 0);
            leftLeg.localRotation = Quaternion.Euler(stride, 0, 0);
            rightLeg.localRotation = Quaternion.Euler(-stride, 0, 0);
            leftArm.localRotation = Quaternion.Euler(-stride * 0.75f - 5, 0, -7);
            rightArm.localRotation = Quaternion.Euler(stride * 0.55f - 8, 0, 9);
            if (actionTime > 0)
            {
                actionTime = Mathf.Max(0, actionTime - dt);
                float progress = 1 - actionTime / actionDuration;
                float swing = Mathf.Sin(progress * Mathf.PI);
                rightArm.localRotation = Quaternion.Euler(-75 * swing - 8, -60 * swing, -95 * swing + 9);
                if (careerIndex == 2) leftArm.localRotation = Quaternion.Euler(64 * swing + 5, 58 * swing, 92 * swing - 7);
                body.localRotation = Quaternion.Euler(0, Mathf.Sin(progress * Mathf.PI * 2) * 19, 0);
                slash.localRotation = Quaternion.Euler(57, -15 + progress * 100, -42 + progress * 152);
                slash.localScale = Vector3.one * (0.75f + progress * 0.65f);
                offhandSlash.localRotation = Quaternion.Euler(57, 15 - progress * 100, 42 - progress * 152);
                offhandSlash.localScale = Vector3.one * (0.75f + progress * 0.65f);
                slashMaterial.color = new Color(0.62f, 1, 0.83f, swing * 0.64f);
                if (actionTime <= 0)
                {
                    slash.gameObject.SetActive(false);
                    offhandSlash.gameObject.SetActive(false);
                }
            }
            Vector3 companionGoal = hero.TransformPoint(new Vector3(1.5f, 0.19f, 0.45f));
            Vector3 petTravel = companionGoal - companion.position;
            petTravel.y = 0;
            companion.position = Vector3.Lerp(companion.position, companionGoal, 3 * dt);
            if (petTravel.sqrMagnitude > .08f)
                companion.rotation = Quaternion.Slerp(companion.rotation, Quaternion.LookRotation(petTravel), 5 * dt);
            if (petIndex >= 0 && petIndex < petArt.Length) petArt[petIndex]?.Move(speed);
            if (petActionTime > 0)
            {
                petActionTime = Mathf.Max(0, petActionTime - dt);
                float progress = 1 - petActionTime / 0.95f;
                float pulse = Mathf.Sin(Mathf.Min(1, progress) * Mathf.PI);
                petPulse.localScale = Vector3.one * (0.58f + progress * 1.25f);
                petPulseMaterial.color = new Color(0.68f, 0.96f, 0.75f, pulse * 0.72f);
                petModels[petIndex].localPosition = new Vector3(0, Mathf.Sin(progress * Mathf.PI) * 0.22f, 0);
                petModels[petIndex].localRotation = Quaternion.Euler(0, progress * 260, progress * 16);
                if (petActionTime <= 0)
                {
                    petPulse.gameObject.SetActive(false);
                    petModels[petIndex].localPosition = Vector3.zero;
                    petModels[petIndex].localRotation = Quaternion.identity;
                }
            }
            for (int i = 0; i < lanterns.Count; i++)
            {
                lanterns[i].localPosition = lanternOrigins[i] + new Vector3(0, Mathf.Sin(time * 0.9f + i) * 0.015f, 0);
                lanterns[i].localRotation = Quaternion.Euler(Mathf.Sin(time * 0.7f + i) * 2.5f, 0, Mathf.Sin(time * 0.84f + i * 1.7f) * 3.3f);
            }
            if (waterVertices != null && time >= nextWaterFrame)
            {
                nextWaterFrame = time + 0.08f;
                for (int i = 0; i < waterVertices.Length; i++)
                {
                    Vector3 p = waterOriginal[i];
                    p.y += Mathf.Sin(p.x * 0.5f + time * 0.65f) * Mathf.Cos(p.z * 0.4f + time * 0.4f) * 0.034f;
                    waterVertices[i] = p;
                }
                waterMesh.vertices = waterVertices;
                waterMesh.RecalculateNormals();
            }
        }

        private void LateUpdate()
        {
            if (!ready || sceneCamera == null) return;
            float dt = Mathf.Min(Time.deltaTime, 0.05f);
            if(portraitCloseup)
            {
                // Use the actual imported head bone instead of a hard-coded world
                // height. Different female outfits and hairstyles have slightly
                // different proportions; the bone keeps the face in frame for all
                // of them. The portrait is shifted left so the editor controls on
                // the right never cover the eyes and cheeks.
                Vector3 face = heroArt != null ? heroArt.PortraitFocus : hero.position + Vector3.up * 2.25f;
                Vector3 side = heroArt != null ? heroArt.transform.right : Vector3.right;
                Vector3 focus = face + side * .18f + Vector3.up * .015f;
                Vector3 forward = heroArt != null ? heroArt.PortraitForward : hero.forward;
                forward.y = 0;
                if (forward.sqrMagnitude < .001f) forward = Vector3.forward;
                forward.Normalize();
                Vector3 cameraPosition = focus - forward * 1.18f + Vector3.up * .025f;
                sceneCamera.transform.position = Vector3.SmoothDamp(sceneCamera.transform.position, cameraPosition, ref cameraVelocity, .10f, 80, dt);
                cameraFocus = Vector3.Lerp(cameraFocus, focus, 1 - Mathf.Exp(-16 * dt));
                sceneCamera.transform.LookAt(cameraFocus);
                sceneCamera.nearClipPlane = .03f;
                sceneCamera.fieldOfView = PresentationFieldOfView(29);
                return;
            }
            if (currentMode == "home")
            {
                Vector3 target = hero.position + Vector3.up * 1.4f;
                cameraFocus = Vector3.Lerp(cameraFocus, target, 1 - Mathf.Exp(-12 * dt));
                Vector3 offset = Quaternion.Euler(cameraPitch, cameraYaw, 0) * new Vector3(0, 0, -cameraDistance);
                sceneCamera.transform.position = Vector3.SmoothDamp(sceneCamera.transform.position, cameraFocus + offset, ref cameraVelocity, .12f, 120, dt);
                sceneCamera.transform.LookAt(cameraFocus);
                sceneCamera.fieldOfView = Mathf.Lerp(sceneCamera.fieldOfView, 52, 1 - Mathf.Exp(-8 * dt));
                return;
            }
            Vector3 follow = currentMode == "home" || currentMode == "mountains"
                ? hero.localPosition - new Vector3(-0.65f, 0.16f, 0)
                : Vector3.zero;
            sceneCamera.transform.position = Vector3.SmoothDamp(sceneCamera.transform.position, cameraGoal + follow * 0.72f, ref cameraVelocity, 0.55f, 60, dt);
            cameraFocus = Vector3.Lerp(cameraFocus, focusGoal + follow * 0.84f, 1 - Mathf.Exp(-6 * dt));
            sceneCamera.transform.LookAt(cameraFocus);
            float targetFov = currentMode == "character" ? PresentationFieldOfView(lensGoal) : lensGoal;
            sceneCamera.fieldOfView = Mathf.Lerp(sceneCamera.fieldOfView, targetFov, 1 - Mathf.Exp(-5 * dt));
        }

        private static float PresentationFieldOfView(float fieldOfView)
        {
            // The world is full bleed, while character controls fit a safe 16:9 canvas.
            float contentHeight = Mathf.Min(Screen.safeArea.height, Screen.safeArea.width * 720f / 1280f);
            float ratio = Screen.height / Mathf.Max(1, contentHeight);
            return 2 * Mathf.Atan(Mathf.Tan(fieldOfView * Mathf.Deg2Rad * .5f) * ratio) * Mathf.Rad2Deg;
        }

        private Vector3 MoveDirection()
        {
            if (sceneCamera == null) return Vector3.zero;
            Vector3 right = sceneCamera.transform.right;
            Vector3 forward = sceneCamera.transform.forward;
            right.y = forward.y = 0;
            return right.normalized * moveInput.x + forward.normalized * moveInput.y;
        }

        private void Roof(Transform parent, Vector3 position, float width, float depth, float height)
        {
            const int segmentsX = 20;
            const int segmentsZ = 12;
            var vertices = new Vector3[(segmentsX + 1) * (segmentsZ + 1)];
            var triangles = new int[segmentsX * segmentsZ * 6];
            var uv = new Vector2[vertices.Length];
            int t = 0;
            for (int z = 0; z <= segmentsZ; z++)
            {
                for (int x = 0; x <= segmentsX; x++)
                {
                    float px = x / (float)segmentsX * 2 - 1;
                    float pz = z / (float)segmentsZ * 2 - 1;
                    int index = z * (segmentsX + 1) + x;
                    vertices[index] = RoofPoint(px, pz, width, depth, height);
                    uv[index] = new Vector2(x / (float)segmentsX, z / (float)segmentsZ);
                    if (x == segmentsX || z == segmentsZ) continue;
                    triangles[t++] = index;
                    triangles[t++] = index + segmentsX + 1;
                    triangles[t++] = index + 1;
                    triangles[t++] = index + 1;
                    triangles[t++] = index + segmentsX + 1;
                    triangles[t++] = index + segmentsX + 2;
                }
            }
            Transform roof = Group("Sweeping Tiled Roof", parent, position);
            MeshObject("Curved Roof", roof, MakeMesh("Roof", vertices, triangles, uv), palette["roof"]);
            Box("Roof Soffit", roof, new Vector3(0, 0.16f, 0), new Vector3(width * 0.83f, 0.15f, depth * 0.71f), palette["wood"]);
            for (int side = -1; side <= 1; side += 2)
            {
                for (int x = 0; x < segmentsX; x++)
                {
                    float a = x / (float)segmentsX * 2 - 1;
                    float b = (x + 1) / (float)segmentsX * 2 - 1;
                    Beam("Curved Eave", roof, RoofPoint(a, side, width, depth, height), RoofPoint(b, side, width, depth, height), 0.095f, palette["roofEdge"]);
                }
                for (int z = 0; z < segmentsZ; z++)
                {
                    float a = z / (float)segmentsZ * 2 - 1;
                    float b = (z + 1) / (float)segmentsZ * 2 - 1;
                    Beam("Roof Verge", roof, RoofPoint(side, a, width, depth, height), RoofPoint(side, b, width, depth, height), 0.07f, palette["roofEdge"]);
                }
                for (int x = 1; x < segmentsX; x++)
                {
                    float px = x / (float)segmentsX * 2 - 1;
                    for (int z = 0; z < 4; z++)
                    {
                        Vector3 a = RoofPoint(px, side * z / 4f, width, depth, height) + Vector3.up * 0.026f;
                        Vector3 b = RoofPoint(px, side * (z + 1) / 4f, width, depth, height) + Vector3.up * 0.026f;
                        Beam("Tile Ridge", roof, a, b, 0.026f, palette["roofEdge"]);
                    }
                }
            }
            Beam("Roof Spine", roof, new Vector3(-width * 0.49f, height + 0.035f, 0), new Vector3(width * 0.49f, height + 0.035f, 0), 0.1f, palette["gold"]);
            for (int side = -1; side <= 1; side += 2)
            {
                Beam("Ridge Horn", roof, new Vector3(side * width * 0.48f, height, 0), new Vector3(side * width * 0.52f, height + 0.32f, 0), 0.095f, palette["gold"]);
            }
        }

        private static Vector3 RoofPoint(float x, float z, float width, float depth, float height)
        {
            float edge = Mathf.Abs(z);
            float rise = height * Mathf.Pow(1 - edge, 1.35f) + height * 0.28f * Mathf.Pow(edge, 5) + Mathf.Pow(Mathf.Abs(x), 6) * Mathf.Pow(edge, 2) * Mathf.Min(height * 0.48f, 0.52f);
            return new Vector3(x * width * 0.5f, rise, z * depth * 0.5f);
        }

        private void Mountain(Transform parent, Vector3 position, Vector3 size, int seed, Material material)
        {
            const int rings = 7;
            const int segments = 11;
            var vertices = new Vector3[(rings + 1) * segments];
            var triangles = new int[rings * segments * 6];
            var rng = new System.Random(seed);
            float[] radii = new float[segments];
            for (int i = 0; i < segments; i++) radii[i] = 0.75f + (float)rng.NextDouble() * 0.34f;
            int index = 0;
            for (int ring = 0; ring <= rings; ring++)
            {
                float h = ring / (float)rings;
                float radius = Mathf.Pow(1 - h, 0.66f) * (ring % 2 == 0 ? 1 : 0.83f);
                for (int i = 0; i < segments; i++)
                {
                    float a = i * Mathf.PI * 2 / segments;
                    vertices[ring * segments + i] = new Vector3(Mathf.Cos(a) * radius * radii[i] + h * 0.16f, h, Mathf.Sin(a) * radius * radii[i] - h * 0.08f);
                    if (ring == rings) continue;
                    int v = ring * segments + i;
                    int n = ring * segments + (i + 1) % segments;
                    triangles[index++] = v;
                    triangles[index++] = v + segments;
                    triangles[index++] = n;
                    triangles[index++] = n;
                    triangles[index++] = v + segments;
                    triangles[index++] = n + segments;
                }
            }
            var mountain = MeshObject("Karst Stone", parent, MakeMesh("Karst Peak", vertices, triangles, null), material).transform;
            mountain.localPosition = position;
            mountain.localScale = size;
        }

        private Transform Taper(string name, Transform parent, Vector3 position, float bottomRadius, float topRadius, float height, int sides, Material material)
        {
            var vertices = new Vector3[sides * 2 + 2];
            var triangles = new int[sides * 12];
            int t = 0;
            for (int i = 0; i < sides; i++)
            {
                float a = i * Mathf.PI * 2 / sides;
                vertices[i] = new Vector3(Mathf.Cos(a) * bottomRadius, -height * 0.5f, Mathf.Sin(a) * bottomRadius);
                vertices[i + sides] = new Vector3(Mathf.Cos(a) * topRadius, height * 0.5f, Mathf.Sin(a) * topRadius);
                int n = (i + 1) % sides;
                triangles[t++] = i;
                triangles[t++] = i + sides;
                triangles[t++] = n;
                triangles[t++] = n;
                triangles[t++] = i + sides;
                triangles[t++] = n + sides;
                triangles[t++] = sides * 2;
                triangles[t++] = i;
                triangles[t++] = n;
                triangles[t++] = sides * 2 + 1;
                triangles[t++] = n + sides;
                triangles[t++] = i + sides;
            }
            vertices[sides * 2] = Vector3.down * height * 0.5f;
            vertices[sides * 2 + 1] = Vector3.up * height * 0.5f;
            Transform part = MeshObject(name, parent, MakeMesh(name, vertices, triangles, null), material).transform;
            part.localPosition = position;
            return part;
        }

        private Transform Cylinder(string name, Transform parent, Vector3 position, float radius, float height, Material material, int sides = 12)
        {
            return Taper(name, parent, position, radius, radius, height, sides, material);
        }

        private Transform Beam(string name, Transform parent, Vector3 from, Vector3 to, float radius, Material material)
        {
            Transform beam = Cylinder(name, parent, (from + to) * 0.5f, radius, Vector3.Distance(from, to), material, 6);
            beam.localRotation = Quaternion.FromToRotation(Vector3.up, to - from);
            return beam;
        }

        private Transform Ring(string name, Transform parent, Vector3 position, float inner, float outer, Material material, int sides)
        {
            var vertices = new Vector3[sides * 2];
            var triangles = new int[sides * 6];
            for (int i = 0; i < sides; i++)
            {
                float a = i * Mathf.PI * 2 / sides;
                vertices[i * 2] = new Vector3(Mathf.Cos(a) * inner, 0, Mathf.Sin(a) * inner);
                vertices[i * 2 + 1] = new Vector3(Mathf.Cos(a) * outer, 0, Mathf.Sin(a) * outer);
                int next = ((i + 1) % sides) * 2;
                int t = i * 6;
                triangles[t] = i * 2;
                triangles[t + 1] = next;
                triangles[t + 2] = i * 2 + 1;
                triangles[t + 3] = i * 2 + 1;
                triangles[t + 4] = next;
                triangles[t + 5] = next + 1;
            }
            Transform ring = MeshObject(name, parent, MakeMesh(name, vertices, triangles, null), material).transform;
            ring.localPosition = position;
            return ring;
        }

        private Mesh CrescentMesh()
        {
            const int segments = 32;
            var vertices = new Vector3[(segments + 1) * 2];
            var triangles = new int[segments * 12];
            for (int i = 0; i <= segments; i++)
            {
                float portion = i / (float)segments;
                float a = Mathf.Lerp(-115, 115, portion) * Mathf.Deg2Rad;
                float thickness = Mathf.Sin(portion * Mathf.PI) * 0.26f;
                Vector3 direction = new Vector3(Mathf.Cos(a), Mathf.Sin(a), 0);
                vertices[i * 2] = direction * (1.45f - thickness);
                vertices[i * 2 + 1] = direction * 1.45f;
                if (i == segments) continue;
                int t = i * 12;
                int v = i * 2;
                triangles[t] = v;
                triangles[t + 1] = v + 1;
                triangles[t + 2] = v + 2;
                triangles[t + 3] = v + 1;
                triangles[t + 4] = v + 3;
                triangles[t + 5] = v + 2;
                triangles[t + 6] = v + 2;
                triangles[t + 7] = v + 1;
                triangles[t + 8] = v;
                triangles[t + 9] = v + 2;
                triangles[t + 10] = v + 3;
                triangles[t + 11] = v + 1;
            }
            return MakeMesh("Sword Crescent", vertices, triangles, null);
        }

        private static Transform Group(string name, Transform parent, Vector3 position = default(Vector3))
        {
            var group = new GameObject(name).transform;
            group.SetParent(parent, false);
            group.localPosition = position;
            return group;
        }

        private Transform Box(string name, Transform parent, Vector3 position, Vector3 scale, Material material)
        {
            return Primitive(name, PrimitiveType.Cube, parent, position, scale, material);
        }

        private Transform Sphere(string name, Transform parent, Vector3 position, Vector3 scale, Material material)
        {
            return Primitive(name, PrimitiveType.Sphere, parent, position, scale, material);
        }

        private static Transform Primitive(string name, PrimitiveType type, Transform parent, Vector3 position, Vector3 scale, Material material)
        {
            var part = GameObject.CreatePrimitive(type);
            part.name = name;
            part.transform.SetParent(parent, false);
            part.transform.localPosition = position;
            part.transform.localScale = scale;
            part.GetComponent<MeshRenderer>().sharedMaterial = material;
            var collider = part.GetComponent<Collider>();
            if (collider != null) Destroy(collider);
            return part.transform;
        }

        private GameObject MeshObject(string name, Transform parent, Mesh mesh, Material material)
        {
            var go = new GameObject(name, typeof(MeshFilter), typeof(MeshRenderer));
            go.transform.SetParent(parent, false);
            go.GetComponent<MeshFilter>().sharedMesh = mesh;
            go.GetComponent<MeshRenderer>().sharedMaterial = material;
            return go;
        }

        private Mesh MakeMesh(string name, Vector3[] vertices, int[] triangles, Vector2[] uv)
        {
            var mesh = new Mesh { name = name };
            if (vertices.Length > 65535) mesh.indexFormat = IndexFormat.UInt32;
            mesh.vertices = vertices;
            mesh.triangles = triangles;
            if (uv != null) mesh.uv = uv;
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            ownedAssets.Add(mesh);
            return mesh;
        }

        private void AddMaterial(string name, Color color, float smoothness, float metallic = 0)
        {
            palette.Add(name, NewMaterial(name, color, smoothness, metallic));
        }

        private Material NewMaterial(string name, Color color, float smoothness, float metallic)
        {
            Shader shader = Shader.Find("Standard");
            if (shader == null) shader = Shader.Find("Legacy Shaders/Diffuse");
            var material = new Material(shader) { name = name, color = color, enableInstancing = true };
            if (material.HasProperty("_Glossiness")) material.SetFloat("_Glossiness", smoothness);
            if (material.HasProperty("_Metallic")) material.SetFloat("_Metallic", metallic);
            ownedAssets.Add(material);
            return material;
        }

        private Material TransparentMaterial(string name, Color color, bool unlit)
        {
            Shader shader = Shader.Find(unlit ? "Sprites/Default" : "Standard");
            if (shader == null) shader = Shader.Find("Unlit/Color");
            var material = new Material(shader) { name = name, color = color };
            if (!unlit)
            {
                material.SetFloat("_Mode", 3);
                material.SetInt("_SrcBlend", (int)BlendMode.One);
                material.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha);
                material.SetInt("_ZWrite", 0);
                material.DisableKeyword("_ALPHATEST_ON");
                material.DisableKeyword("_ALPHABLEND_ON");
                material.EnableKeyword("_ALPHAPREMULTIPLY_ON");
                material.renderQueue = (int)RenderQueue.Transparent;
            }
            ownedAssets.Add(material);
            return material;
        }

        private void CombineArchitecture()
        {
            // Bake static details by material; roofs keep their silhouette without hundreds of draw calls.
            var groups = new Dictionary<Material, List<CombineInstance>>();
            var filters = architecture.GetComponentsInChildren<MeshFilter>();
            foreach (var filter in filters)
            {
                var renderer = filter.GetComponent<MeshRenderer>();
                if (renderer == null || filter.sharedMesh == null) continue;
                Material material = renderer.sharedMaterial;
                if (!groups.TryGetValue(material, out var instances))
                {
                    instances = new List<CombineInstance>();
                    groups.Add(material, instances);
                }
                instances.Add(new CombineInstance { mesh = filter.sharedMesh, transform = architecture.worldToLocalMatrix * filter.transform.localToWorldMatrix });
                renderer.enabled = false;
            }
            foreach (var pair in groups)
            {
                var mesh = new Mesh { name = "Baked " + pair.Key.name, indexFormat = IndexFormat.UInt32 };
                mesh.CombineMeshes(pair.Value.ToArray(), true, true);
                ownedAssets.Add(mesh);
                MeshObject(mesh.name, architecture, mesh, pair.Key);
            }
        }

        private void OnDestroy()
        {
            foreach (UnityEngine.Object asset in ownedAssets)
                if (asset != null) Destroy(asset);
            ownedAssets.Clear();
        }
    }
}
