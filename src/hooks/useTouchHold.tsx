import { useCallback, useEffect, useRef } from "react";

/**
 * This hook is used to detect when the user is holding down a touch or mouse button.
 * It calculates the distance between the initial position and the current position of the touch or mouse event.
 * If the distance is lower than the threshold, the callback function is called.
 * This is to ensure that the user is actually holding down the spot, rather than using it as a pivot point to (slowly) scroll the screen.
 *
 * @param callback - The callback function to be called when the user is holding down the touch or mouse button.
 * @param duration - The duration in **milliseconds** for which the callback function should be called.
 */
export function useTouchHold(callback: () => void, duration = 300, threshold = 5) {
  const touchHold = useRef(false);
  const timer = useRef<number | null>(null);
  const initialPosition = useRef<{ x?: number; y?: number } | null>(null);

  const vibrate = useCallback(() => {
    try {
      window?.navigator?.vibrate?.([1]);
    } catch (e) {
      /* ignore */
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent | MouseEvent) => {
      touchHold.current = true;
      initialPosition.current = {
        x: "touches" in e ? e?.touches?.[0]?.clientX : e.clientX,
        y: "touches" in e ? e?.touches?.[0]?.clientY : e.clientY,
      };

      timer.current = window.setTimeout(() => {
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
          }
        }
      }, duration);
    },
    [callback, duration, threshold, vibrate],
  );

  const handleTouchEnd = useCallback(() => {
    clearTimeout(timer.current!);
    touchHold.current = false;
    initialPosition.current = null;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent | MouseEvent) => {
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
    [threshold],
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
    onMouseLeave: handleTouchEnd as unknown as React.MouseEventHandler,
  };
}
