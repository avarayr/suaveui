/**
 * Cross compatible touch and hold hook (iOS, Android, Windows, supports touch and mouse)
 * If finger/mouse is held down for a certain duration, the callback is called only if the finger/mouse is still held down on that element
 */

import { useEffect, useRef } from "react";

export function useTouchHold(callback: () => void, duration = 300) {
  /**
   * This function will return several functions that will be used to handle the touch events,
   * namely touchstart, touchend, touchcancel, mousedown, mouseup, and mouseleave.
   */

  const touchHold = useRef(false);
  const timer = useRef<number | null>(null);

  function handleTouchStart() {
    touchHold.current = true;
    timer.current = window.setTimeout(() => {
      callback();
    }, duration);
  }

  function handleTouchEnd(e: TouchEvent | MouseEvent) {
    clearTimeout(timer.current!);
    touchHold.current = false;
  }

  function handleTouchMove(e: TouchEvent | MouseEvent) {
    // check if the touch is still on the element
    if (!touchHold.current) {
      return;
    }

    const target = e.target as HTMLElement | null;
    const rect = target?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    // check if the touch is within the element
    if (
      e instanceof TouchEvent &&
      e.touches?.[0]?.clientX &&
      e.touches?.[0]?.clientY &&
      (e.touches?.[0]?.clientX < rect.left ||
        e.touches?.[0]?.clientX > rect.right ||
        e.touches?.[0]?.clientY < rect.top ||
        e.touches?.[0]?.clientY > rect.bottom)
    ) {
      clearTimeout(timer.current!);
      touchHold.current = false;
      return;
    }

    if (
      e instanceof MouseEvent &&
      (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)
    ) {
      clearTimeout(timer.current!);
      touchHold.current = false;

      return;
    }
  }

  useEffect(() => {
    // Add a mousemove/tochmove event listener to the entire document to detect if the user moves their finger/mouse off the element,
    // if they do, the touchhold is cancelled
    document.addEventListener("touchmove", handleTouchMove, { capture: true });
    document.addEventListener("mousemove", handleTouchMove, { capture: true });

    return () => {
      clearTimeout(timer.current!);
      document.removeEventListener("touchmove", handleTouchMove, { capture: true });
      document.removeEventListener("mousemove", handleTouchMove, { capture: true });
    };
  }, []);

  return {
    onTouchStart: handleTouchStart as React.TouchEventHandler,
    onTouchEnd: handleTouchEnd as unknown as React.TouchEventHandler,
    onMouseDown: handleTouchStart as React.MouseEventHandler,
    onMouseUp: handleTouchEnd as unknown as React.MouseEventHandler,
    onMouseLeave: handleTouchEnd as unknown as React.MouseEventHandler,
  };
}
