import { useMutation } from "@tanstack/react-query";
import { useLongPress } from "@uidotdev/usehooks";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Files, RotateCcw, ShipWheel, Trash } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useInView } from "~/hooks/useInView";
import type { Reaction as TReaction } from "~/layouts/types";
import { Reaction } from "./reactions/Reaction";
import { SpoilerParticles } from "./SpoilerParticles";
export type TapbackAction = {
  label: string;
  icon: React.ReactNode;
  className?: string;
  onPress: (e: React.MouseEvent<HTMLDivElement>) => any;
  visible?: boolean;
};

export type Reaction = {
  id: TReaction["type"];
  icon: (props: React.ComponentProps<typeof motion.svg>) => JSX.Element;
};

export const ChatBubble = React.memo(
  ({
    from,
    text,
    tail,
    layoutId,
    typing,
    reactions,
    onDelete,
    onSteer,
    onReact,
    onRegenerate,
  }: {
    from: "me" | "them";
    text: string;
    tail?: boolean;
    layoutId: string;
    typing?: boolean;
    reactions?: TReaction[] | null;
    onSteer: () => Promise<void>;
    onRegenerate: () => Promise<void>;
    onReact: (reaction: TReaction["type"]) => Promise<void>;
    onDelete?: () => void;
  }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isReactionsOpen, setIsReactionsOpen] = useState(false);
    const [isBackdropAnimating, setIsBackdropAnimating] = useState(false);
    const [shouldOffset, setShouldOffset] = useState<number | undefined>(undefined);

    const dropdownMenuRef = useRef<HTMLDivElement>(null);
    const [ref, inView] = useInView(undefined);
    const animator = useAnimationControls();

    const steerMutation = useMutation({
      mutationFn: onSteer,
    });

    const regenerateMutation = useMutation({
      mutationFn: onRegenerate,
    });

    const reactMutation = useMutation({
      mutationFn: onReact,
    });

    const onTapBack = useCallback(() => {
      /**
       * Remove user text selection if any
       */
      window.getSelection()?.removeAllRanges();

      setIsFocused(true);
      setIsReactionsOpen(true);

      requestIdleCallback(() => {
        if (dropdownMenuRef.current?.children?.[0]) {
          const rect = (dropdownMenuRef.current?.children?.[0] as HTMLDivElement)?.getBoundingClientRect();
          // if off screen, offset
          const top = rect?.top ?? 0;
          const height = (dropdownMenuRef.current?.children?.[0] as HTMLDivElement)?.offsetHeight ?? 0;
          const windowHeight = window.innerHeight;

          if (top + height > windowHeight) {
            const offset = top - windowHeight + height + 20;
            setShouldOffset(offset);
          } else {
            setShouldOffset(undefined);
          }
        }
      });
    }, []);

    const onTapBackDismiss = useCallback(() => {
      setShouldOffset(undefined);
      setIsBackdropAnimating(true);
      setIsFocused(false);
      setIsReactionsOpen(false);
    }, []);

    const reactionsSymbols = useMemo(() => {
      return [
        { id: "heart", icon: Reaction.Heart },
        { id: "thumbs-up", icon: Reaction.ThumbsUp },
        { id: "thumbs-down", icon: Reaction.ThumbsDown },
        { id: "haha", icon: Reaction.Haha },
        { id: "exclamation", icon: Reaction.Exclamation },
        { id: "question", icon: Reaction.Question },
      ] as const satisfies Array<Reaction>;
    }, []);

    const onCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        console.error(e);
      }

      onTapBackDismiss();
    }, [onTapBackDismiss, text]);

    const reactToMessage = useCallback(async (reaction: TReaction["type"]) => {
      reactMutation.mutate(reaction);
      setTimeout(onTapBackDismiss, 700);
    }, []);

    useEffect(() => {
      if (inView) {
        void animator.start({
          y: 0,
          opacity: 1,
          transition: { duration: 0.3, ease: "easeInOut" },
        });
      } else {
        void animator.start({
          y: 15,
          opacity: 0.6,
          transition: { duration: 0.3, ease: "easeInOut" },
        });
      }
    }, [animator, inView]);

    useEffect(() => {
      void animator.start({ y: 0, opacity: 1 });
    }, [animator]);

    const tapbackActions = useMemo<TapbackAction[]>(() => {
      const beforeAction = (callback?: () => any) => {
        return (e: React.MouseEvent<HTMLDivElement>) => {
          e.preventDefault();
          e.stopPropagation();

          onTapBackDismiss();
          setTimeout(() => {
            void callback?.();
          }, 100);
        };
      };

      return [
        {
          label: "Copy",
          icon: <Files className="size-5" />,
          onPress: beforeAction(onCopy),
        },
        {
          label: "Steer",
          icon: <ShipWheel className="size-5" />,
          onPress: beforeAction(steerMutation.mutate),
        },
        {
          label: "Regenerate",
          icon: <RotateCcw className="size-5" />,
          onPress: beforeAction(regenerateMutation.mutate),
        },
        {
          label: "Delete",
          icon: <Trash className="size-5" />,
          onPress: beforeAction(onDelete),
          className: "text-red-500",
        },
      ];
    }, [onCopy, onDelete, onTapBackDismiss, steerMutation.mutate]);

    const longPressProps = useLongPress(onTapBack);

    const isRefreshing = useMemo(() => {
      return regenerateMutation.isPending || steerMutation.isPending;
    }, [regenerateMutation.isPending, steerMutation.isPending]);

    return (
      <>
        {/* Focus backdrop */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              onTouchStart={onTapBackDismiss}
              onMouseDown={onTapBackDismiss}
              className="fixed left-0 top-0 z-[99] h-dvh w-dvw bg-black/50 backdrop-blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              // animation start and end
              onAnimationStart={() => setIsBackdropAnimating(true)}
              onAnimationComplete={() => setIsBackdropAnimating(false)}
            ></motion.div>
          )}
        </AnimatePresence>

        <motion.div
          ref={ref}
          whileTap={{
            scale: 1.02,
            filter: "drop-shadow(0px 0px 10px rgba(0, 0, 0, 0.5))",
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            onTapBack?.();
          }}
          layout
          layoutId={layoutId}
          initial={{ y: 15, opacity: 0.6 }}
          animate={animator}
          className={twMerge(
            `will-change-transform [--h:3px] [--w:3px]`,
            `[--them-bg:linear-gradient(to_bottom,#343435,#343435)]`,
            `[--me-bg:linear-gradient(to_bottom,#137BFF,#117BFF)]`,
            `relative max-w-[255px] select-none list-none whitespace-pre-wrap break-words rounded-[18px] px-[calc(var(--w)*4)] py-[calc(var(--h)*2)] [-webkit-user-select:none]
      before:absolute before:bottom-0 before:h-[calc(var(--h)*5)]
      before:w-[calc(var(--h)*4)] before:transition-opacity before:content-[''] after:absolute
      after:bottom-0 after:h-[30px] after:w-[24px] after:bg-black
      after:transition-opacity after:content-['']
      `,
            from === "them" &&
              `chat-bubble-them self-start text-white [background:var(--them-bg)] 
      before:left-[-5px] before:rounded-br-[18px_14px] before:[background:var(--them-bg)] after:left-[-24px] after:rounded-br-[10px]`,
            from === "me" &&
              `chat-bubble-me self-end text-white [background:var(--me-bg)] 
      before:right-[-5px] before:rounded-bl-[18px_14px] before:[background:var(--me-bg)] after:right-[-24px] after:rounded-bl-[10px]`,
            !tail && `before:opacity-0 after:opacity-0`,
            (isFocused || isBackdropAnimating) && "z-[100] shadow-xl",
            // offset
            shouldOffset && `!-translate-y-[var(--offset)] transition-transform duration-300`,
          )}
          style={{ "--offset": shouldOffset ? `${shouldOffset}px` : undefined } as React.CSSProperties}
          {...longPressProps}
        >
          {/* Reactions */}
          <AnimatePresence>
            {isReactionsOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "278px" }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 25,
                  delay: 0.2,
                }}
                style={{ transformOrigin: "center center" }}
                className={twMerge(
                  "[--bg:#333335]",
                  "absolute bottom-[100%] z-[100] mb-1 flex gap-4 rounded-full bg-[var(--bg)] p-3 text-[#757577]",
                  from === "me" && "right-0 [transform-origin:bottom_right]",
                  from === "them" && "left-0 [transform-origin:bottom_left]",
                  // little circles
                  from === "them" &&
                    "before:absolute before:bottom-[-2px] before:left-[3px] before:size-3 before:rounded-full before:bg-[var(--bg)] before:content-['']",
                  from === "them" &&
                    "after:absolute after:bottom-[-6px] after:left-[-1px] after:size-[0.35rem] after:rounded-full after:bg-[var(--bg)] after:content-['']",
                  from === "me" &&
                    "before:absolute before:bottom-[-2px] before:right-[3px] before:size-3 before:rounded-full before:bg-[var(--bg)] before:content-['']",
                  from === "me" &&
                    "after:absolute after:bottom-[-6px] after:right-[-1px] after:size-[0.35rem] after:rounded-full after:bg-[var(--bg)] after:content-['']",
                )}
              >
                {reactionsSymbols.map((reaction, i) => (
                  <motion.div
                    key={reaction.id}
                    className={twMerge(
                      "relative flex cursor-pointer items-center justify-center gap-1 text-[#757577] *:size-6 before:opacity-0 before:transition-opacity",
                      reactions?.find((r) => r.type === reaction.id)?.from === "me" &&
                        "z-[2] !text-white before:absolute before:-left-2 before:-top-2 before:size-10 before:rounded-full before:bg-[#137BFF] before:opacity-100 before:content-['']",
                    )}
                    onClick={() => reactToMessage(reaction.id)}
                  >
                    <reaction.icon className="z-[10]" transition={{ delay: i * 0.05 + 0.2 }} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Applied Reactions on the right top edge */}
          <AnimatePresence>
            {reactions?.map((reaction) => {
              return (
                <motion.div
                  key={reaction.type}
                  className={twMerge(
                    `absolute -top-5 z-[10] flex h-8 w-8 items-center justify-center  rounded-full text-white
                  *:size-4
                  `,
                    // two little blobs
                    from === "me" &&
                      `
                    -left-4
                    before:absolute before:-left-0 before:top-6 before:size-[0.6rem] before:rounded-full  before:content-['']
                    after:absolute after:-left-1  after:top-8 after:size-[0.3rem] after:rounded-full after:content-['']
                  `,
                    from === "them" &&
                      `
                    -right-4
                    before:absolute before:-right-0 before:top-6 before:size-[0.6rem] before:rounded-full  before:content-['']
                    after:absolute after:-right-1  after:top-8 after:size-[0.3rem] after:rounded-full after:content-['']
                  `,
                    reaction.from === "me" && `bg-[#137BFF] before:bg-[#137BFF] after:bg-[#137BFF]`,
                    reaction.from === "them" && `bg-[#222225] before:bg-[#222225] after:bg-[#222225]`,
                    from === "me" && reaction.from === "me" && "z-[10] ring-[1px] ring-black/30",
                    from === "them" && reaction.from === "them" && "z-[10] ring-[1px] ring-black/30",
                  )}
                >
                  {reactionsSymbols?.find((r) => r.id === reaction.type)?.icon?.({})}
                </motion.div>
              );
            })}
          </AnimatePresence>

          <div className="chat-bubble-text relative">
            {text}
            <AnimatePresence mode="wait">{isRefreshing && <SpoilerParticles />}</AnimatePresence>
          </div>

          {typing && (
            // three dots animation
            <div className="flex items-center gap-1 py-1">
              <div className="size-2 animate-pulse rounded-full bg-[#656569] text-white [animation-delay:0s]"></div>
              <div className="size-2 animate-pulse rounded-full bg-[#545457] text-white [animation-delay:0.2s]"></div>
              <div className="size-2 animate-pulse rounded-full bg-[#656569] text-white [animation-delay:0.4s]"></div>
            </div>
          )}

          {/* Context menu (copy, etc.) */}
          <div ref={dropdownMenuRef}>
            <AnimatePresence>
              {isFocused && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.3, ease: [0, 0, 0, 1.05] }}
                  className={twMerge(
                    "[--bg:#1A1A1A]",
                    "absolute top-[100%] z-[100] mb-1 mt-1 flex min-w-[180px] flex-col divide-y divide-white/5 rounded-xl bg-[var(--bg)]  text-white backdrop-blur-xl",
                    from === "me" && "right-0 [transform-origin:top_right]",
                    from === "them" && "left-0 [transform-origin:top_left]",
                  )}
                >
                  {tapbackActions.map(
                    (action) =>
                      action.visible !== false && (
                        <div
                          key={action.label}
                          className={twMerge(
                            "flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3",
                            action.className,
                          )}
                          onClick={(e) => void action.onPress?.(e)}
                        >
                          <span>{action.label}</span>
                          {action.icon}
                        </div>
                      ),
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </>
    );
  },
);
