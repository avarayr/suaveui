import { easeOut } from "framer-motion";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { VListHandle, Virtualizer } from "virtua";

export const useAutoScroll = ({
  scrollerRef,
  scrollContainerRef,
  messages,
}: {
  scrollerRef: React.RefObject<VListHandle>;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  messages: any[];
}) => {
  const animationRef = useRef<{
    startTime: number | null;
    previousTargetScrollTop: number | null;
  }>({
    startTime: null,
    previousTargetScrollTop: null,
  });

  const [isSticky, setIsSticky] = useState(true);
  const isTouching = useRef(false);
  const wheelTimeout = useRef<number | null>(null);
  const initialLoad = useRef(false);

  /**
   * On initial load of messages, scroll to the bottom of the chat (when messages are available)
   */
  useEffect(() => {
    if (!initialLoad.current && messages.length > 0) {
      scrollerRef.current?.scrollToIndex(Infinity, { smooth: false, align: "end", offset: 100 });
      initialLoad.current = true;
    }
  }, [messages, scrollerRef]);

  const scrollToBottom = useCallback(
    (timestamp: number) => {
      if (!scrollerRef.current || isTouching.current || !isSticky || !initialLoad.current) return;

      const { startTime, previousTargetScrollTop } = animationRef.current;
      const currentScrollTop = scrollerRef.current.scrollOffset;
      const scrollHeight = scrollerRef.current.scrollSize - scrollerRef.current.viewportSize;

      const targetScrollTop = scrollHeight;

      if (!startTime || previousTargetScrollTop !== targetScrollTop) {
        animationRef.current.startTime = timestamp;
        animationRef.current.previousTargetScrollTop = targetScrollTop;
      }

      const elapsed = timestamp - animationRef.current.startTime!;
      const duration = 1200; // Duration of the animation in milliseconds
      const progress = Math.min(elapsed / duration, 1);
      const easingProgress = easeOut(progress);
      const difference = targetScrollTop - currentScrollTop;

      const newScrollTop = currentScrollTop + difference * easingProgress;

      scrollerRef.current.scrollTo(newScrollTop);

      if (progress < 1 || difference > 5) {
        requestAnimationFrame(scrollToBottom);
      }
    },
    [isSticky, scrollerRef],
  );

  useEffect(() => {
    let animationFrameId: number;

    if (isSticky) {
      animationFrameId = requestAnimationFrame(scrollToBottom);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSticky, scrollerRef, messages, scrollToBottom]);

  const handleResize = useCallback(() => {
    if (isSticky) {
      scrollerRef.current?.scrollTo(scrollerRef.current.scrollSize);
    }
  }, [isSticky, scrollerRef]);

  useEffect(() => {
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize, scrollerRef]);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollerRef.current) {
        const currentScrollTop = scrollerRef.current.scrollOffset;
        const scrollHeight = scrollerRef.current.scrollSize - scrollerRef.current.viewportSize;

        // Calculate the distance from the bottom
        const distanceFromBottom = scrollHeight - currentScrollTop;

        // If the user is close enough to the bottom, enable sticky scroll
        const shouldSticky = distanceFromBottom <= 5;

        setIsSticky(shouldSticky);
      }
    };

    const handleTouchStart = () => {
      isTouching.current = true;
      handleScroll();
    };

    const handleTouchEnd = () => {
      isTouching.current = false;
      handleScroll();
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        if (wheelTimeout.current) clearTimeout(wheelTimeout.current);

        isTouching.current = true;
        wheelTimeout.current = window.setTimeout(() => {
          isTouching.current = false;
        }, 300);
      }
      handleScroll();
    };

    // Attach the event listeners
    const scroller = scrollContainerRef.current;
    if (scroller) {
      scroller.addEventListener("wheel", handleWheel);
      scroller.addEventListener("touchstart", handleTouchStart);
      scroller.addEventListener("touchend", handleTouchEnd);
      scroller.addEventListener("touchcancel", handleTouchEnd);
    }

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("wheel", handleWheel);

    return () => {
      // Remove the event listeners when component unmounts
      scroller?.removeEventListener("wheel", handleWheel);
      scroller?.removeEventListener("touchstart", handleTouchStart);
      scroller?.removeEventListener("touchend", handleTouchEnd);
      scroller?.removeEventListener("touchcancel", handleTouchEnd);

      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("wheel", handleWheel);
    };
  }, [scrollContainerRef, scrollerRef]);

  const onJumpToBottom = useCallback(() => {
    setIsSticky(true);
    isTouching.current = false;
    scrollToBottom(performance.now());
  }, [scrollToBottom]);

  const JumpToBottomButton = useCallback(
    (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
      return (
        <button
          {...props}
          className={twMerge(
            "fixed bottom-16 left-0 right-0 z-[10000] mx-auto flex size-8 items-center justify-center rounded-full bg-black/90 shadow-xl ring-1 ring-white/10",
            props.className,
            isSticky && "hidden",
          )}
          onClick={onJumpToBottom}
        />
      );
    },
    [onJumpToBottom, isSticky],
  );

  return {
    JumpToBottomButton,
    jumpToBottom: onJumpToBottom,
  };
};
