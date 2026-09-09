using System;
using System.Collections.Generic;
using UnityEngine;

namespace Lunhui
{
    public sealed class BossVisual : MonoBehaviour
    {
        private Animation player;
        private string idle, walk, run, death, current;
        private readonly List<string> attacks = new List<string>();
        private float actionUntil;
        private bool dead;
        public bool HasModel { get; private set; }
        public int Theme { get; private set; }
        public string ModelName { get; private set; }
        public int AnimationCount => player ? player.GetClipCount() : 0;

        public static BossVisual Create(Transform parent, int theme)
        {
            var host = new GameObject("Imported Boss " + theme);
            host.transform.SetParent(parent, false);
            var visual = host.AddComponent<BossVisual>();
            visual.Theme = Mathf.Clamp(theme, 1, 5);
            var prefab = Resources.Load<GameObject>("Art/Bosses/Boss" + visual.Theme);
            if (!prefab) return visual;
            var model = Instantiate(prefab, host.transform, false);
            visual.HasModel = true;
            visual.ModelName = prefab.name;
            visual.player = model.GetComponentInChildren<Animation>();
            if (visual.player)
            {
                foreach (AnimationState state in visual.player)
                {
                    string name = state.name.ToLowerInvariant();
                    if (name.Contains("idle") && visual.idle == null) visual.idle = state.name;
                    if (name.Contains("walk")) visual.walk = state.name;
                    if (name.Contains("run") || name.Contains("fast_flying")) visual.run = state.name;
                    if (name.Contains("death")) visual.death = state.name;
                    if (name.Contains("punch") || name.Contains("weapon") || name.Contains("headbutt") || name.Contains("attack"))
                        visual.attacks.Add(state.name);
                    state.wrapMode = name.Contains("idle") || name.Contains("walk") || name.Contains("run") || name.Contains("flying")
                        ? WrapMode.Loop : WrapMode.ClampForever;
                }
                visual.Play(visual.idle, false);
            }
            return visual;
        }

        public void Move(float speed)
        {
            if (dead || Time.time < actionUntil) return;
            string clip = speed > 2.5f ? run ?? walk ?? idle : speed > .1f ? walk ?? run ?? idle : idle;
            Play(clip, false);
            if (player && clip != null && clip != idle)
                player[clip].speed = Mathf.Clamp(speed / (clip == run ? 3.5f : 1.8f), .7f, 1.5f);
        }

        public void Attack(int style)
        {
            if (dead) return;
            string clip = attacks.Count > 0 ? attacks[Math.Abs(style % attacks.Count)] : idle;
            actionUntil = Time.time + (player && clip != null ? Mathf.Clamp(player[clip].length, .45f, 1.4f) : .7f);
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

        private void Play(string clip, bool restart)
        {
            if (!player || string.IsNullOrEmpty(clip) || !restart && current == clip) return;
            current = clip;
            if (restart) player[clip].time = 0;
            player[clip].speed = 1;
            player.CrossFade(clip, .14f);
        }
    }
}
