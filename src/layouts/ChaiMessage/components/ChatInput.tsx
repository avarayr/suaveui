import { ArrowUp, Plus } from "lucide-react";
import React, { useCallback, useState } from "react";
import { twMerge } from "tailwind-merge";
import { ExpandingTextarea } from "../components/ExpandingTextarea";
import { AttachmentDropup } from "./AttachmentDropup";
import { AnimatePresence, motion } from "framer-motion";
import type { TMessageWithID } from "~/server/schema/Message";

interface ChatInputProps {
  onMessageSend: (message: string) => void | Promise<void>;
  onImportConversation: (content: string) => void | Promise<void>;
  className?: string;
  currentMessages: TMessageWithID[];
}

export const ChatInput = React.memo(
  ({ onMessageSend, onImportConversation, className, currentMessages }: ChatInputProps) => {
    const [message, setMessage] = useState("");
    const [isAttachmentOpen, setIsAttachmentOpen] = useState(false); // New state

    const sendMessage = useCallback(
      (e: { preventDefault: () => void }) => {
        e?.preventDefault();
        if (message.trim() === "") return;
        void onMessageSend(message);
        setMessage("");
      },
      [message, onMessageSend],
    );

    return (
      <section
        className={twMerge("z-10 flex min-h-14 w-full items-center gap-2 bg-black/80 px-3 backdrop-blur-xl", className)}
      >
        {/* Plus Icon */}
        {!isAttachmentOpen && (
          <button
            className={
              "duration-[350ms] -mt-[0.33rem] flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-[#101011] text-white/80 transition-colors"
            }
            onClick={() => setIsAttachmentOpen(!isAttachmentOpen)} // Toggle attachment dropup
          >
            <Plus className="size-4" />
          </button>
        )}

        <AnimatePresence mode="popLayout">
          {isAttachmentOpen ? (
            <AttachmentDropup
              onClose={() => setIsAttachmentOpen(false)}
              onImportConversation={onImportConversation}
              currentMessages={currentMessages}
            />
          ) : (
            <>
              {/* Input */}
              <div className="relative w-full">
                <ExpandingTextarea
                  autoComplete="off"
                  rows={1}
                  wrap="hard"
                  className="h-auto min-h-9 w-full flex-grow rounded-3xl border border-[#1F2021] bg-transparent px-3 py-[5px] pr-10 text-white placeholder-[#434346] caret-blue-600 outline-none selection:bg-[#346DD9]/30"
                  placeholder="Message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (window.innerWidth < 768) return;
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage(e);
                    }
                  }}
                />

                {/* Send Icon (absolute, right-0) */}
                <button
                  onTouchEnd={sendMessage}
                  className={twMerge(
                    "duration-50 absolute bottom-[0.65rem] right-1 flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-[#0C79FF] text-white/80 opacity-100 transition-all",
                    message.length === 0 && "opacity-0",
                  )}
                  onClick={sendMessage}
                >
                  <ArrowUp className="size-4" />
                </button>
              </div>
            </>
          )}
        </AnimatePresence>
      </section>
    );
  },
);
