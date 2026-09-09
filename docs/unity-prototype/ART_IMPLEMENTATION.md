# 轮回online 0.2 美术原型

这版把原型中的几何人物替换为带服装、头发、面部、骨骼和动画的 3D 游戏模型，并制作了六个可行走、可切换的场景。当前是半写实美术原型，尚未达到写实扫描人物或正式商业 MMO 场景的完成度。

## 已接入

| 内容 | 当前实现 |
| --- | --- |
| 三职业 | 独立服装配色、长刃、盾刃、双刃；待机、行走、奔跑、攻击、施法、翻滚动画 |
| 情花 | 女性完整骨架、面部、长发与重新绑定的服装 |
| 砾灵 | Quaternius 岩狼模型，待机、行走和攻击动画 |
| 灯灵 | Quaternius 灵狐模型，待机、行走和攻击动画 |
| 宠物页 | 可拖动旋转的实时 3D 预览，出战选择与本地培养 |
| 六个环境 | 隔世小镇、青岚遗迹、碧潮船坞、天枢基地、赤壁城寨、云海武道场 |
| 世界地图 | 六个环境的实际 Unity 渲染缩略图；点击切换环境 |
| 手机输入 | 保留摇杆与战斗按钮；角色选择页支持拖动查看人物 |

环境采用程序化建筑网格、PBR 颜色与法线贴图、材质合批和建筑占地碰撞约束。场景按需创建，当前没有大世界流式加载。水面、树叶和船帆尚未加入风场与完整动画。

六宝山仍是已有的玩法页面及流程预览，未在这版中完成六座宝山的战斗副本。多人服务器、同步战斗、真实技能伤害和联网经济系统尚未接入。

## 素材来源

- 人物、服饰和动画：Quaternius，CC0。详细链接见 [人物来源](CHARACTER_ART_SOURCES.md)。
- 宠物：[Ultimate Animated Animal Pack](https://quaternius.com/packs/ultimateanimatedanimals.html)，CC0。原始授权位于 `unity-client/Assets/_Game/Art/PetSources/animal-license.txt`。
- 环境材质：[Poly Haven](https://polyhaven.com/license)，CC0。使用 `brick_floor_02`、`wood_planks`、`blue_metal_plate`、`coast_sand_rocks_02` 的 1K 材质。
- 汉字字体：Noto Sans SC，OFL 1.1。

已通过 imagegen 技能的官方 CLI 调用用户指定中转服务测试 `gpt-image-2`。该站返回 HTTP 403：`Image generation is not enabled for this group`。本版没有使用该 API 生成的图片，也没有使用本机未明确适用商业授权的模型生成生产素材。角色提示词保存在 `output/imagegen/prompts/qinghua.txt`，其中不含密钥。

## 重建与验证

在 Unity 中执行 `Lunhui > Build Character Art` 与 `Lunhui > Build Pet Art` 可重新生成资源。分别对应 `CharacterArtSetup.BuildAssets` 和 `PetArtSetup.BuildAssets`。

`PrototypeValidation.RunBatch` 会在 1280x720 和 1920x864 两种横屏尺寸中生成 32 张截图，覆盖八个基础页面、六个环境和两种宠物；同时检查本地养成、地图切换、人物与宠物模型存在、输入与存档逻辑。

Android 构建仍是 ARM64、IL2CPP、Android 8.0 以上的本地测试 APK。没有连接真机，截图与打包成功不等于手机帧率和触控已经验收。

当主工程在编辑器中打开时，可运行 `Prepare-ArtBuild.ps1` 复制 Assets、Packages 和 ProjectSettings 到 `Artifacts/ArtBuildWorkspace`，随后用 `Build-Android.ps1 -BuildProjectPath <该目录>` 在独立目录构建。工具链复用主工程下已安装的 Android SDK、NDK 和 JDK。
