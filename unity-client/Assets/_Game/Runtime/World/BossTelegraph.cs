using System.Collections.Generic;
using UnityEngine;

namespace Lunhui
{
    public sealed class BossTelegraph : MonoBehaviour
    {
        private Mesh mesh;
        private Material fill;
        public int Shape {get;private set;}
        public float Radius {get;private set;}
        public void Configure(int shape,float radius,Vector3 position,Vector3 direction)
        {
            Shape=shape;Radius=radius;
            transform.position=position+Vector3.up*.055f;direction.y=0;transform.rotation=Quaternion.LookRotation(direction.sqrMagnitude>.001f?direction:Vector3.forward);
            if(mesh)Destroy(mesh);mesh=new Mesh{name="Boss attack geometry"};
            var vertices=new List<Vector3>();var triangles=new List<int>();
            if(shape==1)
            {
                vertices.AddRange(new[]{new Vector3(-1.65f,0,0),new Vector3(-1.65f,0,radius),new Vector3(1.65f,0,radius),new Vector3(1.65f,0,0)});triangles.AddRange(new[]{0,1,2,0,2,3});
            }
            else if(shape==0)
            {
                Disc(vertices,triangles,Vector3.zero,2.1f,0,360);
                Disc(vertices,triangles,new Vector3(-3,0,1),1.7f,0,360);Disc(vertices,triangles,new Vector3(3,0,1),1.7f,0,360);
            }
            else Disc(vertices,triangles,Vector3.zero,radius,shape==2?2.3f:0,shape==3?100:360);
            mesh.vertices=vertices.ToArray();mesh.triangles=triangles.ToArray();mesh.RecalculateNormals();mesh.RecalculateBounds();
            var filter=GetComponent<MeshFilter>();if(!filter)filter=gameObject.AddComponent<MeshFilter>();filter.sharedMesh=mesh;
            var renderer=GetComponent<MeshRenderer>();if(!renderer)renderer=gameObject.AddComponent<MeshRenderer>();
            if(!fill){fill=new Material(Shader.Find("Sprites/Default")){name="Boss danger area",color=new Color(1,.22f,.28f,.32f)};}
            renderer.sharedMaterial=fill;renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;
            gameObject.SetActive(true);
        }
        public bool Contains(Vector3 point)
        {
            Vector3 local=transform.InverseTransformPoint(point);local.y=0;float distance=local.magnitude;
            if(Shape==1)return Mathf.Abs(local.x)<1.65f&&local.z>=0&&local.z<=Radius;
            if(Shape==0)return distance<2.1f||Vector3.Distance(local,new Vector3(-3,0,1))<1.7f||Vector3.Distance(local,new Vector3(3,0,1))<1.7f;
            if(Shape==2)return distance>=2.3f&&distance<Radius;
            if(Shape==4)return distance<Radius;
            return distance<Radius&&Vector3.Angle(Vector3.forward,local)<50;
        }
        private static void Disc(List<Vector3> vertices,List<int> triangles,Vector3 center,float outer,float inner,float sweep)
        {
            const int count=64;int start=vertices.Count;
            for(int i=0;i<=count;i++)
            {
                float angle=(i/(float)count-.5f)*sweep*Mathf.Deg2Rad;Vector3 unit=new Vector3(Mathf.Sin(angle),0,Mathf.Cos(angle));vertices.Add(center+unit*inner);vertices.Add(center+unit*outer);
                if(i==count)continue;int a=start+i*2;triangles.AddRange(new[]{a,a+1,a+3,a,a+3,a+2});
            }
        }
        private void OnDestroy(){if(mesh)Destroy(mesh);if(fill)Destroy(fill);}
    }
}
