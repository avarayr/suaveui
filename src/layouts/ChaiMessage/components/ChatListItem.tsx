import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import React, { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { SpinnerIcon } from "~/components/primitives/SpinnerIcon";
import { Avatar } from "./Avatar";
import { Padded } from "./Padded";
import { Link } from "@tanstack/react-router";
import { RouterOutput } from "~/trpc/react";
import { formatDate } from "~/utils/date";

export const ChatListItem = React.memo(({ chat }: { chat: RouterOutput["chat"]["all"][number] }) => {
  const lastMessageDate = useMemo(() => {
    const lastMessage = chat.messages.slice(-1)?.[0];
    if (!lastMessage?.createdAt) return "";
    return formatDate(lastMessage.createdAt);
  }, [chat]);

  return (
    <Link to={`/texting/$chatId`} params={{ chatId: chat.id }} key={chat.id} className="group">
      <motion.div
        key={chat.id}
        className="flex select-none items-center justify-between text-[1.05rem] *:select-none active:bg-[#3d3d44] active:text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: -25 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
      >
        <Padded className="w-full py-0">
          <div className="flex w-full items-center gap-[1rem]">
            {/* Avatar */}
            <div className="flex flex-shrink-0 items-center gap-2">
              {/* Unread indicator */}
              <div
                className={twMerge(
                  "size-[0.45rem] rounded-full text-white",
                  //TODO
                  // chat.isUnread && "bg-[#3679F1]",
                )}
              />
              <Avatar src={chat.persona?.avatar} displayName={chat.persona?.name} />
            </div>

            <div className="flex w-full flex-col gap-[0.25rem] border-t border-[#8F8F95]/[13%] py-[0.5rem] group-last:border-b group-active:border-transparent">
              <div className="flex justify-between">
                {/* Name */}
                <p className="font-bold">{chat.persona?.name}</p>

                {/* Time */}
                <div className="flex items-center gap-[0.3rem]">
                  <time className="text-[0.95rem] text-[#8F8F95]/90">{lastMessageDate}</time>

                  <ChevronRight className="size-[1.2rem] text-[#8F8F95]/50" />
                </div>
              </div>

              {/* Message preview */}
              <p className="h-[1.6rem] w-full max-w-[min(70dvw,350px)] truncate text-white/50">
                {chat.messages.slice(-1)[0]?.content}
              </p>
            </div>
          </div>
        </Padded>
      </motion.div>
    </Link>
  );
});
