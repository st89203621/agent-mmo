using System;
using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using UnityEngine.EventSystems;

namespace Lunhui.Prototype
{
    public static class AdventureInteractionChecks
    {
        private const BindingFlags Private = BindingFlags.Instance | BindingFlags.NonPublic;
        public static List<string> Run(PrototypeApp app)
        {
            var checks=new List<string>();var world=app.World;var combat=app.Combat;
            app.State.Level=1;app.State.Career=0;app.State.EquipmentQuality=1;app.State.EnchantLevel=0;
            app.State.MemoryMask=0;app.State.BossMask=0;app.State.TreasureMask=0;app.State.Experience=0;
            app.State.RealmKills=new int[7];world.SetRealm(1);combat.Bind(world,app.State,app.Save,app.Toast);app.ShowPage("home");
            Require(combat.Enemies.Count==5,"Adventure contains four creatures and an elite guardian",checks);
            foreach (var creature in combat.Enemies)
            {
                var renderers = creature.Root.GetComponentsInChildren<Renderer>();
                bool hasGeometry = false;
                foreach (var renderer in renderers)
                {
                    var skin = renderer as SkinnedMeshRenderer;
                    var filter = renderer.GetComponent<MeshFilter>();
                    bool mesh = skin && skin.sharedMesh ? skin.sharedMesh.vertexCount > 0 : filter && filter.sharedMesh ? filter.sharedMesh.vertexCount > 0 : false;
                    if (mesh && renderer.sharedMaterial) hasGeometry = true;
                }
                Require(hasGeometry, creature.Name + " loads real mesh geometry and a material", checks);
                Require(creature.HealthBar && creature.HealthFill && creature.HealthLabel,
                    creature.Name + " has a world health bar", checks);
            }
            Require(UnityEngine.Object.FindObjectOfType<MiniMapGraphic>().GetComponent<CanvasRenderer>()!=null,"Minimap has a native UI renderer",checks);
            var enemy=combat.Enemies[0];world.Teleport(enemy.Root.position+Vector3.back*2);
            float originalHealth=enemy.Health;Require(combat.TryAction("attack"),"An in-range attack starts",checks);
            Require(!combat.TryAction("attack"),"Attack cooldown rejects duplicate input",checks);
            Tick(combat,.25f);Require(enemy.Health<originalHealth,"Attack animation resolves real enemy damage",checks);
            Tick(combat,.35f);
            Require(combat.TryAction("attack"),"A follow-up attack starts inside the combo window",checks);
            Tick(combat,.25f);
            Require(combat.ComboCount>=2&&combat.ComboMultiplier>1f,"Combo multiplier increases on consecutive hits",checks);
            Tick(combat,combat.ComboWindowSeconds+.1f);
            Require(combat.ComboCount==0,"Combo expires after its short timing window",checks);
            float before=combat.Health;
            typeof(AdventureCombat).GetMethod("ReceiveDamage",Private).Invoke(combat,new object[]{50f});
            Require(combat.Health<before,"Enemy damage reduces player health",checks);
            Require(combat.TryAction("heal")&&combat.Health>before-50,"Healing restores health with a cooldown",checks);
            before=combat.Health;combat.TryAction("dodge");
            typeof(AdventureCombat).GetMethod("ReceiveDamage",Private).Invoke(combat,new object[]{50f});
            Require(combat.Health==before,"Dodge grants a damage-free escape window",checks);
            int coins=app.State.Coins;
            for(int i=0;i<8&&enemy.Alive;i++){Tick(combat,.6f);combat.TryAction("attack");Tick(combat,.25f);}
            Require(!enemy.Alive&&app.State.Coins>coins&&app.State.RealmKills[1]>0,"Defeated enemies grant persistent rewards",checks);
            // Reproduce the reported sequence: kill, choose the next objective,
            // then resume travel. Check both displacement and the real Animator.
            var animator = world.HeroTransform.GetComponentInChildren<Animator>();
            Vector3 afterKill = world.HeroGroundPosition;
            combat.StartAutoQuest();
            for (int frame=0;frame<12;frame++)
            {
                Tick(combat,.033f);
                typeof(PrototypeWorld).GetMethod("Update",Private).Invoke(world,null);
                animator.Update(.033f);
            }
            Require(Vector3.Distance(afterKill,world.HeroGroundPosition)>.05f && animator.GetFloat("MoveSpeed")>.1f,
                "Quest travel after a kill moves the hero and drives locomotion",checks);
            combat.StopAutoQuest(true);
            RunLocomotionChecks(app,checks);
            world.SetRealm(0);combat.SetRealm(0);app.ShowPage("home");world.Teleport(new Vector3(-7,.16f,14));
            coins=app.State.Coins;combat.Interact();
            Require((app.State.MemoryMask&1)!=0&&app.State.Coins==coins+100,"Nearby memories can be collected",checks);
            combat.Interact();Require(app.State.Coins==coins+100,"A memory cannot grant its reward twice",checks);
            world.Teleport(new Vector3(0,.16f,103));coins=app.State.Coins;combat.Interact();
            Require(app.State.Coins==coins,"A locked travel chest cannot grant rewards",checks);
            for(int realm=0;realm<7;realm++)
            {
                world.SetRealm(realm);combat.SetRealm(realm);world.Teleport(new Vector3(0,.16f,105));
                Require(world.HeroGroundPosition.z>100,"Realm "+realm+" keeps its playable exploration bounds",checks);
            }
            Vector3 travel=world.HeroGroundPosition;app.ShowPage("equipment");app.ShowPage("home");
            Require(Vector3.Distance(travel,world.HeroGroundPosition)<.1f,"Opening equipment preserves exploration position",checks);
            world.ResetCamera();float distance=world.CameraDistance;
            var gesture=UnityEngine.Object.FindObjectOfType<WorldCameraGesture>();
            var first=new PointerEventData(EventSystem.current){pointerId=81,position=new Vector2(400,400)};
            var second=new PointerEventData(EventSystem.current){pointerId=82,position=new Vector2(600,400)};
            gesture.OnPointerDown(first);gesture.OnPointerDown(second);second.position=new Vector2(760,400);gesture.OnDrag(second);
            Require(world.CameraDistance<distance,"Two-finger spreading brings the camera closer",checks);
            gesture.OnPointerUp(first);gesture.OnPointerUp(second);world.ZoomCamera(-100);Require(world.CameraDistance>=3.2f,"Camera zoom respects the near limit",checks);
            world.ZoomCamera(100);Require(world.CameraDistance<=17,"Camera zoom respects the far limit",checks);world.ResetCamera();
            app.OpenWorldMap();Require(!world.IsExploring&&!combat.TryAction("attack"),"Modal maps pause movement and combat",checks);app.CloseDialog();
            world.SetRealm(6);combat.SetRealm(6);world.Teleport(new Vector3(0,.16f,112));combat.Interact();
            Require(world.RealmIndex==6&&world.SubmapIndex==1,"The water realm endpoint continues into its next submap",checks);
            world.SetMap(6,2);combat.SetRealm(6);world.Teleport(new Vector3(0,.16f,112));combat.Interact();
            Require(world.RealmIndex==0&&world.SubmapIndex==0,"The final water submap returns to the cherry town",checks);
            var restored=JsonUtility.FromJson<PrototypeState>(JsonUtility.ToJson(app.State));restored.Sanitize();
            Require(restored.MemoryMask==app.State.MemoryMask&&restored.RealmKills[1]>0,"Adventure rewards survive save serialization",checks);
            return checks;
        }
        private static void RunLocomotionChecks(PrototypeApp app,List<string> checks)
        {
            var world=app.World;
            world.SetRealm(0);app.Combat.SetRealm(0);app.ShowPage("home");
            MethodInfo update=typeof(PrototypeWorld).GetMethod("Update",Private);
            for(int sex=0;sex<2;sex++)
            for(int career=0;career<3;career++)
            {
                world.SetMode("home",career);world.SetFemale(sex==0);
                world.Teleport(new Vector3(0,.16f,0));
                var animator=world.HeroTransform.GetComponentInChildren<Animator>();
                Require(animator && animator.avatar && animator.avatar.isValid,"Character rig is valid for sex/career "+sex+"/"+career,checks);
                animator.Rebind();animator.Update(0);
                world.PerformAction("attack");animator.Update(.3f);
                Vector3 start=world.HeroGroundPosition;
                Vector3 destination=start+Vector3.forward*10;
                world.MoveTowardsWorld(destination,4.6f);
                Require(world.HeroGroundPosition==start,"Auto travel queues motion instead of translating the model directly",checks);
                for(int frame=0;frame<45;frame++)
                {
                    world.MoveTowardsWorld(destination,4.6f);update.Invoke(world,null);animator.Update(.05f);
                }
                Require(animator.GetFloat("MoveSpeed")>.1f && animator.GetCurrentAnimatorStateInfo(0).IsName("Locomotion"),
                    "Attack returns to locomotion for sex/career "+sex+"/"+career,checks);
                var foot=animator.GetBoneTransform(HumanBodyBones.LeftFoot);
                Quaternion pose=foot.localRotation;animator.Update(.18f);
                Require(Quaternion.Angle(pose,foot.localRotation)>.2f,"Moving character animates its foot for sex/career "+sex+"/"+career,checks);
                world.SetMove(Vector2.zero);start=world.HeroGroundPosition;update.Invoke(world,null);
                Require(Vector3.Distance(start,world.HeroGroundPosition)<.001f,"Stopping auto travel leaves no residual translation",checks);
                world.MoveTowardsWorld(destination);world.SetInputBlocked(true);update.Invoke(world,null);
                Require(Vector3.Distance(start,world.HeroGroundPosition)<.001f,"Modal input block cancels queued route movement",checks);
                world.SetInputBlocked(false);
            }
            world.SetMode("home",app.State.Career);world.SetFemale(!app.State.UseMaleModel);
        }

        private static void Tick(AdventureCombat combat,float seconds)
        {
            var field=typeof(AdventureCombat).GetField("clock",Private);field.SetValue(combat,(float)field.GetValue(combat)+seconds);
            typeof(AdventureCombat).GetMethod("Update",Private).Invoke(combat,null);
        }
        private static void Require(bool condition,string message,List<string> checks)
        {if(!condition)throw new InvalidOperationException("Adventure check failed: "+message);checks.Add(message);}
    }
}

