import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ChevronLeft, VideoIcon } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { Button } from "~/components/primitives/Button";
import { SpinnerIcon } from "~/components/primitives/SpinnerIcon";
import { useInView } from "~/hooks/useInView";
import type { Reaction as TReaction } from "~/layouts/types";
import { Route } from "~/routes/texting/$chatId";
import { type TextingProps } from "../../types";
import { Avatar } from "../components/Avatar";
import { ChatBubble } from "../components/ChatBubble";
import { ChatInput } from "../components/ChatInput";
import { ChaiColors } from "../types";
import { useAutoScroll } from "~/hooks/useAutoScroll";

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;
const easeOut = (t: number) => {
  return 1 - Math.pow(1 - t, 2); // Quadratic easing out function
};

export const Texting = React.memo(
  ({
    data,
    onMessageSend,
    loading: chatLoading,
    editingMessageId,
    moreMessagesAvailable,
    onMessageDelete,
    onMessageSteer,
    onMessageContinue,
    onMessageRegenerate,
    onMessageReact,
    onMessageEditStart,
    onMessageEditDismiss,
    onMessageEditSubmit,
    onMessageInterrupt,
    onLoadMore,
  }: TextingProps) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const { frameless } = Route.useSearch<{ frameless?: boolean }>();
    const [isSticky, setIsSticky] = useState(true);
    const [initialLoad, setInitialLoad] = useState(false);

    const [loadMoreButtonRef, loadMoreButtonInView] = useInView<HTMLButtonElement>(undefined, {
      timeout: 100,
      rootMargin: "-100px 0px -100px 0px",
    });
    const persona = data?.chat?.personas?.[0];

    const messages = useMemo(() => {
      // sort in reverse chronological order
      // because we're using a reverse flex direction for chat messages
      return [...(data?.messages ?? [])].sort(
        (b, a) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );
    }, [data?.messages]);

    const shouldDisplayTime = useCallback((_messages: typeof messages, i: number) => {
      const timestampInterval = 1000 * 60 * 30; // 30 minutes
      const prevMessage = _messages[i - 1];
      const message = _messages[i];

      const currentTimestamp = message?.createdAt ? message.createdAt.getTime() : 0;
      const nextTimestamp = prevMessage?.createdAt ? prevMessage.createdAt.getTime() : 0;
      const hasDayChanged = message?.createdAt?.getDate() !== prevMessage?.createdAt?.getDate();
      const shouldDisplayTime = currentTimestamp - nextTimestamp >= timestampInterval || hasDayChanged;
      return shouldDisplayTime;
    }, []);

    const shouldShowTail = useCallback(
      (_messages: typeof messages, i: number) => {
        if (_messages[i + 1] && _messages[i + 1]?.role !== _messages[i]?.role) {
          return true;
        }

        // if we have a timestamp, we should show the tail
        // because timestamp act as a separator
        if (shouldDisplayTime(_messages, i)) {
          return true;
        }

        return i === _messages.length - 1;
      },
      [shouldDisplayTime],
    );

    const { mutate: loadMoreMutate, isPending: isLoadMorePending } = useMutation({
      mutationFn: onLoadMore,
      mutationKey: ["load-more"],
    });

    useEffect(() => {
      if (loadMoreButtonInView) {
        void loadMoreMutate();
      }
    }, [loadMoreButtonInView, loadMoreMutate]);

    /**
     * On initial load of messages, scroll to the bottom of the chat (when messages are available)
     */
    useEffect(() => {
      if (messages.length > 0 && !initialLoad) {
        scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "instant" });
        setInitialLoad(true);
      }
    }, [messages, initialLoad]);

    /**
     * On load, scroll to the bottom of the chat
     */
    useAutoScroll(scrollerRef, messages, isSticky);

    /**
     * When isSticky is on, listen for resize events and scroll to the bottom (snap instantly) on resize
     */
    useEffect(() => {
      const handleResize = () => {
        if (isSticky) {
          scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "instant" });
        }
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, [isSticky]);

    useEffect(() => {
      const handleScroll = () => {
        if (scrollerRef.current) {
          const scrollHeight = scrollerRef.current.scrollHeight;
          const clientHeight = scrollerRef.current.clientHeight;
          const currentScrollTop = scrollerRef.current.scrollTop;

          // Calculate the distance from the bottom
          const distanceFromBottom = scrollHeight - clientHeight - currentScrollTop;

          // If the user is close enough to the bottom, enable sticky scroll
          const shouldSticky = distanceFromBottom <= 10;
          setIsSticky(shouldSticky);
        }
      };

      // Attach the event listeners
      const scroller = scrollerRef.current;
      if (scroller) {
        scroller.addEventListener("wheel", handleScroll);
        scroller.addEventListener("touchstart", handleScroll);
        scroller.addEventListener("touchend", handleScroll);
        scroller.addEventListener("touchcancel", handleScroll);
      }

      return () => {
        // Remove the event listeners when component unmounts

        scroller?.removeEventListener("wheel", handleScroll);
        scroller?.removeEventListener("touchstart", handleScroll);
        scroller?.removeEventListener("touchend", handleScroll);
        scroller?.removeEventListener("touchcancel", handleScroll);
      };
    }, []);

    return (
      <motion.main
        className="flex h-svh w-dvw flex-col justify-between overflow-x-hidden bg-black text-white antialiased contain-strict"
        exit={{ y: 15, opacity: 0 }}
      >
        {/* Activity Bar */}
        <section
          style={{ backgroundColor: ChaiColors.TEXTING_ACTIVITYBAR }}
          className={twMerge(
            "duration-[350ms] absolute left-0 top-0 z-10 flex h-20 w-full items-center justify-between px-5 text-white transition-all",
            frameless && "hidden",
          )}
        >
          {/* Back */}
          <Link to="/">
            <motion.div style={{ color: ChaiColors.LINK }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ChevronLeft className="size-9" />
            </motion.div>
          </Link>

          {/* Contact Info */}
          <motion.div
            className="flex flex-col items-center justify-center gap-1 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Avatar src={persona?.avatar} displayName={persona?.name} />
            <p className="text-xs text-white">{persona?.name}</p>
          </motion.div>

          {/* Videocall */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <VideoIcon className="size-7" style={{ color: ChaiColors.LINK }} />
          </motion.div>
        </section>

        {/* Conversation */}
        {chatLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <SpinnerIcon className="size-6" variant="ios" />
          </div>
        )}

        <section
          ref={scrollerRef}
          className="flex h-1 w-full flex-grow flex-col gap-2 overflow-y-auto overflow-x-clip px-5 pb-2 pt-24"
        >
          {moreMessagesAvailable && (
            <Button
              ref={loadMoreButtonRef}
              loading={isLoadMorePending}
              onClick={() => void loadMoreMutate()}
              variant={"ghost"}
            >
              <ArrowUp className="mr-1 size-3 text-white/40" />
              Load More
            </Button>
          )}

          {/* A dummy div that takes up remaining vertical space to push the tail down */}
          {/* <div className="flex-grow" /> */}

          <AnimatePresence initial={false} mode="popLayout">
            {messages.map((message, i) => {
              return (
                <ChatBubble
                  key={"chat_bubble_" + message.id}
                  from={message.role === "user" ? "me" : "them"}
                  text={message.content}
                  tail={shouldShowTail(messages, i)}
                  createdAt={message.createdAt?.getTime() ?? undefined}
                  showTimestamp={shouldDisplayTime(messages, i)}
                  onDelete={() => onMessageDelete(message.id)}
                  onSteer={() => onMessageSteer(message.id)}
                  onContinue={() => onMessageContinue(message.id)}
                  onRegenerate={() => onMessageRegenerate(message.id)}
                  onReact={(reaction) => onMessageReact(message.id, reaction)}
                  onEditStart={() => onMessageEditStart(message.id)}
                  reactions={message.reactions as TReaction[] | null}
                  isEditing={Boolean(editingMessageId && message.id === editingMessageId)}
                  onEditDismiss={() => onMessageEditDismiss(message.id)}
                  onEditSubmit={(newContent) => onMessageEditSubmit(message.id, newContent)}
                  isGenerating={message.isGenerating ?? false}
                  onInterrupt={() => onMessageInterrupt(message.id)}
                />
              );
            })}
          </AnimatePresence>
        </section>

        {/* Chat input */}
        <ChatInput onMessageSend={onMessageSend} className={twMerge(frameless && "hidden")} />
      </motion.main>
    );
  },
  (prevProps, nextProps) => {
    const toCheck = ["data", "moreMessagesAvailable", "editingMessageId"] as const satisfies (keyof typeof prevProps)[];
    const diff = toCheck.every((key) => prevProps[key] === nextProps[key]);
    return diff;
  },
);
