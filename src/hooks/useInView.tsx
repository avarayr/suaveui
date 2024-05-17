import { useState, useRef, useEffect } from "react";

type IntersectionObserverInit = {
  /**
   * The element that is used as the viewport for checking visiblity of the target. Must be the ancestor of the target. Defaults to the browser viewport if not specified or if null.
   */
  root?: HTMLElement | null;
  /**
   * Margin around the root. Can have values similar to the CSS margin property, e.g. "10px 20px 30px 40px" (top, right, bottom, left).
   */
  rootMargin?: string;
  /**
   * The percentage of the target's visibility the observer's
   */
  threshold?: number | number[];

  timeout?: number;
};

export function useInView<T = HTMLDivElement>(ref?: React.RefObject<T>, options: IntersectionObserverInit = {}) {
  const newRef = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const timeoutRef = useRef<Timer | null>(null);
  ref ??= newRef;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) {
        if (entry.isIntersecting) {
          if (options.timeout) {
            timeoutRef.current = setTimeout(() => {
              setInView(true);
            }, options.timeout);
          } else {
            setInView(true);
          }
        } else {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setInView(false);
        }
      }
    }, options);

    if (ref?.current instanceof Element) {
      observer.observe(ref.current);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      observer.disconnect();
    };
  }, [options, ref]);

  return [ref, inView] as const;
}
