using UnityEngine;

namespace Lunhui
{
    [DisallowMultipleComponent]
    public sealed class CharacterVisual : MonoBehaviour
    {
        private static readonly int MoveSpeed = Animator.StringToHash("MoveSpeed");
        private GameObject model;
        private Animator animator;
        private Transform head;
        private int career = -1;
        private bool isGuide;
        private bool useFemale;
        private CharacterAppearance appearance;
        public CharacterCustomizer Customizer {get;private set;}
        public void SetAppearance(CharacterAppearance value)
        {
            appearance=value;
            if(model&&!isGuide){if(!Customizer)Customizer=model.AddComponent<CharacterCustomizer>();Customizer.Apply(value);}
        }

        public bool HasModel => model != null;
        public Animator Animator => animator;
        /// <summary>World-space anchor used by the appearance editor camera.</summary>
        public Transform Head => head;
        public Vector3 PortraitFocus
        {
            get
            {
                if (head != null) return head.position + transform.up * 0.015f;
                return transform.position + transform.up * 1.95f;
            }
        }
        public Vector3 PortraitForward => transform.TransformDirection(Vector3.forward);
        public void SetFemale(bool female)
        {
            if (useFemale == female) return;
            useFemale = female;
            int previous = Mathf.Max(0, career); career = -1; SetCareer(previous);
        }

        public static CharacterVisual Create(Transform parent, bool guide = false)
        {
            var host = new GameObject(guide ? "Qinghua Character Art" : "Hero Character Art");
            host.transform.SetParent(parent, false);
            var visual = host.AddComponent<CharacterVisual>();
            visual.isGuide = guide;
            visual.SetCareer(0);
            return visual;
        }

        public void SetCareer(int index)
        {
            index = Mathf.Clamp(index, 0, 2);
            if (model != null && career == index) return;
            string key = isGuide ? "Guide" : (useFemale ? "Female" : "Career") + index;
            var prefab = Resources.Load<GameObject>("Art/Characters/Prefabs/" + key);
            if (prefab == null)
            {
                Debug.LogWarning("Character art prefab is missing: " + key);
                return;
            }
            if (model != null)
            {
                model.SetActive(false);
                Destroy(model);
            }
            career = index;
            model = Instantiate(prefab, transform, false);
            head = null;
            foreach (var child in model.GetComponentsInChildren<Transform>(true))
                if (child.name == "Head") { head = child; break; }
            Customizer=null;
            if(appearance!=null)SetAppearance(appearance);
            animator = model.GetComponentInChildren<Animator>();
            if (animator != null)
            {
                animator.applyRootMotion = false;
                animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                animator.SetFloat(MoveSpeed, 0);
            }
        }

        public void Move(float speed)
        {
            if (animator != null) animator.SetFloat(MoveSpeed, Mathf.Clamp01(speed), 0.13f, Time.deltaTime);
        }

        public void PerformAction(string action)
        {
            if (animator == null || isGuide) return;
            string state = action == "dodge" || action == "dash" ? "Roll" :
                action == "skill" || action == "ultimate" ? "Skill" : "Attack";
            animator.CrossFadeInFixedTime(state, 0.08f, 0, 0);
        }
    }
}
