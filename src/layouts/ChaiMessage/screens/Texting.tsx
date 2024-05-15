"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUp, ChevronLeft, Plus, VideoIcon } from "lucide-react";
import React, {
  Fragment,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";
import { SpinnerIcon } from "~/components/primitives/SpinnerIcon";
import { Reaction, type TextingProps } from "../../types";
import { Avatar } from "../components/Avatar";
import { ChatBubble } from "../components/ChatBubble";
import { ChaiColors } from "../types";
import { Link } from "@tanstack/react-router";
import { IsRouteTransitioning } from "~/internal/AnimatedOutlet";
import { useAtomValue } from "jotai";
import { ExpandingTextarea } from "../components/ExpandingTextarea";

const RefContext = createContext<React.RefCallback<Element>>(null!);

export const Texting = ({
  data,
  onMessageSend,
  loading: chatLoading,
  editingMessageId,
  onMessageDelete,
  onMessageSteer,
  onMessageRegenerate,
  onMessageReact,
  onMessageEditStart,
  onMessageEditDismiss,
  onMessageEditSubmit,
}: TextingProps) => {
  /**
   * Prevent motion-framer "layout" jitter on route transition
   */
  const isRouteTransitioning = useAtomValue(IsRouteTransitioning);

  const scrolling = useRef(false);

  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  const sendMessageMutation = useMutation({
    mutationFn: onMessageSend,
    onMutate() {
      setTimeout(() => {
        setShouldShowTyping(true);
      }, 1000);
    },
    onSettled() {
      setShouldShowTyping(false);
      if (typingTimeout) clearTimeout(typingTimeout);
    },
  });

  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [shouldShowTyping, setShouldShowTyping] = useState(false);
  const [message, setMessage] = useState("");

  const messages = useMemo(() => {
    return [...(data?.messages ?? [])].sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    );
  }, [data?.messages]);

  const persona = data?.chat?.personas?.[0];

  useEffect(() => {
    document.querySelector("meta[name='theme-color']")?.setAttribute("content", ChaiColors.TEXTING_ACTIVITYBAR);

    return () => {
      document.querySelector("meta[name='theme-color']")?.setAttribute("content", ChaiColors.BACKGROUND);
    };
  }, []);

  const sendMessage = useCallback(
    (e: { preventDefault: () => void }) => {
      // Set focus to the input
      e.preventDefault();
      inputRef.current?.focus();

      if (message.trim() === "") return;

      sendMessageMutation.mutate(message);
      setMessage("");
    },
    [message, sendMessageMutation],
  );

  const shouldShowTail = useCallback((i: number, _messages: typeof messages) => {
    if (_messages[i - 1] && _messages[i - 1]?.role != _messages[i]?.role) {
      return true;
    }

    if (i === 0) {
      return true;
    }
    return false;
  }, []);

  return (
    <motion.main
      className="flex h-dvh w-dvw flex-col justify-between overflow-x-hidden bg-black text-white antialiased"
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

      {/* Loading */}
      {(isRouteTransitioning || chatLoading) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <SpinnerIcon className="size-6" variant="ios" />
        </div>
      )}

      <section
        className={twMerge(
          "flex h-1 flex-grow flex-col-reverse gap-2 overflow-x-clip overflow-y-scroll px-5 pb-2 pt-24",
        )}
        ref={chatMessagesRef}
      >
        {/* If loading, show typing animation */}
        {shouldShowTyping && (
          <ChatBubble layoutId="chatbubble_loading" from="them" text="" typing key="chatbubble_loading" />
        )}

        {!isRouteTransitioning &&
          messages.map((message, i) => (
            <Fragment key={message.id}>
              <ChatBubble
                layoutId={message.id}
                from={message.role === "user" ? "me" : "them"}
                text={message.content}
                key={message.id}
                tail={shouldShowTail(i, messages)}
                onDelete={() => onMessageDelete(message.id)}
                onSteer={() => onMessageSteer(message.id)}
                onRegenerate={() => onMessageRegenerate(message.id)}
                onReact={(reaction) => onMessageReact(message.id, reaction)}
                onEditStart={() => onMessageEditStart(message.id)}
                reactions={message.reactions as Reaction[] | null}
                isEditing={message.id === editingMessageId}
                onEditDismiss={() => onMessageEditDismiss(message.id)}
                onEditSubmit={(newContent) => onMessageEditSubmit(message.id, newContent)}
              />
            </Fragment>
          ))}
      </section>

      {/* Chat input */}
      <section className="z-10 flex min-h-14 w-full items-center gap-2 bg-black/80 px-3 backdrop-blur-xl">
        {/* Plus Icon */}
        <button className="duration-[350ms] flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-[#101011] text-white/80 transition-colors">
          <Plus className="size-4" />
        </button>

        {/* Input */}
        <ExpandingTextarea
          ref={inputRef}
          autoComplete="off"
          rows={1}
          wrap="hard"
          className="h-auto min-h-9 w-full flex-grow rounded-3xl border border-[#1F2021] bg-transparent px-3 py-[0.35rem] pr-10 text-white placeholder-[#434346] caret-blue-600 outline-none selection:bg-[#346DD9]/30"
          placeholder="Message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            // if mobile - don't send on enter
            if (window.innerWidth < 768) return;
            e.key === "Enter" && !e.shiftKey && void sendMessage(e);
          }}
        />

        {/* Send Icon (absolute, right-0)*/}
        <button
          onTouchEnd={sendMessage}
          className={twMerge(
            "duration-50 absolute right-4 flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-[#0C79FF] text-white/80 opacity-100 transition-all",
            message.length === 0 && "opacity-0",
          )}
          onClick={sendMessage}
        >
          <ArrowUp className="size-4" />
        </button>
      </section>
    </motion.main>
  );
};
