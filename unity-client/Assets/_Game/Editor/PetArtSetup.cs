using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace Lunhui.Prototype
{
    public static class PetArtSetup
    {
        private const string Source="Assets/_Game/Art/PetSources";
        private const string Output="Assets/_Game/Resources/Art/Pets";

        [MenuItem("Lunhui/Build Pet Art")]
        public static void BuildAssets()
        {
            Directory.CreateDirectory(Output);
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            string[] models={"Wolf","Fox"};
            for(int i=0;i<models.Length;i++)
            {
                string path=Source+"/"+models[i]+".fbx";
                var importer=(ModelImporter)AssetImporter.GetAtPath(path);
                importer.animationType=ModelImporterAnimationType.Legacy;
                importer.importAnimation=true;
                importer.importCameras=false;
                importer.importLights=false;
                importer.materialImportMode=ModelImporterMaterialImportMode.ImportStandard;
                importer.isReadable=false;
                var clips=importer.defaultClipAnimations;
                foreach(var clip in clips)
                {
                    clip.loopTime=!clip.name.ToLowerInvariant().Contains("attack");
                    clip.lockRootPositionXZ=true;clip.lockRootHeightY=true;clip.lockRootRotation=true;
                    clip.keepOriginalPositionXZ=true;clip.keepOriginalPositionY=true;
                }
                importer.clipAnimations=clips;
                importer.SaveAndReimport();
                var root=new GameObject("Pet"+i);
                try
                {
                    var model=UnityEngine.Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path),root.transform);
                    foreach(var renderer in model.GetComponentsInChildren<Renderer>())
                    {
                        foreach(var material in renderer.sharedMaterials)
                        {
                            if(material==null)continue;
                            material.shader=Shader.Find("Standard");
                            material.SetFloat("_Metallic",0);material.SetFloat("_Glossiness",.18f);
                        }
                    }
                    var animations=AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().Where(c=>!c.name.StartsWith("__preview__",StringComparison.Ordinal)).ToArray();
                    var idle=animations.FirstOrDefault(c=>c.name.EndsWith("|Idle",StringComparison.Ordinal))??animations.First();
                    idle.SampleAnimation(model,0);
                    Bounds bounds=new Bounds();
                    bool measured=false;
                    foreach(var skinned in model.GetComponentsInChildren<SkinnedMeshRenderer>())
                    {
                        skinned.updateWhenOffscreen=true;
                        var baked=new Mesh();
                        skinned.BakeMesh(baked);
                        foreach(Vector3 vertex in baked.vertices)
                        {
                            Vector3 point=skinned.transform.TransformPoint(vertex);
                            if(!measured){bounds=new Bounds(point,Vector3.zero);measured=true;}
                            else bounds.Encapsulate(point);
                        }
                        baked.RecalculateBounds();
                        skinned.localBounds=baked.bounds;
                        UnityEngine.Object.DestroyImmediate(baked);
                    }
                    if(!measured)throw new InvalidOperationException("Pet skin is empty: "+models[i]);
                    Bounds boneBounds=new Bounds();
                    bool measuredBone=false;
                    foreach(var skinned in model.GetComponentsInChildren<SkinnedMeshRenderer>())
                    foreach(var bone in skinned.bones)
                    {
                        if(!measuredBone){boneBounds=new Bounds(bone.position,Vector3.zero);measuredBone=true;}
                        else boneBounds.Encapsulate(bone.position);
                    }
                    Debug.Log("PET_MEASURE "+models[i]+" mesh="+bounds+" bones="+boneBounds);
                    // These FBXs contain a 100x mesh transform; bone positions give the animated world scale.
                    if(measuredBone&&boneBounds.size.y>.001f)bounds=boneBounds;
                    root.transform.localScale=Vector3.one*((i==0?1.16f:.95f)/Mathf.Max(.1f,bounds.size.y));
                    model.transform.localPosition-=Vector3.up*bounds.min.y;
                    var animation=model.GetComponent<Animation>();
                    if(!animation)animation=model.AddComponent<Animation>();
                    animation.playAutomatically=false;
                    foreach(var clip in animations)animation.AddClip(clip,clip.name);
                    if(animations.Length==0)throw new InvalidOperationException("Pet has no animation: "+models[i]);
                    PrefabUtility.SaveAsPrefabAsset(root,Output+"/Pet"+i+".prefab");
                    Debug.Log("PET_ART "+models[i]+" bounds="+bounds+" scale="+root.transform.localScale+" clips="+string.Join(",",animations.Select(c=>c.name)));
                }
                finally{UnityEngine.Object.DestroyImmediate(root);}
            }
            AssetDatabase.SaveAssets();
            Debug.Log("PET_ART_COMPLETE");
        }
    }
}
