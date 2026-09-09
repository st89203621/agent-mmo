using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    public sealed partial class AdventureCombat : MonoBehaviour
    {
        public sealed class Enemy
        {
            public Transform Root;
            public MonsterVisual Beast;
            public CharacterVisual Guardian;
            public BossVisual BossArt;
            public BossTelegraph Telegraph;
            public Transform Warning;
            public Transform HealthBar;
            public Image HealthFill;
            public Text HealthLabel;
            public Vector3 Spawn, StrikeCenter;
            public string Name;
            public string ServerId;
            public Vector3 NetworkPosition;
            public long NetworkCast;
            public float Health, Maximum, Windup, Recovery, Respawn;
            public bool Boss;
            public int Theme,AttackCycle,AttackStyle;
            public string CastName;
            public bool Enraged => Boss && Health>0 && Health<Maximum*.5f;
            public bool Alive => Health > 0;
        }

        private sealed class Landmark
        {
            public Transform Root;
            public int Bit;
            public string Title;
            public bool Chest;
        }

        private readonly List<Enemy> enemies = new List<Enemy>();
        private readonly List<Landmark> landmarks = new List<Landmark>();
        private readonly List<UnityEngine.Object> owned = new List<UnityEngine.Object>();
        private readonly List<Mesh> realmMeshes = new List<Mesh>();
        private readonly Dictionary<string, float> cooldowns = new Dictionary<string, float>();
        private PrototypeWorld world;
        private PrototypeState state;
        private Action save;
        private Action<string> notify;
        private Transform content;
        private Material threatMaterial, memoryMaterial, treasureMaterial, selectionMaterial;
        private Transform selection;
        private float health, shieldUntil, invulnerableUntil, reviveAt, hitAt, pendingDamage, lastDamage, lastPetHit;
        private int comboCount;
        private float comboExpire;
        private const float ComboWindow = 2.8f;
        private int currentRealm = -1;
        private int currentSubmap;
        private int MapKey => Mathf.Max(0,currentRealm)*3+currentSubmap;
        private bool HasMapEnemies => currentRealm != 0 || currentSubmap > 0;
        private float ExitZ => currentRealm >= 3 && currentRealm <= 5 ? 124 : 109;
        private bool MapBossDefeated => currentSubmap == 0 ? (state.BossMask & (1 << currentRealm)) != 0 : (state.SubmapBossMask & (1 << MapKey)) != 0;
        private int MapKills => currentSubmap == 0 ? state.RealmKills[Mathf.Max(0,currentRealm)] : state.SubmapKills[MapKey];
        private bool pendingArea;
        private Enemy pendingTarget;
        private Enemy target;
        private float clock;
        private bool running;
        private CombatEffects effects;
        private bool autoQuest;
        private Enemy autoEnemy;
        private Landmark autoLandmark;
        private readonly List<Vector3> autoPath = new List<Vector3>();
        private int autoPathIndex;
        private Vector3 autoDestination;
        private Transform autoMarker;
        private string autoStatus = "";
        private float autoActionAt;
        public CombatEffects Effects => effects;
        public event Action<Vector3, string, Color> FloatingText;
        public IReadOnlyList<Enemy> Enemies => enemies;
        public Enemy Target => target != null && target.Alive ? target : null;
        public float Health => Mathf.Clamp(health,0,MaxHealth);
        public float MaxHealth => online?.Snapshot != null ? Mathf.Max(1,online.Snapshot.MaxHealth) : 220 + state.Level * 9 + state.EquipmentQuality * 8 + (state.Career == 1 ? 100 : 0);
        public bool IsDead => health <= 0;
        public int ExperienceRequired => 80 + state.Level * 25;
        public static int BaseAttack(PrototypeState data) => 28 + data.Level*2 + data.EquipmentQuality*4 + data.EnchantLevel*6;
        public int MemoryCount
        {
            get
            {
                int count=0;
                foreach(var map in RealmMapCatalog.Maps)
                {
                    int key=map.Realm*3+map.Submap;
                    int mask=online?.Snapshot?.MapMemoryMasks.Count==21?online.Snapshot.MapMemoryMasks[key]:
                        map.Submap==0?state.MemoryMask>>(map.Realm*3):state.SubmapMemories[key];
                    for(int bit=0;bit<3;bit++)if((mask&(1<<bit))!=0)count++;
                }
                return count;
            }
        }
        public float ReviveSeconds => Mathf.Max(0, reviveAt - clock);
        public int ComboCount => comboCount;
        public float ComboRemaining => Mathf.Max(0, comboExpire - clock);
        public float ComboWindowSeconds => ComboWindow;
        public float ComboMultiplier => comboCount <= 0 ? 1f : 1f + Mathf.Min(comboCount, 10) * .05f;
        public bool IsAutoQuestRunning => autoQuest;
        public string AutoQuestStatus => autoStatus;
        public string QuestTitle => online?.Snapshot != null ? online.Snapshot.QuestTitle : RealmMapCatalog.Get(currentRealm,currentSubmap).Journey;
        public string QuestDetail => online?.Snapshot != null ? online.Snapshot.QuestDetail : !HasMapEnemies ? "收集散落回忆 · " + RealmMemoryCount() + "/3" :
            "净化本区域 " + Mathf.Min(4, MapKills) + "/4 · 回忆 " + RealmMemoryCount() + "/3\n" +
            (MapBossDefeated ? "守护者已安息 · 前往远处宝箱" : "沿花径前进并挑战守护者");
        public string NearbyAction
        {
            get
            {
                if (IsDead) return "返回花径";
                foreach (var item in landmarks)
                    if (item.Root.gameObject.activeSelf && Vector3.Distance(world.HeroGroundPosition, item.Root.position) < 3.4f)
                        return item.Chest ? "开启旅途宝箱" : "拾取 · " + item.Title;
                if (world.HeroGroundPosition.z > ExitZ) return "前往 · " + (currentSubmap+1<RealmMapCatalog.Count(currentRealm) ? RealmMapCatalog.Get(currentRealm,currentSubmap+1).Name : RealmMapCatalog.RegionNames[(currentRealm+1)%7]);
                if (currentRealm == 0 && currentSubmap == 0 && Vector3.Distance(world.HeroGroundPosition, new Vector3(1.9f,.16f,5.1f)) < 5) return "与情花交谈";
                return "";
            }
        }

        public void Bind(PrototypeWorld owner, PrototypeState data, Action persist, Action<string> toast)
        {
            world = owner; state = data; state.Sanitize(); save = persist; notify = toast;
            if(!effects)effects=gameObject.AddComponent<CombatEffects>();
            if (threatMaterial == null)
            {
                threatMaterial = Material("Threat", new Color(1,.25f,.28f));
                memoryMaterial = Material("Memory", new Color(1,.8f,.92f));
                treasureMaterial = Material("Treasure", new Color(1,.82f,.3f));
                selectionMaterial = Material("Selection", new Color(1,.83f,.43f));
            }
            currentRealm = -1; health = MaxHealth; cooldowns.Clear(); clock = 0;
            shieldUntil=invulnerableUntil=reviveAt=hitAt=lastDamage=lastPetHit=0; world.SetMovementDisabled(false);
            comboCount=0; comboExpire=0;
            StopAutoQuest(true);
            SetRealm(owner.RealmIndex);
        }

        public void SetRunning(bool value)
        {
            running = value;
            if(effects)effects.SetPaused(!value);
            if(state!=null)health=Mathf.Min(health,MaxHealth);
            if (content) content.gameObject.SetActive(value);
            if (!value) { pendingTarget = null; hitAt = 0; comboCount=0; comboExpire=0; StopAutoQuest(true); }
        }

        public void SetRealm(int realm)
        {
            if (state == null || realm == currentRealm && currentSubmap == world.SubmapIndex) return;
            if (content) { content.gameObject.SetActive(false); Destroy(content.gameObject); }
            foreach(var mesh in realmMeshes)if(mesh)Destroy(mesh);realmMeshes.Clear();
            currentRealm = realm; currentSubmap = world.SubmapIndex; enemies.Clear(); landmarks.Clear(); target = null; pendingTarget = null; hitAt = 0;
            autoEnemy = null; autoLandmark = null; autoPath.Clear(); autoPathIndex = 0; autoMarker = null;
            health = MaxHealth;
            comboCount=0; comboExpire=0;
            world.SetMovementDisabled(false);
            content = new GameObject("Journey Encounters " + realm).transform;
            content.SetParent(transform,false);
            selection = Ring(content, "Selected target", 1.2f, selectionMaterial);
            selection.gameObject.SetActive(false);
            bool extendedMidRealm = realm >= 3 && realm <= 5;
            bool longRealm = realm < 3 || realm == 6;
            bool expeditionRealm = longRealm || extendedMidRealm;
            if (HasMapEnemies)
            {
                Vector3[] points = extendedMidRealm ? new[] { new Vector3(-3,.16f,20), new Vector3(4,.16f,44), new Vector3(-4,.16f,70), new Vector3(4,.16f,96), new Vector3(0,.16f,118) } :
                    longRealm ? new[] { new Vector3(-3,.16f,22), new Vector3(4,.16f,38), new Vector3(-4,.16f,57), new Vector3(4,.16f,74), new Vector3(0,.16f,96) } :
                    new[] { new Vector3(-3,.16f,3), new Vector3(3,.16f,7), new Vector3(-3,.16f,11), new Vector3(3,.16f,13), new Vector3(0,.16f,16) };
                for (int i = 0; i < points.Length; i++) SpawnEnemy(points[i], i == points.Length-1, i);
            }
            string[] names = { "樱花书签", "风中信笺", "相逢约定", "红枫叶", "林间回声", "晚霞札记", "珍珠贝壳", "远方来信", "潮汐歌谣" };
            for (int i = 0; i < 3; i++)
            {
                int bit = currentSubmap == 0 ? (realm * 3 + i) % 30 : i;
                Vector3 point = extendedMidRealm ? new Vector3(i % 2 == 0 ? -8 : 8, .16f, 13 + i * 37) :
                    longRealm ? new Vector3(i%2==0?-7:7,.16f,14+i*29) : new Vector3(i%2==0?-4:4,.16f,2+i*5);
                CreateLandmark(world.ConstrainPosition(point), bit, expeditionRealm ? names[bit % names.Length] : "旅途回忆", false);
            }
            CreateLandmark(world.ConstrainPosition(extendedMidRealm ? new Vector3(0,.16f,123) : longRealm ? new Vector3(0,.16f,104) : new Vector3(0,.16f,14)), realm, "旅途宝箱", true);
            content.gameObject.SetActive(running);
        }

        public void ToggleAutoQuest()
        {
            if (autoQuest) StopAutoQuest(false);
            else StartAutoQuest();
        }

        public void StartAutoQuest()
        {
            if (!running || !world || !world.IsExploring || IsDead)
            { notify?.Invoke("请先进入探险场景"); return; }
            autoQuest = true;
            autoEnemy = null; autoLandmark = null; autoPath.Clear(); autoPathIndex = 0;
            autoStatus = "正在规划路线"; autoActionAt = 0;
            ChooseAutoObjective();
            notify?.Invoke("自动任务已开始 · 沿花径前往目标");
        }

        public void StopAutoQuest(bool silent = false)
        {
            bool wasRunning = autoQuest;
            autoQuest = false; autoEnemy = null; autoLandmark = null; autoPath.Clear(); autoPathIndex = 0; autoStatus = "";
            autoActionAt = 0;
            if (autoMarker) autoMarker.gameObject.SetActive(false);
            if (world) world.SetMove(Vector2.zero);
            if (wasRunning && !silent) notify?.Invoke("自动任务已停止");
        }

        public float Cooldown(string action) => cooldowns.TryGetValue(action, out float until) ? Mathf.Max(0, until - clock) : 0;
        public void CycleTarget()
        {
            if (enemies.Count == 0) return;
            int start = target == null ? -1 : enemies.IndexOf(target);
            for (int step = 1; step <= enemies.Count; step++)
            {
                var next = enemies[(start + step) % enemies.Count];
                if (next.Alive && Vector3.Distance(world.HeroGroundPosition,next.Root.position) < 20) { target = next; return; }
            }
        }

        public bool TryAction(string action)
        {
            if (online != null) return TryOnlineAction(action);
            if (!running || !world.IsExploring || IsDead || Cooldown(action) > 0) return false;
            if (action == "dodge")
            {
                cooldowns[action] = clock + 1.8f; invulnerableUntil = clock + .55f;
                effects.Skill(state.Career,action,world.HeroGroundPosition,world.HeroGroundPosition);
                world.PerformAction("dodge"); return true;
            }
            if (action == "heal")
            {
                cooldowns[action] = clock + 16; health = Mathf.Min(MaxHealth, health + MaxHealth*.42f);
                effects.Skill(state.Career,action,world.HeroGroundPosition,world.HeroGroundPosition);
                Float(world.HeroPosition,"+" + Mathf.RoundToInt(MaxHealth*.42f),new Color(.5f,1,.72f)); return true;
            }
            if (action == "skill" && state.Career == 1)
            {
                shieldUntil = clock + 4; health = Mathf.Min(MaxHealth,health+MaxHealth*.12f);
                effects.Skill(state.Career,action,world.HeroGroundPosition,world.HeroGroundPosition);
                cooldowns[action] = clock + 6; world.PerformAction("skill"); notify("守势 · 减伤 65%"); return true;
            }
            AcquireTarget();
            if (Target == null) { notify("前方暂无敌人"); return false; }
            float distance = Vector3.Distance(world.HeroGroundPosition,target.Root.position);
            float range = action == "attack" ? 3.6f : action == "pet" ? 12 : 7;
            if (distance > range) { notify("靠近 " + target.Name); return false; }
            world.FacePoint(target.Root.position);
            if (action == "pet")
            {
                cooldowns[action] = clock + 7; world.PerformAction("pet");
                effects.Skill(state.Career,action,world.HeroGroundPosition,target.Root.position);
                if (state.ActivePet == 1) { shieldUntil=clock+3; health=Mathf.Min(MaxHealth,health+MaxHealth*.16f); }
                Damage(target, 28 + state.PetLevel*5, true); return true;
            }
            if (hitAt > clock) return false;
            cooldowns[action] = clock + (action=="attack"?.52f:action=="ultimate"?8:4.2f);
            float baseDamage = BaseAttack(state);
            if (state.Career==0) baseDamage *= 1.2f;
            pendingDamage = baseDamage * (action=="attack"?1:action=="ultimate"?2.5f:1.8f);
            if (state.Career==2 && UnityEngine.Random.value<.28f) pendingDamage*=1.7f;
            pendingArea=action!="attack"; pendingTarget=target; hitAt=clock+.18f;
            effects.Skill(state.Career,action,world.HeroGroundPosition,target.Root.position);
            world.PerformAction(action); return true;
        }

        public void Interact()
        {
            if (online != null) { InteractOnline(); return; }
            if (!running) return;
            if (IsDead) { Revive(); return; }
            foreach (var item in landmarks)
            {
                if (!item.Root.gameObject.activeSelf || Vector3.Distance(world.HeroGroundPosition,item.Root.position)>=3.4f) continue;
                if (item.Chest)
                {
                    if (RealmMemoryCount()<3 || HasMapEnemies && (!MapBossDefeated || MapKills<4))
                    { notify(RealmMemoryCount()<3?"请先收集三份回忆":"请先净化四名山灵并击败守护者"); return; }
                    if(currentSubmap==0)state.TreasureMask |= 1 << currentRealm; else state.SubmapTreasureMask |= 1 << MapKey;
                    state.Coins+=800; state.Essence+=12; state.Ore+=20;
                    AddExperience(120); notify("旅途珍藏 · 银两 +800 · 灵魄 +12");
                }
                else
                {
                    if(currentSubmap==0)state.MemoryMask |= 1 << (item.Bit % 30); else state.SubmapMemories[MapKey] |= 1 << item.Bit;
                    state.Coins+=100; AddExperience(35);
                    notify(item.Title + " · 已收入回忆册");
                }
                item.Root.gameObject.SetActive(false); save(); return;
            }
            if (world.HeroGroundPosition.z>ExitZ)
            { if(currentSubmap+1<RealmMapCatalog.Count(currentRealm))world.SetMap(currentRealm,currentSubmap+1);else world.SetRealm((currentRealm+1)%7); SetRealm(world.RealmIndex); notify("抵达 · " + world.MapName); return; }
            if (currentRealm==0&&currentSubmap==0)
            {
                state.IntroComplete=true; save();
                notify("情花：沿花径继续前进");
            }
        }

        public void Revive()
        {
            if (online != null) { ReviveOnline(); return; }
            health=MaxHealth; world.Teleport(new Vector3(-.65f,.16f,0)); invulnerableUntil=clock+3;
            world.SetMovementDisabled(false); notify("已在花径复苏");
            foreach(var enemy in enemies) { enemy.Root.position=enemy.Spawn; enemy.Health=enemy.Maximum; enemy.Windup=0; enemy.Recovery=clock+2; enemy.Warning.gameObject.SetActive(false); enemy.Root.gameObject.SetActive(true);enemy.BossArt?.Revive(); }
        }

        private void Update()
        {
            if (online != null) { UpdateOnline(); return; }
            if (comboCount > 0 && clock >= comboExpire) comboCount=0;
            if (!running || !world || state==null || !world.IsExploring && !IsDead) return;
            float dt=Mathf.Min(Time.deltaTime,.05f); clock+=dt;
            if (comboCount > 0 && clock >= comboExpire) comboCount=0;
            health=Mathf.Min(health,MaxHealth);
            if (world.RealmIndex!=currentRealm||world.SubmapIndex!=currentSubmap) SetRealm(world.RealmIndex);
            if (IsDead) { if(clock>=reviveAt)Revive(); return; }
            if (autoQuest) AutoQuestUpdate(dt);
            if (clock-lastDamage>7) health=Mathf.Min(MaxHealth,health+MaxHealth*.035f*dt);
            if (hitAt>0 && clock>=hitAt)
            {
                if (pendingTarget!=null && pendingTarget.Alive && Vector3.Distance(world.HeroGroundPosition,pendingTarget.Root.position)<(pendingArea?8:4.1f))
                {
                    if(pendingArea) foreach(var enemy in enemies) { if(enemy.Alive && Vector3.Distance(pendingTarget.Root.position,enemy.Root.position)<4.8f)Damage(enemy,pendingDamage,false); }
                    else Damage(pendingTarget,pendingDamage,false);
                }
                hitAt=0;pendingTarget=null;
            }
            AcquireTarget();
            selection.gameObject.SetActive(Target!=null);
            if(Target!=null)selection.position=target.Root.position+Vector3.up*.07f;
            foreach(var enemy in enemies)
            {
                if(!enemy.Alive)
                {
                    if(enemy.Boss && clock>=enemy.Respawn)enemy.Root.gameObject.SetActive(false);
                    if(!enemy.Boss && clock>=enemy.Respawn) { enemy.Health=enemy.Maximum;enemy.Root.position=enemy.Spawn;enemy.Root.gameObject.SetActive(true); }
                    continue;
                }
                float distance=Vector3.Distance(world.HeroGroundPosition,enemy.Root.position);
                float leash=Vector3.Distance(enemy.Spawn,world.HeroGroundPosition);
                if(enemy.Windup>0)
                {
                    enemy.Windup-=dt;
                    if(!enemy.Boss)enemy.Warning.localScale=Vector3.one*(1+.07f*Mathf.Sin(clock*22));
                    if(enemy.Windup<=0)
                    {
                        bool hit=enemy.Boss?enemy.Telegraph.Contains(world.HeroGroundPosition):Vector3.Distance(world.HeroGroundPosition,enemy.StrikeCenter)<2.3f;
                        enemy.Warning.gameObject.SetActive(false); enemy.Recovery=clock+(enemy.Boss?(enemy.Enraged?1.3f:2.2f):1.9f);
                        if(enemy.Boss)
                        {
                            effects.Boss(enemy.Theme,enemy.AttackStyle,enemy.Warning.position,enemy.Warning.forward,enemy.Telegraph.Radius);
                            if(enemy.AttackStyle==1)enemy.Root.position=world.ConstrainPosition(enemy.Root.position+enemy.Warning.forward*7);
                        }
                        if(hit)ReceiveDamage(enemy.Boss?MaxHealth*(enemy.Enraged?.28f:.21f):MaxHealth*.09f);
                    }
                    continue;
                }
                Vector3 goal=distance<13 && leash<22?world.HeroGroundPosition:enemy.Spawn;
                Vector3 travel=goal-enemy.Root.position;travel.y=0;
                bool approaching=travel.magnitude>(goal==enemy.Spawn?.7f:enemy.Boss?4.5f:1.6f);
                if(approaching)
                {
                    enemy.Root.position=world.ConstrainPosition(enemy.Root.position+travel.normalized*dt*(enemy.Boss?2.3f:2.8f));
                    enemy.Root.rotation=Quaternion.Slerp(enemy.Root.rotation,Quaternion.LookRotation(enemy.Guardian?-travel.normalized:travel.normalized),dt*8);
                }
                enemy.Beast?.Move(approaching?1:0);enemy.Guardian?.Move(approaching?1:0);
                enemy.BossArt?.Move(approaching?2.3f:0);
                if(distance<(enemy.Boss?9:2.6f) && clock>=enemy.Recovery && leash<22)
                {
                    if(enemy.Boss)BeginBossAttack(enemy);
                    else
                    {
                        enemy.Windup=.9f;enemy.StrikeCenter=world.HeroGroundPosition;
                        enemy.Warning.position=enemy.StrikeCenter+Vector3.up*.04f;
                        enemy.Warning.gameObject.SetActive(true);enemy.Beast?.Command();enemy.Guardian?.PerformAction("attack");
                    }
                }
            }
            if(Target!=null && Vector3.Distance(world.HeroGroundPosition,target.Root.position)<5 && clock-lastPetHit>3.2f)
            { lastPetHit=clock;world.PerformAction("pet");Damage(target,8+state.PetLevel*2,true); }
            foreach(var item in landmarks) if(item.Root.gameObject.activeSelf) item.Root.Rotate(0,dt*20,0,Space.World);
        }

        private void AcquireTarget()
        {
            if(Target!=null && Vector3.Distance(world.HeroGroundPosition,target.Root.position)<18)return;
            target=null;float closest=18;
            foreach(var enemy in enemies)
            {
                float distance=Vector3.Distance(world.HeroGroundPosition,enemy.Root.position);
                if(enemy.Alive && distance<closest){closest=distance;target=enemy;}
            }
        }

        private void ChooseAutoObjective()
        {
            if(online!=null){ChooseOnlineObjective();return;}
            autoEnemy = null; autoLandmark = null; autoPath.Clear(); autoPathIndex = 0;
            // Clear combat first.  This also guarantees that the final chest
            // cannot be selected before its guardian has been defeated.
            float best = float.MaxValue;
            foreach (var enemy in enemies)
            {
                if (!enemy.Alive || MapBossDefeated || enemy.Boss && MapKills<4 || !enemy.Boss && MapKills>=4) continue;
                float d = Vector3.Distance(world.HeroGroundPosition, enemy.Root.position);
                if (d < best) { best = d; autoEnemy = enemy; }
            }
            if (autoEnemy != null) autoDestination = autoEnemy.Root.position;
            if (autoEnemy == null)
            {
                foreach (var item in landmarks)
                {
                    if (item.Root.gameObject.activeSelf) { autoLandmark = item; autoDestination = item.Root.position; break; }
                }
            }
            if (autoLandmark == null && autoEnemy == null)
            {
                autoStatus = "本区域任务已完成"; StopAutoQuest(false); return;
            }
            if (!autoMarker && content) autoMarker = Ring(content, "Auto quest destination", .82f, selectionMaterial);
            if (autoMarker)
            {
                autoMarker.position = autoDestination + Vector3.up * .035f;
                autoMarker.gameObject.SetActive(true);
            }
            BuildCurvedPath(world.HeroGroundPosition, autoDestination);
            autoStatus = autoLandmark != null ? "前往 · " + autoLandmark.Title : "前往 · " + autoEnemy.Name;
        }

        private void BuildCurvedPath(Vector3 from, Vector3 to)
        {
            autoPath.Clear(); autoPathIndex = 0;
            from.y = to.y = .16f;
            Vector3 direction = (to - from); direction.y = 0;
            Vector3 side = direction.sqrMagnitude > .01f ? Vector3.Cross(Vector3.up, direction.normalized) : Vector3.right;
            float bend = Mathf.Clamp(direction.magnitude * .22f, 1.2f, 4.2f);
            autoPath.Add(from);
            autoPath.Add(world.ConstrainPosition(Vector3.Lerp(from, to, .33f) + side * bend));
            autoPath.Add(world.ConstrainPosition(Vector3.Lerp(from, to, .68f) - side * bend * .72f));
            autoPath.Add(world.ConstrainPosition(to));
        }

        private void AutoQuestUpdate(float dt)
        {
            if (!autoQuest || !world.IsExploring) return;
            if(online!=null&&waitingForEncounter)
            { world.SetMove(Vector2.zero);if(clock>=autoActionAt)ChooseOnlineObjective();return; }
            if(online!=null&&autoGuide)
            {
                if(state.IntroComplete){ChooseAutoObjective();return;}
                if(Vector3.Distance(world.HeroGroundPosition,autoDestination)<2.8f)
                {
                    world.SetMove(Vector2.zero);autoStatus="与情花交谈";
                    if(clock>=autoActionAt){autoActionAt=clock+.6f;Interact();}
                    return;
                }
            }
            if (autoLandmark != null)
            {
                if (!autoLandmark.Root.gameObject.activeSelf) { ChooseAutoObjective(); return; }
                autoDestination = autoLandmark.Root.position;
                if (autoMarker) autoMarker.position = autoDestination + Vector3.up * .035f;
                if (Vector3.Distance(world.HeroGroundPosition, autoDestination) < 2.8f)
                {
                    world.SetMove(Vector2.zero); autoStatus = "自动交互 · " + autoLandmark.Title;
                    if (clock >= autoActionAt) { autoActionAt = clock + .6f; Interact(); }
                    if (!autoLandmark.Root.gameObject.activeSelf) ChooseAutoObjective();
                    return;
                }
            }
            else if (autoEnemy != null)
            {
                if (!autoEnemy.Alive) { ChooseAutoObjective(); return; }
                autoDestination = autoEnemy.Root.position;
                if (autoMarker) autoMarker.position = autoDestination + Vector3.up * .035f;
                float distance = Vector3.Distance(world.HeroGroundPosition, autoDestination);
                if (distance < 3.5f)
                {
                    // Stop the route command as soon as combat range is
                    // reached so attack animations start from a stable pose.
                    world.SetMove(Vector2.zero);
                    target = autoEnemy; autoStatus = "自动战斗 · " + autoEnemy.Name;
                    if (clock >= autoActionAt)
                    {
                        autoActionAt = clock + .24f;
                        if (Health < MaxHealth * .5f && Cooldown("heal") <= 0) TryAction("heal");
                        else if (Cooldown("ultimate") <= 0) TryAction("ultimate");
                        else if (Cooldown("skill") <= 0) TryAction("skill");
                        else if (Cooldown("pet") <= 0) TryAction("pet");
                        else TryAction("attack");
                    }
                    return;
                }
            }
            if (autoPathIndex >= autoPath.Count && Vector3.Distance(world.HeroGroundPosition, autoDestination) > 2.5f)
                BuildCurvedPath(world.HeroGroundPosition, autoDestination);
            if (autoPathIndex < autoPath.Count)
            {
                Vector3 waypoint = autoPath[autoPathIndex];
                if (world.MoveTowardsWorld(waypoint, 4.6f)) autoPathIndex++;
            }
        }
        private void ReceiveDamage(float damage)
        {
            if(clock<invulnerableUntil || world.IsDodging){Float(world.HeroPosition,"闪避",new Color(.65f,.9f,1));return;}
            if(clock<shieldUntil)damage*=.35f;
            health=Mathf.Max(0,health-damage);lastDamage=clock;
            Float(world.HeroPosition,"-"+Mathf.RoundToInt(damage),new Color(1,.42f,.45f));
            if(IsDead){reviveAt=clock+4;world.SetMovementDisabled(true);notify("暂歇片刻 · 正在返回花径");}
        }
        private void Damage(Enemy enemy,float damage,bool pet)
        {
            if(!enemy.Alive)return;
            // Companion attacks are supplemental damage, not player inputs.
            // They must not restart a combo after its input window has expired.
            float amplifiedDamage=damage;
            if (!pet)
            {
                if (clock >= comboExpire) comboCount=0;
                comboCount=Mathf.Min(comboCount+1, 30);
                comboExpire=clock+ComboWindow;
                amplifiedDamage*=ComboMultiplier;
            }
            enemy.Health=Mathf.Max(0,enemy.Health-amplifiedDamage);
            effects.Impact(enemy.Root.position,pet);
            string damageText=Mathf.RoundToInt(amplifiedDamage).ToString();
            if (!pet && comboCount>=2) damageText += "  x" + ComboMultiplier.ToString("0.00");
            Float(enemy.Root.position+Vector3.up*(enemy.Boss?3.6f:1.7f),damageText,pet?new Color(.58f,1,.84f):new Color(1,.89f,.55f));
            if(enemy.Alive)return;
            enemy.Warning.gameObject.SetActive(false);enemy.Respawn=clock+(enemy.Boss?2:35);
            if(enemy.Boss)enemy.BossArt?.Die();else enemy.Root.gameObject.SetActive(false);
            if(currentSubmap==0)state.RealmKills[currentRealm]++;else state.SubmapKills[MapKey]++;
            state.Coins+=enemy.Boss?400:60;state.Ore+=enemy.Boss?12:2;
            if(enemy.Boss){if(currentSubmap==0)state.BossMask|=1<<currentRealm;else state.SubmapBossMask|=1<<MapKey;state.Essence+=8;notify("守卫已安息 · 远处的宝箱可以开启了");}
            else notify("山灵已净化 · 银两 +60 · 经验 +25");
            AddExperience(enemy.Boss?160:25);save();
        }
        private void AddExperience(int amount)
        {
            state.Experience+=amount;
            while(state.Level<120 && state.Experience>=ExperienceRequired)
            {state.Experience-=ExperienceRequired;state.Level++;health=MaxHealth;notify("境界提升 · 等级 "+state.Level);}
        }
        private int RealmMemoryCount()
        {int mask=currentSubmap==0?state.MemoryMask>>(Mathf.Max(0,currentRealm)*3):state.SubmapMemories[MapKey];int count=0;for(int i=0;i<3;i++)if((mask&(1<<i))!=0)count++;return count;}
        private void Float(Vector3 position,string text,Color color)=>FloatingText?.Invoke(position,text,color);
        private Material Material(string name,Color color)
        {var material=new Material(Shader.Find("Unlit/Color")){name=name,color=color};owned.Add(material);return material;}
        private void SpawnEnemy(Vector3 point,bool boss,int index)
        {
            var root=new GameObject(boss?"Ancient Guardian":"Wandering Spirit").transform;root.SetParent(content,false);root.position=world.ConstrainPosition(point);
            string[] bossNames={"蝶梦花灵","绯伞花王","沧潮之主","天枢重装","赤壁战将","云海炎龙","秋海花灵"};
            int monsterVariant = Mathf.Abs(currentRealm * 3 + currentSubmap + index) % 4;
            var enemy=new Enemy{Root=root,Spawn=root.position,Boss=boss,Theme=currentRealm,
                Name=boss?bossNames[Mathf.Clamp(currentRealm,0,bossNames.Length-1)]:MonsterVisual.Archetype(monsterVariant),
                Maximum=boss?640+state.Level*14:110+state.Level*5};
            enemy.Health=enemy.Maximum;enemy.Recovery=clock+1;
            if(boss){enemy.BossArt=BossVisual.Create(root,currentRealm);}
            else {enemy.Beast=MonsterVisual.Create(root,monsterVariant);root.localScale=Vector3.one*1.22f;}
            var tint=new MaterialPropertyBlock();tint.SetColor("_Color",boss?new Color(.63f,.72f,.82f):currentRealm==1?new Color(.6f,.64f,.61f):new Color(.45f,.65f,.72f));
            if(!boss)foreach(var renderer in root.GetComponentsInChildren<Renderer>())renderer.SetPropertyBlock(tint);
            if(boss)
            {enemy.Warning=new GameObject("Boss attack telegraph").transform;enemy.Warning.SetParent(content,false);enemy.Telegraph=enemy.Warning.gameObject.AddComponent<BossTelegraph>();}
            else enemy.Warning=Ring(content,"Enemy attack area",2.3f,threatMaterial);
            enemy.Warning.gameObject.SetActive(false);
            enemies.Add(enemy);
            CreateHealthBar(enemy);
        }

        private void CreateHealthBar(Enemy enemy)
        {
            var canvasObject = new GameObject("敌人血条", typeof(RectTransform), typeof(Canvas));
            canvasObject.transform.SetParent(enemy.Root, false);
            canvasObject.transform.localPosition = Vector3.up * (enemy.Boss ? 4.15f : 2.15f);
            var canvas = canvasObject.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;
            canvas.worldCamera = world.WorldCamera;
            canvas.sortingOrder = 40;
            var rect = canvasObject.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(enemy.Boss ? 230 : 180, 40);
            rect.localScale = Vector3.one * (enemy.Boss ? .008f : .007f);
            var backObject = new GameObject("血条底板", typeof(RectTransform), typeof(Image));
            backObject.transform.SetParent(rect, false);
            var backRect = backObject.GetComponent<RectTransform>();
            backRect.anchorMin = Vector2.zero; backRect.anchorMax = new Vector2(1, .25f);
            backRect.offsetMin = backRect.offsetMax = Vector2.zero;
            var back = backObject.GetComponent<Image>();
            back.color = new Color32(10, 20, 24, 230); back.raycastTarget = false;
            var fillObject = new GameObject("生命值", typeof(RectTransform), typeof(Image));
            fillObject.transform.SetParent(backRect, false);
            var fillRect = fillObject.GetComponent<RectTransform>();
            fillRect.anchorMin = Vector2.zero; fillRect.anchorMax = Vector2.one;
            fillRect.offsetMin = new Vector2(0, 1); fillRect.offsetMax = new Vector2(0, -1);
            var fill = fillObject.GetComponent<Image>();
            fill.color = enemy.Boss ? new Color32(231, 94, 105, 255) : new Color32(105, 220, 164, 255);
            fill.raycastTarget = false;
            var labelObject = new GameObject("名称与生命", typeof(RectTransform), typeof(Text), typeof(Outline));
            labelObject.transform.SetParent(rect, false);
            var labelRect = labelObject.GetComponent<RectTransform>();
            labelRect.anchorMin = new Vector2(0, .25f); labelRect.anchorMax = Vector2.one;
            labelRect.offsetMin = labelRect.offsetMax = Vector2.zero;
            var label = labelObject.GetComponent<Text>();
            label.font = UiKit.Font; label.fontSize = enemy.Boss ? 20 : 18;
            label.alignment = TextAnchor.MiddleCenter; label.color = Color.white;
            label.raycastTarget = false; label.supportRichText = false;
            labelObject.GetComponent<Outline>().effectColor = new Color(0, 0, 0, .85f);
            enemy.HealthBar = canvasObject.transform;
            enemy.HealthFill = fill; enemy.HealthLabel = label;
            UpdateHealthBar(enemy);
        }

        private void LateUpdate()
        {
            if (!running || !world) return;
            foreach (var enemy in enemies) UpdateHealthBar(enemy);
        }

        private void UpdateHealthBar(Enemy enemy)
        {
            if (enemy == null || !enemy.HealthBar || !world || !world.WorldCamera) return;
            bool visible = enemy.Alive && Vector3.Distance(world.HeroGroundPosition, enemy.Root.position) < 28;
            enemy.HealthBar.gameObject.SetActive(visible);
            if (!visible) return;
            float ratio = enemy.Maximum > 0 ? Mathf.Clamp01(enemy.Health / enemy.Maximum) : 0;
            // No sprite is required: adjust the fill rectangle, because Unity
            // ignores Image.fillAmount when an Image has no assigned sprite.
            enemy.HealthFill.rectTransform.anchorMax = new Vector2(ratio, 1);
            enemy.HealthFill.enabled = ratio > 0;
            enemy.HealthLabel.text = enemy.Name + "  " + Mathf.CeilToInt(enemy.Health);
            enemy.HealthBar.rotation = world.WorldCamera.transform.rotation;
        }
        private void BeginBossAttack(Enemy enemy)
        {
            enemy.AttackCycle++;
            enemy.AttackStyle=enemy.Theme==1?0:enemy.Theme==2?2:enemy.Theme==3?1:enemy.Theme==4?3:enemy.AttackCycle%2==0?0:3;
            string[] moves={"散华落种","雷霆冲锋","潮汐环浪","破空横扫"};
            enemy.CastName=enemy.Theme==5?(enemy.AttackStyle==0?"流星火雨":"烈焰吐息"):moves[enemy.AttackStyle];
            Vector3 direction=world.HeroGroundPosition-enemy.Root.position;direction.y=0;if(direction.sqrMagnitude<.01f)direction=Vector3.forward;direction.Normalize();
            enemy.StrikeCenter=enemy.AttackStyle==0?world.HeroGroundPosition:enemy.Root.position;
            enemy.Windup=enemy.Enraged ? .95f : 1.45f;
            enemy.Root.rotation=Quaternion.LookRotation(direction);
            enemy.Telegraph.Configure(enemy.AttackStyle,enemy.AttackStyle==1?9:enemy.Theme==5?8:6.5f,enemy.StrikeCenter,direction);
            enemy.BossArt?.Attack(enemy.AttackCycle);
        }
        private void CreateLandmark(Vector3 position,int bit,string title,bool chest)
        {
            var root=new GameObject(title).transform;root.SetParent(content,false);root.position=position;
            var shape=GameObject.CreatePrimitive(chest?PrimitiveType.Cube:PrimitiveType.Cube);
            shape.transform.SetParent(root,false);shape.transform.localPosition=Vector3.up*(chest?.7f:1.15f);
            shape.transform.localScale=chest?new Vector3(1.2f,.8f,.85f):new Vector3(.35f,.5f,.35f);
            shape.transform.localRotation=Quaternion.Euler(0,0,chest?0:45);Destroy(shape.GetComponent<Collider>());
            shape.GetComponent<Renderer>().sharedMaterial=chest?treasureMaterial:memoryMaterial;
            var ring=Ring(root,"Keepsake marker",chest?1.2f:.7f,chest?treasureMaterial:memoryMaterial);ring.localPosition=Vector3.up*.04f;
            bool collected=currentSubmap==0?((chest?state.TreasureMask:state.MemoryMask)&(1<<bit))!=0:
                chest?(state.SubmapTreasureMask&(1<<MapKey))!=0:(state.SubmapMemories[MapKey]&(1<<bit))!=0;
            root.gameObject.SetActive(!collected);
            landmarks.Add(new Landmark{Root=root,Bit=bit,Title=title,Chest=chest});
        }
        private Transform Ring(Transform parent,string name,float radius,Material material)
        {
            var root=new GameObject(name).transform;root.SetParent(parent,false);
            var mesh=new Mesh{name=name};realmMeshes.Add(mesh);const int segments=64;
            var vertices=new Vector3[segments*2];var triangles=new int[segments*6];
            for(int i=0;i<segments;i++)
            {
                float angle=i*Mathf.PI*2/segments;Vector3 direction=new Vector3(Mathf.Cos(angle),0,Mathf.Sin(angle));
                vertices[i*2]=direction*(radius-.08f);vertices[i*2+1]=direction*radius;int next=((i+1)%segments)*2;
                int t=i*6;triangles[t]=i*2;triangles[t+1]=next;triangles[t+2]=i*2+1;triangles[t+3]=i*2+1;triangles[t+4]=next;triangles[t+5]=next+1;
            }
            mesh.vertices=vertices;mesh.triangles=triangles;mesh.RecalculateNormals();
            root.gameObject.AddComponent<MeshFilter>().sharedMesh=mesh;root.gameObject.AddComponent<MeshRenderer>().sharedMaterial=material;return root;
        }
        private void OnDestroy(){AttachOnline(null, null);foreach(var item in owned)if(item)Destroy(item);foreach(var mesh in realmMeshes)if(mesh)Destroy(mesh);}
    }
}








