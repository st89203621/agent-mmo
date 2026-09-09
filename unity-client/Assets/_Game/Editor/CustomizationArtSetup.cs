using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace Lunhui.Prototype
{
    public static class CustomizationArtSetup
    {
        public static void BuildAssets()
        {
            const string output="Assets/_Game/Resources/Art/Customization";
            Directory.CreateDirectory(output);AssetDatabase.Refresh();
            string[] sources={"Female0","Career0","Female2","Career1"};
            for(int i=0;i<sources.Length;i++)
            {
                var source=Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>("Assets/_Game/Resources/Art/Characters/Prefabs/"+sources[i]+".prefab"));
                var root=new GameObject("Hair"+i);
                try
                {
                    foreach(var filter in source.GetComponentsInChildren<MeshFilter>(true).Where(x=>x.name=="Hair"))
                    {
                        var part=Object.Instantiate(filter.gameObject,root.transform,false);part.name="Hair Mesh";
                        part.transform.localPosition=Vector3.zero;part.transform.localRotation=Quaternion.identity;part.transform.localScale=Vector3.one;
                    }
                    if(root.transform.childCount==0)throw new System.InvalidOperationException("Hair source missing: "+sources[i]);
                    PrefabUtility.SaveAsPrefabAsset(root,output+"/Hair"+i+".prefab");
                }
                finally{Object.DestroyImmediate(source);Object.DestroyImmediate(root);}
            }
            AssetDatabase.SaveAssets();Debug.Log("CUSTOMIZATION_ART_COMPLETE: four sourced hairstyles");
        }
        public static void BuildVersionFour(){BuildAssets();BossArtSetup.BuildAssets();MonsterArtSetup.BuildAssets();}
    }
}
