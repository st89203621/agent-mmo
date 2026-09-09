# Unity 与 ioGame 的实际连接

## 本次接入

Unity 使用 ioGame 官方 C# SDK 21.0.0，通过 Protobuf 二进制消息连接后端 External WebSocket。没有经过 React、Spring HTTP 登录或服务间 Bolt 协议。SDK 来源、固定提交和依赖许可证见 [NETWORK-SOURCES.md](../../unity-client/Assets/ThirdParty/NETWORK-SOURCES.md)。

已实现的路由：

| 功能 | cmd/subCmd | 请求 | 响应 |
| --- | --- | --- | --- |
| 注册 | 1/3 | RegisterRequest | RegisterResponse |
| 用户名密码登录 | 1/1 | LoginVerify | UserInfo |
| 当前角色读取 | 2/1 | 空 | PersonMessage |

注册成功后在同一个连接上登录，再读取服务器角色。角色面板显示服务器的角色编号、昵称、等级、经验、生命、攻击、防御和速度。短暂断网后自动重连并重新认证；密码只在当前会话内存中保留，退出登录时清除，不写入本地存储。客户端不会使用后端演示用的数字 JWT 登录路径。

## Android 连接

1. 启动仓库的 OneApplication 和 MongoDB。
2. 手机和后端电脑连接同一个局域网。
3. 在游戏首屏选择“账号登录”，填写 `ws://192.168.31.169:10100/websocket`。电脑地址变化后可在这里修改。
4. 使用已有账号登录，或选择“注册并登录”。进入后点击“账号角色”读取服务器数据。

本机检查到的实际端口为 External WebSocket `10100`、TCP `10101`、Broker `10200`、Spring HTTP `8090`。现有说明中的 `9200/9300` 与当前 ioGame 默认配置不符。编辑器在本机可使用 `ws://127.0.0.1:10100/websocket`；Android 的 `127.0.0.1` 指向手机本身。

服务器需要保持运行并允许手机访问该局域网端口。当前默认是局域网开发地址；互联网部署应使用有合法证书的 `wss://` 服务地址。

## 状态与数据边界

`Connected` 仅表示 WebSocket 已打开，`Authenticated` 表示登录已由服务器确认。首次登录还须收到当前账号的角色信息才能进入游戏。网络回调由 Unity 主线程的 `Tick()` 派发，SDK 负责消息序号、编码和响应回调；会话负责连接代次、请求期限和取消。连接超时为 12 秒，请求超时为 15 秒，心跳间隔为 8 秒，35 秒没有服务器消息则断线。

0.9.1 修复了在线约 35 秒自动掉线：原 External 未设置 `IdleProcessSetting`，框架会安装 `SocketIdleExcludeHandler` 丢弃心跳，导致客户端误判。WS 和 TCP 现均开启 pong，服务端空闲期限为 300 秒；客户端兼容旧服务端，必要时调用已有的 `1/2 getUserIp` 检查连接。异常断网采用 1、2、4 秒间隔最多重试三次；返回前台自动认证并刷新角色，主动退出和更换地址不会沿用旧凭据。

账号角色数据单独展示。本轮没有把本地战斗、掉落、货币、宠物、宝山或场景移动改造成服务器结算，也没有宣称实现多人同屏。HUD 明确显示“账号已联网 · 冒险试玩”。客户端对尚未实现的网络动作返回错误，不会伪造服务器成功。

本地新角色、65 级试玩、不同服务器地址和不同账号的冒险缓存分别保存。账号缓存只用于本地冒险表现，不上传经验、奖励或数值覆盖服务器角色。服务器接口目前没有返回职业、捏脸和敏捷字段，这些字段不会用本地猜测值充当服务器数据；`speed` 对应“速度”。

## 验证

`Lunhui.Prototype.IoGameNetworkValidation.RunBatch` 通过实际 SDK 连接运行中的后端，覆盖注册、错误密码拒绝、正确密码重试、角色重复读取、断线重连、无效地址、不可达端口、取消连接和主线程回调。它还操作真实账号表单、角色面板、取消登录和返回试玩，检查账号切换不会污染本地存档。测试创建带 `unity_sdk_` 前缀的独立账号，不记录测试密码。

```powershell
$editor = 'C:\Program Files\Tuanjie\Hub\Editor\2022.3.62t14\Editor\Tuanjie.exe'
& $editor -batchmode -buildTarget Android -projectPath 'C:\deye-6.4\agent-mmo\unity-client\Artifacts\SdkBuildWorkspace' -executeMethod Lunhui.Prototype.IoGameNetworkValidation.RunBatch -lunhuiNetworkEndpoint 'ws://127.0.0.1:10100/websocket' -lunhuiNetworkValidationOutput 'C:\deye-6.4\agent-mmo\unity-client\Artifacts\NetworkValidation' -logFile 'C:\deye-6.4\agent-mmo\unity-client\Artifacts\NetworkValidation.log'
```

省略 `-quit`，异步验证完成后会写报告并退出。界面与原有战斗回归继续使用 `PrototypeValidation.RunBatch`，包含两个横屏尺寸的账号登录弹窗截图。编辑器联调与 Android IL2CPP 构建不替代手机实际安装后的网络和性能验收。
