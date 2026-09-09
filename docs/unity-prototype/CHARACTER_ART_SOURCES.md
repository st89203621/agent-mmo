# Character Art Sources

The 3D character prototype uses Quaternius source models and animations under CC0 1.0 Universal. Full original license files are retained under `unity-client/Assets/_Game/Art/CharacterSources/Licenses/`.

| Asset | Source | Use |
| --- | --- | --- |
| Universal Base Characters, Standard | https://quaternius.com/packs/universalbasecharacters.html | Male and female heads, eyes, eyebrows and hairstyles |
| Modular Character Outfits - Fantasy, Standard | https://quaternius.itch.io/modular-character-outfits-fantasy | Outfitted male and female ranger heroes and Qinghua's clothing |
| Universal Animation Library, Standard | https://quaternius.com/packs/universalanimationlibrary.html | Humanoid idle, walk, jog, sword attack, spell and roll |

These are textured, rigged game models with realistic human proportions. They are not photogrammetry scans or photorealistic human likenesses. The freely available outfit set has two wardrobe families, so the three careers use separate colors and equipment rather than three commissioned costumes. Facial expression animation is not included. The visible head is extracted from the base model; body polygons hidden by clothing are omitted from the generated head asset.

Build the prefabs with Unity menu **Lunhui > Build Character Art**, or batch method `Lunhui.Prototype.CharacterArtSetup.BuildAssets`. Generated prefabs are under `Resources/Art/Characters/Prefabs`. The runtime API is `CharacterVisual.Create(parent, guide)`, `SetCareer(index)`, `Move(normalizedSpeed)` and `PerformAction(action)`. Supported action strings are `attack`, `skill`, `ultimate`, `dodge` and `dash`.

Textures import at 1024 or 2048 pixels and use ASTC 6x6 compression on Android. The Standard shader must retain normal-map and alpha-test variants, because skin and clothing use normal maps and hairstyles use cutout opacity.
