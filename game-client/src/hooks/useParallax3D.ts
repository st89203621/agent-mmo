import { useRef, useEffect, useState, useCallback } from 'react';

export interface Parallax3DState {
  rotateY: number;
  rotateX: number;
  translateX: number;
  /** 0~1 归一化旋转强度，用于光影联动 */
  intensity: number;
}

const INITIAL: Parallax3DState = { rotateY: 0, rotateX: 0, translateX: 0, intensity: 0 };

/**
 * 拖拽旋转式3D视差：
 * - 左右滑动/拖拽累积旋转角度，松手后缓慢回弹
 * - 返回 [state, callbackRef]，将 callbackRef 绑定到目标元素
 */
export function useParallax3D(
  { sensitivity = 0.3, maxAngle = 25, maxShift = 30, returnSpeed = 0.04 } = {},
): [Parallax3DState, (node: HTMLElement | null) => void] {
  const [state, setState] = useState<Parallax3DState>(INITIAL);
  const [el, setEl] = useState<HTMLElement | null>(null);
  const angle = useRef(0);
  const smoothed = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const rafId = useRef(0);

  const ref = useCallback((node: HTMLElement | null) => setEl(node), []);

  useEffect(() => {
    if (!el) return;

    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

    const onDown = (x: number) => {
      dragging.current = true;
      lastX.current = x;
    };

    const onMove = (x: number) => {
      if (!dragging.current) return;
      const dx = x - lastX.current;
      lastX.current = x;
      angle.current = clamp(angle.current + dx * sensitivity, -maxAngle, maxAngle);
    };

    const onUp = () => { dragging.current = false; };

    const pointerDown = (e: PointerEvent) => { el.setPointerCapture(e.pointerId); onDown(e.clientX); };
    const pointerMove = (e: PointerEvent) => onMove(e.clientX);
    const pointerUp = (e: PointerEvent) => { el.releasePointerCapture(e.pointerId); onUp(); };

    el.addEventListener('pointerdown', pointerDown);
    el.addEventListener('pointermove', pointerMove);
    el.addEventListener('pointerup', pointerUp);
    el.addEventListener('pointercancel', pointerUp);

    const preventScroll = (e: TouchEvent) => {
      if (dragging.current) e.preventDefault();
    };
    el.addEventListener('touchmove', preventScroll, { passive: false });

    const tick = () => {
      if (!dragging.current) {
        angle.current += (0 - angle.current) * returnSpeed;
      }
      smoothed.current += (angle.current - smoothed.current) * 0.12;

      const ry = smoothed.current;
      const norm = Math.abs(ry) / maxAngle;
      setState({
        rotateY: ry,
        rotateX: -ry * 0.08,
        translateX: (ry / maxAngle) * maxShift,
        intensity: norm,
      });
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId.current);
      el.removeEventListener('pointerdown', pointerDown);
      el.removeEventListener('pointermove', pointerMove);
      el.removeEventListener('pointerup', pointerUp);
      el.removeEventListener('pointercancel', pointerUp);
      el.removeEventListener('touchmove', preventScroll);
    };
  }, [el, sensitivity, maxAngle, maxShift, returnSpeed]);

  return [state, ref];
}
