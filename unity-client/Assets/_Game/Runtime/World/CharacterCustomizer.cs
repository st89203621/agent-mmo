using System;
using System.Collections.Generic;
using UnityEngine;

namespace Lunhui
{
    public sealed class CharacterCustomizer : MonoBehaviour
    {
        private sealed class FacePart
        {
            public Mesh Mesh;
            public Vector3[] Source;
            public bool Eyes;
            public bool Brows;
            public Renderer Renderer;
        }
        private readonly List<FacePart> parts=new List<FacePart>();
        private readonly List<Renderer> skin=new List<Renderer>(),eyes=new List<Renderer>(),brows=new List<Renderer>(),cloth=new List<Renderer>();
        private readonly List<Material> materials=new List<Material>();
        private Transform head;
        private GameObject hair;
        private int hairIndex=-1;
        private Bounds faceBounds;
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
                var vertices=new Vector3[part.Source.Length];
                for(int i=0;i<vertices.Length;i++)
                {
                    Vector3 p=part.Source[i];float height=Mathf.InverseLerp(faceBounds.min.y,faceBounds.max.y,p.y);
                    float jaw=1-Mathf.SmoothStep(.18f,.63f,height);
                    p.x*=1+(appearance.FaceWidth-.5f)*.3f+(appearance.JawWidth-.5f)*.35f*jaw;
                    p.y-=(appearance.ChinLength-.5f)*faceBounds.size.y*.15f*jaw;
                    float eyeLine=faceBounds.center.y+faceBounds.size.y*.12f;
                    float eyeWeight=part.Eyes||part.Brows?1:Mathf.Exp(-Mathf.Pow((p.y-eyeLine)/(faceBounds.size.y*.11f),2))*Mathf.Clamp01(-p.z/Mathf.Max(.01f,faceBounds.extents.z));
                    p.x+=Mathf.Sign(p.x)*(appearance.EyeSpacing-.5f)*faceBounds.size.x*.1f*eyeWeight;
                    float eyeCenter=Mathf.Sign(p.x)*faceBounds.size.x*.21f;
                    p.x+=(p.x-eyeCenter)*(appearance.EyeSize-.5f)*.32f*eyeWeight;
                    p.y+=(p.y-eyeLine)*(appearance.EyeSize-.5f)*.4f*eyeWeight;
                    if (part.Eyes || part.Brows)
                    {
                        p.y += (appearance.EyeHeight - .5f) * faceBounds.size.y * .12f;
                        if (part.Brows) p.y += (appearance.BrowHeight - .5f) * faceBounds.size.y * .10f;
                    }
                    if(!part.Eyes&&!part.Brows)
                    {
                        float nose=Mathf.Exp(-Mathf.Pow(p.x/(faceBounds.size.x*.11f),2)-Mathf.Pow((height-.47f)/.15f,2));
                        p.z-=(appearance.NoseSize-.5f)*faceBounds.size.z*.22f*nose;
                        float cheek=Mathf.Exp(-Mathf.Pow((Mathf.Abs(p.x)-faceBounds.size.x*.23f)/(faceBounds.size.x*.18f),2)-Mathf.Pow((height-.53f)/.23f,2));
                        p.x += Mathf.Sign(p.x) * (appearance.CheekFullness - .5f) * faceBounds.size.x * .07f * cheek;
                        p.z -= (appearance.CheekFullness - .5f) * faceBounds.size.z * .08f * cheek;
                        float lowerFace=Mathf.Exp(-Mathf.Pow(p.x/(faceBounds.size.x*.22f),2)-Mathf.Pow((height-.30f)/.20f,2));
                        p.z -= (appearance.LipFullness - .5f) * faceBounds.size.z * .08f * lowerFace;
                    }
                    vertices[i]=p;
                }
                part.Mesh.vertices=vertices;part.Mesh.RecalculateBounds();part.Mesh.RecalculateNormals();
            }
            Tint(skin,CharacterAppearance.SkinColors[appearance.SkinColor]);
            Tint(eyes,CharacterAppearance.EyeColors[appearance.EyeColor]*1.7f);
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
            var part=new FacePart{Mesh=mesh,Source=mesh.vertices,Eyes=isEyes,Brows=isBrows,Renderer=renderer};
            parts.Add(part); DeformedVertexCount+=mesh.vertexCount;
            if(isFace && (faceBounds.size.sqrMagnitude < .001f || name.Contains("superhero"))) faceBounds=mesh.bounds;
            if(isEyes) eyes.Add(renderer); else if(isBrows) brows.Add(renderer); else skin.Add(renderer);
        }
        private static void Tint(IEnumerable<Renderer> renderers,Color color)
        {
            var properties=new MaterialPropertyBlock();
            properties.SetColor("_Color",color);
            properties.SetColor("_BaseColor",color);
            properties.SetFloat("_Smoothness", .42f);
            foreach(var renderer in renderers)if(renderer)renderer.SetPropertyBlock(properties);
        }
        private void OnDestroy(){foreach(var part in parts)if(part.Mesh)Destroy(part.Mesh);foreach(var material in materials)if(material)Destroy(material);}
    }
}
