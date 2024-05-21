import { useCallback, useEffect, useRef, useState } from "react";

/**
 * This hook is used to detect when the user is holding down a touch or mouse button.
 * It calculates the distance between the initial position and the current position of the touch or mouse event.
 * If the distance is lower than the threshold, the callback function is called.
 * This is to ensure that the user is actually holding down the spot, rather than using it as a pivot point to (slowly) scroll the screen.
 *
 * @param callback - The callback function to be called when the user is holding down the touch or mouse button.
 * @param duration - The duration in **milliseconds** for which the callback function should be called.
 */
export function useTouchHold({
  callback,
  duration = 300,
  threshold = 5,
  enabled = true,
}: {
  callback: () => void;
  duration?: number;
  threshold?: number;
  enabled?: boolean;
}) {
  const touchHold = useRef(false);
  const timer = useRef<number | null>(null);
  const initialPosition = useRef<{ x?: number; y?: number } | null>(null);
  const [contextMenuLastTime, setContextMenuLastTime] = useState<number | null>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!enabled) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      touchHold.current = true;
      initialPosition.current = {
        x: "touches" in e ? e?.touches?.[0]?.clientX : e.clientX,
        y: "touches" in e ? e?.touches?.[0]?.clientY : e.clientY,
      };

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
            callback();
          }
        }
      }, duration);
    },
    [callback, duration, enabled, threshold],
  );

  const reset = useCallback(() => {
    clearTimeout(timer.current!);
    timer.current = null;
    touchHold.current = false;
    initialPosition.current = null;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!enabled) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (contextMenuLastTime && Date.now() - contextMenuLastTime < 100) {
        return;
      }

      // if the user lifted before the timeout executes, trigger an onClick event
      if (timer.current) {
        const onClickEvent = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        });
        e.target?.dispatchEvent(onClickEvent);
      }

      reset();
    },
    [contextMenuLastTime, enabled, reset],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!enabled) {
        return;
      }

      if (!touchHold.current || !initialPosition.current) {
        return;
      }

      const currentPosition = {
        x: "touches" in e ? e?.touches?.[0]?.clientX : e.clientX,
        y: "touches" in e ? e?.touches?.[0]?.clientY : e.clientY,
      };

      if (!currentPosition.x || !currentPosition.y || !initialPosition.current.x || !initialPosition.current.y) return;

      const distance = Math.sqrt(
        Math.pow(currentPosition.x - initialPosition.current.x, 2) +
          Math.pow(currentPosition.y - initialPosition.current.y, 2),
      );
      if (distance > threshold) {
        clearTimeout(timer.current!);
        touchHold.current = false;
        initialPosition.current = null;
      }
    },
    [enabled, threshold],
  );

  const onContextMenu: React.MouseEventHandler = useCallback(
    (e) => {
      if (!enabled) {
        return;
      }

      // ignore on mobile because on mobile we use the long press
      // this is a hack, but it works
      e.preventDefault();
      e.stopPropagation();
      setContextMenuLastTime(Date.now());

      if (window.innerWidth < 768) return;
      callback();
    },
    [callback, enabled],
  );

  useEffect(() => {
    document.addEventListener("touchmove", handleTouchMove, { capture: true });
    document.addEventListener("mousemove", handleTouchMove, { capture: true });

    return () => {
      clearTimeout(timer.current!);
      document.removeEventListener("touchmove", handleTouchMove, { capture: true });
      document.removeEventListener("mousemove", handleTouchMove, { capture: true });
    };
  }, [handleTouchMove]);

  return {
    onTouchStart: handleTouchStart as unknown as React.TouchEventHandler,
    onTouchEnd: handleTouchEnd as unknown as React.TouchEventHandler,
    onMouseDown: handleTouchStart as unknown as React.MouseEventHandler,
    onMouseUp: handleTouchEnd as unknown as React.MouseEventHandler,
    onMouseLeave: reset,
    onContextMenu: onContextMenu,
  };
}
