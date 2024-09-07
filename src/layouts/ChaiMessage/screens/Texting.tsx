import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowDown, ChevronLeft, VideoIcon } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { VListHandle, Virtualizer } from "virtua";
import { SpinnerIcon } from "~/components/primitives/SpinnerIcon";
import { useAutoScroll } from "~/hooks/useAutoScroll";
import { useInView } from "~/hooks/useInView";
import type { Reaction as TReaction } from "~/layouts/types";
import { Route } from "~/routes/texting/$chatId";
import { type TextingProps } from "../../types";
import { Avatar } from "../components/Avatar";
import { ChatBubble } from "../components/ChatBubble";
import { ChatInput } from "../components/ChatInput";
import { ChaiColors } from "../types";
import { VideoCallButton } from "../components/VideoCallButton";

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
    const scrollerRef = useRef<VListHandle>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const { frameless } = Route.useSearch<{ frameless?: boolean }>();
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
     * On load, scroll to the bottom of the chat
     */
    const { JumpToBottomButton, jumpToBottom } = useAutoScroll({ scrollerRef, messages, scrollContainerRef });

    const onBeforeMessageSend = (...props: Parameters<typeof onMessageSend>) => {
      jumpToBottom();
      return onMessageSend(...props);
    };

    const handleVideoCallStart = () => {
      // Implement video call start logic
    };

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
          <VideoCallButton onVideoCallStart={handleVideoCallStart} />
        </section>

        {/* Conversation */}
        {chatLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <SpinnerIcon className="size-6" variant="ios" />
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className="flex h-1 w-full flex-grow flex-col overflow-y-auto overflow-x-clip px-5 pb-2 pt-24"
        >
          <Virtualizer ref={scrollerRef}>
            {messages.map((message, i) => (
              <ChatBubble
                className={"my-1"}
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
            ))}
          </Virtualizer>
        </div>

        <JumpToBottomButton>
          <ArrowDown className="size-4" />
        </JumpToBottomButton>

        {/* Chat input */}
        <ChatInput onMessageSend={onBeforeMessageSend} className={twMerge(frameless && "hidden")} />
      </motion.main>
    );
  },
  (prevProps, nextProps) => {
    const toCheck = ["data", "moreMessagesAvailable", "editingMessageId"] as const satisfies (keyof typeof prevProps)[];
    const diff = toCheck.every((key) => prevProps[key] === nextProps[key]);
    return diff;
  },
);
