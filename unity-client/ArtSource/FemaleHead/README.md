# Female Head Art Source

First refinement of the existing Quaternius CC0 female head, created in Blender
4.5.3 LTS. Original licenses remain in `Assets/_Game/Art/CharacterSources/Licenses`.
Body meshes, outfit materials, prefab transforms, humanoid avatars and animation
clips are unchanged. The head remains rigidly attached to the existing Head bone;
this asset does not introduce facial animation or blend shapes.

## Contents

- `FemaleHead.blend`: editable refined meshes in `Game Head`, with the unmodified
  original in the hidden `Original CC0 Head` collection. Textures are packed.
- `head.json`: deterministic intermediate mesh export, read only by the Unity
  editor asset builder. Not loaded from disk on the phone.
- `refine.py`: Blender refinement and export script. One subdivision pass adds
  close-up surface detail; the neckline is preserved.
- `../../Assets/_Game/Art/CharacterGenerated/Textures/FemaleFace.png`: derived
  skin/lip atlas using the original UV layout. Original textures are untouched.

## Edit and Integrate

Run from `unity-client`, substituting your Blender and Unity/Tuanjie executable
locations. The portable Blender used locally is under ignored `Artifacts/Tools`.

```powershell
& $blender -b ArtSource/FemaleHead/FemaleHead.blend --python ArtSource/FemaleHead/refine.py -- --export-only
& $editor -batchmode -projectPath $PWD -executeMethod Lunhui.Prototype.FaceArtValidation.RunBatch -rebuildHeads -faceOutput Artifacts/FaceReview/final -logFile Artifacts/FaceReview/final.log
```

Do not pass `-quit` or `-nographics` to validation. It renders in Play Mode and
exits on completion. Alternatively, use `Lunhui/Rebuild Character Heads Only`
in the editor after export. It preserves mesh GUIDs and does not rewrite prefabs.

For a fresh procedural refinement, `--source` accepts the **original** compact
`head-source.json` exported by `FaceArtValidation`, not an already refined head.
For further artistic changes, edit the `.blend` and use `--export-only`.

## Verification and Limits

The focused validation checks seven characters, mesh winding/bounds, eye/socket
and brow/lash behavior, facial centerline, slider endpoints, reset/idempotence,
humanoid animation attachment, presets, and actual UI save/cancel/serialization.
It restores the previous local character save after testing.

PNG reviews include front, three-quarter and profile portraits, and 1280x720 /
1920x864 full-body poses. Local comparison: `../../Artifacts/FaceReview/comparison.png`.
The comparison uses identical lighting but is not a full gameplay screenshot.

Female head export: 6,820 face vertices / 13,112 face triangles; 912 brow/lash
vertices / 1,480 triangles; 420 eye vertices / 768 triangles. The face atlas imports
at 1024px with Android ASTC 6x6. No Android device frame-time, crowd stress test,
or LOD quality claim has been made. Aesthetic approval still requires reviewing
the images; this is a stylized first pass, not a photoreal character replacement.
