using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Lunhui.Protocol;
using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    public sealed partial class AdventureCombat
    {
        private NativeGameClient online;
        private PrototypeApp onlineApp;
        private Task worldRequest;
        private bool actionRequest, rewardRefresh;
        private float nextPoll, lastSnapshotAt;
        private long lastServerTime, lastEvent;
        private bool autoGuide;
        private bool waitingForEncounter;
        private readonly HashSet<string> receivedRewards = new HashSet<string>();
        private readonly Dictionary<long, RemoteTraveler> travelers = new Dictionary<long, RemoteTraveler>();

        public void AttachOnline(NativeGameClient client, PrototypeApp app)
        {
            if (online != null) online.WorldChanged -= ApplyOnlineWorld;
            foreach (var traveler in travelers.Values) if (traveler.Root) Destroy(traveler.Root.gameObject);
            travelers.Clear(); receivedRewards.Clear(); lastEvent = 0;
            online = client; onlineApp = app; actionRequest = false; worldRequest = null; nextPoll = 0;
            if (online == null) return;
            online.WorldChanged += ApplyOnlineWorld;
            RestoreOnlineWorld();
        }

        public void RestoreOnlineWorld()
        {
            if (online?.Snapshot == null) return;
            var snapshot = online.Snapshot;
            world.SetMap(snapshot.Realm, snapshot.Submap); SetRealm(snapshot.Realm);
            world.Teleport(new Vector3(snapshot.X, .16f, snapshot.Z));
            ApplyOnlineWorld(snapshot);
        }

        private void ChooseOnlineObjective()
        {
            autoEnemy=null;autoLandmark=null;autoGuide=false;waitingForEncounter=false;autoPath.Clear();autoPathIndex=0;
            var snapshot=online.Snapshot;
            if(snapshot==null){StopAutoQuest(true);return;}
            if(currentRealm==0&&currentSubmap==0&&!state.IntroComplete)
            {
                var guide=snapshot.Landmarks.FirstOrDefault(x=>x.Kind=="guide");
                if(guide!=null){autoGuide=true;autoDestination=new Vector3(guide.X,.16f,guide.Z);}
            }
            bool needKills=HasMapEnemies&&snapshot.SubmapKills<4;
            bool needBoss=HasMapEnemies&&!snapshot.SubmapBossDefeated;
            if(!autoGuide&&(needKills||needBoss))
            {
                autoEnemy=enemies.Where(e=>e.Alive&&(needKills?!e.Boss:e.Boss))
                    .OrderBy(e=>Vector3.Distance(world.HeroGroundPosition,e.Root.position)).FirstOrDefault();
                if(autoEnemy!=null)autoDestination=autoEnemy.Root.position;
            }
            if(!autoGuide&&autoEnemy==null)
            {
                autoLandmark=landmarks.FirstOrDefault(item=>item.Root.gameObject.activeSelf&&!item.Chest);
                if(autoLandmark==null&&snapshot.Landmarks.Any(x=>x.Kind=="chest"&&!x.Collected&&x.Available))
                    autoLandmark=landmarks.FirstOrDefault(item=>item.Chest&&item.Root.gameObject.activeSelf);
                if(autoLandmark!=null)autoDestination=autoLandmark.Root.position;
            }
            if(!autoGuide&&autoEnemy==null&&autoLandmark==null)
            {
                if(!snapshot.SubmapTreasureCollected)
                { waitingForEncounter=true;autoStatus="等待山灵重现";autoActionAt=clock+1;world.SetMove(Vector2.zero);return; }
                StopAutoQuest(true);notify("本区域旅程已完成");return;
            }
            if(!autoMarker&&content)autoMarker=Ring(content,"Auto quest destination",.82f,selectionMaterial);
            if(autoMarker){autoMarker.position=autoDestination+Vector3.up*.035f;autoMarker.gameObject.SetActive(true);}
            BuildCurvedPath(world.HeroGroundPosition,autoDestination);
            autoStatus=autoGuide?"前往 · 情花":autoEnemy!=null?"前往 · "+autoEnemy.Name:"前往 · "+autoLandmark.Title;
        }

        private void ApplyOnlineWorld(NativeWorldSnapshot snapshot)
        {
            if (online == null || snapshot == null) return;
            lastServerTime = snapshot.ServerTime; lastSnapshotAt = Time.realtimeSinceStartup;
            state.MemoryMask = snapshot.MemoryMask; state.BossMask = snapshot.BossMask;
            state.TreasureMask = snapshot.TreasureMask; state.IntroComplete = snapshot.IntroComplete;
            for(int key=0;key<snapshot.MapMemoryMasks.Count&&key<state.SubmapMemories.Length;key++)
                state.SubmapMemories[key]=snapshot.MapMemoryMasks[key];
            if(snapshot.Submap>0)
            {
                int key=snapshot.Realm*3+snapshot.Submap;
                state.SubmapKills[key]=snapshot.SubmapKills;
                state.SubmapBossMask=snapshot.SubmapBossDefeated?state.SubmapBossMask|(1<<key):state.SubmapBossMask&~(1<<key);
                state.SubmapTreasureMask=snapshot.SubmapTreasureCollected?state.SubmapTreasureMask|(1<<key):state.SubmapTreasureMask&~(1<<key);
            }
            state.Level = snapshot.Level; state.Experience = (int)Math.Min(int.MaxValue, snapshot.Experience);
            for (int i = 0; i < Math.Min(7, snapshot.RealmKills.Count); i++) state.RealmKills[i] = snapshot.RealmKills[i];
            bool realmChanged = currentRealm != snapshot.Realm || currentSubmap != snapshot.Submap;
            if (realmChanged)
            {
                world.SetMap(snapshot.Realm, snapshot.Submap); SetRealm(snapshot.Realm);
                world.Teleport(new Vector3(snapshot.X, .16f, snapshot.Z));
                foreach (var traveler in travelers.Values) if (traveler.Root) Destroy(traveler.Root.gameObject);
                travelers.Clear();
            }
            if (!snapshot.Accepted) world.Teleport(new Vector3(snapshot.X, .16f, snapshot.Z));
            health = snapshot.Health;
            reviveAt = clock + Mathf.Max(0,(snapshot.ReviveAt - snapshot.ServerTime)/1000f);
            world.SetMovementDisabled(IsDead || !online.Ready);
            cooldowns.Clear();
            foreach (var cooldown in snapshot.Cooldowns) cooldowns[cooldown.Action] = clock + Mathf.Max(0,(cooldown.ReadyAt-snapshot.ServerTime)/1000f);
            for (int i = 0; i < snapshot.Enemies.Count && i < enemies.Count; i++)
            {
                var source = snapshot.Enemies[i]; var enemy = enemies[i];
                bool wasAlive = enemy.Alive;
                enemy.ServerId = source.Id; enemy.Name = source.Name;
                enemy.Maximum = source.MaxHealth; enemy.Health = source.Health;
                enemy.NetworkPosition = new Vector3(source.X,.16f,source.Z);
                if (realmChanged || Vector3.Distance(enemy.Root.position,enemy.NetworkPosition)>8) enemy.Root.position=enemy.NetworkPosition;
                if (wasAlive && !enemy.Alive) { enemy.BossArt?.Die(); enemy.Warning.gameObject.SetActive(false); }
                if (!wasAlive && enemy.Alive) enemy.BossArt?.Revive();
                enemy.Root.gameObject.SetActive(enemy.Alive);
                enemy.Windup = Mathf.Max(0,(source.CastEndsAt-snapshot.ServerTime)/1000f);
                if (enemy.Windup>0 && enemy.NetworkCast!=source.CastEndsAt)
                {
                    enemy.NetworkCast=source.CastEndsAt;
                    enemy.StrikeCenter=new Vector3(source.CastX,.16f,source.CastZ);
                    if (enemy.Boss)
                    {
                        enemy.CastName=source.CastStyle==2?"风华震荡":"凝聚灵力";
                        enemy.Telegraph.Configure(4,source.CastRadius,enemy.StrikeCenter,Vector3.forward);
                        enemy.BossArt?.Attack(source.CastStyle);
                    }
                    else
                    {
                        enemy.Warning.position=enemy.StrikeCenter;
                        enemy.Warning.gameObject.SetActive(true); enemy.Beast?.Command();
                    }
                }
                if (enemy.Windup<=0) enemy.Warning.gameObject.SetActive(false);
            }
            foreach (var item in landmarks)
            {
                var source=snapshot.Landmarks.FirstOrDefault(x=>item.Chest?x.Kind=="chest":x.Kind=="memory"&&x.Bit==item.Bit);
                if(source!=null) { item.Title=source.Title; item.Root.position=new Vector3(source.X,.16f,source.Z); item.Root.gameObject.SetActive(!source.Collected); }
            }
            ApplyTravelers(snapshot);
            foreach (var entry in snapshot.Events)
            {
                if(entry.Id<=lastEvent)continue;
                lastEvent=entry.Id;
                var position=new Vector3(entry.X,1.8f,entry.Z);
                if(entry.Kind=="damage")
                {
                    bool player=entry.TargetId==online.Person.UserId.ToString();
                    Float(position,(player?"-":"")+entry.Amount,player?UiKit.Red:UiKit.Gold);
                    effects.Impact(new Vector3(entry.X,.16f,entry.Z),entry.Action=="pet");
                    if(entry.SourceId==online.Person.UserId.ToString() && entry.Action!="pet") { comboCount=Math.Min(30,comboCount+1);comboExpire=clock+ComboWindow; }
                }
                if(entry.Kind=="heal")Float(position,"+"+entry.Amount,UiKit.Jade);
            }
            bool newReward=false;
            foreach(var reward in snapshot.Rewards)
            {
                if(!receivedRewards.Add(reward.Id))continue;
                newReward=true;
                string text="获得 银两 "+reward.Gold+" · 经验 "+reward.Experience;
                foreach(var item in reward.Items) text+="\n"+(item.Important?"珍稀 · ":"")+item.Name+" × "+item.Quantity;
                if(!string.IsNullOrEmpty(reward.EquipmentId))text+="\n获得一件装备";
                notify(text);
            }
            if(newReward)RefreshOnlineRewards();
        }

        private async void RefreshOnlineRewards()
        {
            if(rewardRefresh||online==null)return;
            rewardRefresh=true;
            var client=online;
            try { await client.RefreshGrowth(); }
            catch(Exception exception) { if(client==online&&client.Connected)notify(exception.Message); }
            finally { rewardRefresh=false; }
        }

        private void UpdateOnline()
        {
            if (!world || state==null) return;
            float dt=Mathf.Min(Time.deltaTime,.05f);clock+=dt;
            if(comboCount>0&&clock>=comboExpire)comboCount=0;
            bool connected=online.Ready&&online.Connected;
            world.SetMovementDisabled(!connected||IsDead);
            if (!connected) { world.SetMove(Vector2.zero); return; }
            if(running&&!IsDead&&autoQuest)AutoQuestUpdate(dt);
            if(IsDead&&running&&clock>=reviveAt&&!actionRequest)ReviveOnline();
            if(!onlineApp.IsEnteringMap&&Time.realtimeSinceStartup>=nextPoll&&!actionRequest&&(worldRequest==null||worldRequest.IsCompleted))
            {
                nextPoll=Time.realtimeSinceStartup+.2f;
                worldRequest=SynchronizeOnlinePosition();
            }
            foreach(var enemy in enemies)
            {
                if(!enemy.Alive)continue;
                Vector3 delta=enemy.NetworkPosition-enemy.Root.position;
                enemy.Root.position=Vector3.Lerp(enemy.Root.position,enemy.NetworkPosition,Mathf.Min(1,dt*12));
                if(delta.sqrMagnitude>.004f)enemy.Root.rotation=Quaternion.Slerp(enemy.Root.rotation,Quaternion.LookRotation(delta.normalized),dt*10);
                enemy.Beast?.Move(delta.magnitude>.02f?1:0);enemy.BossArt?.Move(delta.magnitude>.02f?2.3f:0);
                enemy.Windup=Mathf.Max(0,(enemy.NetworkCast-lastServerTime)/1000f-(Time.realtimeSinceStartup-lastSnapshotAt));
                if(enemy.Windup<=0)enemy.Warning.gameObject.SetActive(false);
            }
            foreach(var traveler in travelers.Values)traveler.Update(dt,world.WorldCamera);
            if(!running)return;
            AcquireTarget(); selection.gameObject.SetActive(Target!=null);
            if(Target!=null)selection.position=target.Root.position+Vector3.up*.07f;
            foreach(var item in landmarks)if(item.Root.gameObject.activeSelf)item.Root.Rotate(0,dt*20,0,Space.World);
        }

        private async Task SynchronizeOnlinePosition()
        {
            var client=online;
            try
            {
                var position=world.HeroGroundPosition;
                var previous=client.Snapshot;
                if(running&&world.IsExploring&&Vector2.Distance(new Vector2(position.x,position.z),new Vector2(previous.X,previous.Z))>.02f)
                    await client.Move(currentRealm,position.x,position.z,world.HeroTransform.eulerAngles.y);
                else await client.PollWorld();
            }
            catch(Exception) { /* The session owns reconnect and error presentation. */ }
        }

        public async Task FlushOnlineMovement()
        {
            if(worldRequest!=null)await worldRequest;
            while(actionRequest)await Task.Delay(20);
        }

        private bool TryOnlineAction(string action)
        {
            if(!running||!world.IsExploring||IsDead||Cooldown(action)>0||actionRequest||!online.Ready||!online.Connected)return false;
            bool support=action=="dodge"||action=="heal"||action=="skill"&&state.Career==1;
            if(!support)
            {
                AcquireTarget();
                if(Target==null){notify("前方暂无敌人");return false;}
                if(Vector3.Distance(world.HeroGroundPosition,target.Root.position)>(action=="attack"?3.6f:action=="pet"?12:7)){notify("请靠近目标");return false;}
            }
            var enemy=support?null:target;
            SendOnlineAction(action,enemy);return true;
        }

        private async void SendOnlineAction(string action,Enemy enemy)
        {
            actionRequest=true;
            var client=online;
            try
            {
                if(worldRequest!=null)await worldRequest;
                await SynchronizeOnlinePosition();
                await client.Act(action,enemy?.ServerId);
                if(client!=online)return;
                Vector3 destination=enemy==null?world.HeroGroundPosition:enemy.Root.position;
                if(enemy!=null)world.FacePoint(destination);
                world.PerformAction(action);effects.Skill(state.Career,action,world.HeroGroundPosition,destination);
            }
            catch(Exception exception){if(client==online&&client.Connected)notify(exception.Message);}
            finally{actionRequest=false;}
        }

        private async void InteractOnline()
        {
            if(!running||!online.Ready||!online.Connected||actionRequest)return;
            if(IsDead){ReviveOnline();return;}
            var landmark=online.Snapshot.Landmarks.FirstOrDefault(x=>!x.Collected&&Vector3.Distance(world.HeroGroundPosition,new Vector3(x.X,.16f,x.Z))<3.4f);
            if(landmark==null)
            {
                if(world.HeroGroundPosition.z>ExitZ)
                {
                    if(currentSubmap+1<RealmMapCatalog.Count(currentRealm))onlineApp.EnterMap(currentRealm,currentSubmap+1);
                    else onlineApp.EnterRealm((currentRealm+1)%7);
                }
                return;
            }
            actionRequest=true;var client=online;
            try
            {
                if(worldRequest!=null)await worldRequest;
                await SynchronizeOnlinePosition();await client.Interact(landmark.Id);
                if(!string.IsNullOrEmpty(client.Snapshot.Message))notify(client.Snapshot.Message);
            }
            catch(Exception exception){if(client==online&&client.Connected)notify(exception.Message);}
            finally{actionRequest=false;}
        }

        private async void ReviveOnline()
        {
            if(actionRequest||!online.Connected||!IsDead)return;
            actionRequest=true;var client=online;
            try{await client.Revive();if(client==online)RestoreOnlineWorld();}
            catch(Exception exception){if(client==online&&client.Connected)notify(exception.Message);}
            finally{actionRequest=false;}
        }

        private void ApplyTravelers(NativeWorldSnapshot snapshot)
        {
            var present=new HashSet<long>();
            foreach(var player in snapshot.Players)
            {
                if(player.UserId==online.Person.UserId)continue;
                present.Add(player.UserId);
                if(!travelers.TryGetValue(player.UserId,out var traveler))
                {
                    var root=new GameObject("同行旅人").transform;root.SetParent(transform,false);
                    traveler=new RemoteTraveler{Root=root,Art=CharacterVisual.Create(root)};
                    traveler.Art.SetFemale(player.Gender!="male");traveler.Art.SetCareer(player.Profession=="DEFENSE"?1:player.Profession=="AGILITY"?2:0);
                    try{if(!string.IsNullOrEmpty(player.AppearanceJson))traveler.Art.SetAppearance(JsonUtility.FromJson<CharacterAppearance>(player.AppearanceJson));}catch(Exception){}
                    var labelRoot=new GameObject("旅人姓名",typeof(RectTransform),typeof(Canvas));labelRoot.transform.SetParent(root,false);labelRoot.transform.localPosition=new Vector3(0,3.5f,0);
                    labelRoot.GetComponent<Canvas>().renderMode=RenderMode.WorldSpace;labelRoot.GetComponent<RectTransform>().sizeDelta=new Vector2(260,40);labelRoot.transform.localScale=Vector3.one*.008f;
                    traveler.Label=UiKit.Label(labelRoot.transform,player.Nickname,0,0,260,40,23,UiKit.Paper,TextAnchor.MiddleCenter);
                    root.position=new Vector3(player.X,.16f,player.Z);travelers[player.UserId]=traveler;
                }
                traveler.Position=new Vector3(player.X,.16f,player.Z);traveler.Yaw=player.Yaw;
                traveler.Label.text=player.Nickname+" · "+player.Level+"级";
                if(player.ActionAt>traveler.LastAction){traveler.LastAction=player.ActionAt;if(snapshot.ServerTime-player.ActionAt<1200&&!string.IsNullOrEmpty(player.Action))traveler.Art.PerformAction(player.Action);}
                traveler.Root.gameObject.SetActive(running);
            }
            foreach(long id in travelers.Keys.Where(x=>!present.Contains(x)).ToArray()){Destroy(travelers[id].Root.gameObject);travelers.Remove(id);}
        }

        private sealed class RemoteTraveler
        {
            public Transform Root;public CharacterVisual Art;public Text Label;public Vector3 Position;public float Yaw;public long LastAction;
            public void Update(float dt,Camera camera)
            {
                float distance=Vector3.Distance(Root.position,Position);Root.position=Vector3.Lerp(Root.position,Position,Mathf.Min(1,dt*12));
                Root.rotation=Quaternion.Slerp(Root.rotation,Quaternion.Euler(0,Yaw,0),dt*12);Art.Move(distance>.025f?1:0);
                if(Label)Label.transform.parent.rotation=camera.transform.rotation;
            }
        }
    }
}
