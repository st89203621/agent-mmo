# 地图美术资源来源

调研日期：2026-09-06。目标平台是 Android 手机，地图资源按低面数、1K 贴图和可分批加载选择。资源文件实际存放在 `unity-client/Assets/_Game/Resources/Art/MapExpansion`。

## 已下载并可直接使用

### Kenney Nature Kit 2.1

- 来源：[Kenney Nature Kit](https://kenney.nl/assets/nature-kit)
- 下载包：[kenney_nature-kit.zip](https://kenney.nl/media/pages/assets/nature-kit/37ac38a37b-1677698939/kenney_nature-kit.zip)，归档 SHA-256 `FA7974A0D342BFE63C38664BA9F8EC1A4AAB8EA25F099BDC56870E33588C4D9D`（下载日期 2026-09-06，约 10.5 MB）。
- 授权：包内 `License.txt` 为 Creative Commons Zero (CC0)，个人、教育和商业项目均可使用，不要求署名。保留原文副本 `Kenney-License.txt`。
- 导入子集：`KenneyNature/` 中的 OBJ/MTL 共约 474 KB。包括 `tree_detailed_fall`、`tree_oak_fall`、`tree_detailed`、`tree_palmDetailedTall/Short`、`crops_bambooStageA/B`、三色花簇、`lily_large/small`、石桥和木桥、`canoe`、瀑布岩、路径石、灌木、草、岩石和原木。
- 三角形预算：树 196–402，竹子 276–564，桥 336–360，花 76–154，岩石 16–80，舟 200；适合在远景使用 GPU instancing。OBJ 无贴图依赖，MTL 使用内置 `Kd` 颜色。
- Unity：使用原生 Model Importer 读取 OBJ，植被不附加独立 Animator；可行走地形与地标的碰撞由场景代码维护。

### Poly Haven（CC0）

- 授权页：[polyhaven.com/license](https://polyhaven.com/license) 明确所有资源为 CC0/Public Domain，可用于商业项目。
- 已下载的 1K 贴图：
  - `PolyHaven/grass_path_2/`：diffuse 716,010 B（MD5 `48cebe95af233211c9469a9bfe2f42f2`）、normal 831,959 B（`aa04d930b6af2bd7e3252e31776822bd`）、roughness 335,245 B（`a3f245c716d0f2bbdece65a38b1bcd4a`）。
  - `PolyHaven/coast_sand_01/`：diffuse 960,614 B（`a1e243fc8635806381505c7dc44b192a`）、normal 1,146,826 B（`38bbe6863249a3d20d8417c9db207780`）、roughness 383,892 B（`978aca9e374cf988095392a91d3a4f71`）。
  - 来源 API：[grass_path_2 files](https://api.polyhaven.com/files/grass_path_2)、[coast_sand_01 files](https://api.polyhaven.com/files/coast_sand_01)。
- `PolyHaven/flower_gazania/`：1K FBX 1,047,180 B（MD5 `907ae0d9e8859fcc505fb2c4b7e4b876`）和配套 1K diffuse/alpha/normal/roughness/displacement 文件；模型资料报告 25,819 polygons。建议只在花溪观景点少量放置，或烘焙为 billboard，避免把整株高密度网格复制到手机场景。
- Poly Haven 资产作者信息已从 API 记录：Gazania 为 James Ray Cock、Jenelle van Heerden；grass_path_2 与 coast_sand_01 为 Rob Tuytel。CC0 不要求署名，但项目发布页可列出致谢。

## 评估但未购买

- [Synty POLYGON Nature Pack](https://syntystore.com/products/polygon-nature-pack)：官方商品 API 在 2026-09-06 观察到价格 USD 49.99（可用），Unity 2022.3+、URP 和 Built-in、FBX、LOD、含水体和落叶特效。该包是低多边形风格，与本项目现有几何原型兼容；没有购买或下载，不能把它的授权当成 CC0。
- Unity Asset Store 的 Stylized Nature Pack 页面需要 Unity ID 登录，无法对价格/授权作可信验证，未采纳。
- Quaternius 资产页显示 CC0、可商用且免费；本轮未下载，后续若需要更多生物群落可从其官方资产页按包逐一核验下载链接。

## 使用边界

Poly Haven 的海岸岩石等扫描模型常见 300K 到 2M 以上 polygons；它们不适合作为手机端批量植被。只使用 1K 贴图和低面数 Kenney 模型作为默认地图装饰，扫描模型必须先做 LOD/减面并在单个地标中限量出现。

0.10 已在地图中实际加载 Kenney 的棕榈、竹子、花簇、水生植物和小舟，地面使用 Poly Haven 草地/沙地贴图。Gazania 模型保留为下载资源，不将其宣称为批量植被效果。其余下载模型可用于后续地标完善。
