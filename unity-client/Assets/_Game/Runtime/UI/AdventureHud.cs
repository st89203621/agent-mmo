using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Lunhui
{
    public sealed class WorldCameraGesture : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler, IScrollHandler
    {
        public PrototypeWorld World;
        private readonly Dictionary<int,Vector2> pointers = new Dictionary<int,Vector2>();
        private float pinchDistance;
        public void OnPointerDown(PointerEventData data)
        { pointers[data.pointerId]=data.position;pinchDistance=Distance(); }
        public void OnDrag(PointerEventData data)
        {
            if (!pointers.ContainsKey(data.pointerId)) return;
            pointers[data.pointerId]=data.position;
            if(pointers.Count>1)
            {
                float distance=Distance();
                if(pinchDistance>0)World.ZoomCamera((pinchDistance-distance)*18/Mathf.Max(360,Screen.height));
                pinchDistance=distance;
            }
            else World.OrbitCamera(new Vector2(data.delta.x,-data.delta.y)*(.19f*720/Mathf.Max(360,Screen.height)));
        }
        public void OnPointerUp(PointerEventData data){pointers.Remove(data.pointerId);pinchDistance=Distance();}
        public void OnScroll(PointerEventData data)=>World.ZoomCamera(-data.scrollDelta.y*.8f);
        private float Distance()
        {
            if(pointers.Count<2)return 0;
            var iterator=pointers.Values.GetEnumerator();iterator.MoveNext();var a=iterator.Current;iterator.MoveNext();return Vector2.Distance(a,iterator.Current);
        }
        private void OnDisable(){pointers.Clear();pinchDistance=0;}
        private void OnApplicationFocus(bool value){if(!value){pointers.Clear();pinchDistance=0;}}
    }

    public sealed class AdventureHud : MonoBehaviour
    {
        public PrototypeApp App;
        private Text player,healthText,realm,questTitle,questDetail,targetName,contextText,positionText,comboLabel,autoQuestLabel,chatPreview,chatUnread;
        private RectTransform healthFill,experienceFill,targetFill,targetPanel,comboPanel,comboFill;
        private Button contextButton;
        private readonly List<Button> actionButtons=new List<Button>();
        private readonly List<Text> actionTimers=new List<Text>();
        private readonly List<string> actionKeys=new List<string>();
        private RectTransform page;
        private MiniMapGraphic minimap;

        public static AdventureHud Build(RectTransform root,PrototypeApp app)
        {
            var hud=root.gameObject.AddComponent<AdventureHud>();hud.App=app;hud.page=root;hud.Build();return hud;
        }
        private void Build()
        {
            var cameraArea=UiKit.Panel(page,"CameraGesture",0,0,1280,632,Color.clear);
            cameraArea.GetComponent<Image>().raycastTarget=true;cameraArea.gameObject.AddComponent<WorldCameraGesture>().World=App.World;
            UiKit.Panel(page,"PlayerHud",24,22,304,92,new Color32(14,29,37,210));
            player=UiKit.Label(page,"",42,27,275,32,23,UiKit.Paper);
            if (App.OnlineMode)
            {
                var roleButton = UiKit.Button(page,"OpenPlayerProfile","",24,22,304,92,App.OpenOnlineProfile);
                roleButton.GetComponent<Image>().color = Color.clear;
            }
            healthText=UiKit.Label(page,"",42,58,270,24,17,UiKit.Paper);
            UiKit.Bar(page,"Health",42,89,264,8,1,new Color32(98,215,178,255));healthFill=(RectTransform)page.Find("Health/Fill");
            UiKit.Bar(page,"Experience",42,103,264,3,0,UiKit.Gold);experienceFill=(RectTransform)page.Find("Experience/Fill");
            realm=UiKit.Label(page,"",392,23,484,42,27,Color.white,TextAnchor.MiddleCenter);
            var connection = UiKit.Label(page,App.ConnectionCaption,442,65,390,27,18,new Color(1,.9f,.9f),TextAnchor.MiddleCenter);
            connection.gameObject.AddComponent<NetworkCaption>().App = App;
            if (App.OnlineMode) UiKit.Button(page,"OnlineAccountProfile","账号角色",844,23,168,44,App.OpenOnlineProfile);
            if (App.OnlineMode) UiKit.IconButton(page,"Inventory","book","行囊",1086,251,App.OpenInventory,null,48);
            UiKit.Panel(page,"QuestShade",24,132,314,117,new Color32(14,29,37,193));
            questTitle=UiKit.Label(page,"",40,141,283,29,21,UiKit.Gold);
            questDetail=UiKit.Label(page,"",40,177,280,59,19,UiKit.Paper,TextAnchor.UpperLeft);
            UiKit.Button(page,"Quest",App.World.RealmIndex==0?"出发 · 晚照枫林":"继续任务",24,257,214,44,()=>
            {
                // The large quest card is the mobile-friendly one-tap route
                // entry.  The book icon beside it remains the explicit album.
                if(App.World.RealmIndex==0 && !App.OnlineMode) App.EnterRealm(1,true);
                else App.Combat.StartAutoQuest();
            });
            var autoButton=UiKit.Button(page,"AutoQuest","自动任务",24,307,214,38,()=>App.Combat.ToggleAutoQuest(),true);
            autoQuestLabel=UiKit.Label(page,"",248,307,88,38,16,UiKit.Jade,TextAnchor.MiddleLeft);
            UiKit.IconButton(page,"Album","book","回忆册",254,257,App.OpenMemories,UiKit.Paper,44);
            var mapButton=UiKit.Button(page,"WorldMap","",1032,22,218,157,App.OpenWorldMap);
            minimap=UiKit.Rect(mapButton.transform,"TrailMap",9,9,200,117).gameObject.AddComponent<MiniMapGraphic>();
            minimap.World=App.World;minimap.Combat=App.Combat;minimap.raycastTarget=false;
            positionText=UiKit.Label(mapButton.transform,"",8,124,202,27,17,UiKit.Paper,TextAnchor.MiddleCenter);
            UiKit.IconButton(page,"ZoomIn","zoomIn","拉近镜头",1198,192,()=>App.World.ZoomCamera(-1.5f),null,48);
            UiKit.IconButton(page,"ZoomOut","zoomOut","拉远镜头",1142,192,()=>App.World.ZoomCamera(1.5f),null,48);
            UiKit.IconButton(page,"ResetCamera","reset","镜头归位",1086,192,App.World.ResetCamera,null,48);
            UiKit.IconButton(page,"PhotoMode","camera","观景",1030,192,App.OpenPhotoMode,null,48);
            UiKit.IconButton(page,"HomeSettings","settings","设置",1198,251,App.OpenSettings,null,48);
            UiKit.IconButton(page,"CustomizeInWorld","guild","容貌",1142,251,App.OpenCustomization,null,48);
            BuildChatShortcut();
            targetPanel=UiKit.Panel(page,"TargetHud",478,108,324,62,new Color32(24,31,40,200));
            targetName=UiKit.Label(targetPanel,"",14,1,296,33,20,UiKit.Paper,TextAnchor.MiddleCenter);
            UiKit.Bar(targetPanel,"TargetHealth",17,45,290,6,1,UiKit.Red);targetFill=(RectTransform)targetPanel.Find("TargetHealth/Fill");
            comboPanel=UiKit.Panel(page,"ComboHud",818,108,180,62,new Color32(48,31,28,220));
            UiKit.Label(comboPanel,"连击",12,4,156,21,16,UiKit.Gold,TextAnchor.MiddleCenter);
            comboLabel=UiKit.Label(comboPanel,"",10,24,160,27,21,Color.white,TextAnchor.MiddleCenter);
            UiKit.Bar(comboPanel,"ComboTime",14,54,152,4,0,new Color32(255,177,88,255));comboFill=(RectTransform)comboPanel.Find("ComboTime/Fill");
            comboPanel.gameObject.SetActive(false);
            // Keep the physical target generous, but make both the visual and
            // raycast area a disc so the lower-left control reads as a mobile
            // joystick rather than a square panel.
            var stick=UiKit.Panel(page,"Joystick",54,422,164,164,Color.clear);
            var stickImage=stick.GetComponent<Image>();
            stickImage.enabled=false;stickImage.raycastTarget=false;
            // Image and MaskableGraphic cannot coexist on one GameObject. The
            // disc is therefore a full-size child: pointer events still bubble
            // to MobileJoystick on its parent, while its own raycast filter owns
            // the circular hit area.
            var stickDiscRect=UiKit.Rect(stick,"JoystickDisc",0,0,164,164);
            var stickDisc=stickDiscRect.gameObject.AddComponent<JoystickDiscGraphic>();
            stickDisc.color=new Color32(18,37,41,155);stickDisc.InnerColor=new Color32(36,88,83,86);stickDisc.RingColor=new Color32(167,225,211,138);
            stickDisc.raycastTarget=true;
            var knob=UiKit.Panel(stick,"Thumb",54,54,56,56,Color.clear);
            var knobImage=knob.GetComponent<Image>();
            knobImage.enabled=false;knobImage.raycastTarget=false;
            var knobDiscRect=UiKit.Rect(knob,"ThumbDisc",0,0,56,56);
            var knobDisc=knobDiscRect.gameObject.AddComponent<JoystickDiscGraphic>();
            knobDisc.color=new Color32(186,225,219,225);knobDisc.InnerColor=new Color32(235,250,242,215);knobDisc.RingColor=new Color32(255,255,255,170);
            knobDisc.raycastTarget=false;
            var joystick=stick.gameObject.AddComponent<MobileJoystick>();joystick.World=App.World;joystick.Thumb=knob;
            AddAction("Attack","attack","sword","普攻",1134,483,86);
            AddAction("Skill1","skill","diamond",App.State.Career==1?"守势":"花落",1030,420,66);
            AddAction("Skill2","ultimate","sword","流光",1120,367,66);
            AddAction("Dodge","dodge","dodge","闪避",1030,518,66);
            AddAction("PetCommand","pet","pet","同心",939,491,66);
            AddAction("Heal","heal","heal","回春",842,518,58);
            UiKit.IconButton(page,"SwitchTarget","target","切换目标",1206,402,App.Combat.CycleTarget,UiKit.Gold,44);
            contextButton=UiKit.Button(page,"Interact","",488,526,298,55,()=>{App.Combat.Interact();},true);
            contextText=UiKit.Label(contextButton.transform,"",8,0,282,55,22,UiKit.Paper,TextAnchor.MiddleCenter);
            App.Combat.FloatingText+=ShowFloating;
        }

        private void BuildChatShortcut()
        {
            var button = UiKit.Button(page, "ChatShortcut", "", 24, 365, 314, 48, () => App.ShowPage("community"));
            button.GetComponent<Image>().color = new Color32(13, 30, 30, 226);
            UiKit.Rect(button.transform, "ChatMark", 14, 13, 22, 22).gameObject.AddComponent<SymbolGraphic>().Symbol = "chat";
            chatPreview = UiKit.Label(button.transform, "世界频道 · 暂无消息", 48, 0, 222, 48, 17, UiKit.Paper, TextAnchor.MiddleLeft);
            chatUnread = UiKit.Label(button.transform, "", 272, 4, 30, 24, 15, UiKit.Gold, TextAnchor.MiddleCenter);
            if (App.Native != null) App.Native.Changed += RefreshChatShortcut;
            RefreshChatShortcut();
        }

        private void RefreshChatShortcut()
        {
            if (!chatPreview || App.Native == null) return;
            var latest = App.Native.LatestChatMessage;
            if (latest == null || string.IsNullOrWhiteSpace(latest.Content))
            {
                chatPreview.text = "世界频道 · 暂无消息";
            }
            else
            {
                string sender = string.IsNullOrEmpty(latest.SenderName) ? "玩家" : latest.SenderName;
                string content = latest.Content.Replace("\n", " ").Trim();
                if (content.Length > 14) content = content.Substring(0, 14) + "…";
                chatPreview.text = sender + "：" + content;
            }
            int unread = App.Native.TotalUnreadChatCount;
            chatUnread.text = unread > 0 ? (unread > 99 ? "99+" : unread.ToString()) : "";
        }
        private void AddAction(string id,string key,string icon,string caption,float x,float y,float size)
        {
            var button=UiKit.IconButton(page,id,icon,caption,x,y,()=>
            {
                // Give touch users immediate confirmation while preserving the
                // existing cooldown and combat validation in TryAction.
                if (App.Combat.TryAction(key)) MobileFeedback.Action(key);
            },key=="attack"?UiKit.Gold:UiKit.Paper,size);
            var timer=UiKit.Label(button.transform,"",0,0,size,size,24,Color.white,TextAnchor.MiddleCenter);
            actionButtons.Add(button);actionTimers.Add(timer);actionKeys.Add(key);
            UiKit.Label(page,caption,x-8,y+size+2,size+16,27,17,UiKit.Paper,TextAnchor.MiddleCenter);
        }
        private void Update()
        {
            var combat=App.Combat;
            player.text=App.State.Nickname+"  "+App.State.Level+" 级";
            healthText.text=Mathf.CeilToInt(combat.Health)+" / "+Mathf.CeilToInt(combat.MaxHealth)+"    "+PrototypeApp.Careers[App.State.Career];
            healthFill.sizeDelta=new Vector2(264*combat.Health/combat.MaxHealth,8);
            experienceFill.sizeDelta=new Vector2(264*Mathf.Clamp01((float)App.State.Experience/combat.ExperienceRequired),3);
            realm.text=App.World.RealmName;questTitle.text=combat.QuestTitle;questDetail.text=combat.QuestDetail;
            autoQuestLabel.text=combat.IsAutoQuestRunning ? (combat.AutoQuestStatus.Length>9 ? combat.AutoQuestStatus.Substring(0,9)+"…" : combat.AutoQuestStatus) : "";
            var autoButtonTransform=page.Find("AutoQuest");
            if(autoButtonTransform) autoButtonTransform.GetComponentInChildren<Text>().text=combat.IsAutoQuestRunning?"停止自动":"自动任务";
            Rect realmBounds=App.World.CurrentRealmBounds;
            positionText.text="探索 "+Mathf.Max(0,Mathf.RoundToInt(App.World.HeroGroundPosition.z-realmBounds.yMin))+" 米   ·   地图";
            bool comboActive=combat.ComboCount>0 && combat.ComboRemaining>0;
            comboPanel.gameObject.SetActive(comboActive);
            if(comboActive)
            {
                comboLabel.text=combat.ComboCount+" 连击  ×"+combat.ComboMultiplier.ToString("0.00");
                comboFill.sizeDelta=new Vector2(152*Mathf.Clamp01(combat.ComboRemaining/combat.ComboWindowSeconds),4);
            }
            bool targeted=combat.Target!=null;targetPanel.gameObject.SetActive(targeted);
            if(targeted){targetName.text=combat.Target.Windup>0&&combat.Target.Boss?combat.Target.CastName+"  "+combat.Target.Windup.ToString("0.0"):combat.Target.Name+(combat.Target.Enraged?" · 狂怒":"");targetFill.sizeDelta=new Vector2(290*combat.Target.Health/combat.Target.Maximum,6);}
            for(int i=0;i<actionKeys.Count;i++)
            {
                float remaining=combat.Cooldown(actionKeys[i]);actionTimers[i].text=remaining>.05f?remaining.ToString("0.0"):"";
                actionButtons[i].interactable=remaining<=0&&!combat.IsDead;
                actionButtons[i].transform.Find("Icon").gameObject.SetActive(remaining<=0);
            }
            string nearby=combat.NearbyAction;contextButton.gameObject.SetActive(nearby.Length>0);contextText.text=nearby;
            RefreshChatShortcut();
        }
        private void ShowFloating(Vector3 position,string value,Color color)
        {
            if(!isActiveAndEnabled)return;
            var label=UiKit.Label(page,value,0,0,180,38,29,color,TextAnchor.MiddleCenter);
            label.gameObject.AddComponent<DamageNumber>().Initialize(page,App.World.WorldCamera,position);
        }
        private void OnDestroy(){if(App&&App.Combat)App.Combat.FloatingText-=ShowFloating;if(App?.Native!=null)App.Native.Changed-=RefreshChatShortcut;}
    }

    /// <summary>
    /// A circular, raycast-filtered control surface used by the mobile joystick.
    /// Its RectTransform remains square only as a layout container; no corners
    /// are drawn or accepted as touches.
    /// </summary>
    [RequireComponent(typeof(CanvasRenderer))]
    public sealed class JoystickDiscGraphic : MaskableGraphic, ICanvasRaycastFilter
    {
        public Color InnerColor = new Color32(36,88,83,86);
        public Color RingColor = new Color32(167,225,211,138);
        private const int Segments = 40;

        public bool IsRaycastLocationValid(Vector2 screenPoint, Camera eventCamera)
        {
            if (!RectTransformUtility.ScreenPointToLocalPointInRectangle(rectTransform, screenPoint, eventCamera, out Vector2 local)) return false;
            Rect rect = rectTransform.rect;
            float radius = Mathf.Min(rect.width, rect.height) * .5f;
            return (local - rect.center).sqrMagnitude <= radius * radius;
        }

        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear();
            Rect rect = rectTransform.rect;
            float radius = Mathf.Min(rect.width, rect.height) * .5f;
            Vector2 center = rect.center;
            Disc(vh, center, radius, color);
            Disc(vh, center, radius * .68f, InnerColor);
            Ring(vh, center, radius * .88f, radius * .925f, RingColor);
            Ring(vh, center, radius * .18f, radius * .215f, RingColor);
        }

        private static void Disc(VertexHelper vh, Vector2 center, float radius, Color tint)
        {
            int start = vh.currentVertCount;
            vh.AddVert(center, tint, Vector2.zero);
            for (int i = 0; i < Segments; i++)
            {
                float angle = i * Mathf.PI * 2 / Segments;
                vh.AddVert(center + new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * radius, tint, Vector2.zero);
            }
            for (int i = 0; i < Segments; i++) vh.AddTriangle(start, start + 1 + i, start + 1 + (i + 1) % Segments);
        }

        private static void Ring(VertexHelper vh, Vector2 center, float innerRadius, float outerRadius, Color tint)
        {
            int start = vh.currentVertCount;
            for (int i = 0; i < Segments; i++)
            {
                float angle = i * Mathf.PI * 2 / Segments;
                Vector2 direction = new Vector2(Mathf.Cos(angle), Mathf.Sin(angle));
                vh.AddVert(center + direction * innerRadius, tint, Vector2.zero);
                vh.AddVert(center + direction * outerRadius, tint, Vector2.zero);
            }
            for (int i = 0; i < Segments; i++)
            {
                int next = (i + 1) % Segments;
                vh.AddTriangle(start + i * 2, start + next * 2, start + i * 2 + 1);
                vh.AddTriangle(start + i * 2 + 1, start + next * 2, start + next * 2 + 1);
            }
        }
    }

    public sealed class DamageNumber : MonoBehaviour
    {
        private RectTransform parent;private Camera camera;private Vector3 point;private float age;private Text text;
        public void Initialize(RectTransform owner,Camera view,Vector3 position){parent=owner;camera=view;point=position;text=GetComponent<Text>();}
        private void Update()
        {
            age+=Time.deltaTime;if(age>.85f){Destroy(gameObject);return;}
            Vector3 screen=camera.WorldToScreenPoint(point+Vector3.up*age);
            RectTransformUtility.ScreenPointToLocalPointInRectangle(parent,screen,null,out Vector2 local);
            text.rectTransform.anchoredPosition=local+new Vector2(-90,0);Color color=text.color;color.a=Mathf.Clamp01((.85f-age)*3);text.color=color;
        }
    }

    [RequireComponent(typeof(CanvasRenderer))]
    public sealed class MiniMapGraphic : MaskableGraphic
    {
        public PrototypeWorld World;public AdventureCombat Combat;
        private void Update()=>SetVerticesDirty();
        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear();if(!World)return;
            Rect bounds=World.CurrentRealmBounds;
            for(int i=0;i<12;i++)
            {
                float t=i/11f;
                Dot(vh,new Vector2(.5f+Mathf.Sin(t*Mathf.PI*3)*.055f,.06f+t*.87f),.012f,new Color(.76f,.83f,.77f));
            }
            Vector3 position=World.HeroGroundPosition;
            Dot(vh,MapPoint(position,bounds),.036f,new Color(.56f,1,.85f));
            if(Combat!=null)foreach(var enemy in Combat.Enemies)if(enemy.Alive)Dot(vh,MapPoint(enemy.Root.position,bounds),enemy.Boss?.034f:.022f,enemy.Boss?new Color(1,.77f,.32f):new Color(1,.46f,.52f));
            Dot(vh,new Vector2(.5f,.97f),.035f,new Color(.96f,.76f,.92f));
        }
        private static Vector2 MapPoint(Vector3 position,Rect bounds)=>new Vector2(Mathf.InverseLerp(bounds.xMin,bounds.xMax,position.x),Mathf.InverseLerp(bounds.yMin,bounds.yMax,position.z));
        private void Dot(VertexHelper vh,Vector2 point,float radius,Color tint)
        {
            Rect r=rectTransform.rect;Vector2 center=new Vector2(r.x+point.x*r.width,r.y+point.y*r.height);float size=radius*Mathf.Min(r.width,r.height);int start=vh.currentVertCount;
            vh.AddVert(center,tint,Vector2.zero);
            for(int i=0;i<12;i++){float angle=i*Mathf.PI/6;vh.AddVert(center+new Vector2(Mathf.Cos(angle),Mathf.Sin(angle))*size,tint,Vector2.zero);}
            for(int i=0;i<12;i++)vh.AddTriangle(start,start+1+(i+1)%12,start+1+i);
        }
    }
}
