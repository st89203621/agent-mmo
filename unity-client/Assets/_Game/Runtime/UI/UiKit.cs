using System;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

namespace Lunhui
{
    public static class UiKit
    {
        public static readonly Color Ink = new Color32(23, 26, 29, 255);
        public static readonly Color Paper = new Color32(240, 239, 232, 255);
        public static readonly Color Muted = new Color32(171, 181, 181, 255);
        public static readonly Color Jade = new Color32(117, 199, 181, 255);
        public static readonly Color Gold = new Color32(225, 188, 112, 255);
        public static readonly Color Red = new Color32(215, 113, 99, 255);
        public static Font Font;

        public static RectTransform Rect(Transform parent, string name, float x, float y, float w, float h)
        {
            var rect = new GameObject(name, typeof(RectTransform)).GetComponent<RectTransform>();
            rect.SetParent(parent, false);
            rect.anchorMin = rect.anchorMax = new Vector2(0, 1);
            rect.pivot = new Vector2(0, 1);
            rect.anchoredPosition = new Vector2(x, -y);
            rect.sizeDelta = new Vector2(w, h);
            return rect;
        }

        public static RectTransform Panel(Transform parent, string name, float x, float y, float w, float h, Color color)
        {
            var rect = Rect(parent, name, x, y, w, h);
            var image = rect.gameObject.AddComponent<Image>();
            image.color = color;
            image.raycastTarget = false;
            return rect;
        }

        public static Text Label(Transform parent, string text, float x, float y, float w, float h,
            int size = 24, Color? color = null, TextAnchor align = TextAnchor.MiddleLeft)
        {
            var rect = Rect(parent, "Label", x, y, w, h);
            var label = rect.gameObject.AddComponent<Text>();
            label.font = Font;
            label.text = text;
            label.fontSize = size;
            label.color = color ?? Paper;
            label.alignment = align;
            label.horizontalOverflow = HorizontalWrapMode.Wrap;
            label.verticalOverflow = VerticalWrapMode.Truncate;
            label.resizeTextForBestFit = true;
            label.resizeTextMinSize = Math.Min(size, Math.Max(14, size - 4));
            label.resizeTextMaxSize = size;
            label.supportRichText = false;
            label.raycastTarget = false;
            return label;
        }

        public static RawImage Picture(Transform parent,string name,string resource,float x,float y,float w,float h)
        {
            var image=Rect(parent,name,x,y,w,h).gameObject.AddComponent<RawImage>();
            image.texture=Resources.Load<Texture2D>(resource);
            image.raycastTarget=false;
            image.color=image.texture?Color.white:new Color32(36,54,57,255);
            if(image.texture)
            {
                float aspect=(float)image.texture.width/image.texture.height, target=w/h;
                image.uvRect=aspect>target?new Rect((1-target/aspect)*.5f,0,target/aspect,1):new Rect(0,(1-aspect/target)*.5f,1,aspect/target);
            }
            return image;
        }

        public static Button Button(Transform parent, string name, string text, float x, float y,
            float w, float h, Action click, bool primary = false)
        {
            var rect = Panel(parent, name, x, y, w, h, primary ? new Color32(49, 91, 83, 245) : new Color32(36, 41, 44, 242));
            var img = rect.GetComponent<Image>();
            img.raycastTarget = true;
            var button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = img;
            var colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(1.18f, 1.18f, 1.15f);
            colors.pressedColor = new Color(.72f, .84f, .78f);
            colors.disabledColor = new Color(.48f, .48f, .48f, .7f);
            button.colors = colors;
            button.navigation = new Navigation { mode = Navigation.Mode.None };
            button.onClick.AddListener(() => click?.Invoke());
            Panel(rect, "Accent", 0, h - 2, w, 2, primary ? Gold : new Color32(85, 96, 96, 130));
            if (!string.IsNullOrEmpty(text)) Label(rect, text, 12, 0, w - 24, h, 23, primary ? Paper : Muted, TextAnchor.MiddleCenter);
            return button;
        }

        public static Button IconButton(Transform parent, string name, string icon, string tooltip,
            float x, float y, Action click, Color? tint = null, float size = 56)
        {
            var button = Button(parent, name, "", x, y, size, size, click);
            var graphic = Rect(button.transform, "Icon", size * .25f, size * .25f, size * .5f, size * .5f).gameObject.AddComponent<SymbolGraphic>();
            graphic.Symbol = icon;
            graphic.color = tint ?? Paper;
            graphic.raycastTarget = false;
            var tip = button.gameObject.AddComponent<UiTooltip>();
            tip.Caption = tooltip;
            return button;
        }

        public static InputField Input(Transform parent, string name, string value, string placeholder,
            float x, float y, float w, float h, int limit = 10)
        {
            var rect = Panel(parent, name, x, y, w, h, new Color32(12, 25, 26, 244));
            rect.GetComponent<Image>().raycastTarget = true;
            var input = rect.gameObject.AddComponent<InputField>();
            input.targetGraphic = rect.GetComponent<Image>();
            input.textComponent = Label(rect, "", 18, 0, w - 36, h, 27, Paper);
            input.placeholder = Label(rect, placeholder, 18, 0, w - 36, h, 24, Muted);
            input.characterLimit = limit;
            input.lineType = InputField.LineType.SingleLine;
            input.text = value;
            Panel(rect, "InputRule", 0, h - 2, w, 2, Gold);
            return input;
        }

        public static void Bar(Transform parent, string name, float x, float y, float w, float h, float amount, Color color)
        {
            var rect = Panel(parent, name, x, y, w, h, new Color32(12, 24, 25, 220));
            Panel(rect, "Fill", 0, 0, w * Mathf.Clamp01(amount), h, color);
        }

        public static RectTransform PageContent(Transform parent, string name, string context, string status = "")
        {
            var content = Rect(parent, name, 0, 108, 1280, 516);
            Label(content, context, 48, 12, 690, 40, 22, Muted);
            Label(content, status, 760, 12, 470, 40, 21, Gold, TextAnchor.MiddleRight);
            Panel(content, "SectionRule", 48, 72, 1184, 1, new Color32(85, 96, 96, 100));
            return content;
        }
    }

    public sealed class UiTooltip : MonoBehaviour, IPointerEnterHandler, IPointerExitHandler
    {
        public string Caption;
        public void OnPointerEnter(PointerEventData data)
        {
            if (Input.touchCount == 0) GetComponentInParent<PrototypeApp>()?.Hint(Caption);
        }
        public void OnPointerExit(PointerEventData data) => GetComponentInParent<PrototypeApp>()?.Hint("");
    }

    // Small geometric symbols stay crisp at every Canvas scale without a font glyph dependency.
    [RequireComponent(typeof(CanvasRenderer))]
    public sealed class SymbolGraphic : MaskableGraphic
    {
        public string Symbol = "diamond";
        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear();
            switch (Symbol)
            {
                case "back": Line(vh, .72f, .1f, .28f, .5f); Line(vh, .28f, .5f, .72f, .9f); break;
                case "zoomIn": case "zoomOut": Ring(vh,.41f,.59f,.28f);Line(vh,.62f,.36f,.93f,.06f);Line(vh,.26f,.59f,.56f,.59f);if(Symbol=="zoomIn")Line(vh,.41f,.44f,.41f,.74f);break;
                case "heal": Line(vh,.16f,.5f,.84f,.5f,.18f);Line(vh,.5f,.16f,.5f,.84f,.18f);break;
                case "target": Ring(vh,.5f,.5f,.3f);Line(vh,.5f,.02f,.5f,.25f);Line(vh,.5f,.75f,.5f,.98f);Line(vh,.02f,.5f,.25f,.5f);Line(vh,.75f,.5f,.98f,.5f);break;
                case "reset": Ring(vh,.5f,.5f,.31f);Line(vh,.08f,.73f,.19f,.39f);Line(vh,.19f,.39f,.45f,.59f);break;
                case "camera": Line(vh,.08f,.17f,.92f,.17f);Line(vh,.92f,.17f,.92f,.76f);Line(vh,.92f,.76f,.08f,.76f);Line(vh,.08f,.76f,.08f,.17f);Ring(vh,.5f,.46f,.2f);Line(vh,.28f,.8f,.39f,.91f);Line(vh,.39f,.91f,.65f,.91f);break;
                case "book": Line(vh,.5f,.1f,.5f,.85f);Line(vh,.5f,.85f,.1f,.94f);Line(vh,.1f,.94f,.1f,.2f);Line(vh,.1f,.2f,.5f,.1f);Line(vh,.5f,.85f,.9f,.94f);Line(vh,.9f,.94f,.9f,.2f);Line(vh,.9f,.2f,.5f,.1f);break;
                case "close": Line(vh, .2f, .2f, .8f, .8f); Line(vh, .2f, .8f, .8f, .2f); break;
                case "settings": Ring(vh, .5f, .5f, .36f); Ring(vh, .5f, .5f, .12f); for (int i=0;i<8;i++) { float a=i*Mathf.PI/4; Line(vh,.5f+Mathf.Cos(a)*.35f,.5f+Mathf.Sin(a)*.35f,.5f+Mathf.Cos(a)*.49f,.5f+Mathf.Sin(a)*.49f); } break;
                case "sword": Line(vh,.15f,.12f,.84f,.86f,.09f); Line(vh,.13f,.36f,.42f,.12f); Line(vh,.65f,.83f,.85f,.85f); break;
                case "mountain": Line(vh,.05f,.1f,.38f,.85f); Line(vh,.38f,.85f,.73f,.1f); Line(vh,.57f,.45f,.76f,.71f); Line(vh,.76f,.71f,.98f,.1f); Line(vh,.05f,.1f,.98f,.1f); break;
                case "pet": Ring(vh,.5f,.37f,.24f); Ring(vh,.16f,.71f,.075f); Ring(vh,.5f,.85f,.075f); Ring(vh,.84f,.71f,.075f); break;
                case "guild": Ring(vh,.5f,.74f,.15f); Line(vh,.2f,.09f,.23f,.4f); Line(vh,.23f,.4f,.5f,.51f); Line(vh,.5f,.51f,.77f,.4f); Line(vh,.77f,.4f,.8f,.09f); break;
                case "chat": Ring(vh,.5f,.55f,.32f); Line(vh,.24f,.28f,.13f,.08f); Line(vh,.13f,.08f,.34f,.18f); Line(vh,.30f,.55f,.42f,.55f); Line(vh,.48f,.55f,.60f,.55f); Line(vh,.66f,.55f,.78f,.55f); break;
                case "home": Line(vh,.03f,.53f,.5f,.92f); Line(vh,.5f,.92f,.97f,.53f); Line(vh,.2f,.6f,.2f,.08f); Line(vh,.2f,.08f,.8f,.08f); Line(vh,.8f,.08f,.8f,.6f); break;
                case "dodge": Line(vh,.1f,.5f,.85f,.5f); Line(vh,.6f,.8f,.9f,.5f); Line(vh,.9f,.5f,.6f,.2f); break;
                default: Line(vh,.5f,.95f,.9f,.5f); Line(vh,.9f,.5f,.5f,.05f); Line(vh,.5f,.05f,.1f,.5f); Line(vh,.1f,.5f,.5f,.95f); break;
            }
        }
        private void Ring(VertexHelper vh,float x,float y,float r)
        {
            for(int i=0;i<32;i++){ float a=i*Mathf.PI/16,b=(i+1)*Mathf.PI/16; Line(vh,x+Mathf.Cos(a)*r,y+Mathf.Sin(a)*r,x+Mathf.Cos(b)*r,y+Mathf.Sin(b)*r,.045f); }
        }
        private void Line(VertexHelper vh,float ax,float ay,float bx,float by,float width=.055f)
        {
            Rect r=rectTransform.rect;
            Vector2 a=new Vector2(r.x+ax*r.width,r.y+ay*r.height), b=new Vector2(r.x+bx*r.width,r.y+by*r.height);
            Vector2 n=new Vector2(-(b-a).y,(b-a).x).normalized*width*Mathf.Min(r.width,r.height)*.5f;
            int start=vh.currentVertCount;
            vh.AddVert(a-n,color,Vector2.zero);vh.AddVert(a+n,color,Vector2.zero);vh.AddVert(b+n,color,Vector2.zero);vh.AddVert(b-n,color,Vector2.zero);
            vh.AddTriangle(start,start+1,start+2);vh.AddTriangle(start,start+2,start+3);
        }
    }
}
