using System;
using System.Security.Cryptography;
using System.Text;
using System.Linq;
using System.Threading.Tasks;
using Lunhui.Protocol;
using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    public sealed partial class PrototypeApp
    {
        private const string UsernamePreference = "Lunhui.Network.Username";
        private Text onlineStatus;
        private InputField endpointInput, usernameInput, passwordInput;
        private Button loginButton, registerButton;
        private bool loginDialogOpen, loginBusy, onlineProfileOpen;
        private Action pendingAuthentication;
        private GameProfileSnapshot accountProfile;
        private string accountSaveKey;
        private bool onlineOperationBusy;
        public NativeGameClient Native { get; private set; }

        public bool OnlineMode { get; private set; }
        public GameProfileSnapshot AccountProfile => accountProfile;
        public string ConnectionCaption => !OnlineMode ? "本地试玩" : !Network.Authenticated ? "正在恢复连接"
            : Native == null || !Native.Ready ? "正在同步旅程" : "七界同游 · 已联网";
        private string CurrentSaveKey => OnlineMode ? accountSaveKey : SavePrefix + (DemoMode ? "demo" : "new");

        public void OpenOnlineLogin()
        {
            if (OnlineMode)
            {
                LeaveOnlineSession(); DemoMode = false; State = Load(false);
                ShowPage("login");
            }
            CloseDialog();
            Native?.Dispose(); Native = null;
            // A login form starts a new session; in-flight profile refreshes belong to the old one.
            Network.Disconnect();
            World.SetInputBlocked(true);
            Combat.SetRunning(false);
            loginDialogOpen = true;
            modal = UiKit.Panel(stage, "OnlineLoginDialog", 0, 0, 1280, 720, new Color(0, 0, 0, .72f));
            modal.GetComponent<Image>().raycastTarget = true;
            UiKit.Panel(modal, "AccountForm", 306, 52, 668, 616, UiKit.Ink);
            UiKit.Label(modal, "轮回 · 账号登录", 346, 76, 530, 52, 32, UiKit.Paper);
            UiKit.IconButton(modal, "CloseOnlineLogin", "close", "关闭", 894, 76, CloseDialog);
            UiKit.Label(modal, "登录区服", 346, 142, 536, 28, 20, UiKit.Muted);
            BuildServerSelector(modal, 346, 178, 588);
            UiKit.Label(modal, "账号", 346, 314, 280, 28, 20, UiKit.Muted);
            usernameInput = UiKit.Input(modal, "AccountUsername", PlayerPrefs.GetString(UsernamePreference, ""), "请输入账号", 346, 352, 282, 54, 64);
            usernameInput.keyboardType = TouchScreenKeyboardType.ASCIICapable;
            UiKit.Label(modal, "密码", 650, 314, 280, 28, 20, UiKit.Muted);
            passwordInput = UiKit.Input(modal, "AccountPassword", "", "请输入密码", 650, 352, 284, 54, 128);
            passwordInput.contentType = InputField.ContentType.Password;
            passwordInput.ForceLabelUpdate();
            onlineStatus = UiKit.Label(modal, "", 346, 434, 588, 74, 20, UiKit.Muted);
            loginButton = UiKit.Button(modal, "SubmitOnlineLogin", "登录", 346, 536, 278, 60, () => SubmitOnlineLogin(false), true);
            registerButton = UiKit.Button(modal, "RegisterAccount", "注册并登录", 648, 536, 286, 60, () => SubmitOnlineLogin(true));
            UiKit.Label(modal, "轮回 online", 346, 616, 588, 26, 18, UiKit.Muted, TextAnchor.MiddleCenter);
        }

        private void SubmitOnlineLogin(bool register)
        {
            if (loginBusy) return;
            string username = usernameInput.text.Trim();
            string password = passwordInput.text;
            if (username.Length == 0 || password.Length == 0)
            { SetOnlineStatus("请输入账号和密码", true); return; }
            if (register && (username.Length < 3 || password.Length < 6))
            { SetOnlineStatus("新账号至少 3 个字符，密码至少 6 位", true); return; }
            if (!SaveServerSelection(out string endpoint)) return;

            Network.Disconnect();
            Network = new IoGameNetworkSession();
            Network.StateChanged += OnOnlineStateChanged;
            Network.ErrorReceived += OnOnlineError;
            Network.ProfileReceived += OnOnlineProfile;
            pendingAuthentication = register
                ? (Action)(() => Network.Register(new GameRegistrationRequest { Username = username, Password = password }))
                : () => Network.Login(new GameLoginRequest { Username = username, Password = password });
            SetLoginBusy(true);
            SetOnlineStatus("正在连接" + serverDraft.Name + "……");
            if (!SuppressPersistence)
            {
                PlayerPrefs.SetString(UsernamePreference, username);
                PlayerPrefs.Save();
            }
            Network.Connect(endpoint);
        }

        private void OnOnlineStateChanged(NetworkConnectionState connection)
        {
            if (connection != NetworkConnectionState.Connected) Native?.Suspend();
            if (connection == NetworkConnectionState.Connected && pendingAuthentication != null)
            {
                var authenticate = pendingAuthentication;
                pendingAuthentication = null;
                SetOnlineStatus("正在验证账号并读取角色……");
                authenticate();
            }
            else if (connection == NetworkConnectionState.Failed || connection == NetworkConnectionState.Offline)
            {
                pendingAuthentication = null;
                SetLoginBusy(false);
                if (OnlineMode) Toast("账号连接已断开");
            }
        }

        private void OnOnlineError(string message)
        {
            pendingAuthentication = null;
            if (loginDialogOpen) Network.Disconnect();
            SetLoginBusy(false);
            SetOnlineStatus(message, true);
            if (!loginDialogOpen) Toast(message);
        }

        private async void OnOnlineProfile(GameProfileSnapshot profile)
        {
            if (profile == null || !Network.Authenticated) return;
            if (loginDialogOpen && !loginBusy) return;
            accountProfile = profile;
            if (OnlineMode && !loginDialogOpen)
            {
                var restoringConnection = Network;
                var restoringNative = Native;
                try
                {
                    if (restoringNative == null) return;
                    if (!restoringNative.Ready)
                    {
                        await restoringNative.Initialize();
                        if (Network != restoringConnection || Native != restoringNative || !OnlineMode) return;
                        Combat.RestoreOnlineWorld();
                    }
                    else await restoringNative.RefreshGrowth();
                    if (Network != restoringConnection || Native != restoringNative || !OnlineMode) return;
                    if (onlineProfileOpen) OpenOnlineProfile();
                }
                catch (Exception exception)
                { if (Network == restoringConnection && Native == restoringNative && Network.Authenticated) Toast(exception.Message); }
                return;
            }
            var connection = Network;
            Native?.Dispose();
            var native = new NativeGameClient((IoGameNetworkSession)connection);
            Native = native;
            native.Changed += ApplyNativeGrowth;
            State = new PrototypeState { Coins = 0, Ore = 0, Essence = 0 };
            try
            {
                SetOnlineStatus("正在读取行囊、宝宝与七界旅程……");
                await native.Initialize();
            }
            catch (Exception exception)
            {
                if (connection != Network || native != Native) return;
                SetOnlineStatus("旅程同步失败：" + exception.Message, true);
                SetLoginBusy(false); native.Dispose(); Native = null; connection.Disconnect();
                return;
            }
            if (connection != Network || native != Native || !loginDialogOpen) return;
            DemoMode = false;
            OnlineMode = true;
            accountSaveKey = BuildAccountSaveKey(connection.Endpoint, profile.UserId);
            ApplyNativeGrowth();
            SetLoginBusy(false);
            loginDialogOpen = false;
            ClearLoginInputs();
            nicknameDraft = State.Nickname;
            draftCareer = State.Career;
            draftMale = State.UseMaleModel;
            World.SetMap(native.Snapshot.Realm, native.Snapshot.Submap);
            Combat.Bind(World, State, Save, Toast);
            Combat.AttachOnline(native, this);
            ShowPage(native.Person.CustomizationComplete ? "home" : "character");
            Toast("账号登录成功");
        }

        private void ApplyNativeGrowth()
        {
            if (Native?.Person == null) return;
            var p = Native.Person;
            State.Nickname = p.Name;
            State.Level = Math.Max(1, p.Level?.Level ?? 1);
            State.Experience = (int)Math.Min(int.MaxValue, p.Level?.Exp ?? 0);
            State.Career = p.Profession == "DEFENSE" ? 1 : p.Profession == "AGILITY" ? 2 : 0;
            State.UseMaleModel = p.Gender == "male";
            State.Coins = Native.Currency.Gold;
            State.Ore = ItemQuantity("material_002"); State.Essence = ItemQuantity("material_003");
            var weapon = Native.Equipment.FirstOrDefault(e => e.Equipped && e.Position == 2);
            State.EquipmentQuality = weapon == null ? 1 : Math.Max(1, weapon.Grade + weapon.FurnaceGrade);
            State.EnchantLevel = weapon != null && Native.Enchantments.TryGetValue(weapon.Id, out var enchant) ? enchant.EnchantLevel : 0;
            var pet = Native.Pets.FirstOrDefault(e => e.Active);
            State.ActivePet = pet != null && pet.PetTemplateId == "contract_fox" ? 1 : 0;
            State.PetLevel = pet?.Level ?? 1;
            State.GuildJoined = Native.Guild?.Guild != null && !string.IsNullOrEmpty(Native.Guild.Guild.GuildId);
            State.Contribution = (int)Math.Min(int.MaxValue, Native.Guild?.Contribution ?? 0);
            if (!string.IsNullOrEmpty(p.AppearanceJson))
            {
                try { State.Appearance = JsonUtility.FromJson<CharacterAppearance>(p.AppearanceJson) ?? new CharacterAppearance(); }
                catch (Exception) { State.Appearance = new CharacterAppearance(); }
            }
            if (OnlineMode)
            {
                World.SetAppearance(State.Appearance); World.SetPet(State.ActivePet);
                World.SetFemale(!State.UseMaleModel);
                // Chat owns its message refresh; rebuilding it would discard the active composer.
                if (ready && !onlineOperationBusy && CurrentPage == "titles")
                    ShowPage(CurrentPage);
            }
        }

        public int ItemQuantity(string itemId) => Native != null && Native.Bag.ItemMap.TryGetValue(itemId, out var item) ? item.Quantity : 0;

        public async void RunOnline(Func<Task> operation, string success = null, bool refreshPage = true)
        {
            if (onlineOperationBusy) { Toast("正在处理，请稍候"); return; }
            if (!OnlineMode || Native == null || !Native.Ready || !Network.Authenticated) { Toast("连接正在恢复，请稍候"); return; }
            onlineOperationBusy = true;
            var native = Native;
            var originalPage = CurrentPage;
            try
            {
                await operation();
                if (Native != native || !OnlineMode) return;
                ApplyNativeGrowth();
                if (onlineProfileOpen) OpenOnlineProfile();
                else if (refreshPage && CurrentPage == originalPage) ShowPage(CurrentPage);
                if (!string.IsNullOrEmpty(success)) Toast(success);
            }
            catch (Exception exception) { if (Native == native) Toast(exception.Message); }
            finally { onlineOperationBusy = false; }
        }

        public void EnterRealm(int realm, bool auto = false) => EnterMap(realm, 0, auto);

        public void OpenInventory()
        {
            if (!OnlineMode) { ShowPage("equipment"); return; }
            ShowPage("inventory");
        }

        internal static string BuildAccountSaveKey(string endpoint, long userId)
        {
            using (var sha = SHA256.Create())
            {
                string server = new Uri(endpoint).AbsoluteUri;
                string digest = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(server))).Replace("-", "");
                return SavePrefix + "account." + digest + "." + userId;
            }
        }

        public void OpenOnlineProfile()
        {
            if (accountProfile == null) { OpenOnlineLogin(); return; }
            if (Native?.Person != null)
            {
                CloseDialog(); World.SetInputBlocked(true); Combat.SetRunning(false);
                modal = UiKit.Panel(stage, "OnlineRolePanel", 0, 0, 1280, 720, UiKit.Ink);
                modal.GetComponent<Image>().raycastTarget = true;
                NativeGrowthPages.BuildProfile(modal, this);
                onlineProfileOpen = true;
                return;
            }
            var p = accountProfile;
            string details = "昵称：" + p.Nickname + "\n角色编号：" + p.UserId + "\n等级：" + p.Level
                + "    经验：" + p.Experience + "\n生命：" + p.MaxHealth + "    攻击：" + p.Attack
                + "\n防御：" + p.Defense + "    速度：" + p.Speed;
            ShowDialog(Network.Authenticated ? "服务器角色" : "服务器角色 · 已断线", details, null, "");
            onlineProfileOpen = true;
            UiKit.Button(modal, "RefreshAccountProfile", "刷新角色", 382, 470, 238, 56, () =>
            {
                if (Network.Authenticated) Network.LoadProfile(p.UserId);
                else OpenOnlineLogin();
            }, true);
            UiKit.Button(modal, "ReconnectAccount", "重新登录", 638, 470, 252, 56, OpenOnlineLogin);
        }

        private void SetLoginBusy(bool busy)
        {
            loginBusy = busy;
            if (loginButton) loginButton.interactable = !busy;
            if (registerButton) registerButton.interactable = !busy;
            if (endpointInput) endpointInput.interactable = !busy;
            if (serverButtons != null) foreach (var button in serverButtons) if (button) button.interactable = !busy;
            if (usernameInput) usernameInput.interactable = !busy;
            if (passwordInput) passwordInput.interactable = !busy;
        }

        private void SetOnlineStatus(string text, bool error = false)
        {
            if (!onlineStatus) return;
            onlineStatus.text = text;
            onlineStatus.color = error ? UiKit.Red : UiKit.Muted;
        }

        private void ClearLoginInputs()
        {
            if (passwordInput) passwordInput.text = "";
            endpointInput = usernameInput = passwordInput = null;
            onlineStatus = null;
            loginButton = registerButton = null;
            serverButtons = null;
            serverDraft = null;
        }

        private void CloseOnlineDialog()
        {
            onlineProfileOpen = false;
            if (!loginDialogOpen) return;
            loginDialogOpen = false;
            pendingAuthentication = null;
            Network.Disconnect();
            Native?.Dispose(); Native = null;
            accountProfile = null;
            accountSaveKey = null;
            loginBusy = false;
            ClearLoginInputs();
        }

        private void LeaveOnlineSession()
        {
            Native?.Dispose(); Native = null;
            Combat?.AttachOnline(null, this);
            OnlineMode = false;
            accountProfile = null;
            accountSaveKey = null;
            pendingAuthentication = null;
            Network?.Disconnect();
            Network = new OfflineGameNetworkSession();
            Network.Connect("offline://prototype");
        }
    }

    public sealed class NetworkCaption : MonoBehaviour
    {
        public PrototypeApp App;
        private Text label;
        private void Awake() => label = GetComponent<Text>();
        private void Update()
        {
            if (App && label) label.text = App.ConnectionCaption;
        }
    }
}
