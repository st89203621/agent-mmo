using System;
using System.Text.RegularExpressions;
using Lunhui.Protocol;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Lunhui
{
    public sealed partial class PrototypeApp : MonoBehaviour
    {
        public static readonly string[] Careers = { "无坚不摧", "金刚护体", "行动敏捷" };
        private static readonly string[] CareerRoles = { "攻 · 重击", "防 · 盾壁", "敏 · 双刃" };
        private static readonly string[] CareerLore = { "重击破阵，造成强力伤害。", "护体坚守，承受伤害并反击。", "迅捷双刃，专攻敌方弱点。" };
        private const string SavePrefix = "Lunhui.NativePrototype.v1.";
        public PrototypeState State { get; private set; }
        public string CurrentPage { get; private set; }
        public bool DemoMode { get; private set; }
        public bool SuppressPersistence { get; set; }
        public PrototypeWorld World { get; private set; }
        public AdventureCombat Combat { get; private set; }
        public IGameNetworkSession Network { get; private set; }
        public RectTransform PageRoot => page;
        private RectTransform safe, stage, page, modal, toastRoot, screenVeil, hintRoot;
        private string settingsReturn = "login";
        private Text toastText, hintText;
        private float toastUntil;
        private string nicknameDraft = "";
        private int draftCareer;
        private bool draftMale;
        private bool photoMode;
        private CharacterAppearance appearanceDraft;
        private bool appearanceEditing;
        private string appearanceReturn;
        private int appearanceTab;
        private bool ready;
        private Rect lastSafe;
        private Vector2 lastScreen;

        private void Awake()
        {
            State = Load(false);
            nicknameDraft = State.Nickname;
            draftCareer = State.Career;
            draftMale = State.UseMaleModel;
            UiKit.Font = Resources.Load<Font>("Fonts/NotoSansSC-Variable");
            if (!UiKit.Font) UiKit.Font = Font.CreateDynamicFontFromOSFont(new[] { "Microsoft YaHei", "PingFang SC", "Arial" }, 24);
            if (!FindObjectOfType<EventSystem>()) new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));
            BuildCanvas();
            World = PrototypeWorld.Create();
            Network = new OfflineGameNetworkSession();
            Network.Connect("offline://prototype");
            Combat = gameObject.AddComponent<AdventureCombat>();
            Combat.Bind(World,State,Save,Toast);
            ready = true;
            ApplySettings();
            ShowPage("login");
        }

        private void BuildCanvas()
        {
            var canvasObject = new GameObject("MobileCanvas", typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvasObject.transform.SetParent(transform, false);
            var canvas = canvasObject.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;
            screenVeil = UiKit.Panel(canvas.transform, "ScreenVeil", 0, 0, 0, 0, UiKit.Ink);
            screenVeil.anchorMin = Vector2.zero; screenVeil.anchorMax = Vector2.one;
            screenVeil.offsetMin = screenVeil.offsetMax = Vector2.zero;
            safe = UiKit.Rect(canvas.transform, "SafeArea", 0, 0, 0, 0);
            safe.pivot = new Vector2(.5f, .5f);
            stage = UiKit.Rect(safe, "MobileStage_1280x720", 0, 0, 1280, 720);
            stage.anchorMin = stage.anchorMax = new Vector2(.5f,.5f);
            stage.pivot = new Vector2(.5f,.5f);
            hintRoot = UiKit.Panel(stage, "Tooltip", 0, 0, 224, 36, UiKit.Ink);
            hintText = UiKit.Label(hintRoot, "", 8, 0, 208, 36, 18, UiKit.Paper, TextAnchor.MiddleCenter);
            hintRoot.gameObject.SetActive(false);
            FitScreen();
        }

        private void FitScreen()
        {
            if (!safe || Screen.width == 0 || Screen.height == 0) return;
            Rect area = Screen.safeArea;
            lastSafe = area; lastScreen = new Vector2(Screen.width, Screen.height);
            safe.anchorMin = new Vector2(area.xMin/Screen.width, area.yMin/Screen.height);
            safe.anchorMax = new Vector2(area.xMax/Screen.width, area.yMax/Screen.height);
            safe.offsetMin = safe.offsetMax = Vector2.zero;
            float scale = Mathf.Min(area.width/1280f, area.height/720f);
            stage.localScale = Vector3.one * scale;
            stage.anchoredPosition = Vector2.zero;
        }

        public void ShowPage(string name)
        {
            if (!ready) return;
            if (name == "mountain") name = "mountains";
            if (name == "pet") name = "pets";
            if (!PageDirectory.ContainsKey(name)) throw new ArgumentException("Unknown page: " + name);
            CloseDialog();
            if (page) { page.gameObject.SetActive(false); Destroy(page.gameObject); }
            if (toastRoot) { toastRoot.gameObject.SetActive(false); Destroy(toastRoot.gameObject); }
            CurrentPage = name;
            Hint("");
            World.SetMove(Vector2.zero);
            World.SetMode(name, name == "character" ? draftCareer : State.Career);
            World.SetFemale(!(name == "character" ? draftMale : State.UseMaleModel));
            World.SetAppearance(State.Appearance);
            World.SetPet(State.ActivePet);
            Combat.SetRealm(World.RealmIndex);
            Combat.SetRunning(name == "home");
            page = UiKit.Rect(stage, "Page_" + name, 0, 0, 1280, 720);
            bool systemPage = name != "login" && name != "character" && name != "home";
            screenVeil.gameObject.SetActive(systemPage);
            if (systemPage) Shell(PageDirectory[name].Title);
            switch (name)
            {
                case "login": Login(); break;
                case "character": Character(); break;
                case "home": Home(); break;
                case "journey": Journey(); break;
                case "mountains": if (OnlineMode) NativeSocialPages.BuildMountains(page, this); else MountainPage.Build(page, this); break;
                case "equipment": if (OnlineMode) NativeGrowthPages.BuildEquipment(page, this); else EquipmentPage.Build(page, this); break;
                case "inventory": if (OnlineMode) NativeGrowthPages.BuildInventory(page, this); else ConnectionRequired(); break;
                case "pets": if (OnlineMode) NativeGrowthPages.BuildPets(page, this); else PetPage.Build(page, this); break;
                case "guild": if (OnlineMode) NativeSocialPages.BuildGuild(page, this); else Guild(); break;
                case "community": if (OnlineMode) NativeCommunityPages.Build(page, this); else ConnectionRequired(); break;
                case "titles": if (OnlineMode) NativeGrowthPages.BuildTitles(page, this); else ConnectionRequired(); break;
                case "settings": Settings(); break;
            }
            if (systemPage) Navigation();
            toastRoot = UiKit.Panel(stage, "Toast", name=="home"?400:360, name=="home"?182:96, name=="home"?480:560, 48, UiKit.Ink);
            toastText = UiKit.Label(toastRoot, "", 18, 0, name=="home"?444:524, 48, 22, UiKit.Gold, TextAnchor.MiddleCenter);
            toastRoot.gameObject.SetActive(false);
        }

        private void Login()
        {
            UiKit.Panel(page, "LoginShade", 0, 0, 540, 720, new Color32(20,24,27,180));
            UiKit.Label(page, "轮回", 72, 86, 410, 124, 72, UiKit.Paper);
            UiKit.Label(page, "山海相逢 · 同赴轮回", 80, 214, 390, 42, 24, UiKit.Gold);
            UiKit.Panel(page,"BrandRule",80,278,64,2,UiKit.Gold);
            UiKit.Label(page, "隔世小镇", 1010, 60, 210, 42, 26, UiKit.Paper, TextAnchor.MiddleRight);
            UiKit.Button(page, "SelectServer", "区服 · " + GameServerSettings.Load().Name, 80, 354, 390, 48, OpenServerSettings);
            UiKit.Button(page, "OnlineLogin", "进入轮回", 80, 420, 390, 64, OpenOnlineLogin, true);
            UiKit.Button(page, "EnterGame", string.IsNullOrEmpty(State.Nickname) ? "本地启程" : "继续 · " + State.Nickname, 80, 502, 390, 54, () => Enter(false));
            UiKit.Button(page, "EnterDemo", "系统试玩", 80, 574, 390, 48, () => Enter(true));
            UiKit.Label(page, Application.version, 80, 656, 300, 26, 17, UiKit.Muted);
            UiKit.IconButton(page, "LoginSettings", "settings", "设置", 1170, 630, () => {settingsReturn="login";ShowPage("settings");});
        }

        public void Enter(bool demo)
        {
            LeaveOnlineSession();
            int selectedServer = State.Server;
            DemoMode = demo;
            State = Load(demo);
            State.Server = selectedServer;
            nicknameDraft = State.Nickname;
            draftCareer = State.Career;
            draftMale = State.UseMaleModel;
            World.SetRealm(0);
            Combat.Bind(World,State,Save,Toast);
            ShowPage(string.IsNullOrEmpty(State.Nickname) || demo ? "character" : "home");
        }

        private void Character()
        {
            var orbit = UiKit.Panel(page,"CharacterOrbit",100,108,642,420,Color.clear);
            orbit.GetComponent<Image>().raycastTarget=true;
            orbit.gameObject.AddComponent<CharacterOrbit>().World=World;
            UiKit.IconButton(page, "BackToLogin", "back", "返回", 40, 30, () => ShowPage("login"));
            UiKit.Label(page, "选择你的道路", 116, 30, 460, 56, 33, UiKit.Paper);
            UiKit.Label(page, DemoMode ? "系统试玩 · 独立存档" : "初入轮回", 924, 38, 308, 42, 23, UiKit.Gold, TextAnchor.MiddleRight);
            UiKit.Panel(page, "CharacterShade", 792, 108, 488, 612, new Color32(23,26,29,235));
            UiKit.Label(page, CareerRoles[draftCareer], 824, 146, 380, 34, 22, UiKit.Gold);
            UiKit.Label(page, Careers[draftCareer], 824, 196, 380, 66, 36, UiKit.Paper);
            UiKit.Label(page, CareerLore[draftCareer], 824, 277, 376, 44, 25, UiKit.Muted);
            string[] attrs = { "攻击", "守御", "敏捷" };
            float[][] strengths = { new[]{.94f,.45f,.65f}, new[]{.52f,.96f,.38f}, new[]{.67f,.48f,.96f} };
            for (int i=0;i<3;i++)
            {
                UiKit.Label(page, attrs[i], 824, 342+i*46, 70, 30, 22, UiKit.Muted);
                UiKit.Bar(page, "CareerStat"+i, 911, 354+i*46, 260, 6, strengths[draftCareer][i], i==draftCareer?UiKit.Gold:UiKit.Jade);
            }
            var input = UiKit.Input(page, "Nickname", nicknameDraft, "输入昵称", 824, 508, 306, 58);
            input.onValueChanged.AddListener(value => nicknameDraft=value);
            UiKit.IconButton(page,"RandomName","diamond","随机昵称",1144,508,()=> { string[] names={"听雨","归舟","照夜","云岫","清越","逐风"}; nicknameDraft=names[UnityEngine.Random.Range(0,names.Length)]; input.text=nicknameDraft; });
            for (int i=0;i<3;i++)
            {
                int career=i;
                UiKit.Button(page, "Career"+i, Careers[i], 40+i*240, 622, 222, 62,
                    () => { draftCareer=career; ShowPage("character"); }, draftCareer==i);
            }
            UiKit.Button(page,"CreateCharacter","踏入轮回",824,622,376,62,CreateCharacter,true);
            UiKit.Button(page,"FemaleAppearance","女侠",252,548,132,48,()=>{draftMale=false;ShowPage("character");},!draftMale);
            UiKit.Button(page,"MaleAppearance","侠客",396,548,132,48,()=>{draftMale=true;ShowPage("character");},draftMale);
            UiKit.IconButton(page,"CustomizeCharacter","guild","容貌",40,548,OpenCustomization,null,48);
        }

        private void CreateCharacter()
        {
            string name=(nicknameDraft??"").Trim();
            if (!Regex.IsMatch(name,@"^[\p{IsCJKUnifiedIdeographs}a-zA-Z0-9]{2,10}$")) { Toast("昵称需要 2 至 10 个汉字、字母或数字"); return; }
            if (OnlineMode)
            {
                RunOnline(async () =>
                {
                    await Native.UpdatePerson(new UpdatePersonMessage { Name = name, Profession = draftCareer == 1 ? "DEFENSE" : draftCareer == 2 ? "AGILITY" : "ATTACK", Gender = draftMale ? "male" : "female", AppearanceJson = JsonUtility.ToJson(State.Appearance) });
                    await Native.RefreshGrowth();
                    ShowPage("home");
                }, "新的旅程开始了");
                return;
            }
            State.Nickname=name; State.Career=draftCareer; State.UseMaleModel=draftMale; Save(); ShowPage("home");
        }

        private void Home()
        {
            AdventureHud.Build(page,this);
        }
        public void OpenWorldMap()=>WorldMap();
        public void OpenSettings(){settingsReturn="home";ShowPage("settings");}
        public void PreviewAppearance(CharacterAppearance appearance)=>World.SetAppearance(appearance);
        public void OpenCustomization()
        {
            CloseDialog();appearanceReturn=CurrentPage;appearanceDraft=State.Appearance.Copy();appearanceEditing=true;appearanceTab=0;
            World.SetMode("character",CurrentPage=="character"?draftCareer:State.Career);World.SetPortraitCloseup(true);
            World.SetInputBlocked(true);Combat.SetRunning(false);page.gameObject.SetActive(false);BuildCustomization();
            screenVeil.gameObject.SetActive(false);
        }
        public void ApplyAppearancePreset(int index){appearanceDraft=CharacterAppearance.Preset(index);World.SetAppearance(appearanceDraft);BuildCustomization();}
        private void BuildCustomization()
        {
            if(modal){modal.gameObject.SetActive(false);Destroy(modal.gameObject);}
            modal=UiKit.Panel(stage,"CharacterCustomization",0,0,1280,720,Color.clear);modal.GetComponent<Image>().raycastTarget=true;
            CustomizationPage.Build(modal,this,appearanceDraft,appearanceTab,index=>{appearanceTab=index;BuildCustomization();},()=>{appearanceDraft=new CharacterAppearance();World.SetAppearance(appearanceDraft);BuildCustomization();},CloseDialog,()=>
            {
                var appearance = appearanceDraft.Copy();
                if (OnlineMode && CurrentPage != "character")
                {
                    RunOnline(async () => { await Native.UpdatePerson(new UpdatePersonMessage { Name = State.Nickname, AppearanceJson = JsonUtility.ToJson(appearance) }); CloseDialog(); }, "容貌已保存");
                    return;
                }
                State.Appearance=appearance;Save();CloseDialog();Toast("容貌已保存");
            });
        }

        public void OpenPhotoMode()
        {
            CloseDialog();World.SetMove(Vector2.zero);Combat.SetRunning(false);page.gameObject.SetActive(false);photoMode=true;
            modal=UiKit.Panel(stage,"PhotoMode",0,0,1280,720,Color.clear);modal.GetComponent<Image>().raycastTarget=true;
            modal.gameObject.AddComponent<WorldCameraGesture>().World=World;
            UiKit.IconButton(modal,"ClosePhoto","close","返回旅途",1190,28,CloseDialog);
            UiKit.IconButton(modal,"PhotoZoomIn","zoomIn","拉近",1190,104,()=>World.ZoomCamera(-1));
            UiKit.IconButton(modal,"PhotoZoomOut","zoomOut","拉远",1190,176,()=>World.ZoomCamera(1));
        }

        public void OpenMemories()
        {
            BuildMemoryAlbum(0);
        }

        private void WorldMap()
        {
            CloseDialog();
            World.SetMove(Vector2.zero);
            World.SetInputBlocked(true);Combat.SetRunning(false);
            modal=UiKit.Panel(stage,"WorldAtlas",0,0,1280,720,new Color32(11,21,25,249));
            modal.GetComponent<Image>().raycastTarget=true;
            UiKit.Label(modal,"万象诸界",48,26,650,62,36,UiKit.Paper);
            UiKit.Label(modal,World.RealmName,714,43,420,32,20,UiKit.Gold,TextAnchor.MiddleRight);
            UiKit.IconButton(modal,"CloseWorldAtlas","close","关闭",1176,29,CloseDialog);
            for(int i=0;i<PrototypeWorld.RealmNames.Length;i++)
            {
                int world=i;
                // Seven realms fit on a phone friendly atlas in a compact 3-row grid.
                float x=48+(i%3)*400, y=119+(i/3)*166;
                var tile=UiKit.Button(modal,"World"+i,"",x,y,384,150,
                    ()=> OpenRegionMap(world),World.RealmIndex==i);
                UiKit.Picture(tile.transform,"RealmView","Art/Realms/realm"+i,2,2,380,96);
                UiKit.Label(tile.transform,RealmMapCatalog.RegionNames[i],18,99,232,34,20,UiKit.Paper);
                UiKit.Label(tile.transform,RealmMapCatalog.Count(i)+" 处风景",246,102,120,30,18,UiKit.Muted,TextAnchor.MiddleRight);
                if(World.RealmIndex==i)UiKit.Label(tile.transform,"当前位置",220,14,144,30,18,UiKit.Gold,TextAnchor.MiddleRight);
                if (OnlineMode && Native?.Snapshot != null && (Native.Snapshot.UnlockedRealmMask & (1 << i)) == 0)
                {
                    UiKit.Label(tile.transform,"尚未开启",220,14,144,30,18,UiKit.Muted,TextAnchor.MiddleRight);
                }
            }
        }

        private void Guild()
        {
            UiKit.Label(page,State.GuildJoined?"碧空盟":"寻找同行者",54,148,610,60,42,UiKit.Paper);
            UiKit.Label(page,"盟友携手守护每一座山川",54,221,730,40,25,UiKit.Muted);
            UiKit.Panel(page,"GuildRule",54,290,1160,1,new Color32(70,96,88,180));
            UiKit.Label(page,"盟会荣誉",54,332,320,36,25,UiKit.Gold);
            UiKit.Label(page,State.GuildJoined?"盟会成员":"尚未加入",54,392,380,48,32,UiKit.Paper);
            UiKit.Label(page,"个人贡献",507,332,300,36,25,UiKit.Gold);
            UiKit.Label(page,State.Contribution.ToString(),507,392,300,48,36,UiKit.Paper);
            UiKit.Label(page,"驻地",916,332,280,36,25,UiKit.Gold);
            UiKit.Label(page,"隔世小镇",916,392,280,48,30,UiKit.Paper);
            UiKit.Button(page,"GuildAction",State.GuildJoined?"捐献 1,000 银两":"加入碧空盟",54,509,350,62,()=>
            {
                if(!State.GuildJoined) { State.GuildJoined=true; Save();ShowPage("guild");Toast("已加入本地盟会");return; }
                if(State.Coins<1000) { Toast("银两不足");return; }
                ShowDialog("盟会捐献","捐献 1,000 银两可获得 10 点贡献。",()=> { if(State.Coins<1000){Toast("银两不足");return;} State.Coins-=1000;State.Contribution+=10;Save();ShowPage("guild");Toast("捐献完成"); },"捐献");
            },true);
            UiKit.Label(page,"本地盟会 · 尚未连接其他玩家",450,519,720,44,23,UiKit.Muted);
        }

        private void Settings()
        {
            UiKit.Label(page,"画面与体验",54,143,570,52,34,UiKit.Paper);
            UiKit.Label(page,"帧率",54,233,240,48,25,UiKit.Paper);
            int fps=PlayerPrefs.GetInt(SavePrefix+"Fps",30);
            foreach(int value in new[]{30,60})
                UiKit.Button(page,"Fps"+value,value+" 帧",560+(value==30?0:210),229,190,56,()=> {PlayerPrefs.SetInt(SavePrefix+"Fps",value);PlayerPrefs.Save();ApplySettings();ShowPage("settings");},fps==value);
            UiKit.Label(page,"环境音量",54,326,320,48,25,UiKit.Paper);
            var track=UiKit.Panel(page,"VolumeSlider",566,334,394,40,new Color32(41,63,58,255));
            var fill=UiKit.Panel(track,"Fill",0,0,394,40,UiKit.Jade);
            var handle=UiKit.Panel(track,"Handle",0,0,26,48,UiKit.Gold);
            var slider=track.gameObject.AddComponent<Slider>();slider.fillRect=fill;slider.handleRect=handle;slider.targetGraphic=handle.GetComponent<Image>();
            track.GetComponent<Image>().raycastTarget=true;handle.GetComponent<Image>().raycastTarget=true;
            slider.value=PlayerPrefs.GetFloat(SavePrefix+"Volume",.45f);
            slider.onValueChanged.AddListener(value=> {PlayerPrefs.SetFloat(SavePrefix+"Volume",value);AudioListener.volume=value;});
            UiKit.Label(page,"登录区服："+GameServerSettings.Load().Name,54,398,490,42,23,UiKit.Muted);
            UiKit.Button(page,"ConfigureServers","区服设置",560,391,400,56,OpenServerSettings);
            UiKit.Button(page,"ReturnToLogin","返回登录",54,466,320,60,()=> {Save();LeaveOnlineSession();DemoMode=false;State=Load(false);ShowPage("login");});
            UiKit.Button(page,"ResetDemo","重置试玩存档",410,466,338,60,()=>ShowDialog("重置试玩","清除 65 级试玩角色及进度。",()=> {PlayerPrefs.DeleteKey(SavePrefix+"demo");PlayerPrefs.Save();if(DemoMode){State=PrototypeState.Create(true);Combat.Bind(World,State,Save,Toast);ShowPage("settings");}Toast("试玩存档已重置");},"重置"));
            UiKit.Label(page,"轮回在线 · " + Application.version + " · " + ConnectionCaption,54,562,1050,32,22,UiKit.Muted);
            if (OnlineMode) UiKit.Button(page,"AccountProfile","账号角色",796,466,320,60,OpenOnlineProfile);
        }

        public void ShowDialog(string title,string body,Action confirm=null,string confirmLabel="确定")
        {
            CloseDialog();World.SetMove(Vector2.zero);
            World.SetInputBlocked(true);Combat.SetRunning(false);
            modal=UiKit.Panel(stage,"Modal",0,0,1280,720,new Color(0,0,0,.7f));
            modal.GetComponent<Image>().raycastTarget=true;
            UiKit.Panel(modal,"DialogBody",342,166,596,386,new Color32(20,39,36,255));
            UiKit.Panel(modal,"DialogRule",342,166,596,3,UiKit.Gold);
            UiKit.Label(modal,title,382,197,472,56,32,UiKit.Paper);
            UiKit.IconButton(modal,"CloseDialog","close","关闭",864,188,CloseDialog);
            UiKit.Label(modal,body,382,270,508,168,24,UiKit.Muted,TextAnchor.UpperLeft);
            if(!string.IsNullOrEmpty(confirmLabel))
            {
                if(confirm!=null)UiKit.Button(modal,"CancelDialog","取消",382,470,174,56,CloseDialog);
                UiKit.Button(modal,"ConfirmDialog",confirmLabel,confirm==null?382:580,470,confirm==null?508:310,56,()=> { CloseDialog();confirm?.Invoke(); },true);
            }
        }

        public void CloseDialog()
        {
            CloseOnlineDialog();
            CloseServerSettings();
            if(modal){modal.gameObject.SetActive(false);Destroy(modal.gameObject);modal=null;}
            if(appearanceEditing)
            {
                appearanceEditing=false;World.SetPortraitCloseup(false);World.SetAppearance(State.Appearance);page.gameObject.SetActive(true);
                World.SetMode(appearanceReturn,appearanceReturn=="character"?draftCareer:State.Career);
                screenVeil.gameObject.SetActive(CurrentPage != "login" && CurrentPage != "character" && CurrentPage != "home");
            }
            if(photoMode&&page){page.gameObject.SetActive(true);photoMode=false;}
            World?.SetInputBlocked(false);Combat?.SetRunning(CurrentPage=="home");
        }
        public void Toast(string message) { if(!toastRoot)return; toastText.text=message;toastUntil=Time.unscaledTime+2.6f;toastRoot.SetAsLastSibling();toastRoot.gameObject.SetActive(true); }
        public void Hint(string message)
        {
            if (!hintRoot) return;
            hintText.text = message;
            hintRoot.gameObject.SetActive(!string.IsNullOrEmpty(message));
            if (string.IsNullOrEmpty(message)) return;
            RectTransformUtility.ScreenPointToLocalPointInRectangle(stage, Input.mousePosition, null, out var point);
            hintRoot.anchoredPosition = new Vector2(Mathf.Clamp(point.x + 652, 8, 1048), -Mathf.Clamp(380 - point.y, 8, 676));
            hintRoot.SetAsLastSibling();
        }
        public void Save() { if(State==null||SuppressPersistence||OnlineMode)return;State.Sanitize();PlayerPrefs.SetString(CurrentSaveKey,JsonUtility.ToJson(State));PlayerPrefs.Save(); }
        private PrototypeState Load(bool demo)
        {
            try { string json=PlayerPrefs.GetString(SavePrefix+(demo?"demo":"new"),""); var state=string.IsNullOrEmpty(json)?PrototypeState.Create(demo):JsonUtility.FromJson<PrototypeState>(json);state.Sanitize();return state; }
            catch(Exception) { return PrototypeState.Create(demo); }
        }
        private void ApplySettings() { QualitySettings.vSyncCount=0;Application.targetFrameRate=PlayerPrefs.GetInt(SavePrefix+"Fps",30);AudioListener.volume=PlayerPrefs.GetFloat(SavePrefix+"Volume",.45f); }
        private void Update()
        {
            Network?.Tick();
            if(lastSafe!=Screen.safeArea||lastScreen!=new Vector2(Screen.width,Screen.height))FitScreen();
            if(toastRoot&&Time.unscaledTime>toastUntil)toastRoot.gameObject.SetActive(false);
            if(Input.GetKeyDown(KeyCode.Escape)){if(modal)CloseDialog();else ShowPage(CurrentPage=="login"?"login":CurrentPage=="character"?"login":"home");}
        }
        private void OnApplicationPause(bool paused) { if(paused){World?.SetMove(Vector2.zero);Save();} (Network as IoGameNetworkSession)?.SetSuspended(paused); }
        private void OnApplicationFocus(bool focus) { if(!focus)World?.SetMove(Vector2.zero); }
        private void OnApplicationQuit() => Save();
        private void OnDestroy() { Network?.Disconnect(); }
    }

    public sealed class CharacterOrbit : MonoBehaviour,IDragHandler
    {
        public PrototypeWorld World;
        public void OnDrag(PointerEventData data) { World.RotateHero(-data.delta.x*.35f); }
    }

    public sealed class MobileJoystick : MonoBehaviour,IPointerDownHandler,IDragHandler,IPointerUpHandler
    {
        public PrototypeWorld World;
        public RectTransform Thumb;
        private int pointer=int.MinValue;
        public void OnPointerDown(PointerEventData data){if(pointer!=int.MinValue)return;pointer=data.pointerId;OnDrag(data);}
        public void OnDrag(PointerEventData data)
        {
            if(pointer!=data.pointerId)return;
            RectTransformUtility.ScreenPointToLocalPointInRectangle((RectTransform)transform,data.position,data.pressEventCamera,out Vector2 local);
            Vector2 delta=Vector2.ClampMagnitude(local-new Vector2(82,-82),54);
            Thumb.anchoredPosition=new Vector2(54,-54)+delta;
            World.SetMove(delta/54);
        }
        public void OnPointerUp(PointerEventData data){if(pointer==data.pointerId)ResetInput();}
        private void ResetInput(){pointer=int.MinValue;if(Thumb)Thumb.anchoredPosition=new Vector2(54,-54);if(World)World.SetMove(Vector2.zero);}
        private void OnDisable()=>ResetInput();
        private void OnApplicationPause(bool pause){if(pause)ResetInput();}
        private void OnApplicationFocus(bool focus){if(!focus)ResetInput();}
    }
}




