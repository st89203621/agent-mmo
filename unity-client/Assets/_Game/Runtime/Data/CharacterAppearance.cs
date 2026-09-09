using System;
using UnityEngine;

namespace Lunhui
{
    [Serializable]
    public sealed class CharacterAppearance
    {
        public int Hair;
        public int HairColor;
        public int SkinColor;
        public int EyeColor;
        public int OutfitColor;
        public float FaceWidth=.43f;
        public float JawWidth=.38f;
        public float ChinLength=.47f;
        public float EyeSize=.61f;
        public float EyeSpacing=.52f;
        public float NoseSize=.41f;
        public float Height=.5f;
        // Secondary face controls are deliberately normalized so the JSON
        // contract remains compact and old saved appearances still load.
        public float CheekFullness=.56f;
        public float EyeHeight=.53f;
        public float LipFullness=.52f;
        public float BrowHeight=.53f;

        public static readonly Color[] HairColors={new Color(.12f,.07f,.055f),new Color(.34f,.14f,.06f),new Color(.68f,.35f,.08f),new Color(.13f,.19f,.27f),new Color(.5f,.09f,.18f)};
        public static readonly Color[] SkinColors={new Color(1f,.88f,.82f),new Color(.93f,.73f,.62f),new Color(.78f,.53f,.4f),new Color(.58f,.36f,.29f),new Color(.9f,.87f,.91f)};
        public static readonly Color[] EyeColors={new Color(.28f,.14f,.08f),new Color(.18f,.5f,.66f),new Color(.18f,.5f,.3f),new Color(.53f,.34f,.7f),new Color(.7f,.48f,.12f)};
        public static readonly Color[] OutfitColors={new Color(1,1,1),new Color(.66f,.85f,1),new Color(.58f,1,.82f),new Color(1,.69f,.81f),new Color(.88f,.8f,.55f)};

        public CharacterAppearance Copy()=>JsonUtility.FromJson<CharacterAppearance>(JsonUtility.ToJson(this));
        public void Sanitize()
        {
            Hair=Mathf.Clamp(Hair,0,3);HairColor=Mathf.Clamp(HairColor,0,4);SkinColor=Mathf.Clamp(SkinColor,0,4);EyeColor=Mathf.Clamp(EyeColor,0,4);OutfitColor=Mathf.Clamp(OutfitColor,0,4);
            FaceWidth=Value(FaceWidth);JawWidth=Value(JawWidth);ChinLength=Value(ChinLength);EyeSize=Value(EyeSize);EyeSpacing=Value(EyeSpacing);NoseSize=Value(NoseSize);Height=Value(Height);
            CheekFullness=Value(CheekFullness);EyeHeight=Value(EyeHeight);LipFullness=Value(LipFullness);BrowHeight=Value(BrowHeight);
        }
        private static float Value(float value)=>float.IsNaN(value)||float.IsInfinity(value)?.5f:Mathf.Clamp01(value);
        public static CharacterAppearance Preset(int index)
        {
            switch(index)
            {
                case 1:return new CharacterAppearance{Hair=2,HairColor=2,SkinColor=1,EyeColor=2,OutfitColor=2,FaceWidth=.3f,JawWidth=.22f,ChinLength=.4f,EyeSize=.7f,EyeSpacing=.58f,NoseSize=.35f,CheekFullness=.62f,EyeHeight=.56f,LipFullness=.58f,BrowHeight=.55f};
                case 2:return new CharacterAppearance{Hair=1,HairColor=3,SkinColor=4,EyeColor=1,OutfitColor=1,FaceWidth=.48f,JawWidth=.4f,ChinLength=.62f,EyeSize=.62f,EyeSpacing=.45f,NoseSize=.5f,CheekFullness=.44f,EyeHeight=.52f,LipFullness=.44f,BrowHeight=.46f};
                case 3:return new CharacterAppearance{Hair=0,HairColor=4,SkinColor=1,EyeColor=3,OutfitColor=3,FaceWidth=.37f,JawWidth=.28f,ChinLength=.48f,EyeSize=.78f,EyeSpacing=.54f,NoseSize=.3f,CheekFullness=.7f,EyeHeight=.6f,LipFullness=.66f,BrowHeight=.58f};
                default:return new CharacterAppearance();
            }
        }
    }
}
