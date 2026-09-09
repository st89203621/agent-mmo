using System.IO;
using UnityEditor;
using UnityEngine;

namespace Lunhui.Prototype
{
    public static class ArtReviewSetup
    {
        [MenuItem("Lunhui/Capture Art Review")]
        public static void Capture()
        {
            EnvironmentArtImport.Reimport();
            PrototypeValidation.Run();
        }

        public static void CaptureRuntime(PrototypeApp app)
        {
            Directory.CreateDirectory("Assets/_Game/Resources/Art/Realms");
            Directory.CreateDirectory("Artifacts/ArtReview");
            var world = app.World;
            try
            {
                world.SetMode("login", 0);
                Camera camera = world.WorldCamera;
                for (int i = 0; i < PrototypeWorld.RealmNames.Length; i++)
                {
                    world.SetRealm(i);
                    camera.transform.position = new Vector3(13, 9.7f, -16);
                    camera.transform.LookAt(new Vector3(0, 2.2f, 9));
                    camera.fieldOfView = 49;
                    CaptureCamera(camera, 1280, 720, "Artifacts/ArtReview/realm" + i + ".jpg");
                    CaptureCamera(camera, 768, 432, "Assets/_Game/Resources/Art/Realms/realm" + i + ".jpg");
                }
                world.SetRealm(0);
                for (int i = 0; i < 3; i++)
                {
                    world.SetMode("character", i);
                    foreach (Animator animator in world.GetComponentsInChildren<Animator>()) animator.Update(0);
                    camera.transform.position = new Vector3(1.5f, 2.4f, -5.6f);
                    camera.transform.LookAt(new Vector3(-.55f, 1.3f, 0));
                    camera.fieldOfView = 38;
                    CaptureCamera(camera, 1024, 1024, "Artifacts/ArtReview/career" + i + ".jpg");
                }
            }
            finally { world.SetRealm(0); app.ShowPage("login"); }
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            AssetDatabase.SaveAssets();
            Debug.Log("ART_REVIEW_COMPLETE: seven realm thumbnails and three character renders.");
        }

        private static void CaptureCamera(Camera camera,int width,int height,string path)
        {
            var target=RenderTexture.GetTemporary(width,height,24,RenderTextureFormat.ARGB32);
            var previous=RenderTexture.active;
            var previousTarget=camera.targetTexture;
            var image=new Texture2D(width,height,TextureFormat.RGB24,false);
            try
            {
                camera.targetTexture=target;
                camera.Render();
                RenderTexture.active=target;
                image.ReadPixels(new Rect(0,0,width,height),0,0);
                image.Apply();
                File.WriteAllBytes(path,image.EncodeToJPG(91));
            }
            finally
            {
                camera.targetTexture=previousTarget;
                RenderTexture.active=previous;
                RenderTexture.ReleaseTemporary(target);
                Object.DestroyImmediate(image);
            }
        }
    }
}


