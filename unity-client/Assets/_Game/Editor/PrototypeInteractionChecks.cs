using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using Lunhui;

namespace Lunhui.Prototype
{
    public static class PrototypeInteractionChecks
    {
        private const string Prefix="Lunhui.NativePrototype.v1.";
        public static List<string> Run(PrototypeApp app)
        {
            var checks=new List<string>();
            string[] keys={Prefix+"new",Prefix+"demo"};
            var originals=keys.ToDictionary(key=>key,key=>PlayerPrefs.HasKey(key)?PlayerPrefs.GetString(key):null);
            try
            {
                app.Enter(true);
                app.State.Level=65;app.State.EquipmentQuality=4;app.State.EnchantLevel=2;app.State.Coins=286000;app.State.Ore=480;app.State.Essence=160;
                app.ShowPage("equipment");
                Click("UpgradeQuality");
                Require(app.State.EquipmentQuality==4&&app.State.Coins==286000,"Opening confirmation cannot spend currency",checks);
                Click("CancelDialog");
                Require(app.State.Coins==286000,"Cancelling an upgrade preserves resources",checks);
                Click("UpgradeQuality");Click("ConfirmDialog");
                Require(app.State.EquipmentQuality==5&&app.State.Coins==277000&&app.State.Ore==455,"Confirmed quality upgrade deducts exact resources",checks);
                Click("EnchantWeapon");Click("ConfirmDialog");
                Require(app.State.EnchantLevel==3&&app.State.Coins==272500&&app.State.Essence==151,"Confirmed enchant deducts exact resources",checks);
                app.State.Coins=0;app.ShowPage("equipment");Click("UpgradeQuality");Click("ConfirmDialog");
                Require(app.State.EquipmentQuality==5&&app.State.Ore==455,"Insufficient currency cannot upgrade or consume materials",checks);
                app.State.Level=2;app.ShowPage("equipment");
                Require(!Find("UpgradeQuality").interactable&&!Find("EnchantWeapon").interactable,"Equipment unlock gates are enforced",checks);
                app.State.Level=65;app.State.EquipmentQuality=21;app.State.EnchantLevel=10;app.ShowPage("equipment");
                Require(!Find("UpgradeQuality").interactable&&!Find("EnchantWeapon").interactable,"Upgrade caps disable spending",checks);
                app.State.PetLevel=8;app.State.ActivePet=0;app.State.Coins=20000;app.State.Essence=50;
                app.ShowPage("pets");Click("Pet1");Click("DeployPet");
                Require(app.State.ActivePet==1,"Selected pet is deployed",checks);
                Click("FeedPet");
                Require(app.State.PetLevel==9&&app.State.Coins==17600&&app.State.Essence==48,"Pet feeding deducts resources and persists growth",checks);
                app.State.Level=1;app.ShowPage("pets");
                Require(Find("FeedPet").interactable,"New companions can be trained from level one",checks);
                app.State.Level=65;app.State.GuildJoined=false;app.State.Contribution=0;app.ShowPage("guild");
                Click("GuildAction");Click("GuildAction");Click("ConfirmDialog");
                Require(app.State.GuildJoined&&app.State.Contribution==10&&app.State.Coins==16600,"Guild join and donation update the local state",checks);
                app.ShowPage("mountains");
                Require(Enumerable.Range(0,6).All(i=>Find("Mountain"+i)!=null),"All six original mountain entries exist",checks);
                Click("Mountain1");Click("EnterMountain");Click("ConfirmDialog");
                Require(Find("ReturnToMountains")!=null,"Mountain preview has a return route",checks);
                Click("ReturnToMountains");Click("Nav_home");
                Require(app.CurrentPage=="home","Bottom navigation returns to town",checks);
                for(int realm=0;realm<7;realm++)
                {
                    Click("WorldMap");
                    Click("World"+realm);
                    Click("EnterSubmap0");
                    Require(app.CurrentPage=="home"&&app.World.RealmIndex==realm,"World map enters 3D realm "+realm,checks);
                }
                app.World.SetRealm(0);
                app.ShowPage("home");
                Require(UnityEngine.Object.FindObjectsOfType<CharacterVisual>().Any(x=>x.HasModel),"Imported character art is present",checks);
                var petModels=app.World.GetComponentsInChildren<PetVisual>(true);
                Require(petModels.Length==2&&petModels.All(x=>x.HasModel),"Both pets use imported animated models",checks);
                var joystick=UnityEngine.Object.FindObjectOfType<MobileJoystick>();
                var pointer=new PointerEventData(EventSystem.current){pointerId=7,position=new Vector2(Screen.width*.14f,Screen.height*.28f)};
                joystick.OnPointerDown(pointer);joystick.OnDrag(pointer);joystick.OnPointerUp(pointer);
                Require(joystick.Thumb.anchoredPosition==new Vector2(54,-54),"Joystick release resets the thumb",checks);
                Click("HomeSettings");Click("Back");
                Require(app.CurrentPage=="home","Settings returns to the correct source page",checks);
                app.Save();
                Require(JsonUtility.FromJson<PrototypeState>(PlayerPrefs.GetString(Prefix+"demo")).ActivePet==1,"Local pet selection survives serialization",checks);
                app.Enter(false);app.State.Nickname="";app.State.Level=1;app.ShowPage("character");
                var input=UnityEngine.Object.FindObjectsOfType<InputField>().Single(x=>x.name=="Nickname");
                input.text="x";Click("CreateCharacter");
                Require(app.CurrentPage=="character","Invalid nickname is rejected",checks);
                input.text="云归客";Click("Career2");Click("CreateCharacter");
                Require(app.CurrentPage=="home"&&app.State.Nickname=="云归客"&&app.State.Career==2,"Nickname and career choices create a playable local character",checks);
                Require(app.State.Level==1,"New character remains separate from level 65 demo",checks);
                RunCustomizationChecks(app, checks);
                RunJourneyChecks(app, checks);
                checks.AddRange(AdventureInteractionChecks.Run(app));
                RunBossChecks(app, checks);
                // Leave screenshots populated, but restore every user save before the editor quits.
                app.Enter(true);app.State.Level=65;app.State.Nickname="归来客";app.State.Career=0;
                app.State.EquipmentQuality=4;app.State.EnchantLevel=2;app.State.Coins=286000;app.State.Ore=480;app.State.Essence=160;app.State.PetLevel=8;app.State.ActivePet=0;
                app.SuppressPersistence=true;
                app.ShowPage("login");
                return checks;
            }
            finally
            {
                app.SuppressPersistence=true;
                foreach(var pair in originals){if(pair.Value==null)PlayerPrefs.DeleteKey(pair.Key);else PlayerPrefs.SetString(pair.Key,pair.Value);}
                PlayerPrefs.Save();
            }
        }
        private static Button Find(string name)=>UnityEngine.Object.FindObjectsOfType<Button>().Single(button=>button.name==name);
        private static void Click(string name){var button=Find(name);if(!button.interactable)throw new Exception("Button disabled: "+name);button.onClick.Invoke();Canvas.ForceUpdateCanvases();}
        private static void Require(bool condition,string message,List<string> checks){if(!condition)throw new Exception("Interaction check failed: "+message);checks.Add(message);}

        private static void RunJourneyChecks(PrototypeApp app, List<string> checks)
        {
            app.World.SetRealm(1); app.ShowPage("home");
            app.World.Teleport(new Vector3(0, .16f, 12));
            Vector3 position = app.World.HeroGroundPosition;
            int coins = app.State.Coins;
            Click("OpenJourney");
            Require(app.CurrentPage == "journey" && !app.World.IsExploring, "Journey suspends world controls", checks);
            Click("JourneyAppearance"); Click("CancelAppearance");
            Require(app.CurrentPage == "journey" && !app.World.IsExploring, "Appearance returns to its source system", checks);
            Click("JourneySettings"); Click("Back");
            Require(app.CurrentPage == "journey", "Settings returns to the journey hub", checks);
            Click("ContinueJourney");
            Require(app.CurrentPage == "home" && app.World.IsExploring && Vector3.Distance(position, app.World.HeroGroundPosition) < .01f,
                "Journey round trip preserves exploration location", checks);
            Require(app.State.Coins == coins && !app.Combat.IsAutoQuestRunning, "Opening journey cannot spend or start automatic play", checks);
            Click("Quest");
            Require(app.CurrentPage == "journey" && app.World.RealmIndex == 1, "Quest opens current objective without changing maps", checks);
            Click("Nav_equipment"); Click("Back");
            Require(app.CurrentPage == "journey", "System back navigation returns to the hub", checks);
            Click("Nav_community"); Click("ConnectForContent"); Click("CloseOnlineLogin");
            Require(app.CurrentPage == "community", "Cancelling login preserves the offline source page", checks);
        }

        internal static void RunCustomizationChecks(PrototypeApp app,List<string> checks)
        {
            app.ShowPage("home");
            CharacterAppearance original=app.State.Appearance.Copy();
            app.OpenCustomization();
            Click("FacePreset1");
            CharacterAppearance preset=CharacterAppearance.Preset(1);
            CharacterCustomizer customizer=app.World.HeroCustomizer;
            Require(customizer!=null&&customizer.DeformedVertexCount>0,"Face customization has a deformable imported head",checks);
            Require(customizer.Current.Hair==preset.Hair&&Mathf.Abs(customizer.Current.FaceWidth-preset.FaceWidth)<.001f,"Appearance preset updates the live preview",checks);
            Slider slider=UnityEngine.Object.FindObjectsOfType<Slider>().Single(x=>x.name=="FaceWidth");
            slider.value=.92f;Canvas.ForceUpdateCanvases();
            Require(Mathf.Abs(app.World.HeroCustomizer.Current.FaceWidth-.92f)<.02f,"Face sliders update the live preview",checks);
            Click("CancelAppearance");
            Require(AppearanceEqual(app.State.Appearance,original),"Cancelling appearance editing leaves the saved profile unchanged",checks);
            Require(AppearanceEqual(app.World.HeroCustomizer.Current,original),"Cancelling appearance editing restores the original preview",checks);
            app.OpenCustomization();Click("FacePreset2");Click("SaveAppearance");
            CharacterAppearance saved=app.State.Appearance.Copy();
            string json=PlayerPrefs.GetString("Lunhui.NativePrototype.v1.new","");
            PrototypeState serialized=JsonUtility.FromJson<PrototypeState>(json);
            Require(serialized!=null&&AppearanceEqual(serialized.Appearance,saved),"Saved appearance survives local serialization",checks);
        }

        private static void RunBossChecks(PrototypeApp app,List<string> checks)
        {
            var names=new HashSet<string>();
            MethodInfo begin=typeof(AdventureCombat).GetMethod("BeginBossAttack",BindingFlags.Instance|BindingFlags.NonPublic);
            MethodInfo damage=typeof(AdventureCombat).GetMethod("Damage",BindingFlags.Instance|BindingFlags.NonPublic);
            for(int realm=1;realm<=5;realm++)
            {
                app.State.BossMask=0;app.ShowPage("home");app.World.SetRealm(realm);app.Combat.SetRealm(realm);
                var boss=app.Combat.Enemies.Single(x=>x.Boss);
                Require(boss.BossArt!=null&&boss.BossArt.HasModel&&boss.BossArt.AnimationCount>0,"Boss "+realm+" uses an animated imported model",checks);
                names.Add(boss.BossArt.ModelName);
                app.World.Teleport(boss.Root.position+Vector3.back*5f);
                begin.Invoke(app.Combat,new object[]{boss});
                Require(boss.Warning.gameObject.activeSelf&&boss.Telegraph.Shape>=0&&boss.Telegraph.Shape<=3&&boss.Telegraph.Radius>0,"Boss "+realm+" exposes a shaped attack telegraph",checks);
                boss.Health=boss.Maximum*.4f;
                Require(boss.Enraged,"Boss "+realm+" enters its enraged phase below half health",checks);
                boss.Health=1;damage.Invoke(app.Combat,new object[]{boss,9999f,false});
                Require(!boss.Alive&&boss.BossArt.HasModel,"Boss "+realm+" plays a death state without losing its model",checks);
                Tick(app.Combat,2.2f);
                Require(!boss.Root.gameObject.activeSelf,"Defeated boss leaves the encounter after its death window",checks);
            }
            Require(names.Count==5,"All five realms use distinct boss silhouettes",checks);
            app.State.BossMask=0;app.World.SetRealm(0);app.Combat.SetRealm(0);app.ShowPage("home");
        }

        private static void Tick(AdventureCombat combat,float seconds)
        {
            const BindingFlags flags=BindingFlags.Instance|BindingFlags.NonPublic;
            var field=typeof(AdventureCombat).GetField("clock",flags);
            field.SetValue(combat,(float)field.GetValue(combat)+seconds);
            typeof(AdventureCombat).GetMethod("Update",flags).Invoke(combat,null);
        }

        private static bool AppearanceEqual(CharacterAppearance a,CharacterAppearance b)
        {
            if(a==null||b==null)return a==b;
            return a.Hair==b.Hair&&a.HairColor==b.HairColor&&a.SkinColor==b.SkinColor&&a.EyeColor==b.EyeColor&&a.OutfitColor==b.OutfitColor&&
                Mathf.Abs(a.FaceWidth-b.FaceWidth)<.001f&&Mathf.Abs(a.JawWidth-b.JawWidth)<.001f&&Mathf.Abs(a.ChinLength-b.ChinLength)<.001f&&
                Mathf.Abs(a.EyeSize-b.EyeSize)<.001f&&Mathf.Abs(a.EyeSpacing-b.EyeSpacing)<.001f&&Mathf.Abs(a.NoseSize-b.NoseSize)<.001f&&Mathf.Abs(a.Height-b.Height)<.001f;
        }
    }
}
