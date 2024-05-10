import { motion } from "framer-motion";
import { debounce } from "lodash";
import { forwardRef, useCallback, useLayoutEffect, useRef } from "react";
type ExpandingTextareaProps = React.ComponentPropsWithoutRef<typeof motion.textarea> & {
  maxRows?: number;
};
export const ExpandingTextarea = forwardRef<HTMLTextAreaElement, ExpandingTextareaProps>(
  ({ children, maxRows = 14, ...props }, ref: React.ForwardedRef<HTMLTextAreaElement>) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const resolvedRef = (ref as React.RefObject<HTMLTextAreaElement>) || textareaRef;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const resizeTextarea = useCallback(() => {
      if (!resolvedRef.current) return;

      const { current } = resolvedRef;

      current.style.height = "auto";
      current.style.height = `${Math.min(
        current.scrollHeight,
        maxRows * parseFloat(getComputedStyle(current).lineHeight),
      )}px`;
    }, [maxRows, resolvedRef]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedResizeTextarea = useCallback(debounce(resizeTextarea, 100), [resizeTextarea]);

    useLayoutEffect(() => {
      resizeTextarea();
    }, [maxRows, resizeTextarea, props.value, children]);

    return (
      <motion.textarea
        {...props}
        ref={resolvedRef}
        autoComplete="off"
        onInput={(e) => {
          debouncedResizeTextarea();
          props.onInput?.(e);
        }}
      />
    );
  },
);