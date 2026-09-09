using System;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Lunhui
{
    public sealed class PetVisual : MonoBehaviour
    {
        private Animation animationPlayer;
        private string idle,walk,attack,current;
        private float actionUntil;
        public bool HasModel {get;private set;}

        public static PetVisual Create(Transform parent,int index)
        {
            var host=new GameObject("Imported Pet "+index);
            host.transform.SetParent(parent,false);
            var visual=host.AddComponent<PetVisual>();
            var prefab=Resources.Load<GameObject>("Art/Pets/Pet"+Mathf.Clamp(index,0,1));
            if(!prefab)return visual;
            var model=Instantiate(prefab,host.transform,false);
            visual.HasModel=true;
            visual.animationPlayer=model.GetComponentInChildren<Animation>();
            if(visual.animationPlayer)
            {
                foreach(AnimationState state in visual.animationPlayer)
                {
                    string key=state.name.ToLowerInvariant();
                    if(key.EndsWith("|idle",StringComparison.Ordinal))visual.idle=state.name;
                    if(key.Contains("walk")&&visual.walk==null)visual.walk=state.name;
                    if(key.Contains("attack")&&visual.attack==null)visual.attack=state.name;
                }
                foreach(AnimationState state in visual.animationPlayer)
                    if(visual.idle==null)visual.idle=state.name;
                visual.Play(visual.idle);
            }
            return visual;
        }

        public void Move(float speed)
        {
            if(Time.time<actionUntil)return;
            Play(speed>.15f?walk??idle:idle);
        }

        public void Command()
        {
            actionUntil=Time.time+.9f;
            Play(attack??idle);
        }

        private void Play(string clip)
        {
            if(!animationPlayer||string.IsNullOrEmpty(clip)||current==clip)return;
            current=clip;
            animationPlayer.wrapMode=clip==attack?WrapMode.Once:WrapMode.Loop;
            animationPlayer.CrossFade(clip,.15f);
        }
    }

    public sealed class PetArtPreview : MonoBehaviour,IDragHandler
    {
        private GameObject scene;
        private Transform pet;
        private RenderTexture target;

        public static void Create(Transform parent,int index,float x,float y,float width,float height)
        {
            var rect=UiKit.Rect(parent,"PetModelPreview",x,y,width,height);
            var preview=rect.gameObject.AddComponent<PetArtPreview>();
            var image=rect.gameObject.AddComponent<RawImage>();
            image.raycastTarget=true;
            preview.target=new RenderTexture(640,480,16){name="Pet Preview",antiAliasing=2};
            image.texture=preview.target;
            preview.scene=new GameObject("Pet Preview Scene");
            preview.scene.transform.position=new Vector3(2000,0,0);
            var visual=PetVisual.Create(preview.scene.transform,index);
            preview.pet=visual.transform;
            preview.pet.localRotation=Quaternion.Euler(0,135,0);
            foreach(var transform in preview.scene.GetComponentsInChildren<Transform>(true))transform.gameObject.layer=30;
            var cameraObject=new GameObject("Pet Preview Camera",typeof(Camera));
            cameraObject.transform.SetParent(preview.scene.transform,false);
            var camera=cameraObject.GetComponent<Camera>();
            camera.cullingMask=1<<30;
            camera.clearFlags=CameraClearFlags.SolidColor;
            camera.backgroundColor=new Color(.075f,.13f,.15f);
            camera.targetTexture=preview.target;
            camera.fieldOfView=34;
            camera.transform.localPosition=new Vector3(2.25f,1.6f,-3.2f);
            camera.transform.LookAt(preview.scene.transform.position+Vector3.up*.65f);
            var lightObject=new GameObject("Pet Preview Light",typeof(Light));
            lightObject.transform.SetParent(preview.scene.transform,false);
            lightObject.transform.localPosition=new Vector3(-1,3,-2);
            var light=lightObject.GetComponent<Light>();
            light.type=LightType.Point;light.range=10;light.intensity=1.8f;light.cullingMask=1<<30;
        }

        public void OnDrag(PointerEventData data){if(pet)pet.Rotate(0,-data.delta.x*.5f,0,Space.World);}
        private void OnDestroy()
        {
            if(scene)Destroy(scene);
            if(target){target.Release();Destroy(target);}
        }
    }
}
