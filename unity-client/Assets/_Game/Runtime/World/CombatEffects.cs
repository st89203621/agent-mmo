using System.Collections.Generic;
using UnityEngine;

namespace Lunhui
{
    public sealed class CombatEffects : MonoBehaviour
    {
        private sealed class Effect
        {
            public GameObject Root;
            public ParticleSystem Particles;
            public LineRenderer Line;
            public float Until,Duration,Radius;
            public Vector3 Position,End;
            public Color Color;
            public int Kind;
        }
        private readonly List<Effect> pool=new List<Effect>();
        private readonly Dictionary<string,Material> materials=new Dictionary<string,Material>();
        private float clock;
        private bool paused;
        public int ActiveCount {get;private set;}
        public static readonly Color[] CareerColors={new Color(1,.55f,.34f),new Color(.35f,.77f,1),new Color(.98f,.53f,.86f)};
        public static readonly Color[] BossColors={Color.white,new Color(.88f,.63f,1),new Color(.25f,.87f,1),new Color(.36f,.72f,1),new Color(1,.56f,.18f),new Color(1,.38f,.25f)};

        public void SetPaused(bool value)
        {
            paused=value;
            foreach(var item in pool)if(item.Root.activeSelf&&item.Particles){if(value)item.Particles.Pause();else item.Particles.Play();}
        }
        public void Skill(int career,string action,Vector3 origin,Vector3 target)
        {
            Color color=CareerColors[Mathf.Clamp(career,0,2)];Vector3 center=origin+Vector3.up*.12f;
            if(action=="heal")
            {
                color=new Color(.35f,1,.72f);Ring(center,2.2f,color,1.15f);Burst(origin+Vector3.up,"star_04",color,44,.16f,1.6f,1.1f);return;
            }
            if(action=="dodge")
            {Burst(origin+Vector3.up*.8f,"trace_01",color,25,.3f,1.8f,.6f);return;}
            if(action=="pet")
            {Beam(origin+Vector3.up,target+Vector3.up,color,.3f);Burst(target+Vector3.up,"star_04",color,24,.22f,2,.6f);return;}
            if(action=="attack")
            {
                Arc(origin+Vector3.up*1.15f,target,color,1.7f,.28f);
                Burst(target+Vector3.up,"spark_04",color,14,.1f,2,.4f);return;
            }
            bool ultimate=action=="ultimate";
            if(career==1 && !ultimate)
            {Ring(center,2,color,1);Ring(origin+Vector3.up*1.3f,1.35f,color,.8f);Burst(origin+Vector3.up,"magic_01",color,32,.25f,1.6f,1.1f);return;}
            Arc(origin+Vector3.up,target,color,ultimate?3.2f:2.2f,.55f);
            Beam(origin+Vector3.up*1.2f,target+Vector3.up*.8f,color,.5f);
            Ring(target+Vector3.up*.08f,ultimate?4.4f:2.6f,color,ultimate?1.2f:.7f);
            Burst(target+Vector3.up*.8f,career==0?"fire_01":career==1?"magic_01":"star_04",color,ultimate?70:40,ultimate?.3f:.2f,ultimate?4:2.8f,ultimate?1.2f:.8f);
            if(ultimate)
            {
                for(int i=0;i<5;i++)
                {
                    float angle=i*Mathf.PI*2/5;Vector3 point=target+new Vector3(Mathf.Cos(angle),0,Mathf.Sin(angle))*2.5f;
                    Beam(point+Vector3.up*4.3f,point+Vector3.up*.2f,color,.8f);
                }
            }
        }
        public void Impact(Vector3 target,bool pet)
        {Burst(target+Vector3.up,pet?"star_04":"spark_04",pet?new Color(.5f,1,.83f):new Color(1,.89f,.56f),14,.14f,2.1f,.45f);}
        public void Boss(int theme,int style,Vector3 position,Vector3 direction,float radius)
        {
            Color color=BossColors[Mathf.Clamp(theme,1,5)];
            if(style==1)
            {Beam(position+Vector3.up*.9f,position+direction*radius+Vector3.up*.9f,color,.55f);}
            Ring(position+Vector3.up*.08f,radius,color,.85f);
            Burst(position+Vector3.up*.5f,theme==5?"fire_01":theme==2?"circle_05":"magic_01",color,65,.28f,3.5f,1.1f);
        }
        private Material Material(string texture)
        {
            if(materials.TryGetValue(texture,out Material cached))return cached;
            cached=new Material(Shader.Find("Lunhui/ParticleGlow")){name="Kenney "+texture};
            cached.mainTexture=Resources.Load<Texture2D>("Art/Vfx/"+texture);materials.Add(texture,cached);return cached;
        }
        private Effect Obtain(bool particle)
        {
            foreach(var item in pool)if(!item.Root.activeSelf&&((item.Particles!=null)==particle)){item.Root.SetActive(true);return item;}
            // Limit transparent effects during sustained boss fights on mobile.
            if(pool.Count>=44)
            {
                foreach(var item in pool)if((item.Particles!=null)==particle){item.Root.SetActive(true);return item;}
            }
            var effect=new Effect{Root=new GameObject(particle?"Skill particles":"Skill light trail")};effect.Root.transform.SetParent(transform,false);
            if(particle)effect.Particles=effect.Root.AddComponent<ParticleSystem>();
            else
            {
                effect.Line=effect.Root.AddComponent<LineRenderer>();effect.Line.useWorldSpace=true;effect.Line.numCapVertices=3;
                effect.Line.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;effect.Line.receiveShadows=false;effect.Line.textureMode=LineTextureMode.Stretch;
                effect.Line.sharedMaterial=Material("trace_01");
            }
            pool.Add(effect);return effect;
        }
        private void Burst(Vector3 position,string texture,Color color,int count,float size,float speed,float duration)
        {
            var effect=Obtain(true);effect.Root.transform.position=position;effect.Until=clock+duration+.2f;
            var system=effect.Particles;system.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
            var main=system.main;main.loop=false;main.playOnAwake=false;main.duration=duration;main.startLifetime=new ParticleSystem.MinMaxCurve(duration*.5f,duration);
            main.simulationSpace=ParticleSystemSimulationSpace.World;main.startSpeed=new ParticleSystem.MinMaxCurve(speed*.4f,speed);main.startSize=new ParticleSystem.MinMaxCurve(size*.5f,size);main.startColor=color;
            main.maxParticles=90;main.gravityModifier=.08f;var emission=system.emission;emission.rateOverTime=0;emission.SetBursts(new[]{new ParticleSystem.Burst(0,(short)count)});
            var shape=system.shape;shape.shapeType=ParticleSystemShapeType.Sphere;shape.radius=.35f;
            var gradient=new Gradient();gradient.SetKeys(new[]{new GradientColorKey(color,0),new GradientColorKey(color,1)},new[]{new GradientAlphaKey(1,0),new GradientAlphaKey(0,1)});
            var overLife=system.colorOverLifetime;overLife.enabled=true;overLife.color=gradient;
            var renderer=system.GetComponent<ParticleSystemRenderer>();renderer.sharedMaterial=Material(texture);renderer.renderMode=ParticleSystemRenderMode.Billboard;renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;
            system.Play();
        }
        private void Ring(Vector3 position,float radius,Color color,float duration)
        {
            var effect=Obtain(false);effect.Kind=0;effect.Position=position;effect.Radius=radius;effect.Color=color;effect.Duration=duration;effect.Until=clock+duration;
            effect.Line.loop=true;effect.Line.positionCount=65;effect.Line.widthMultiplier=.11f;
            RenderLine(effect,0);
        }
        private void Beam(Vector3 start,Vector3 end,Color color,float duration)
        {
            var effect=Obtain(false);effect.Kind=1;effect.Position=start;effect.End=end;effect.Color=color;effect.Duration=duration;effect.Until=clock+duration;
            effect.Line.loop=false;effect.Line.positionCount=9;effect.Line.widthMultiplier=.2f;RenderLine(effect,0);
        }
        private void Arc(Vector3 origin,Vector3 target,Color color,float radius,float duration)
        {
            var effect=Obtain(false);effect.Kind=2;effect.Position=origin;effect.End=target;effect.Radius=radius;effect.Color=color;effect.Duration=duration;effect.Until=clock+duration;
            effect.Line.loop=false;effect.Line.positionCount=28;effect.Line.widthMultiplier=.21f;RenderLine(effect,0);
        }
        private void RenderLine(Effect effect,float progress)
        {
            Color color=effect.Color;color.a=(1-progress)*.85f;effect.Line.startColor=color;effect.Line.endColor=color;
            for(int i=0;i<effect.Line.positionCount;i++)
            {
                float t=i/(float)(effect.Line.positionCount-1);Vector3 point;
                if(effect.Kind==1)point=Vector3.Lerp(effect.Position,effect.End,t)+Vector3.up*Mathf.Sin(t*25+progress*12)*.07f;
                else
                {
                    float angle=effect.Kind==0?t*Mathf.PI*2:Mathf.Atan2(effect.End.z-effect.Position.z,effect.End.x-effect.Position.x)+(t-.5f)*Mathf.PI*1.3f+progress*.5f;
                    float radius=effect.Radius*Mathf.Lerp(.38f,1.1f,progress);
                    point=effect.Position+new Vector3(Mathf.Cos(angle)*radius,effect.Kind==2?Mathf.Sin(t*Mathf.PI)*.6f:0,Mathf.Sin(angle)*radius);
                }
                effect.Line.SetPosition(i,point);
            }
        }
        private void Update()
        {
            if(paused)return;clock+=Time.deltaTime;ActiveCount=0;
            foreach(var effect in pool)
            {
                if(!effect.Root.activeSelf)continue;
                if(clock>effect.Until){effect.Root.SetActive(false);continue;}
                ActiveCount++;if(effect.Line)RenderLine(effect,1-(effect.Until-clock)/effect.Duration);
            }
        }
        private void OnDestroy(){foreach(var material in materials.Values)if(material)Destroy(material);}
    }
}
