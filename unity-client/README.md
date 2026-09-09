# 轮回online 手机原生原型

## 0.10.1 区服配置

安装包：[LunhuiOnline-Prototype.apk](Builds/Android/LunhuiOnline-Prototype.apk)，Android 8+ / ARM64。APK 为本地构建产物，不再纳入 Git（`Builds/` 已在 `.gitignore` 中），构建方法见下文"Android 构建"。

登录首屏的区服按钮、账号登录页及设置页均可选择区服、修改 WebSocket 地址。IP、端口和路径都可修改，配置保存在手机上，无需重新打包。首次默认公司区服；升级前填写过的其他地址会保留在自定义区服。

| 区服 | 初始地址 |
| --- | --- |
| 公司区服 | `ws://192.168.74.47:9200` |
| 家里区服 | `ws://192.168.31.169:10100/websocket` |
| 自定义 | 自行填写 `ws://` 或 `wss://` 地址 |

家里区服沿用之前的端口与路径，IP 为当前电脑局域网地址；电脑 IP 变化时在页面修改。手机需能访问对应局域网，不能将电脑地址填成 `127.0.0.1`。设置中“保存配置”仅更改下次登录选择，当前连接及自动重连仍使用原地址；“保存并切服登录”退出当前会话并打开新登录页，不会自动向另一个区服发送密码。不同地址是否共用角色由后端数据库决定。

本版验证：52 项区服交互检查、1280×720 与 1920×864 共 8 张截图检查通过；家里地址 WebSocket 握手成功，公司地址在当前家庭网络下超时，待公司网络验证。区服检查入口为 `Lunhui.Prototype.PrototypeValidation.RunBatch -lunhuiServersOnly`。APK 版本码 13，74,916,119 字节，通过 APK v2 签名校验，SHA-256 为 `E1BDD7E2426667D3D4B1AA6FA641F1D091D97406E55662BC1681C13D53081ACC`，尚未进行本版 Android 真机安装验证。

## 当前编辑器

当前机器安装的是团结引擎 `2022.3.62t14`，编辑器路径：

```text
C:/Program Files/Tuanjie/Hub/Editor/2022.3.62t14/Editor/Tuanjie.exe
```

工程暂时采用内置渲染管线和 UGUI，使用现有可运行工具验证原型。设计中的 Unity 6 LTS + URP 是后续正式工程方向，尚未在本工程安装或迁移；不应把本目录描述为已完成的 Unity 6 URP 游戏。

已为该编辑器安装匹配的 Android Build Support。本机 Android 工具链（OpenJDK 17、NDK r23b、SDK API 35、Build Tools 34.0.0、Command-line Tools 6.0）原先位于本工程 `Artifacts/AndroidToolchain`，该目录已清理，下次构建 APK 前需重新下载并放置到该路径。iOS 需要 Mac、Xcode、签名和真实 iPhone 验收。

## 在编辑器运行

1. 用上述编辑器打开 `unity-client`，等待脚本和字体导入完成。
2. 执行 `Lunhui > Setup Mobile Prototype`，生成或更新 `Assets/_Game/Scenes/Boot.unity`。
3. 打开 Boot 场景并进入 Play Mode。运行时由 `PrototypeApp` 创建场景与界面。
4. 使用横屏 Game View 检查交互。1280 x 720 和 1920 x 864 是布局验证尺寸，不是手机性能认证。

设置工具将产品名设为“轮回online”，允许横屏左右旋转，并把 Boot 设为构建场景。已有 Boot 中的 `PrototypeApp` 不会被重复创建。编辑器输入只用于调试；发行目标仍为手机原生客户端。

## 编辑器自动化

从仓库根目录在 PowerShell 运行一次场景设置：

```powershell
& "C:/Program Files/Tuanjie/Hub/Editor/2022.3.62t14/Editor/Tuanjie.exe" -batchmode -quit -projectPath "C:/deye-6.4/agent-mmo/unity-client" -executeMethod Lunhui.Prototype.PrototypeSetup.CreateProject -logFile "C:/deye-6.4/agent-mmo/unity-client/setup.log"
```

自动截图菜单为 `Lunhui > Validate Mobile UI Screenshots`。工具进入 Play Mode，打开八个基础页面、六个场景和两种宠物，在两种横屏尺寸下保存 32 张 PNG 与 `validation.json`。验证还会执行本地交互回归：确认/取消养成、装备等级门槛、宝宝出战与培养、盟会捐献、六宝山预览、摇杆释放、昵称校验、地图切换、模型存在和存档隔离。宠物预览区域单独进行像素检查，防止背景正常但模型不可见。

需要编辑器可用的图形环境；自动化入口会在完成后退出，因此不要传 `-quit` 或 `-nographics`。先关闭已打开的同一工程，避免项目锁冲突。

```powershell
& "C:/Program Files/Tuanjie/Hub/Editor/2022.3.62t14/Editor/Tuanjie.exe" -projectPath "C:/deye-6.4/agent-mmo/unity-client" -executeMethod Lunhui.Prototype.PrototypeValidation.RunBatch -lunhuiValidationOutput "C:/deye-6.4/agent-mmo/unity-client/Artifacts/UIValidation" -logFile "C:/deye-6.4/agent-mmo/unity-client/validation.log"
```

自动检查覆盖页面能打开、Canvas 存在、截图非单色、输出尺寸正确、交互状态正确，以及捕获运行时错误日志。美术版完整结果位于 `Artifacts/ArtValidationFinal/validation.json`；宠物朝向的补充验证位于 `Artifacts/PetValidationFinal/validation.json`。仍需在真实 Android 手机上查看触控、文字、发热和性能；截图成功不能代替真机测试。工具使用编辑器内部 Game View API，升级编辑器后须重新验证。

## Android 构建

当前机器直接在 PowerShell 执行：

```powershell
& .\unity-client\Build-Android.ps1
```

脚本支持 `-EditorPath`、`-SdkPath`、`-NdkPath`、`-JdkPath`、`-BuildProjectPath` 参数，默认使用上述本机编辑器及工程工具目录。通过 `LUNHUI_ANDROID_SDK`、`LUNHUI_ANDROID_NDK`、`LUNHUI_ANDROID_JDK` 将路径传给构建入口，只等待本次编辑器进程结束，并拒绝把之前生成的 APK 报为本次成功。主工程正打开时可先执行 `Prepare-ArtBuild.ps1`，再指定 `-BuildProjectPath .\unity-client\Artifacts\ArtBuildWorkspace` 使用独立工程构建。

也可执行菜单 `Lunhui > Build Android APK`，或使用 batch 入口：

```text
Lunhui.Prototype.PrototypeSetup.BuildAndroid
```

输出为 `Builds/Android/LunhuiOnline-Prototype.apk`，ARM64/IL2CPP 开发包，最低 Android 8.0 (API 26)，目标 API 35，包名 `com.lunhui.prototype`。采用 Android debug 签名，供本地安装测试；发行签名、AAB、商店提交、热更新与正式服务器连接均另行处理。

官方 Maven 源在本机出现 TLS 中断，因此 `Assets/Plugins/Android/settingsTemplate.gradle` 优先使用阿里云 Google/Public 镜像，并保留官方源回退。`PrototypeShaderVariants` 已为美术版保留法线贴图与头发透明裁切，以及阴影、雾、自发光和预乘透明；增加其他材质贴图功能时仍须同步检查该裁剪列表。

## 真机验收边界

Android 中档参考骁龙 778G 级 6 GB，目标 30 FPS、P95 不高于 40 ms；高档参考骁龙 8 Gen 2 级 8 GB，可选 60 FPS、P95 不高于 20 ms。iPhone 13 独立验收。

这些是拟议目标，没有已通过的性能数据。至少测 30 分钟热稳定、四指输入与焦点取消、来电、切后台、杀进程、Wi-Fi/蜂窝切换和屏幕安全区。编辑器截图不能证明真机性能或四台手机联网能力。

产品和技术设计见 [原型设计](../docs/unity-prototype/PROTOTYPE_DESIGN.md)、[实施方案](../docs/unity-prototype/UNITY_IMPLEMENTATION.md)，服务端接入见 [ioGame SDK 接入](../docs/unity-prototype/IOGAME_UNITY_SDK.md)。字体授权见 [OFL.txt](Assets/_Game/Resources/Fonts/OFL.txt)。
