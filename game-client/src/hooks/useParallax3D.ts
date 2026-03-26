import { useRef, useEffect, useState } from 'react';

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
 * - sensitivity: 每像素对应旋转角度
 * - maxAngle: 最大旋转角 (deg)
 * - maxShift: 最大水平位移 (px)
 * - returnSpeed: 回弹阻尼 (0-1)
 */
export function useParallax3D(
  containerRef: React.RefObject<HTMLElement | null>,
  { sensitivity = 0.3, maxAngle = 25, maxShift = 30, returnSpeed = 0.04 } = {},
) {
  const [state, setState] = useState<Parallax3DState>(INITIAL);
  const angle = useRef(0);       // 当前目标角度
  const smoothed = useRef(0);    // 平滑后的角度
  const dragging = useRef(false);
  const lastX = useRef(0);
  const rafId = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
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

    // Pointer events (mouse + touch unified)
    const pointerDown = (e: PointerEvent) => { console.log('[Parallax] pointerDown', e.clientX); el.setPointerCapture(e.pointerId); onDown(e.clientX); };
    const pointerMove = (e: PointerEvent) => { console.log('[Parallax] pointerMove', e.clientX); onMove(e.clientX); };
    const pointerUp = (e: PointerEvent) => { console.log('[Parallax] pointerUp'); el.releasePointerCapture(e.pointerId); onUp(); };

    el.addEventListener('pointerdown', pointerDown);
    el.addEventListener('pointermove', pointerMove);
    el.addEventListener('pointerup', pointerUp);
    el.addEventListener('pointercancel', pointerUp);

    // 阻止触摸滑动引起页面滚动
    const preventScroll = (e: TouchEvent) => {
      if (dragging.current) e.preventDefault();
    };
    el.addEventListener('touchmove', preventScroll, { passive: false });

    const tick = () => {
      // 未拖拽时缓慢回弹到 0
      if (!dragging.current) {
        angle.current += (0 - angle.current) * returnSpeed;
      }
      // 平滑插值
      smoothed.current += (angle.current - smoothed.current) * 0.12;

      const ry = smoothed.current;
      const norm = Math.abs(ry) / maxAngle; // 0~1
      setState({
        rotateY: ry,
        rotateX: -ry * 0.08,  // 轻微纵向联动
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
  }, [containerRef, sensitivity, maxAngle, maxShift, returnSpeed]);

  return state;
}
