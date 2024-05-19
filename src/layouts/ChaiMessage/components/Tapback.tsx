import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useTouchHold } from "~/hooks/useTouchHold";
import { useOnClickOutside } from "usehooks-ts";

export type TapbackAction = {
  label: string;
  icon: React.ReactNode;
  className?: string;
  onPress:
    | ((...args: any[]) => any)
    | {
        callback: (...args: any[]) => any;
        immediate?: boolean;
      };
  hidden?: boolean;
};

export type TapbackProps<T extends React.ElementType> = {
  as: T;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  longPressDuration?: number;
  menuClassName?: string;
  actions?: TapbackAction[];
  transformOrigin?: "left" | "right";
};

export const Tapback = React.memo(
  <T extends React.ElementType>({ ..._props }: TapbackProps<T> & React.ComponentPropsWithoutRef<T>) => {
    // Cast to get autocomplete
    const {
      as,
      children,
      longPressDuration,
      isOpen,
      onOpenChange,
      transformOrigin = "left",
      menuClassName,
      actions,
      ...props
    } = _props as unknown as React.ComponentPropsWithoutRef<"div"> & TapbackProps<T>;
    const [shouldOffset, setShouldOffset] = useState<number | undefined>(undefined);
    const dropdownMenuRef = useRef<HTMLDivElement>(null);
    const elementRef = useRef<HTMLDivElement>(null);
    const [isDropdownAnimating, setIsDropdownAnimating] = useState(false);

    const Component: React.ElementType = as ?? "div";

    const recalculateOffset = useCallback(() => {
      if (!dropdownMenuRef.current) return;

      const child = dropdownMenuRef.current?.children?.[0] as HTMLDivElement | undefined;

      if (child) {
        const rect = child?.getBoundingClientRect();
        // if off screen, offset
        const top = rect?.top ?? 0;
        const height = child?.offsetHeight ?? 0;
        const windowHeight = window.innerHeight;

        const marginTop = 80;

        if (top + height + marginTop > windowHeight) {
          const offset = top - windowHeight + height + marginTop;
          setShouldOffset(offset);
        } else {
          setShouldOffset(undefined);
        }
      }
    }, []);

    useEffect(() => {
      if (isOpen) {
        setTimeout(recalculateOffset, 50);
      } else {
        setShouldOffset(undefined);
      }
    }, [isOpen, longPressDuration, recalculateOffset]);

    useEffect(() => {
      if (!elementRef.current) return;

      const transformProps: KeyframeAnimationOptions = {
        duration: 500,
        fill: "forwards",
        easing: "cubic-bezier(0.275, 0.485, 0.1, 1)",
      };

      if (shouldOffset) {
        elementRef.current.animate({ translate: `0 ${-shouldOffset}px` }, transformProps);
      } else {
        elementRef.current?.animate({ translate: "initial" }, transformProps);
      }
    }, [shouldOffset]);

    const onMenuOpen = useCallback(() => {
      /**
       * Remove user text selection if any
       */
      window.getSelection()?.removeAllRanges();

      onOpenChange?.(true);
    }, [onOpenChange]);

    const handleActionClick = useCallback((e: React.MouseEvent<HTMLDivElement>, action: TapbackAction) => {
      e.preventDefault();
      e.stopPropagation();

      if (typeof action.onPress === "function") {
        action.onPress(e);
      } else {
        if (action.onPress.immediate) {
          action.onPress.callback(e);
        } else {
          setTimeout(action.onPress.callback, 300);
        }
      }
    }, []);

    const onContextMenu: React.MouseEventHandler<HTMLDivElement> = useCallback(
      (e) => {
        // ignore on mobile because on mobile we use the long press
        // this is a hack, but it works
        if (window.innerWidth < 768) return;
        e.preventDefault();
        e.stopPropagation();

        onMenuOpen();
      },
      [onMenuOpen],
    );

    const longPressProps = useTouchHold(onMenuOpen, longPressDuration ?? 300);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (elementRef.current?.contains(e.target as Node) || dropdownMenuRef.current?.contains(e.target as Node)) {
          return;
        }

        if (isDropdownAnimating || !isOpen) return;
        onOpenChange?.(false);
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      } else {
        document.removeEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isDropdownAnimating, isOpen, onOpenChange]);

    return (
      <Component {...props} onContextMenu={onContextMenu} ref={elementRef} {...longPressProps}>
        {children}
        {/* Context menu (copy, etc.) */}
        <div ref={dropdownMenuRef} className={twMerge(isDropdownAnimating && "pointer-events-none select-none")}>
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                onAnimationStart={() => setIsDropdownAnimating(true)}
                onAnimationComplete={() => setIsDropdownAnimating(false)}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ ease: [0.165, 0.44, 0.14, 1], duration: 0.4 }}
                className={twMerge(
                  "[--bg:#1A1A1A]",
                  "absolute top-[100%] z-[100] mb-1 mt-1 flex min-w-[180px] flex-col divide-y divide-white/5 rounded-xl bg-[var(--bg)]  text-white backdrop-blur-xl",
                  transformOrigin === "left" && "left-0 [transform-origin:top_left]",
                  transformOrigin === "right" && "right-0 [transform-origin:top_right]",
                  menuClassName,
                )}
              >
                {actions?.map((action) => {
                  if (action.hidden === true) return null;

                  return (
                    <div
                      key={action.label}
                      className={twMerge(
                        "flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3",
                        action.className,
                      )}
                      onClick={(e) => handleActionClick?.(e, action)}
                    >
                      <span>{action.label}</span>
                      {action.icon}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Component>
    );
  },
);
