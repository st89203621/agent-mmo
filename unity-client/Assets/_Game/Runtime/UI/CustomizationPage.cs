using System;
using UnityEngine;
using UnityEngine.UI;

namespace Lunhui
{
    /// <summary>
    /// The appearance editor leaves the left side unobstructed for the live 3D portrait.
    /// </summary>
    public static class CustomizationPage
    {
        private static readonly Color PanelColor = new Color32(18, 30, 39, 239);
        private static readonly Color FrameColor = new Color32(225, 188, 112, 210);
        private static readonly Color DimFrameColor = new Color32(118, 155, 143, 170);

        // Keep Chinese text ASCII-safe for Windows Unity batch imports.
        private const string MirrorTitle = "\u955c\u4e2d\u4eba";
        private const string PortraitTitle = "\u9762\u90e8\u9884\u89c8";
        private const string PortraitHint = "\u5728\u4eba\u7269\u533a\u57df\u6ed1\u52a8\uff0c\u65cb\u8f6c\u67e5\u770b\u4e94\u5b98";
        private const string AppearanceTitle = "\u5bb9\u8c8c\u7f16\u8f91";
        private const string EditHint = "\u62d6\u52a8\u6ed1\u6746\uff0c\u5b9e\u65f6\u67e5\u770b\u8138\u90e8\u53d8\u5316";
        private const string FeaturesTab = "\u4e94\u5b98";
        private const string HairTab = "\u53d1\u578b";
        private const string ColorsTab = "\u8272\u5f69";
        private const string FaceWidth = "\u8138\u5bbd";
        private const string JawWidth = "\u4e0b\u988c";
        private const string ChinLength = "\u4e0b\u5df4";
        private const string EyeSize = "\u773c\u775b\u5927\u5c0f";
        private const string EyeSpacing = "\u773c\u8ddd";
        private const string NoseSize = "\u9f3b\u578b";
        private const string FirstImpression = "\u521d\u89c1";
        private static readonly string[] FacePresets = { "\u6a31\u65f6", "\u542c\u67ab", "\u6ca7\u6d77", "\u82b1\u6eaa" };
        private static readonly string[] HairStyles = { "\u62ab\u80a9\u957f\u53d1", "\u4fa7\u5206", "\u53cc\u9b52", "\u77ed\u53d1" };
        private const string Height = "\u8eab\u5f62";
        private const string HairColor = "\u53d1\u8272";
        private const string SkinColor = "\u80a4\u8272";
        private const string EyeColor = "\u773c\u8272";
        private const string OutfitColor = "\u8863\u8272";
        private const string ResetAppearance = "\u91cd\u7f6e\u5bb9\u8c8c";
        private const string Cancel = "\u53d6\u6d88";
        private const string SaveAppearance = "\u4fdd\u5b58\u5bb9\u8c8c";
        private const string TurnLeft = "\u5411\u5de6\u65cb\u8f6c";
        private const string TurnRight = "\u5411\u53f3\u65cb\u8f6c";

        public static void Build(RectTransform root, PrototypeApp app, CharacterAppearance draft, int tab,
            Action<int> changeTab, Action reset, Action cancel, Action save)
        {
            BuildPortraitZone(root, app);

            UiKit.Label(root, MirrorTitle, 42, 24, 340, 50, 34, UiKit.Paper);
            UiKit.Label(root, PortraitTitle, 42, 76, 260, 28, 21, UiKit.Gold);
            UiKit.Label(root, PortraitHint, 42, 564, 568, 30, 19, UiKit.Muted);
            UiKit.Label(root, AppearanceTitle, 730, 24, 400, 42, 30, UiKit.Paper);
            UiKit.Label(root, EditHint, 730, 62, 450, 25, 18, UiKit.Muted);
            UiKit.Panel(root, "AppearancePanel", 704, 96, 534, 494, PanelColor);

            string[] tabs = { FeaturesTab, HairTab, ColorsTab };
            for (int i = 0; i < tabs.Length; i++)
            {
                int index = i;
                UiKit.Button(root, "AppearanceTab" + i, tabs[i], 726 + i * 164, 111, 151, 47,
                    () => changeTab(index), tab == i);
            }

            if (tab == 0)
            {
                CompactSlider(root, "FaceWidth", FaceWidth, draft.FaceWidth, 155, 734, value => draft.FaceWidth = value, app, draft);
                CompactSlider(root, "JawWidth", JawWidth, draft.JawWidth, 155, 986, value => draft.JawWidth = value, app, draft);
                CompactSlider(root, "CheekFullness", "面颊饱满", draft.CheekFullness, 220, 734, value => draft.CheekFullness = value, app, draft);
                CompactSlider(root, "ChinLength", ChinLength, draft.ChinLength, 220, 986, value => draft.ChinLength = value, app, draft);
                CompactSlider(root, "EyeSize", EyeSize, draft.EyeSize, 285, 734, value => draft.EyeSize = value, app, draft);
                CompactSlider(root, "EyeSpacing", EyeSpacing, draft.EyeSpacing, 285, 986, value => draft.EyeSpacing = value, app, draft);
                CompactSlider(root, "EyeHeight", "眼睛高度", draft.EyeHeight, 350, 734, value => draft.EyeHeight = value, app, draft);
                CompactSlider(root, "BrowHeight", "眉眼距离", draft.BrowHeight, 350, 986, value => draft.BrowHeight = value, app, draft);
                CompactSlider(root, "NoseSize", NoseSize, draft.NoseSize, 415, 734, value => draft.NoseSize = value, app, draft);
                CompactSlider(root, "LipFullness", "唇形饱满", draft.LipFullness, 415, 986, value => draft.LipFullness = value, app, draft);
                BuildPresets(root, app);
            }
            else if (tab == 1)
            {
                for (int i = 0; i < HairStyles.Length; i++)
                {
                    int style = i;
                    UiKit.Button(root, "HairStyle" + i, HairStyles[i], 731 + (i % 2) * 246, 193 + (i / 2) * 86, 221, 66,
                        () => { draft.Hair = style; app.PreviewAppearance(draft); changeTab(1); }, draft.Hair == i);
                }
                Slider(root, "Height", Height, draft.Height, 406, value => draft.Height = value, app, draft);
                UiKit.Label(root, HairColor, 734, 470, 300, 35, 23, UiKit.Paper);
                Swatches(root, "HairColor", draft.HairColor, CharacterAppearance.HairColors, 518,
                    value => { draft.HairColor = value; app.PreviewAppearance(draft); changeTab(1); });
            }
            else
            {
                Palette(root, "SkinColor", SkinColor, draft.SkinColor, CharacterAppearance.SkinColors, 184,
                    value => { draft.SkinColor = value; app.PreviewAppearance(draft); changeTab(2); });
                Palette(root, "EyeColor", EyeColor, draft.EyeColor, CharacterAppearance.EyeColors, 310,
                    value => { draft.EyeColor = value; app.PreviewAppearance(draft); changeTab(2); });
                Palette(root, "OutfitColor", OutfitColor, draft.OutfitColor, CharacterAppearance.OutfitColors, 436,
                    value => { draft.OutfitColor = value; app.PreviewAppearance(draft); changeTab(2); });
            }

            UiKit.IconButton(root, "ResetAppearance", "reset", ResetAppearance, 44, 622, reset);
            UiKit.Button(root, "CancelAppearance", Cancel, 728, 622, 183, 62, cancel);
            UiKit.Button(root, "SaveAppearance", SaveAppearance, 929, 622, 288, 62, save, true);
            UiKit.IconButton(root, "CloseAppearance", "close", Cancel, 1170, 28, cancel);
        }

        private static void BuildPortraitZone(Transform root, PrototypeApp app)
        {
            // It receives every unobstructed drag while keeping the live 3D face visible.
            var orbit = UiKit.Panel(root, "FaceOrbit", 20, 104, 650, 452, Color.clear);
            orbit.GetComponent<Image>().raycastTarget = true;
            orbit.gameObject.AddComponent<CharacterOrbit>().World = app.World;

            UiKit.Panel(root, "PortraitFrameTop", 20, 104, 650, 2, FrameColor);
            UiKit.Panel(root, "PortraitFrameLeft", 20, 104, 2, 452, FrameColor);
            UiKit.Panel(root, "PortraitFrameRight", 668, 104, 2, 452, DimFrameColor);
            UiKit.Panel(root, "PortraitFrameBottom", 20, 554, 650, 2, DimFrameColor);

            // Tappable arrows complement the drag gesture for a direct mobile affordance.
            UiKit.Button(root, "TurnPortraitLeft", "<", 42, 442, 48, 44, () => app.World.RotateHero(-18));
            UiKit.Button(root, "TurnPortraitRight", ">", 94, 442, 48, 44, () => app.World.RotateHero(18));
            var leftTip = root.Find("TurnPortraitLeft")?.gameObject.AddComponent<UiTooltip>();
            if (leftTip != null) leftTip.Caption = TurnLeft;
            var rightTip = root.Find("TurnPortraitRight")?.gameObject.AddComponent<UiTooltip>();
            if (rightTip != null) rightTip.Caption = TurnRight;
        }

        private static void BuildPresets(Transform parent, PrototypeApp app)
        {
            UiKit.Label(parent, FirstImpression, 42, 489, 108, 31, 22, UiKit.Paper);
            for (int i = 0; i < FacePresets.Length; i++)
            {
                int preset = i;
                UiKit.Button(parent, "FacePreset" + i, FacePresets[i], 150 + i * 128, 493, 116, 42,
                    () => app.ApplyAppearancePreset(preset));
            }
        }

        private static void Slider(Transform parent, string name, string caption, float value, float y,
            Action<float> set, PrototypeApp app, CharacterAppearance draft)
        {
            UiKit.Label(parent, caption, 734, y, 142, 32, 21, UiKit.Paper);
            var valueLabel = UiKit.Label(parent, Percent(value), 1198, y, 30, 32, 17, UiKit.Gold, TextAnchor.MiddleRight);
            var rect = UiKit.Rect(parent, name, 883, y - 2, 300, 40);
            UiKit.Panel(rect, "Track", 0, 16, 300, 7, new Color32(67, 82, 90, 255));
            var handle = UiKit.Panel(rect, "Handle", 0, 4, 22, 32, UiKit.Gold);
            handle.GetComponent<Image>().raycastTarget = true;
            var hit = rect.gameObject.AddComponent<Image>();
            hit.color = Color.clear;
            hit.raycastTarget = true;
            var slider = rect.gameObject.AddComponent<Slider>();
            slider.minValue = 0;
            slider.maxValue = 1;
            slider.handleRect = handle;
            slider.targetGraphic = handle.GetComponent<Image>();
            slider.value = value;
            slider.navigation = new Navigation { mode = Navigation.Mode.None };
            slider.onValueChanged.AddListener(next =>
            {
                set(next);
                valueLabel.text = Percent(next);
                app.PreviewAppearance(draft);
            });
        }

        private static void CompactSlider(Transform parent, string name, string caption, float value, float y, float x,
            Action<float> set, PrototypeApp app, CharacterAppearance draft)
        {
            UiKit.Label(parent, caption, x, y, 78, 30, 16, UiKit.Paper);
            var valueLabel = UiKit.Label(parent, Percent(value), x + 199, y, 32, 30, 14, UiKit.Gold, TextAnchor.MiddleRight);
            var rect = UiKit.Rect(parent, name, x + 78, y - 1, 116, 36);
            UiKit.Panel(rect, "Track", 0, 15, 116, 6, new Color32(67, 82, 90, 255));
            var handle = UiKit.Panel(rect, "Handle", 0, 3, 18, 30, UiKit.Gold);
            handle.GetComponent<Image>().raycastTarget = true;
            var hit = rect.gameObject.AddComponent<Image>();
            hit.color = Color.clear;
            hit.raycastTarget = true;
            var slider = rect.gameObject.AddComponent<Slider>();
            slider.minValue = 0; slider.maxValue = 1; slider.handleRect = handle;
            slider.targetGraphic = handle.GetComponent<Image>(); slider.value = value;
            slider.navigation = new Navigation { mode = Navigation.Mode.None };
            slider.onValueChanged.AddListener(next =>
            {
                set(next); valueLabel.text = Percent(next); app.PreviewAppearance(draft);
            });
        }

        private static string Percent(float value) => Mathf.RoundToInt(Mathf.Clamp01(value) * 100f).ToString();

        private static void Palette(Transform parent, string id, string title, int selected, Color[] colors, float y, Action<int> set)
        {
            UiKit.Label(parent, title, 734, y, 340, 32, 23, UiKit.Paper);
            Swatches(parent, id, selected, colors, y + 45, set);
        }

        private static void Swatches(Transform parent, string id, int selected, Color[] colors, float y, Action<int> set)
        {
            for (int i = 0; i < colors.Length; i++)
            {
                int index = i;
                var button = UiKit.Button(parent, id + i, "", 737 + i * 94, y, 76, 48, () => set(index), selected == i);
                UiKit.Panel(button.transform, "Swatch", 6, 6, 64, 34, colors[i]);
                if (selected == i) UiKit.Panel(button.transform, "Selected", 0, 0, 76, 3, UiKit.Paper);
            }
        }
    }
}
