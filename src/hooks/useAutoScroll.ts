import { useEffect, useRef } from "react";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const useAutoScroll = (scrollerRef: React.RefObject<HTMLDivElement>, messages: any[], isSticky: boolean) => {
  const animationRef = useRef<{
    startTime: number | null;
    previousTargetScrollTop: number | null;
  }>({
    startTime: null,
    previousTargetScrollTop: null,
  });
  const isTouching = useRef(false);

  useEffect(() => {
    let animationFrameId: number;

    const handleTouchStart = () => {
      isTouching.current = true;
    };

    const handleTouchEnd = () => {
      isTouching.current = false;
    };

    const scrollToBottom = (timestamp: number) => {
      if (!scrollerRef.current || isTouching.current) return;

      const { startTime, previousTargetScrollTop } = animationRef.current;
      const currentScrollTop = scrollerRef.current.scrollTop;
      const scrollHeight = scrollerRef.current.scrollHeight;
      const clientHeight = scrollerRef.current.clientHeight;
      const targetScrollTop = scrollHeight - clientHeight;

      if (!startTime || previousTargetScrollTop !== targetScrollTop) {
        animationRef.current.startTime = timestamp;
        animationRef.current.previousTargetScrollTop = targetScrollTop;
      }

      const elapsed = timestamp - animationRef.current.startTime!;
      const duration = 700; // Duration of the animation in milliseconds
      const progress = Math.min(elapsed / duration, 1);

      const newScrollTop = lerp(currentScrollTop, targetScrollTop, progress);

      scrollerRef.current.scrollTop = newScrollTop;

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(scrollToBottom);
      } else {
        // Ensure we end up exactly at the bottom
        scrollerRef.current.scrollTop = targetScrollTop;
      }
    };

    if (isSticky) {
      requestAnimationFrame(scrollToBottom);
    }

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isSticky, scrollerRef, messages]);
};
