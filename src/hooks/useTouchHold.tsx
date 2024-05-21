import { useCallback, useEffect, useRef, useState } from "react";

/**
 * This hook is used to detect when the user is holding down a touch or mouse button.
 * It calculates the distance between the initial position and the current position of the touch or mouse event.
 * If the distance is lower than the threshold, the callback function is called.
 * This is to ensure that the user is actually holding down the spot, rather than using it as a pivot point to (slowly) scroll the screen.
 *
 * @param targetRef - The ref to the target element.
 * @param callback - The callback function to be called when the user is holding down the touch or mouse button.
 * @param duration - The duration in **milliseconds** for which the callback function should be called.
 * @param threshold - The maximum distance allowed for the touch or mouse movement.
 * @param enabled - Whether the touch hold functionality is enabled or not.
 */
export function useTouchHold({
  targetRef,
  callback,
  duration = 300,
  threshold = 5,
  enabled = true,
}: {
  targetRef: React.RefObject<HTMLElement>;
  callback: () => void;
  duration?: number;
  threshold?: number;
  enabled?: boolean;
}) {
  const touchHold = useRef(false);
  const timer = useRef<number | null>(null);
  const scaleTimer = useRef<number | null>(null);
  const initialPosition = useRef<{ x?: number; y?: number } | null>(null);
  const [contextMenuLastTime, setContextMenuLastTime] = useState<number | null>(null);
  const scaleAnimation = useRef<Animation | null>(null);

  const vibrate = useCallback(() => {
    window?.navigator?.vibrate?.(1);
  }, []);

  const resetScale = useCallback(() => {
    clearTimeout(scaleTimer.current!);
    if (scaleAnimation.current) {
      scaleAnimation.current.playbackRate = -1;
      scaleAnimation.current = null;
    }
  }, []);

  const isInput = useCallback((target: EventTarget | null) => {
    return (
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLButtonElement ||
      target instanceof HTMLOptionElement ||
      target instanceof HTMLFieldSetElement ||
      target instanceof HTMLFormElement ||
      target instanceof HTMLDataListElement
    );
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!enabled || isInput(e.target)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      touchHold.current = true;
      initialPosition.current = {
        x: "touches" in e ? e.touches[0]?.clientX : e.clientX,
        y: "touches" in e ? e.touches[0]?.clientY : e.clientY,
      };

      scaleTimer.current = window.setTimeout(() => {
        resetScale();

        scaleAnimation.current =
          targetRef.current?.animate(
            { transform: "scale(1.25)" },
            { duration: 800, easing: "ease-in-out", fill: "forwards", composite: "accumulate" },
          ) ?? null;
      }, 50);

      timer.current = window.setTimeout(() => {
        timer.current = null;

        if (touchHold.current && initialPosition.current) {
          const currentPosition = {
            x: "touches" in e ? e?.touches?.[0]?.clientX : e.clientX,
            y: "touches" in e ? e?.touches?.[0]?.clientY : e.clientY,
          };
          if (!currentPosition.x || !currentPosition.y || !initialPosition.current.x || !initialPosition.current.y)
            return;

          const distance = Math.sqrt(
            Math.pow(currentPosition.x - initialPosition.current.x, 2) +
              Math.pow(currentPosition.y - initialPosition.current.y, 2),
          );

          if (distance <= threshold) {
            vibrate();
            callback();
            setTimeout(resetScale, 100);
          }
        }
      }, duration);
    },
    [callback, duration, enabled, isInput, resetScale, targetRef, threshold, vibrate],
  );

  const reset = useCallback(() => {
    clearTimeout(timer.current!);
    clearTimeout(scaleTimer.current!);
    timer.current = null;
    touchHold.current = false;
    initialPosition.current = null;
    resetScale();
  }, [resetScale]);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      resetScale();

      if (!enabled || isInput(e.target)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (contextMenuLastTime && Date.now() - contextMenuLastTime < 100) {
        return;
      }

      if (timer.current) {
        const onClickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        });
        e.target?.dispatchEvent(onClickEvent);
      }

      reset();
    },
    [contextMenuLastTime, enabled, isInput, reset, resetScale],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!touchHold.current || !initialPosition.current) {
        return;
      }

      const currentPosition = {
        x: "touches" in e ? e.touches?.[0]?.clientX : e.clientX,
        y: "touches" in e ? e.touches?.[0]?.clientY : e.clientY,
      };

      if (!currentPosition.x || !currentPosition.y || !initialPosition.current.x || !initialPosition.current.y) return;

      const distance = Math.sqrt(
        Math.pow(currentPosition.x - initialPosition.current.x, 2) +
          Math.pow(currentPosition.y - initialPosition.current.y, 2),
      );

      if (distance > threshold) {
        reset();
      }
    },
    [reset, threshold],
  );

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || isInput(e.target)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setContextMenuLastTime(Date.now());

      if (window.innerWidth < 768) {
        return;
      }

      callback();
    },
    [callback, enabled, isInput],
  );

  useEffect(() => {
    document.addEventListener("touchmove", handleTouchMove, { capture: true });
    document.addEventListener("mousemove", handleTouchMove, { capture: true });

    return () => {
      reset();

      document.removeEventListener("touchmove", handleTouchMove, { capture: true });
      document.removeEventListener("mousemove", handleTouchMove, { capture: true });
    };
  }, [handleTouchMove, reset]);

  return {
    onTouchStart: handleTouchStart as unknown as React.TouchEventHandler,
    onMouseDown: handleTouchStart as unknown as React.MouseEventHandler,
    onTouchEnd: handleTouchEnd as React.TouchEventHandler,
    onMouseUp: handleTouchEnd as React.MouseEventHandler,
    onMouseLeave: reset,
    onContextMenu: onContextMenu,
  };
}
