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
};

export function useInView<T = HTMLDivElement>(ref?: React.RefObject<T>, options: IntersectionObserverInit = {}) {
  const newRef = useRef<T>(null);
  const [inView, setInView] = useState(false);
  ref ??= newRef;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) {
        setInView(entry.isIntersecting);
      }
    }, options);

    if (ref?.current instanceof Element) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [options, ref]);

  return [ref, inView] as const;
}
