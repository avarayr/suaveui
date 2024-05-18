import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { ArrowUp, ChevronLeft, VideoIcon } from "lucide-react";
import React, { Fragment, useCallback, useEffect, useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { SpinnerIcon } from "~/components/primitives/SpinnerIcon";
import type { Reaction as TReaction } from "~/layouts/types";
import { type TextingProps } from "../../types";
import { Avatar } from "../components/Avatar";
import { ChatBubble } from "../components/ChatBubble";
import { ChatInput } from "../components/ChatInput";
import { ChaiColors } from "../types";
import { formatDateWithTime } from "~/utils/date";
import { useMutation } from "@tanstack/react-query";
import { Button } from "~/components/primitives/Button";
import { useInView } from "~/hooks/useInView";

export const Texting = React.memo(
  ({
    data,
    onMessageSend,
    loading: chatLoading,
    editingMessageId,
    moreMessagesAvailable,
    onMessageDelete,
    onMessageSteer,
    onMessageRegenerate,
    onMessageReact,
    onMessageEditStart,
    onMessageEditDismiss,
    onMessageEditSubmit,
    onMessageInterrupt,
    onLoadMore,
  }: TextingProps) => {
    const [loadMoreButtonRef, loadMoreButtonInView] = useInView(undefined, {
      timeout: 100,
      rootMargin: "-100px 0px -100px 0px",
    });
    const persona = data?.chat?.personas?.[0];

    const messages = useMemo(() => {
      return [...(data?.messages ?? [])].sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );
    }, [data?.messages]);

    const shouldShowTail = useCallback(
      (i: number) => {
        if (messages[i - 1] && messages[i - 1]?.role !== messages[i]?.role) {
          return true;
        }
        return i === 0;
      },
      [messages],
    );

    const { mutate: loadMoreMutate, isPending: isLoadMorePending } = useMutation({
      mutationFn: onLoadMore,
      mutationKey: ["load-more"],
    });

    const timestampInterval = 1000 * 60 * 30; // 30 minutes

    useEffect(() => {
      if (loadMoreButtonInView) {
        void loadMoreMutate();
      }
    }, [loadMoreButtonInView, loadMoreMutate]);

    return (
      <motion.main
        className="flex h-dvh w-dvw flex-col justify-between overflow-x-hidden bg-black text-white antialiased contain-strict"
        exit={{ y: 15, opacity: 0 }}
      >
        {/* Activity Bar */}
        <section
          style={{ backgroundColor: ChaiColors.TEXTING_ACTIVITYBAR }}
          className="duration-[350ms] absolute left-0 top-0 z-10 flex h-20 w-full items-center justify-between px-5 text-white transition-all"
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
          className={twMerge(
            "flex h-1 flex-grow flex-col-reverse gap-2 overflow-x-clip overflow-y-scroll px-5 pb-2 pt-24",
          )}
        >
          <AnimatePresence initial={false}>
            {messages.map((message, i) => {
              const element = (
                <ChatBubble
                  key={"chat_bubble_" + message.id}
                  layoutId={"chat_bubble_" + message.id}
                  from={message.role === "user" ? "me" : "them"}
                  text={message.content}
                  tail={shouldShowTail(i)}
                  onDelete={() => onMessageDelete(message.id)}
                  onSteer={() => onMessageSteer(message.id)}
                  onRegenerate={() => onMessageRegenerate(message.id)}
                  onReact={(reaction) => onMessageReact(message.id, reaction)}
                  onEditStart={() => onMessageEditStart(message.id)}
                  reactions={message.reactions as TReaction[] | null}
                  isEditing={message.id === editingMessageId}
                  onEditDismiss={() => onMessageEditDismiss(message.id)}
                  onEditSubmit={(newContent) => onMessageEditSubmit(message.id, newContent)}
                  canInterrupt={message.loading}
                  onInterrupt={() => onMessageInterrupt(message.id)}
                />
              );
              let timestampElement = null;

              const nextMessage = messages[i + 1];
              const currentTimestamp = message.createdAt ? message.createdAt.getTime() : 0;
              const nextTimestamp = nextMessage?.createdAt ? nextMessage.createdAt.getTime() : 0;
              const hasDayChanged = message.createdAt?.getDate() !== nextMessage?.createdAt?.getDate();
              const shouldDisplayTime = currentTimestamp - nextTimestamp >= timestampInterval || hasDayChanged;

              if (shouldDisplayTime) {
                timestampElement = (
                  <motion.div layout className="timestamp mt-1 w-full text-center text-xs text-[#7D7C80]">
                    {formatDateWithTime(message.createdAt!)}
                  </motion.div>
                );
              }

              return (
                <Fragment key={"chat_container_" + message.id}>
                  {element}
                  {/* Everything comes after the chat bubble because the chat is in flex-col-reverse */}
                  {timestampElement}
                </Fragment>
              );
            })}

            {moreMessagesAvailable && (
              <Button
                ref={loadMoreButtonRef as unknown as React.LegacyRef<HTMLButtonElement>}
                loading={isLoadMorePending}
                onClick={() => void loadMoreMutate()}
                variant={"ghost"}
              >
                <ArrowUp className="mr-1 size-3 text-white/40" />
                Load More
              </Button>
            )}
          </AnimatePresence>
        </section>

        {/* Chat input */}
        <ChatInput onMessageSend={onMessageSend} />
      </motion.main>
    );
  },
);
