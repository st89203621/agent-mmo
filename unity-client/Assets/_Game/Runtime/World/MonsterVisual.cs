using System;
using System.Collections.Generic;
using UnityEngine;

namespace Lunhui
{
    /// <summary>
    /// Lightweight animated art wrapper for ordinary enemies.  The first two
    /// variants are the downloaded Quaternius Imp/Puglin models; the latter
    /// two reuse the CC0 Fox/Wolf models already shipped with the pet system.
    /// Keeping the visual contract separate from combat lets the server later
    /// send a monster archetype without changing the combat loop.
    /// </summary>
    public sealed class MonsterVisual : MonoBehaviour
    {
        private static readonly string[] ResourceKeys =
        {
            "Art/Monsters/Monster0",
            "Art/Monsters/Monster1",
            "Art/Pets/Pet1",
            "Art/Pets/Pet0"
        };

        private Animation player;
        private string idle, walk, run, attack, death, current;
        private readonly List<string> attacks = new List<string>();
        private float actionUntil;
        private bool dead;
        public int Variant { get; private set; }
        public bool HasModel { get; private set; }
        public string ArchetypeName { get; private set; }

        public static MonsterVisual Create(Transform parent, int variant)
        {
            variant = Mathf.Abs(variant) % ResourceKeys.Length;
            var host = new GameObject("Monster Art " + variant);
            host.transform.SetParent(parent, false);
            var visual = host.AddComponent<MonsterVisual>();
            visual.Variant = variant;
            visual.ArchetypeName = Archetype(variant);

            var prefab = Resources.Load<GameObject>(ResourceKeys[variant]);
            if (prefab)
            {
                var model = Instantiate(prefab, host.transform, false);
                visual.HasModel = true;
                visual.player = model.GetComponentInChildren<Animation>();
                visual.ConfigureAnimation();
            }
            else
            {
                // A primitive silhouette keeps old build workspaces playable
                // while the editor imports a newly downloaded FBX.
                visual.BuildFallbackSilhouette();
            }
            return visual;
        }

        public static string Archetype(int variant)
        {
            switch (Mathf.Abs(variant) % ResourceKeys.Length)
            {
                case 0: return "焰角小鬼";
                case 1: return "苔背地精";
                case 2: return "樱影灵狐";
                default: return "霜尾灵狼";
            }
        }

        public void Move(float speed)
        {
            if (dead || Time.time < actionUntil) return;
            string clip = speed > 2.3f ? run ?? walk ?? idle : speed > .1f ? walk ?? run ?? idle : idle;
            Play(clip, false);
            if (player && !string.IsNullOrEmpty(clip) && clip != idle)
                player[clip].speed = Mathf.Clamp(speed / (clip == run ? 3.5f : 1.8f), .7f, 1.5f);
        }

        public void Command()
        {
            if (dead) return;
            string clip = attacks.Count > 0 ? attacks[Mathf.Abs(GetInstanceID()) % attacks.Count] : attack ?? idle;
            actionUntil = Time.time + (player && !string.IsNullOrEmpty(clip) ? Mathf.Clamp(player[clip].length, .45f, 1.2f) : .7f);
            Play(clip, true);
        }

        public void Die()
        {
            if (dead) return;
            dead = true;
            actionUntil = float.PositiveInfinity;
            Play(death ?? idle, true);
        }

        public void Revive()
        {
            dead = false;
            actionUntil = 0;
            Play(idle, true);
        }

        private void ConfigureAnimation()
        {
            if (!player) return;
            foreach (AnimationState state in player)
            {
                string name = state.name.ToLowerInvariant();
                if (name.Contains("idle") && idle == null) idle = state.name;
                if (name.Contains("walk") && walk == null) walk = state.name;
                if ((name.Contains("run") || name.Contains("move")) && run == null) run = state.name;
                if (name.Contains("attack") || name.Contains("hit") || name.Contains("punch"))
                {
                    if (attack == null) attack = state.name;
                    attacks.Add(state.name);
                }
                if ((name.Contains("death") || name.Contains("die")) && death == null) death = state.name;
                state.wrapMode = name.Contains("idle") || name.Contains("walk") || name.Contains("run") || name.Contains("move")
                    ? WrapMode.Loop : WrapMode.ClampForever;
            }
            if (idle == null)
                foreach (AnimationState state in player) { idle = state.name; break; }
            Play(idle, true);
        }

        private void Play(string clip, bool restart)
        {
            if (!player || string.IsNullOrEmpty(clip) || !restart && current == clip) return;
            current = clip;
            if (restart) player[clip].time = 0;
            player[clip].speed = 1;
            player.CrossFade(clip, .12f);
        }

        private void BuildFallbackSilhouette()
        {
            HasModel = false;
            Color body = Variant == 0 ? new Color(1f, .27f, .12f) : Variant == 1 ? new Color(.22f, .54f, .3f) : Variant == 2 ? new Color(.42f, .66f, .9f) : new Color(1f, .43f, .67f);
            var material = new Material(Shader.Find("Standard")) { color = body };
            PrimitiveType shape = Variant < 2 ? PrimitiveType.Capsule : PrimitiveType.Sphere;
            var torso = GameObject.CreatePrimitive(shape);
            torso.name = "Monster fallback body";
            torso.transform.SetParent(transform, false);
            torso.transform.localPosition = Vector3.up * (Variant < 2 ? .7f : .55f);
            torso.transform.localScale = Variant < 2 ? new Vector3(.7f, .8f, .58f) : new Vector3(.85f, .62f, .65f);
            torso.GetComponent<Renderer>().sharedMaterial = material;
            Destroy(torso.GetComponent<Collider>());
            var crest = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            crest.name = "Monster fallback crest";
            crest.transform.SetParent(transform, false);
            crest.transform.localPosition = Vector3.up * (Variant < 2 ? 1.55f : 1.06f);
            crest.transform.localScale = Vector3.one * (Variant == 0 ? .34f : .27f);
            crest.GetComponent<Renderer>().sharedMaterial = material;
            Destroy(crest.GetComponent<Collider>());
            transform.localScale = Vector3.one * (Variant < 2 ? 1f : .9f);
        }
    }
}
