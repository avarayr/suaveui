import { useMutation } from "@tanstack/react-query";
import { useLongPress } from "@uidotdev/usehooks";
import { AnimatePresence, motion } from "framer-motion";
import { Files, RotateCcw, ShipWheel, Trash } from "lucide-react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
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
    onDelete?: () => Promise<void>;
  }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isReactionsOpen, setIsReactionsOpen] = useState(false);
    const [isBackdropAnimating, setIsBackdropAnimating] = useState(false);
    const [shouldOffset, setShouldOffset] = useState<number | undefined>(undefined);

    const dropdownMenuRef = useRef<HTMLDivElement>(null);

    const steerMutation = useMutation({
      mutationFn: onSteer,
    });

    const regenerateMutation = useMutation({
      mutationFn: onRegenerate,
    });

    const reactMutation = useMutation({
      mutationFn: onReact,
    });

    const recalculateOffset = useCallback(() => {
      if (!dropdownMenuRef.current) return;

      const child = dropdownMenuRef.current?.children?.[0] as HTMLDivElement | undefined;
      if (child) {
        const rect = child?.getBoundingClientRect();
        // if off screen, offset
        const top = rect?.top ?? 0;
        const height = child?.offsetHeight ?? 0;
        const windowHeight = window.innerHeight;

        const marginTop = 60;
        if (top + height + marginTop > windowHeight) {
          const offset = top - windowHeight + height + marginTop;
          setShouldOffset(offset);
        } else {
          setShouldOffset(undefined);
        }
      }
    }, []);

    const onTapBack = useCallback(() => {
      /**
       * Remove user text selection if any
       */
      window.getSelection()?.removeAllRanges();

      // haptic feedback
      try {
        window.navigator.vibrate([1]);
      } catch (e) {
        /* ignore */
      }

      setIsFocused(true);
      setIsReactionsOpen(true);

      setTimeout(recalculateOffset, 100);
    }, [recalculateOffset]);

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
      ] as const satisfies Reaction[];
    }, []);

    const onCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        console.error(e);
      }

      onTapBackDismiss();
    }, [onTapBackDismiss, text]);

    const reactToMessage = useCallback(
      (reaction: TReaction["type"]) => {
        reactMutation.mutate(reaction);
        setTimeout(onTapBackDismiss, 700);
      },
      [onTapBackDismiss, reactMutation],
    );

    const tapbackActions = useMemo<TapbackAction[]>(() => {
      const beforeAction = (callback?: () => any, immediate = false) => {
        return (e: React.MouseEvent<HTMLDivElement>) => {
          e.preventDefault();
          e.stopPropagation();

          onTapBackDismiss();

          if (immediate) {
            return void callback?.();
          }

          setTimeout(() => {
            void callback?.();
          }, 350);
        };
      };

      return [
        {
          label: "Copy",
          icon: <Files className="size-5" />,
          onPress: beforeAction(onCopy, true),
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
    }, [onCopy, onDelete, onTapBackDismiss, regenerateMutation.mutate, steerMutation.mutate]);

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
          variants={{
            hidden: { opacity: 0, y: 17 },
            visible: { opacity: 1, y: 0 },
          }}
          initial={"hidden"}
          animate={"visible"}
          whileInView={"visible"}
          whileTap={{
            scale: 1.02,
            filter: "drop-shadow(0px 0px 10px rgba(0, 0, 0, 0.5))",
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            // ignore on mobile
            if (window.innerWidth < 768) return;
            onTapBack?.();
          }}
          layout={"position"}
          layoutId={layoutId}
          className={twMerge(
            `will-change-transform [--h:3px] [--w:3px]`,
            `[--them-bg:linear-gradient(to_bottom,#343435,#343435)]`,
            `[--me-bg:linear-gradient(to_bottom,#137BFF,#117BFF)]`,
            `relative max-w-[70dvw] select-none list-none whitespace-pre-wrap break-words rounded-[18px] px-[calc(var(--w)*4)] py-[calc(var(--h)*2)] [-webkit-user-select:none]
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
            // shadow if focused
            (isFocused || isBackdropAnimating) && "z-[100] shadow-xl",
            // offset
            shouldOffset && `!-translate-y-[var(--offset)] transition-transform duration-300`,
            // has reactions -> margin top
            reactions?.length && "mb-1 mt-5",
          )}
          style={{ "--offset": shouldOffset ? `${shouldOffset}px` : undefined } as React.CSSProperties}
          {...longPressProps}
        >
          {/* Reactions */}
          <AnimatePresence>
            {isReactionsOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 278 }}
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
                  "absolute bottom-[100%] z-[100] mb-1 rounded-full bg-[var(--bg)]  text-[#757577]",
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
                <div className="flex w-full items-center justify-center gap-5 overflow-hidden p-3">
                  {reactionsSymbols.map((reaction, i) => (
                    <motion.div
                      key={reaction.id}
                      className={twMerge(
                        "relative flex cursor-pointer items-center justify-center gap-1 text-[#757577]",
                        reactions?.find((r) => r.type === reaction.id && r.from === "me") && "text-white",
                        // if active reaction is a heart, text is red
                        reactions?.find((r) => r.type === reaction.id && r.type === "heart" && r.from === "me") &&
                          "text-[#F9538B]",
                      )}
                      onClick={() => reactToMessage(reaction.id)}
                    >
                      {/* white background if active reaction */}
                      {reactions?.find((r) => r.type === reaction.id)?.from === "me" && (
                        <motion.div
                          key={reaction.id + "-white-bg"}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, ease: [0, 0, 0, 1.05] }}
                          className={twMerge(
                            "absolute -left-2 -top-2 size-10 rounded-full bg-[#137BFF] opacity-100 [transform-origin:bottom]",
                          )}
                        />
                      )}
                      <reaction.icon className="z-[10] size-6" transition={{ delay: i * 0.05 + 0.2 }} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Applied Reactions on the right top edge */}
          <AnimatePresence initial={false}>
            {reactions?.map((reaction) => {
              return (
                <motion.div
                  key={reaction.type}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 1,
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                  className={twMerge(
                    `absolute -top-5 z-[10] flex h-8 w-8 items-center justify-center  rounded-full text-white
                    [transform-origin:bottom_right]
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
                    // if focused, opacity is 30%
                    isFocused && "!opacity-0 transition-opacity",
                    // if reaction is a heart, text is red
                    reaction.type === "heart" && "text-[#F9538B]",
                  )}
                >
                  {reactionsSymbols?.find((r) => r.id === reaction.type)?.icon?.({})}
                </motion.div>
              );
            })}
          </AnimatePresence>

          <div className="chat-bubble-text relative">
            {text}
            <AnimatePresence initial={false} mode="wait">
              {isRefreshing && <SpoilerParticles />}
            </AnimatePresence>
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
            <AnimatePresence initial={false}>
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
