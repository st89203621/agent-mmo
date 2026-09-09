using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Lunhui
{
    public sealed class CharacterCustomizer : MonoBehaviour
    {
        private sealed class FacePart
        {
            public Mesh Mesh;
            public Vector3[] Source;
            public Vector3[] Vertices;
            public int[][] NormalGroups;
            public bool Eyes;
            public bool Brows;
        }
        private readonly List<FacePart> parts=new List<FacePart>();
        private readonly List<Renderer> skin=new List<Renderer>(),eyes=new List<Renderer>(),brows=new List<Renderer>(),cloth=new List<Renderer>();
        private Transform head;
        private GameObject hair;
        private int hairIndex=-1;
        private Bounds faceBounds;
        private Bounds eyeBounds;
        private Vector3 initialScale;
        private bool initialized;
        public int DeformedVertexCount {get;private set;}
        public CharacterAppearance Current {get;private set;}

        public void Apply(CharacterAppearance appearance)
        {
            if(appearance==null)return;
            if(!initialized)Initialize();
            appearance.Sanitize();Current=appearance.Copy();
            if(!head)return;
            transform.localScale=initialScale*Mathf.Lerp(.94f,1.06f,appearance.Height);
            if(hairIndex!=appearance.Hair)
            {
                var prefab=Resources.Load<GameObject>("Art/Customization/Hair"+appearance.Hair);
                if(prefab)
                {
                    if(hair){hair.SetActive(false);Destroy(hair);}
                    hair=Instantiate(prefab,head,false);hairIndex=appearance.Hair;
                }
            }
            foreach(var part in parts)
            {
                var vertices=part.Vertices;
                for(int i=0;i<vertices.Length;i++)
                {
                    Vector3 original=part.Source[i],p=original;
                    float height=Mathf.InverseLerp(faceBounds.min.y,faceBounds.max.y,p.y);
                    float jaw=1-Mathf.SmoothStep(0,1,Mathf.InverseLerp(.2f,.62f,height));
                    float neck=Mathf.SmoothStep(0,1,Mathf.InverseLerp(0,.22f,height));
                    float front=Mathf.SmoothStep(0,1,Mathf.InverseLerp(0,eyeBounds.min.z,p.z));
                    float eyeLine=eyeBounds.center.y;
                    float eyeCenter=Mathf.Sign(p.x)*(eyeBounds.extents.x-eyeBounds.extents.y);
                    // Eye geometry and the surrounding sockets share the same local deformation.
                    float eyeWeight=part.Eyes||part.Brows?1:front*(1-Mathf.SmoothStep(0,1,
                        Mathf.Max(Mathf.Abs(p.y-eyeLine)/(eyeBounds.size.y*1.8f),
                            Mathf.Abs(p.x-eyeCenter)/(eyeBounds.size.y*1.6f))-.65f));
                    if(!part.Eyes&&!part.Brows)
                        eyeWeight*=Mathf.SmoothStep(0,1,Mathf.InverseLerp(0,eyeBounds.extents.y,Mathf.Abs(p.x)));
                    p.x+=(p.x-eyeCenter)*(appearance.EyeSize-.5f)*.24f*eyeWeight;
                    p.y+=(p.y-eyeLine)*(appearance.EyeSize-.5f)*.24f*eyeWeight;
                    p.z+=(p.z-eyeBounds.center.z)*(appearance.EyeSize-.5f)*.24f*eyeWeight;
                    p.x+=Mathf.Sign(p.x)*(appearance.EyeSpacing-.5f)*eyeBounds.size.x*.08f*eyeWeight;
                    p.y+=(appearance.EyeHeight-.5f)*eyeBounds.size.y*.24f*eyeWeight;
                    if(part.Brows && original.y>eyeBounds.max.y)
                        p.y+=(appearance.BrowHeight-.5f)*eyeBounds.size.y*.3f;
                    p.x*=1+((appearance.FaceWidth-.5f)*.18f+(appearance.JawWidth-.5f)*.22f*jaw)*neck;
                    p.y-=(appearance.ChinLength-.5f)*faceBounds.size.y*.07f*jaw*neck;
                    if(!part.Eyes&&!part.Brows)
                    {
                        float nose=front*Mathf.Exp(-Mathf.Pow(original.x/(faceBounds.size.x*.10f),2)-Mathf.Pow((original.y-eyeLine+faceBounds.size.y*.15f)/(faceBounds.size.y*.10f),2));
                        p.z+=(appearance.NoseSize-.5f)*faceBounds.size.z*.08f*nose;
                        float cheek=front*Mathf.Exp(-Mathf.Pow((Mathf.Abs(original.x)-faceBounds.size.x*.24f)/(faceBounds.size.x*.15f),2)-Mathf.Pow((original.y-eyeLine+faceBounds.size.y*.12f)/(faceBounds.size.y*.13f),2));
                        p.x+=Mathf.Clamp(original.x/(faceBounds.size.x*.1f),-1,1)
                            *(appearance.CheekFullness-.5f)*faceBounds.size.x*.04f*cheek;
                        p.z+=(appearance.CheekFullness-.5f)*faceBounds.size.z*.03f*cheek;
                        float lips=front*Mathf.Exp(-Mathf.Pow(original.x/(faceBounds.size.x*.15f),2)-Mathf.Pow((original.y-eyeLine+faceBounds.size.y*.31f)/(faceBounds.size.y*.045f),2));
                        p.z+=(appearance.LipFullness-.5f)*faceBounds.size.z*.04f*lips;
                    }
                    vertices[i]=p;
                }
                part.Mesh.vertices=vertices;part.Mesh.RecalculateBounds();part.Mesh.RecalculateNormals();
                var normals=part.Mesh.normals;
                foreach(var group in part.NormalGroups)
                {
                    Vector3 normal=Vector3.zero;
                    foreach(int index in group)normal+=normals[index];
                    normal.Normalize();
                    foreach(int index in group)normals[index]=normal;
                }
                part.Mesh.normals=normals;part.Mesh.RecalculateTangents();
            }
            Tint(skin,CharacterAppearance.SkinColors[appearance.SkinColor]);
            var eyeProperties=new MaterialPropertyBlock();
            eyeProperties.SetColor("_Color",Color.white);
            eyeProperties.SetColor("_IrisColor",CharacterAppearance.EyeColors[appearance.EyeColor]);
            foreach(var renderer in eyes)renderer.SetPropertyBlock(eyeProperties);
            Tint(brows,CharacterAppearance.HairColors[appearance.HairColor]*1.8f);
            Tint(cloth,CharacterAppearance.OutfitColors[appearance.OutfitColor]);
            if(hair)Tint(hair.GetComponentsInChildren<Renderer>(),CharacterAppearance.HairColors[appearance.HairColor]*1.55f);
        }
        private void Initialize()
        {
            initialized=true;initialScale=transform.localScale;
            foreach(var child in GetComponentsInChildren<Transform>(true))if(child.name=="Head"){head=child;break;}
            if(!head)return;
            foreach(var child in head.GetComponentsInChildren<Transform>(true))if(child.name=="Hair")child.gameObject.SetActive(false);
            foreach(var filter in head.GetComponentsInChildren<MeshFilter>())
                RegisterPart(filter.name, filter.sharedMesh, mesh => filter.sharedMesh = mesh, filter.GetComponent<Renderer>());
            foreach(var skinned in head.GetComponentsInChildren<SkinnedMeshRenderer>())
                RegisterPart(skinned.name, skinned.sharedMesh, mesh => skinned.sharedMesh = mesh, skinned);
            if(faceBounds.size.sqrMagnitude < .001f && parts.Count > 0) faceBounds=parts[0].Mesh.bounds;
            if(eyeBounds.size.sqrMagnitude < .00001f)
                eyeBounds=new Bounds(faceBounds.center+Vector3.up*faceBounds.size.y*.12f,
                    new Vector3(faceBounds.size.x*.58f,faceBounds.size.y*.12f,faceBounds.size.z*.15f));
            foreach(var renderer in GetComponentsInChildren<Renderer>())
            {
                string name=renderer.name.ToLowerInvariant();
                if(name.Contains("ranger")||name.Contains("silk")||name.Contains("peasant"))cloth.Add(renderer);
            }
        }
        private void RegisterPart(string rawName, Mesh sourceMesh, Action<Mesh> assign, Renderer renderer)
        {
            if(sourceMesh == null || renderer == null) return;
            string name=rawName.ToLowerInvariant();
            bool isFace=name.Contains("superhero") || name.Contains("face") || name == "head";
            bool isEyes=name.Contains("eyes") || name.Contains("iris") || name.Contains("pupil");
            bool isBrows=name.Contains("brow");
            if(!isFace && !isEyes && !isBrows) return;
            var mesh=Instantiate(sourceMesh);
            mesh.name=sourceMesh.name+" (Runtime Face)";
            assign(mesh);
            var source=mesh.vertices;
            var groups=Enumerable.Range(0,source.Length).GroupBy(i=>source[i]).Where(g=>g.Count()>1).Select(g=>g.ToArray()).ToArray();
            var part=new FacePart{Mesh=mesh,Source=source,Vertices=new Vector3[source.Length],NormalGroups=groups,Eyes=isEyes,Brows=isBrows};
            parts.Add(part); DeformedVertexCount+=mesh.vertexCount;
            if(isFace && (faceBounds.size.sqrMagnitude < .001f || name.Contains("superhero"))) faceBounds=mesh.bounds;
            if(isEyes)eyeBounds=mesh.bounds;
            if(isEyes) eyes.Add(renderer); else if(isBrows) brows.Add(renderer); else skin.Add(renderer);
        }
        private static void Tint(IEnumerable<Renderer> renderers,Color color)
        {
            var properties=new MaterialPropertyBlock();
            properties.SetColor("_Color",color);
            properties.SetColor("_BaseColor",color);
            foreach(var renderer in renderers)if(renderer)renderer.SetPropertyBlock(properties);
        }
        private void OnDestroy(){foreach(var part in parts)if(part.Mesh)Destroy(part.Mesh);}
    }
}
