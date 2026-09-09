using UnityEngine;

namespace Lunhui
{
    /// <summary>
    /// Small, rate-limited haptic cues for touch controls. Handheld.Vibrate is a
    /// no-op on platforms without a vibration device, so the prototype stays
    /// playable in the editor and on tablets without haptic hardware.
    /// </summary>
    public static class MobileFeedback
    {
        private static float nextPulse;

        public static void Action(string action)
        {
            // Basic attack can be tapped repeatedly; keep haptics subtle and
            // avoid queuing a vibration for every frame of a rapid tap stream.
            float now = Time.unscaledTime;
            float interval = action == "attack" ? 0.12f : 0.07f;
            if (now < nextPulse) return;
            nextPulse = now + interval;

#if UNITY_ANDROID && !UNITY_EDITOR
            Handheld.Vibrate();
#endif
        }
    }
}
