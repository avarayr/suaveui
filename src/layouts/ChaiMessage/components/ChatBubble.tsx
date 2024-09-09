import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion, useMotionValue, PanInfo } from "framer-motion";
import {
  ArrowRight,
  CheckIcon,
  Files,
  LoaderCircle,
  Pencil,
  RotateCcw,
  ShipWheel,
  Square,
  Trash,
  XIcon,
} from "lucide-react";
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { ChatMarkdown } from "~/components/primitives/ChatMarkdown";
import type { Reaction as TReaction } from "~/layouts/types";
import { formatDateWithTime } from "~/utils/date";
import { ExpandingTextarea } from "./ExpandingTextarea";
import { Reaction } from "./reactions/Reaction";
import { SpoilerParticles } from "./SpoilerParticles";
import { Tapback, TapbackAction } from "./Tapback";
import { copyToClipboard } from "~/utils/clipboard";

export type Reaction = {
  id: TReaction["type"];
  icon: React.JSX.ElementType | React.ReactNode;
};

export const ChatBubble = React.memo(
  ({
    from,
    text,
    tail,
    typing,
    isGenerating,
    reactions,
    isEditing,
    createdAt: createdAtNumber,
    onContinue,
    onInterrupt,
    onDelete,
    onSteer,
    onReact,
    onRegenerate,
    onEditStart,
    onEditDismiss,
    onEditSubmit,
    showTimestamp,
    className,
    onTapbackOpenChange: onTapbackOpenChangeProp,
  }: {
    from: "me" | "them";
    text: string;
    tail?: boolean;
    typing?: boolean;
    isGenerating?: boolean;
    reactions?: TReaction[] | null;
    isEditing?: boolean;
    showTimestamp?: boolean;
    createdAt?: number;
    className?: string;
    onInterrupt?: () => Promise<any>;
    onSteer?: () => Promise<void>;
    onRegenerate?: () => Promise<void>;
    onReact?: (reaction: TReaction["type"]) => Promise<void>;
    onContinue?: () => Promise<void>;
    onDelete?: () => Promise<void>;
    onEditStart?: () => void;
    onEditDismiss?: () => void;
    onEditSubmit?: (newContent: string) => void | Promise<void>;
    onTapbackOpenChange?: (open: boolean) => void;
  }) => {
    const [isFocused, setIsFocused] = useState(false);

    const [editingText, setEditingText] = useState<string | undefined>();

    const [isDragRevealed, setIsDragRevealed] = useState(false);
    const x = useMotionValue(0);

    const steerMutation = useMutation({
      mutationFn: onSteer,
    });

    const regenerateMutation = useMutation({
      mutationFn: onRegenerate,
    });

    const reactMutation = useMutation({
      mutationFn: onReact,
    });

    const continueGeneratingMutation = useMutation({
      mutationFn: onContinue,
    });

    const interruptGenerationMutation = useMutation({
      mutationFn: onInterrupt,
    });

    const deleteMutation = useMutation({
      mutationFn: onDelete,
    });

    const onTapBackOpenChange = useCallback(
      (open: boolean) => {
        if (open) {
          if (isEditing) {
            return;
          }
          setIsFocused(true);
        } else {
          setIsFocused(false);
        }
      },
      [isEditing],
    );

    const createdAt = useMemo(() => {
      return createdAtNumber ? new Date(createdAtNumber) : undefined;
    }, [createdAtNumber]);

    useEffect(() => {
      onTapbackOpenChangeProp?.(isFocused);
    }, [isFocused, onTapbackOpenChangeProp]);

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

    const onCopy = useCallback(() => {
      copyToClipboard(text);
    }, [text]);

    const reactToMessage = useCallback(
      (reaction: TReaction["type"]) => {
        reactMutation.mutate(reaction);
        setTimeout(() => onTapBackOpenChange(false), 700);
      },
      [onTapBackOpenChange, reactMutation],
    );

    // for dragging the chat bubble to the left
    const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < 0) {
        setIsDragRevealed(true);
      }
    }, []);

    const handleDragEnd = useCallback(
      (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.velocity.x > 10) {
          x.set(0);
        }
        setIsDragRevealed(false);
      },
      [x],
    );

    const tapbackActions = useCallback(
      (role: "me" | "them") => {
        const beforeAction = (callback: () => any, { interruptGeneration = false } = {}) => {
          return async () => {
            if (interruptGeneration && isGenerating) {
              await interruptGenerationMutation.mutateAsync();
            }
            callback?.();
          };
        };

        return [
          {
            label: "Copy",
            icon: <Files className="size-5" />,
            onPress: { callback: beforeAction(onCopy), immediate: true },
          },
          {
            label: "Edit",
            icon: <Pencil className="size-5" />,
            onPress: beforeAction(
              () => {
                setEditingText(text);
                void onEditStart?.();
              },
              { interruptGeneration: true },
            ),
          },
          {
            label: "Steer",
            icon: <ShipWheel className="size-5" />,
            onPress: beforeAction(steerMutation.mutate, { interruptGeneration: true }),
            hidden: role === "me",
          },
          {
            label: "Regenerate",
            icon: <RotateCcw className="size-5" />,
            onPress: beforeAction(regenerateMutation.mutate, { interruptGeneration: true }),
            hidden: role === "me",
          },
          {
            label: "Continue",
            icon: <ArrowRight className="size-5" />,
            onPress: beforeAction(continueGeneratingMutation.mutate, { interruptGeneration: true }),
            hidden: role === "me",
          },
          {
            label: "Delete",
            icon: <Trash className="size-5" />,
            onPress: beforeAction(deleteMutation.mutate, { interruptGeneration: true }),
            className: "text-red-500",
          },
        ] satisfies TapbackAction[];
      },
      [
        onCopy,
        steerMutation.mutate,
        regenerateMutation.mutate,
        continueGeneratingMutation.mutate,
        deleteMutation.mutate,
        isGenerating,
        interruptGenerationMutation,
        text,
        onEditStart,
      ],
    );

    const isRefreshing = useMemo(() => {
      return regenerateMutation.isPending || steerMutation.isPending;
    }, [regenerateMutation.isPending, steerMutation.isPending]);

    const getReactionIcon = useCallback(
      (reactionType: TReaction["type"]): ReactNode => {
        const Icon = reactionsSymbols?.find((r) => r.id === reactionType)?.icon;
        return Icon ? <Icon /> : null;
      },
      [reactionsSymbols],
    );

    return (
      <motion.div
        layoutRoot
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x }}
      >
        {/* Timestamp */}
        {showTimestamp && createdAt && (
          <div className={twMerge("timestamp mb-3 mt-1 w-full text-center text-xs text-[#7D7C80]")}>
            {formatDateWithTime(createdAt)}
          </div>
        )}

        {/* Focus backdrop */}
        <div className={twMerge("flex items-center justify-between")}>
          {/* Dismiss Action */}
          <AnimatePresence mode="popLayout">
            {isEditing && (
              <motion.section
                className="flex items-center justify-start overflow-hidden [transform-origin:left]"
                initial={{ opacity: 0, scale: 0, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0, x: -10 }}
                transition={{ duration: 0.25 }}
              >
                <button
                  className="mr-2 flex size-8 items-center justify-center rounded-full border-none bg-[#272628] text-white"
                  onClick={onEditDismiss}
                >
                  <XIcon className="size-5" />
                </button>
              </motion.section>
            )}
          </AnimatePresence>

          <section
            className={twMerge(
              "flex flex-grow items-center gap-2",
              // My messages are on the right
              from === "me" && "justify-end",
              // Their messages are on the left
              from === "them" && "justify-start",
              className,
            )}
          >
            <Tapback
              as={motion.div}
              actions={tapbackActions(from)}
              isOpen={isFocused}
              onOpenChange={(isOpen) => onTapBackOpenChange(isOpen)}
              className={twMerge(
                `[--h:3px] [--w:3px]`,
                `[--them-bg:linear-gradient(to_bottom,#343435,#343435)]`,
                `[--me-bg:linear-gradient(to_bottom,#137BFF,#117BFF)]`,
                `[--edit-bg:black]`,
                `[--edit-border:#202020]`,
                `relative max-w-[70dvw] select-none list-none whitespace-pre-wrap break-words rounded-[18px] px-[calc(var(--w)*4)] py-[calc(var(--h)*2)] [-webkit-user-select:none] before:absolute before:bottom-0 before:h-[calc(var(--h)*5)] before:w-[calc(var(--h)*4)] before:transition-opacity before:content-[''] after:absolute after:bottom-0 after:h-[30px] after:w-[24px] after:bg-black after:transition-opacity after:content-['']`,
                from === "them" &&
                  `chat-bubble-them bg-[image:var(--them-bg)] text-white before:left-[-5px] before:rounded-br-[18px_14px] before:bg-[image:var(--them-bg)] after:left-[-24px] after:rounded-br-[10px]`,
                from === "me" &&
                  `chat-bubble-me bg-[image:var(--me-bg)] text-white before:right-[-5px] before:rounded-bl-[18px_14px] before:bg-[image:var(--me-bg)] after:right-[-24px] after:rounded-bl-[10px]`,
                tail && "has-tail",
                !tail && `before:opacity-0 after:opacity-0`,
                // has reactions -> margin top
                reactions?.length && "mb-1 mt-5",
                // editing input
                isEditing &&
                  "w-full max-w-full border-2 border-[var(--edit-border)] bg-[image:var(--edit-bg)] transition-[border] before:hidden after:hidden",
                // animation
                "animate-fade-in",
              )}
              transformOrigin={from === "me" ? "right" : "left"}
            >
              {/* Reactions */}
              <AnimatePresence>
                {isFocused && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 278 }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    transition={{
                      type: "spring",
                      stiffness: 250,
                      damping: 20,
                      delay: 0.11,
                    }}
                    style={{ transformOrigin: "center center" }}
                    className={twMerge(
                      "[--bg:#333335]",
                      "absolute bottom-[100%] mb-1 rounded-full bg-[var(--bg)] text-[#757577]",
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
                          <reaction.icon className="z-[10] size-6" transition={{ delay: i * 0.05 + 0.22 }} />
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
                        `absolute -top-5 z-[9] flex h-8 w-8 items-center justify-center rounded-full text-white [transform-origin:bottom_right] *:size-4`,
                        // two little blobs
                        from === "me" &&
                          `-left-4 before:absolute before:-left-0 before:top-6 before:size-[0.6rem] before:rounded-full before:content-[''] after:absolute after:-left-1 after:top-8 after:size-[0.3rem] after:rounded-full after:content-['']`,
                        from === "them" &&
                          `-right-4 before:absolute before:-right-0 before:top-6 before:size-[0.6rem] before:rounded-full before:content-[''] after:absolute after:-right-1 after:top-8 after:size-[0.3rem] after:rounded-full after:content-['']`,
                        reaction.from === "me" && `bg-[#137BFF] before:bg-[#137BFF] after:bg-[#137BFF]`,
                        reaction.from === "them" && `bg-[#222225] before:bg-[#222225] after:bg-[#222225]`,
                        from === "me" && reaction.from === "me" && "ring-[1px] ring-black/30",
                        from === "them" && reaction.from === "them" && "ring-[1px] ring-black/30",
                        (isFocused || isEditing) && "!opacity-0",
                        // if reaction is a heart, text is red
                        reaction.type === "heart" && "text-[#F9538B]",
                      )}
                    >
                      {getReactionIcon(reaction.type)}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              <motion.div className="chat-bubble-text relative">
                {isEditing ? (
                  <ExpandingTextarea
                    className="h-full w-full bg-transparent caret-blue-600 outline-none selection:bg-[#346DD9]/30"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      // if mobile - don't send on enter
                      if (window.innerWidth < 768) return;
                      if (e.key === "Enter" && !e.shiftKey && editingText) {
                        void onEditSubmit?.(editingText);
                      }
                    }}
                  />
                ) : text?.trim() || isGenerating ? (
                  <ChatMarkdown>{text}</ChatMarkdown>
                ) : (
                  <span className="italic text-white/30">empty response</span>
                )}

                <AnimatePresence initial={false} mode="wait">
                  {isRefreshing && <SpoilerParticles />}
                </AnimatePresence>
              </motion.div>

              {(typing || (isGenerating && text.length === 0)) && (
                // three dots animation
                <div className="flex items-center gap-1 py-[6px]">
                  <div className="size-2 animate-pulse rounded-full bg-[#656569] text-white [animation-delay:0.333s] [animation-duration:1s]"></div>
                  <div className="size-2 animate-pulse rounded-full bg-[#545457] text-white [animation-delay:0.666s] [animation-duration:1s]"></div>
                  <div className="size-2 animate-pulse rounded-full bg-[#656569] text-white [animation-delay:0.999s] [animation-duration:1s]"></div>
                </div>
              )}
            </Tapback>
          </section>

          {isDragRevealed && createdAt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={twMerge(
                "right-0 w-[80px] text-right text-xs text-[#7D7C80]",
                "tarnsform translate-x-[calc(100%+0px)]",
              )}
            >
              {createdAt.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {/* Submit Action */}
            {isEditing && (
              <motion.section
                className="flex items-center justify-end [transform-origin:right]"
                initial={{ opacity: 0, scale: 0, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <button
                  className={twMerge(
                    "ml-2 flex size-8 items-center justify-center rounded-full border-none bg-[#1076FF] text-white",
                    !editingText && "pointer-events-none bg-[#272628]",
                  )}
                  onClick={() => {
                    if (editingText) {
                      void onEditSubmit?.(editingText);
                    }
                  }}
                >
                  <CheckIcon className="size-5" />
                </button>
              </motion.section>
            )}
            {isGenerating && (
              <motion.section
                className="flex self-end overflow-clip"
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  transition: { delay: 0.25, type: "spring", stiffness: 200, damping: 20 },
                }}
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
              >
                <button
                  className={twMerge(
                    "relative ml-2 flex size-8 items-center justify-center rounded-full border-none bg-white/20 text-white",
                  )}
                  onClick={() => {
                    void interruptGenerationMutation.mutate();
                  }}
                >
                  {/* Spinner surrounding */}
                  <LoaderCircle className="absolute size-[125%] animate-spin stroke-white/20 stroke-[1] ease-linear" />
                  <Square className="size-3 fill-white" />
                </button>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
        {/* Drag-revealed Timestamp */}
      </motion.div>
    );
  },
  (prevProps, nextProps) => {
    const toCheck = [
      "from",
      "text",
      "createdAt",
      "tail",
      "typing",
      "isGenerating",
      "reactions",
      "isEditing",
      "showTimestamp",
      "className",
    ] as const satisfies (keyof typeof prevProps)[];
    const diff = toCheck.every((key) => prevProps[key] === nextProps[key]);
    return diff;
  },
);
