import { easeOut } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";
import { useDebounceCallback } from "usehooks-ts";

export const useAutoScroll = (scrollerRef: React.RefObject<HTMLDivElement>, messages: any[], isSticky: boolean) => {
  const animationRef = useRef<{
    startTime: number | null;
    previousTargetScrollTop: number | null;
  }>({
    startTime: null,
    previousTargetScrollTop: null,
  });
  const isTouching = useRef(false);
  const wheelTimeout = useRef<number | null>(null);

  const scrollToBottom = useCallback(
    (timestamp: number) => {
      if (!scrollerRef.current || isTouching.current) return;

      const { startTime, previousTargetScrollTop } = animationRef.current;
      const currentScrollTop = scrollerRef.current.scrollTop;
      const scrollHeight = scrollerRef.current.scrollHeight;
      const clientHeight = scrollerRef.current.clientHeight;
      const targetScrollTop = scrollHeight - clientHeight;

      console.log("Scrolling to bottom", { currentScrollTop, targetScrollTop, previousTargetScrollTop });
      if (previousTargetScrollTop) {
        if (previousTargetScrollTop > targetScrollTop) {
          console.log("Scrolling up, stopping animation", { previousTargetScrollTop, targetScrollTop });
          animationRef.current.startTime = null;
          animationRef.current.previousTargetScrollTop = null;
          return;
        }
      }
      if (!startTime || previousTargetScrollTop !== targetScrollTop) {
        animationRef.current.startTime = timestamp;
        animationRef.current.previousTargetScrollTop = targetScrollTop;
      }

      const elapsed = timestamp - animationRef.current.startTime!;
      const duration = 2000; // Duration of the animation in milliseconds
      const progress = Math.min(elapsed / duration, 0.5);
      const easingProgress = easeOut(progress);
      const difference = targetScrollTop - currentScrollTop;

      const newScrollTop = currentScrollTop + difference * easingProgress;

      scrollerRef.current.scrollTop = newScrollTop;

      if (progress < 1 && difference > 5) {
        requestAnimationFrame(scrollToBottom);
      }
    },
    [scrollerRef],
  );

  const debouncedScrollToBottom = useDebounceCallback(scrollToBottom, 10);

  useEffect(() => {
    let animationFrameId: number;

    if (isSticky) {
      animationFrameId = requestAnimationFrame(debouncedScrollToBottom);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSticky, scrollerRef, messages, scrollToBottom, debouncedScrollToBottom]);

  useEffect(() => {
    const handleTouchStart = () => {
      isTouching.current = true;
    };

    const handleTouchEnd = () => {
      isTouching.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        if (wheelTimeout.current) clearTimeout(wheelTimeout.current);

        isTouching.current = true;
        wheelTimeout.current = window.setTimeout(() => {
          isTouching.current = false;
        }, 1000);
      }
    };

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);

    document.addEventListener("wheel", handleWheel);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);
};
