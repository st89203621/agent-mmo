using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;
using UnityEngine.Rendering;

namespace Lunhui.Prototype
{
    public static class CharacterArtSetup
    {
        private const string Source = "Assets/_Game/Art/CharacterSources";
        private const string Generated = "Assets/_Game/Art/CharacterGenerated";
        private const string Prefabs = "Assets/_Game/Resources/Art/Characters/Prefabs";
        private static readonly Dictionary<string, Material> Materials = new Dictionary<string, Material>();
        private static readonly Dictionary<int,Texture2D> SilkTextures = new Dictionary<int,Texture2D>();

        [MenuItem("Lunhui/Build Character Art")]
        public static void BuildAssets()
        {
            Directory.CreateDirectory(Generated + "/Materials");
            Directory.CreateDirectory(Generated + "/Meshes");
            Directory.CreateDirectory(Prefabs);
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            Materials.Clear();
            SilkTextures.Clear();
            ConfigureTextures();
            ConfigureModels();
            var controller = BuildController();
            BuildCharacter("Career0", "Male_Ranger", false, "Hair_SimpleParted", 0, controller);
            BuildCharacter("Career1", "Male_Ranger", false, "Hair_Buzzed", 1, controller);
            BuildCharacter("Career2", "Female_Ranger", true, "Hair_Buns", 2, controller);
            BuildCharacter("Guide", "Female_Peasant", true, "Hair_Long", 3, controller);
            BuildCharacter("Female0", "Female_Ranger", true, "Hair_Long", 0, controller);
            BuildCharacter("Female1", "Female_Ranger", true, "Hair_SimpleParted", 1, controller);
            BuildCharacter("Female2", "Female_Ranger", true, "Hair_Buns", 2, controller);
            AssetDatabase.SaveAssets();
            Debug.Log("CHARACTER_ART_COMPLETE: 3 outfitted heroes and Qinghua with humanoid locomotion, attack, spell and roll animations.");
        }

        private static void ConfigureTextures()
        {
            foreach (string path in Directory.GetFiles(Source + "/Textures", "*.png"))
            {
                var importer = (TextureImporter)AssetImporter.GetAtPath(path.Replace('\\', '/'));
                bool normal = path.IndexOf("Normal", StringComparison.OrdinalIgnoreCase) >= 0;
                importer.textureType = normal ? TextureImporterType.NormalMap : TextureImporterType.Default;
                importer.sRGBTexture = !normal && path.IndexOf("ORM", StringComparison.Ordinal) < 0;
                importer.alphaSource = TextureImporterAlphaSource.FromInput;
                importer.mipmapEnabled = true;
                importer.maxTextureSize = path.Contains("Ranger") || path.Contains("Peasant") ? 2048 : 1024;
                importer.textureCompression = TextureImporterCompression.Compressed;
                // The outfit pack supplies DirectX normals; the base pack includes OpenGL variants.
                importer.flipGreenChannel = normal && !Path.GetFileName(path).StartsWith("GL_", StringComparison.Ordinal);
                var android = importer.GetPlatformTextureSettings("Android");
                android.overridden = true;
                android.maxTextureSize = importer.maxTextureSize;
                android.format = TextureImporterFormat.ASTC_6x6;
                android.compressionQuality = 70;
                importer.SetPlatformTextureSettings(android);
                importer.SaveAndReimport();
            }
        }

        private static void ConfigureModels()
        {
            foreach (string path in Directory.GetFiles(Source, "*.fbx", SearchOption.AllDirectories))
            {
                var importer = (ModelImporter)AssetImporter.GetAtPath(path.Replace('\\', '/'));
                bool animation = path.Contains("Animations");
                bool humanoid = animation || path.Contains("Ranger");
                importer.animationType = humanoid ? ModelImporterAnimationType.Human : ModelImporterAnimationType.Generic;
                importer.avatarSetup = humanoid ? ModelImporterAvatarSetup.CreateFromThisModel : ModelImporterAvatarSetup.NoAvatar;
                importer.importAnimation = animation;
                importer.isReadable = true;
                importer.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
                importer.importCameras = false;
                importer.importLights = false;
                importer.meshCompression = ModelImporterMeshCompression.Low;
                importer.optimizeGameObjects = false;
                if (animation)
                {
                    var clips = importer.defaultClipAnimations;
                    foreach (var clip in clips)
                    {
                        clip.loopTime = clip.name.Contains("Loop") || clip.name == "Sword_Idle";
                        clip.keepOriginalOrientation = true;
                        clip.keepOriginalPositionXZ = true;
                        clip.keepOriginalPositionY = true;
                        clip.lockRootRotation = true;
                        clip.lockRootPositionXZ = true;
                        clip.lockRootHeightY = true;
                    }
                    importer.clipAnimations = clips;
                }
                importer.SaveAndReimport();
            }
        }

        private static AnimatorController BuildController()
        {
            string path = Generated + "/Character.controller";
            var controller = AssetDatabase.LoadAssetAtPath<AnimatorController>(path);
            if (controller == null) controller = AnimatorController.CreateAnimatorControllerAtPath(path);
            if (controller.layers.Length == 0) controller.AddLayer("Base Layer");
            foreach (var parameter in controller.parameters) controller.RemoveParameter(parameter);
            controller.AddParameter("MoveSpeed", AnimatorControllerParameterType.Float);
            var machine = controller.layers[0].stateMachine;
            foreach (var state in machine.states) machine.RemoveState(state.state);
            var clips = AssetDatabase.LoadAllAssetsAtPath(Source + "/Animations/UAL1_Standard.fbx")
                .OfType<AnimationClip>().Where(c => !c.name.StartsWith("__preview__", StringComparison.Ordinal)).ToArray();
            AnimationClip Find(string name)
            {
                var clip = clips.FirstOrDefault(c => c.name == name || c.name.EndsWith("|" + name, StringComparison.Ordinal));
                if (clip == null) throw new InvalidOperationException("Missing animation " + name + ". Available: " + string.Join(", ", clips.Select(c => c.name)));
                return clip;
            }
            var locomotion = machine.AddState("Locomotion");
            var blend = new BlendTree { name = "Character Locomotion", blendParameter = "MoveSpeed", useAutomaticThresholds = false };
            AssetDatabase.AddObjectToAsset(blend, controller);
            blend.AddChild(Find("Idle_Loop"), 0);
            blend.AddChild(Find("Walk_Loop"), 0.35f);
            blend.AddChild(Find("Jog_Fwd_Loop"), 1);
            locomotion.motion = blend;
            machine.defaultState = locomotion;
            foreach (var action in new[] { ("Attack", "Sword_Attack"), ("Skill", "Spell_Simple_Shoot"), ("Roll", "Roll") })
            {
                var state = machine.AddState(action.Item1);
                state.motion = Find(action.Item2);
                var transition = state.AddTransition(locomotion);
                transition.hasExitTime = true;
                transition.exitTime = 0.9f;
                transition.duration = 0.12f;
            }
            return controller;
        }

        private static void BuildCharacter(string name, string outfit, bool female, string hair, int career, RuntimeAnimatorController controller)
        {
            var root = new GameObject(name);
            var model = UnityEngine.Object.Instantiate(LoadModel(outfit.Contains("Peasant") ? "Female_Ranger" : outfit), root.transform);
            model.name = "Outfit Rig";
            try
            {
                if (outfit.Contains("Peasant")) ReplaceClothes(model, outfit);
                var animator = model.GetComponent<Animator>();
                if (animator == null || animator.avatar == null || !animator.avatar.isHuman || !animator.avatar.isValid)
                    throw new InvalidOperationException(outfit + " does not have a valid humanoid avatar.");
                animator.runtimeAnimatorController = controller;
                animator.applyRootMotion = false;
                foreach (var renderer in model.GetComponentsInChildren<Renderer>())
                {
                    if (renderer.name.Contains("Head_Hood")) { renderer.gameObject.SetActive(false); continue; }
                    AssignMaterials(renderer, career, female);
                    if (renderer is SkinnedMeshRenderer skinned) { skinned.updateWhenOffscreen = true; skinned.quality = SkinQuality.Bone4; }
                }
                var head = FindBone(model.transform, "Head");
                AddFace(head, female, name);
                AddHair(head, hair, female, name);
                if (female)
                {
                    var pearl = Material("PearlAdornment", null, null, new Color(1f,.84f,.91f), .15f, .65f);
                    var goldPin = Material("HairpinGold", null, null, new Color(.9f,.74f,.4f), .55f, .5f);
                    for (int side = -1; side <= 1; side += 2)
                    {
                        Part(head,"Pearl Earring",PrimitiveType.Sphere,new Vector3(side*.083f,-.027f,.003f),Vector3.one*.018f,pearl);
                        Part(head,"Fine Earring Chain",PrimitiveType.Cylinder,new Vector3(side*.083f,-.011f,.003f),new Vector3(.003f,.02f,.003f),goldPin);
                    }
                    Part(head,"Sakura Hairpin",PrimitiveType.Sphere,new Vector3(-.079f,.079f,-.014f),new Vector3(.031f,.026f,.014f),pearl);
                }
                AddEquipment(model.transform, career);
                if (female) AddSilkSkirt(model.transform, career, name);
                Bounds bounds = new Bounds();
                bool first = true;
                foreach (var renderer in root.GetComponentsInChildren<Renderer>())
                {
                    if (first) { bounds = renderer.bounds; first = false; } else bounds.Encapsulate(renderer.bounds);
                }
                // Match the prototype's 2.5 m character framing while retaining source proportions.
                float scale = 2.5f / Mathf.Max(0.1f, bounds.size.y);
                root.transform.localScale = Vector3.one * scale;
                model.transform.localPosition += new Vector3(0, -bounds.min.y, 0);
                PrefabUtility.SaveAsPrefabAsset(root, Prefabs + "/" + name + ".prefab");
                Debug.Log("CHARACTER_ART " + name + " renderers=" + root.GetComponentsInChildren<Renderer>().Length + " sourceHeight=" + bounds.size.y + " avatar=" + animator.avatar.isValid);
            }
            finally { UnityEngine.Object.DestroyImmediate(root); }
        }

        private static void ReplaceClothes(GameObject rig, string outfit)
        {
            foreach (var renderer in rig.GetComponentsInChildren<Renderer>()) UnityEngine.Object.DestroyImmediate(renderer.gameObject);
            var source = UnityEngine.Object.Instantiate(LoadModel(outfit));
            try
            {
                var bones = rig.GetComponentsInChildren<Transform>().GroupBy(t => t.name).ToDictionary(group => group.Key, group => group.First());
                foreach (var renderer in source.GetComponentsInChildren<SkinnedMeshRenderer>())
                {
                    renderer.bones = renderer.bones.Select(bone => bones[bone.name]).ToArray();
                    renderer.rootBone = bones[renderer.rootBone.name];
                    renderer.transform.SetParent(rig.transform, false);
                }
            }
            finally { UnityEngine.Object.DestroyImmediate(source); }
        }

        private static void AddSilkSkirt(Transform rig, int career, string key)
        {
            Transform hip=FindBone(rig,"pelvis"), left=FindBone(rig,"thigh_l"), right=FindBone(rig,"thigh_r");
            const int sides=36, rows=7;
            var vertices=new Vector3[(sides+1)*(rows+1)];var uv=new Vector2[vertices.Length];var weights=new BoneWeight[vertices.Length];
            var fabric=new List<int>();var trim=new List<int>();
            for(int row=0;row<=rows;row++)for(int i=0;i<=sides;i++)
            {
                float t=row/(float)rows, angle=i*Mathf.PI*2/sides;
                float radius=Mathf.Lerp(.185f,.42f,t)+Mathf.Sin(angle*12)*.013f*t;
                Vector3 offset=new Vector3(Mathf.Cos(angle)*radius,.06f-t*(career==2?.63f:.78f),Mathf.Sin(angle)*radius*.78f);
                int index=row*(sides+1)+i;
                vertices[index]=rig.InverseTransformPoint(hip.position+offset);
                uv[index]=new Vector2(i/(float)sides,t);
                weights[index]=new BoneWeight{boneIndex0=0,weight0=1-t*.23f,boneIndex1=offset.x<0?1:2,weight1=t*.23f};
                if(row==rows||i==sides)continue;
                var triangles=row==rows-1?trim:fabric;int next=index+sides+1;
                triangles.AddRange(new[]{index,index+1,next,index+1,next+1,next});
            }
            var mesh=new Mesh{name=key+"SilkSkirt",vertices=vertices,uv=uv,boneWeights=weights};
            mesh.bindposes=new[]{hip.worldToLocalMatrix*rig.localToWorldMatrix,left.worldToLocalMatrix*rig.localToWorldMatrix,right.worldToLocalMatrix*rig.localToWorldMatrix};
            mesh.subMeshCount=2;mesh.SetTriangles(fabric,0);mesh.SetTriangles(trim,1);mesh.RecalculateNormals();mesh.RecalculateBounds();
            var skirt=new GameObject("Layered silk skirt");skirt.transform.SetParent(rig,false);
            var renderer=skirt.AddComponent<SkinnedMeshRenderer>();renderer.sharedMesh=PersistMesh(mesh,key+"SilkSkirt");
            renderer.bones=new[]{hip,left,right};renderer.rootBone=hip;renderer.updateWhenOffscreen=true;
            Color silk=career==0?new Color(.85f,.47f,.61f):career==1?new Color(.58f,.74f,.91f):career==2?new Color(.51f,.85f,.75f):new Color(.92f,.73f,.8f);
            renderer.sharedMaterials=new[]{Material("Silk"+career,null,null,silk,.05f,.4f),Material("SilkHem",null,null,new Color(.94f,.82f,.57f),.4f,.45f)};
        }

        private static void AddFace(Transform targetHead, bool female, string character)
        {
            var source = UnityEngine.Object.Instantiate(LoadModel(female ? "Superhero_Female_FullBody" : "Superhero_Male_FullBody"));
            try
            {
                var head = FindBone(source.transform, "Head");
                var neck = FindBone(source.transform, "neck_01");
                float cutoff = source.transform.InverseTransformPoint(neck.position).y + 0.014f;
                foreach (var renderer in source.GetComponentsInChildren<SkinnedMeshRenderer>())
                {
                    bool body = renderer.sharedMaterials.Any(m => m != null && m.name.IndexOf("Superhero", StringComparison.OrdinalIgnoreCase) >= 0);
                    var baked = new Mesh();
                    renderer.BakeMesh(baked);
                    Vector3[] vertices = baked.vertices;
                    var allowed = new bool[vertices.Length];
                    for (int i = 0; i < vertices.Length; i++)
                    {
                        Vector3 world = renderer.transform.TransformPoint(vertices[i]);
                        allowed[i] = !body || source.transform.InverseTransformPoint(world).y >= cutoff;
                        vertices[i] = head.InverseTransformPoint(world);
                    }
                    var submeshes = new int[baked.subMeshCount][];
                    for (int sub = 0; sub < baked.subMeshCount; sub++)
                    {
                        var indices = baked.GetTriangles(sub);
                        var keep = new List<int>();
                        for (int i = 0; i < indices.Length; i += 3)
                            if (allowed[indices[i]] && allowed[indices[i + 1]] && allowed[indices[i + 2]])
                            { keep.Add(indices[i]); keep.Add(indices[i + 1]); keep.Add(indices[i + 2]); }
                        submeshes[sub] = keep.ToArray();
                    }
                    baked.vertices = vertices;
                    for (int sub = 0; sub < submeshes.Length; sub++) baked.SetTriangles(submeshes[sub], sub);
                    baked.RecalculateNormals();
                    baked.RecalculateTangents();
                    baked.RecalculateBounds();
                    var mesh = PersistMesh(baked, character + "_" + renderer.name);
                    var part = new GameObject(renderer.name);
                    part.transform.SetParent(targetHead, false);
                    part.AddComponent<MeshFilter>().sharedMesh = mesh;
                    var visual = part.AddComponent<MeshRenderer>();
                    visual.sharedMaterials = renderer.sharedMaterials;
                    AssignMaterials(visual, 0, female);
                }
            }
            finally { UnityEngine.Object.DestroyImmediate(source); }
        }

        private static void AddHair(Transform targetHead, string hair, bool female, string character)
        {
            var source = UnityEngine.Object.Instantiate(LoadModel(hair));
            try
            {
                var sourceHead = FindBone(source.transform, "Head");
                foreach (var renderer in source.GetComponentsInChildren<SkinnedMeshRenderer>())
                {
                    var mesh = new Mesh();
                    renderer.BakeMesh(mesh);
                    mesh.vertices = mesh.vertices.Select(v => sourceHead.InverseTransformPoint(renderer.transform.TransformPoint(v))).ToArray();
                    mesh.RecalculateNormals();
                    mesh.RecalculateTangents();
                    mesh.RecalculateBounds();
                    mesh = PersistMesh(mesh, character + "_Hair");
                    var part = new GameObject("Hair");
                    part.transform.SetParent(targetHead, false);
                    part.AddComponent<MeshFilter>().sharedMesh = mesh;
                    var visual = part.AddComponent<MeshRenderer>();
                    visual.sharedMaterials = renderer.sharedMaterials;
                    AssignMaterials(visual, 0, female);
                }
            }
            finally { UnityEngine.Object.DestroyImmediate(source); }
        }

        private static void AssignMaterials(Renderer renderer, int career, bool female)
        {
            renderer.sharedMaterials = renderer.sharedMaterials.Select(original =>
            {
                string name = original == null ? "skin" : original.name.ToLowerInvariant();
                if (name.Contains("ranger"))
                {
                    if(female)
                    {
                        var silk=Material("FemaleRanger"+career,null,"T_Ranger_Normal",Color.white,.08f,.32f);
                        silk.mainTexture=SilkTexture(career);return silk;
                    }
                    Color tint = career == 0 ? new Color(1f, 0.85f, 0.9f) : career == 1 ? new Color(0.88f, 0.93f, 1f) : new Color(0.8f, 1f, 0.92f);
                    return Material("Ranger" + career, "T_Ranger" + (career == 0 ? "_3" : "") + "_BaseColor", "T_Ranger_Normal", tint, 0.16f, 0.29f);
                }
                if (name.Contains("peasant")) return Material("QinghuaClothes", "T_Peasant_2_BaseColor", "T_Peasant_Normal", new Color(1f, 0.88f, 0.95f), 0, 0.24f);
                if (name.Contains("hair"))
                {
                    string number = name.Contains("2") ? "2" : "1";
                    var material = Material("Hair" + number, "T_Hair_" + number + "_BaseColor", "GL_T_Hair_" + number + "_Normal", new Color(0.34f, 0.29f, 0.26f), 0, 0.25f);
                    material.SetFloat("_Mode", 1);
                    material.SetInt("_SrcBlend", (int)BlendMode.One);
                    material.SetInt("_DstBlend", (int)BlendMode.Zero);
                    material.SetInt("_ZWrite", 1);
                    material.EnableKeyword("_ALPHATEST_ON");
                    material.SetFloat("_Cutoff", 0.38f);
                    material.renderQueue = (int)RenderQueue.AlphaTest;
                    return material;
                }
                if (name.Contains("eye")) return Material("Eyes", "T_Eye_Brown", "GL_T_Eye_Normal", Color.white, 0, 0.75f);
                if (name.Contains("regular")) return Material("OutfitSkin" + female, "T_Regular_" + (female ? "Female" : "Male") + "_Dark_BaseColor", "T_Regular_" + (female ? "Female" : "Male") + "_Normal", Color.white, 0, 0.24f);
                return Material("Face" + female, female ? "T_Superhero_Female_Light_BaseColor" : "T_Superhero_Male_Ligh", "GL_T_Superhero_" + (female ? "Female" : "Male") + "_Normal", Color.white, 0, 0.28f);
            }).ToArray();
        }

        private static Material Material(string key, string diffuse, string normal, Color tint, float metallic, float smoothness)
        {
            if (Materials.TryGetValue(key, out var cached)) return cached;
            string path = Generated + "/Materials/" + key + ".mat";
            var material = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (material == null)
            {
                material = new Material(Shader.Find("Standard"));
                AssetDatabase.CreateAsset(material, path);
            }
            material.color = tint;
            material.SetFloat("_Metallic", metallic);
            material.SetFloat("_Glossiness", smoothness);
            if (!string.IsNullOrEmpty(diffuse)) material.mainTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(Source + "/Textures/" + diffuse + ".png");
            if (!string.IsNullOrEmpty(normal))
            {
                material.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>(Source + "/Textures/" + normal + ".png"));
                material.SetFloat("_BumpScale", 0.75f);
                material.EnableKeyword("_NORMALMAP");
            }
            EditorUtility.SetDirty(material);
            Materials[key] = material;
            return material;
        }

        private static Texture2D SilkTexture(int career)
        {
            if(SilkTextures.TryGetValue(career,out Texture2D cached))return cached;
            Directory.CreateDirectory(Generated+"/Textures");
            var source=new Texture2D(2,2,TextureFormat.RGBA32,false);
            source.LoadImage(File.ReadAllBytes(Source+"/Textures/T_Ranger"+(career==0?"_3":"")+"_BaseColor.png"));
            const int size=1024;var output=new Texture2D(size,size,TextureFormat.RGBA32,true);var pixels=new Color32[size*size];
            Color rose=career==0?new Color(.98f,.75f,.84f):career==1?new Color(.73f,.9f,1f):new Color(.65f,.96f,.83f);
            for(int y=0;y<size;y++)for(int x=0;x<size;x++)
            {
                Color original=source.GetPixelBilinear(x/(float)size,y/(float)size);
                float luminance=original.r*.3f+original.g*.59f+original.b*.11f;
                Color tinted=original;
                if(original.r>original.b*1.08f&&luminance>.16f)tinted=rose*(.27f+luminance*1.18f);
                tinted.a=original.a;pixels[y*size+x]=tinted;
            }
            output.SetPixels32(pixels);output.Apply();string path=Generated+"/Textures/SilkRanger"+career+".png";
            File.WriteAllBytes(path,output.EncodeToPNG());UnityEngine.Object.DestroyImmediate(source);UnityEngine.Object.DestroyImmediate(output);
            AssetDatabase.ImportAsset(path,ImportAssetOptions.ForceSynchronousImport);
            var importer=(TextureImporter)AssetImporter.GetAtPath(path);importer.maxTextureSize=size;importer.mipmapEnabled=true;
            var android=importer.GetPlatformTextureSettings("Android");android.overridden=true;android.maxTextureSize=size;android.format=TextureImporterFormat.ASTC_6x6;importer.SetPlatformTextureSettings(android);importer.SaveAndReimport();
            cached=AssetDatabase.LoadAssetAtPath<Texture2D>(path);SilkTextures[career]=cached;return cached;
        }

        private static void AddEquipment(Transform rig, int career)
        {
            if (career == 3) return;
            var steel = Material("WeaponSteel", null, null, new Color(0.62f, 0.71f, 0.75f), 0.8f, 0.6f);
            var gold = Material("WeaponGold", null, null, new Color(0.6f, 0.38f, 0.13f), 0.7f, 0.4f);
            var leather = Material("WeaponGrip", null, null, new Color(0.095f, 0.055f, 0.038f), 0, 0.2f);
            var right = FindBone(rig, "hand_r");
            var left = FindBone(rig, "hand_l");
            BuildSword(right, career == 0 ? 1.12f : 0.76f, steel, gold, leather, "Sword" + career);
            if (career == 2) BuildSword(left, 0.68f, steel, gold, leather, "Offhand");
            if (career == 1)
            {
                var shield = new GameObject("Shield");
                shield.transform.SetParent(left, false);
                shield.transform.localPosition = new Vector3(0, 0.01f, 0.06f);
                shield.transform.localRotation = Quaternion.Euler(90, 0, 0);
                var mesh = new Mesh { name = "Kite Shield" };
                mesh.vertices = new[] { new Vector3(-0.25f,0.3f,0),new Vector3(0.25f,0.3f,0),new Vector3(0.3f,0.06f,0),new Vector3(0,-0.42f,0),new Vector3(-0.3f,0.06f,0),new Vector3(0,0,0.08f),new Vector3(0,0,-0.025f) };
                var triangles = new List<int>();
                for (int i = 0; i < 5; i++) { triangles.Add(5); triangles.Add((i+1)%5); triangles.Add(i); triangles.Add(6); triangles.Add(i); triangles.Add((i+1)%5); }
                mesh.triangles = triangles.ToArray();
                mesh.RecalculateNormals();
                mesh.RecalculateBounds();
                shield.AddComponent<MeshFilter>().sharedMesh = PersistMesh(mesh,"Shield");
                shield.AddComponent<MeshRenderer>().sharedMaterial = steel;
                Part(shield.transform, "Shield Crest", PrimitiveType.Cube, new Vector3(0, 0.035f, 0.085f), new Vector3(0.045f,0.41f,0.02f), gold);
            }
        }

        private static void BuildSword(Transform hand, float length, Material steel, Material gold, Material leather, string meshKey)
        {
            var sword = new GameObject("Equipped Blade");
            sword.transform.SetParent(hand, false);
            sword.transform.localPosition = new Vector3(0.015f, 0.015f, 0);
            sword.transform.localRotation = Quaternion.Euler(0, 0, 90);
            Part(sword.transform, "Grip", PrimitiveType.Cylinder, Vector3.zero, new Vector3(0.035f,0.095f,0.035f), leather);
            Part(sword.transform, "Guard", PrimitiveType.Cube, new Vector3(0,0.12f,0), new Vector3(0.28f,0.035f,0.07f), gold);
            Part(sword.transform, "Pommel", PrimitiveType.Sphere, new Vector3(0,-0.1f,0), Vector3.one * 0.07f, gold);
            var blade = new GameObject("Forged Blade");
            blade.transform.SetParent(sword.transform, false);
            var mesh = new Mesh { name = meshKey };
            mesh.vertices = new[] {new Vector3(-0.055f,0.135f,0),new Vector3(0.055f,0.135f,0),new Vector3(-0.035f,length-0.12f,0),new Vector3(0.035f,length-0.12f,0),new Vector3(0,length,0),new Vector3(0,0.135f,0.018f),new Vector3(0,length-0.12f,0.018f),new Vector3(0,0.135f,-0.018f),new Vector3(0,length-0.12f,-0.018f)};
            mesh.triangles = new[] {0,2,6,0,6,5,5,6,3,5,3,1,2,4,6,6,4,3,0,7,8,0,8,2,7,1,3,7,3,8,2,8,4,8,3,4};
            mesh.RecalculateNormals();
            blade.AddComponent<MeshFilter>().sharedMesh = PersistMesh(mesh, meshKey);
            blade.AddComponent<MeshRenderer>().sharedMaterial = steel;
        }

        private static void Part(Transform parent, string name, PrimitiveType type, Vector3 position, Vector3 scale, Material material)
        {
            var part = GameObject.CreatePrimitive(type);
            part.name = name;
            part.transform.SetParent(parent, false);
            part.transform.localPosition = position;
            part.transform.localScale = scale;
            UnityEngine.Object.DestroyImmediate(part.GetComponent<Collider>());
            part.GetComponent<Renderer>().sharedMaterial = material;
        }

        private static Mesh PersistMesh(Mesh mesh, string key)
        {
            string path = Generated + "/Meshes/" + key.Replace("/", "_") + ".asset";
            var old = AssetDatabase.LoadAssetAtPath<Mesh>(path);
            if (old == null) { AssetDatabase.CreateAsset(mesh, path); return mesh; }
            EditorUtility.CopySerialized(mesh, old);
            UnityEngine.Object.DestroyImmediate(mesh);
            return old;
        }

        private static GameObject LoadModel(string name)
        {
            var model = AssetDatabase.LoadAssetAtPath<GameObject>(Source + "/Models/" + name + ".fbx");
            if (model == null) throw new FileNotFoundException("Character source model missing: " + name);
            return model;
        }

        private static Transform FindBone(Transform root, string name)
        {
            var bone = root.GetComponentsInChildren<Transform>().FirstOrDefault(t => t.name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (bone == null) throw new InvalidOperationException("Missing bone " + name + " in " + root.name);
            return bone;
        }
    }
}
