import { useCallback, useEffect, useRef, useState } from "react";
import type { Corner, Point } from "./types";

const DRAG_THRESHOLD = 5;

interface UseDragOptions {
  disabled?: boolean;
  position: Corner;
  onPositionChange: (position: Corner) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

interface UseDragResult {
  ref: React.RefObject<HTMLDivElement | null>;
  isDragging: boolean;
}

export function useDrag({
  disabled,
  position,
  onPositionChange,
  onDragStart,
  onDragEnd,
}: UseDragOptions): UseDragResult {
  const ref = useRef<HTMLDivElement>(null);
  const stateRef = useRef<"idle" | "press" | "drag" | "animating">("idle");
  const originRef = useRef<Point>({ x: 0, y: 0 });
  const translationRef = useRef<Point>({ x: 0, y: 0 });
  const velocitiesRef = useRef<Array<{ position: Point; timestamp: number }>>(
    [],
  );
  const [isDragging, setIsDragging] = useState(false);

  const getCorners = useCallback((): Record<Corner, Point> => {
    const el = ref.current;
    if (!el) return {} as Record<Corner, Point>;

    const padding = 20;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    const [currentV, currentH] = position.split("-");
    const baseX =
      currentH === "right"
        ? window.innerWidth - scrollbarWidth - padding - width
        : padding;
    const baseY =
      currentV === "bottom" ? window.innerHeight - padding - height : padding;

    return {
      "top-left": {
        x: padding - baseX,
        y: padding - baseY,
      },
      "top-right": {
        x: window.innerWidth - scrollbarWidth - padding - width - baseX,
        y: padding - baseY,
      },
      "bottom-left": {
        x: padding - baseX,
        y: window.innerHeight - padding - height - baseY,
      },
      "bottom-right": {
        x: window.innerWidth - scrollbarWidth - padding - width - baseX,
        y: window.innerHeight - padding - height - baseY,
      },
    };
  }, [position]);

  const getNearestCorner = useCallback(
    (projected: Point): { corner: Corner; translation: Point } => {
      const corners = getCorners();
      let nearest: Corner = position;
      let minDistance = Number.POSITIVE_INFINITY;

      for (const [corner, point] of Object.entries(corners)) {
        const distance = Math.sqrt(
          (projected.x - point.x) ** 2 + (projected.y - point.y) ** 2,
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearest = corner as Corner;
        }
      }

      return { corner: nearest, translation: corners[nearest] };
    },
    [getCorners, position],
  );

  const calculateVelocity = useCallback((): Point => {
    const history = velocitiesRef.current;
    if (history.length < 2) return { x: 0, y: 0 };

    const oldest = history[0];
    const latest = history[history.length - 1];

    if (!oldest || !latest) return { x: 0, y: 0 };

    const timeDelta = latest.timestamp - oldest.timestamp;

    if (timeDelta === 0) return { x: 0, y: 0 };

    return {
      x: ((latest.position.x - oldest.position.x) / timeDelta) * 1000,
      y: ((latest.position.y - oldest.position.y) / timeDelta) * 1000,
    };
  }, []);

  const project = useCallback(
    (velocity: number, deceleration = 0.999): number => {
      return ((velocity / 1000) * deceleration) / (1 - deceleration);
    },
    [],
  );

  const animateToCorner = useCallback(
    (target: { corner: Corner; translation: Point }) => {
      const el = ref.current;
      if (!el) return;

      stateRef.current = "animating";

      const handleTransitionEnd = (e: TransitionEvent) => {
        if (e.propertyName === "translate") {
          el.style.transition = "";
          el.style.translate = "";
          translationRef.current = { x: 0, y: 0 };
          stateRef.current = "idle";
          onPositionChange(target.corner);
          el.removeEventListener("transitionend", handleTransitionEnd);
        }
      };

      el.style.transition = "translate 400ms var(--tt-timing-bounce)";
      el.addEventListener("transitionend", handleTransitionEnd);
      el.style.translate = `${target.translation.x}px ${target.translation.y}px`;
    },
    [onPositionChange],
  );

  useEffect(() => {
    if (disabled) return;

    const el = ref.current;
    if (!el) return;

    const root = el.closest("[data-tt-root]") as HTMLElement | null;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (stateRef.current === "animating") return;

      originRef.current = { x: e.clientX, y: e.clientY };
      stateRef.current = "press";
      velocitiesRef.current = [];

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    };

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - originRef.current.x;
      const dy = e.clientY - originRef.current.y;

      if (stateRef.current === "press") {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance >= DRAG_THRESHOLD) {
          stateRef.current = "drag";
          setIsDragging(true);
          root?.classList.add("tt-grabbing");
          onDragStart?.();
        }
      }

      if (stateRef.current !== "drag") return;

      translationRef.current = { x: dx, y: dy };
      el.style.translate = `${dx}px ${dy}px`;

      const now = Date.now();
      velocitiesRef.current = [
        ...velocitiesRef.current.slice(-5),
        { position: { x: e.clientX, y: e.clientY }, timestamp: now },
      ];
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      root?.classList.remove("tt-grabbing");

      if (stateRef.current === "drag") {
        const velocity = calculateVelocity();
        const projected = {
          x: translationRef.current.x + project(velocity.x),
          y: translationRef.current.y + project(velocity.y),
        };
        const nearest = getNearestCorner(projected);
        animateToCorner(nearest);
        onDragEnd?.();
        // Reset isDragging after animation completes (prevent click)
        setTimeout(() => setIsDragging(false), 450);
      } else {
        stateRef.current = "idle";
      }
    };

    el.addEventListener("pointerdown", onPointerDown);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [
    disabled,
    calculateVelocity,
    project,
    getNearestCorner,
    animateToCorner,
    onDragStart,
    onDragEnd,
  ]);

  return { ref, isDragging };
}

export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
  enabled: boolean,
) {
  // Store handler in ref to avoid re-subscribing on handler changes
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;

    const listener = (e: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      handlerRef.current();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handlerRef.current();
      }
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, enabled]);
}
