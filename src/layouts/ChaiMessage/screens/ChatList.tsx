"use client";

import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { BellOff, BellPlus, BellRing, ChevronRight, Search, Settings } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { SpinnerIcon } from "~/components/primitives/SpinnerIcon";
import { Input } from "../../../components/primitives/Input";
import { type ChatListProps } from "../../types";
import { Avatar } from "../components/Avatar";
import { Padded } from "../components/Padded";
import { ChaiColors } from "../types";

export const ChatList = React.memo(
  ({ chats, onNewChatClick, loading, areNotificationsEnabled, onNotificationToggle }: ChatListProps) => {
    const [loadingChatId, setLoadingChatId] = useState<string | undefined>(undefined);

    const [searchValue, setSearchValue] = useState("");
    const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
    function handleSearchInputFocus() {
      setIsSearchInputFocused(true);
    }

    function handleSearchInputBlur() {
      setIsSearchInputFocused(false);
      setSearchValue("");
    }

    const filteredChat = useMemo(() => {
      if (!isSearchInputFocused) return chats;

      return chats.filter((chat) => {
        const searchTerm = searchValue.toLowerCase();
        return chat.persona?.name.toLowerCase().includes(searchTerm || "__##__");
      });
    }, [chats, isSearchInputFocused, searchValue]);

    useEffect(() => {
      if (isSearchInputFocused) {
        setTimeout(() => {
          document.querySelector("meta[name='theme-color']")?.setAttribute("content", ChaiColors.ACTIVITYBAR);
        }, 100);
      } else {
        document.querySelector("meta[name='theme-color']")?.setAttribute("content", ChaiColors.BACKGROUND);
      }
    }, [isSearchInputFocused]);

    return (
      <motion.main className="flex h-dvh w-dvw flex-col overflow-x-hidden bg-black text-white antialiased">
        <AnimatePresence initial={false}>
          {!isSearchInputFocused && (
            <motion.div
              initial={{ height: 0, y: -50, opacity: 0 }}
              animate={{ height: "auto", y: 0, opacity: 1 }}
              exit={{ height: 0, y: -50, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="overflow-visible"
            >
              <Padded className="mt-16 flex items-center justify-between">
                <h1 className="text-4xl font-bold">ChaiMessages</h1>

                <section className="header--actions flex items-center gap-3">
                  <button
                    className="text-2xl text-white/50 hover:text-white"
                    onClick={() => onNotificationToggle?.(!areNotificationsEnabled)}
                  >
                    {areNotificationsEnabled ? <BellRing /> : <BellOff />}
                  </button>

                  <button className="text-2xl text-white/50 hover:text-white">
                    <Settings />
                  </button>
                </section>
              </Padded>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Activity Bar */}
        <AnimatePresence>
          <div
            className={twMerge(
              "duration-[350ms] flex min-h-[3rem] w-full items-center px-5 text-white transition-all",
              isSearchInputFocused && "py-3",
            )}
            style={{
              backgroundColor: isSearchInputFocused ? ChaiColors.ACTIVITYBAR : undefined,
            }}
          >
            <Input
              placeholder="Search"
              className="flex-grow"
              onFocus={handleSearchInputFocus}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              icon={<Search />}
              name="search"
            />

            <AnimatePresence>
              {isSearchInputFocused && (
                <motion.div
                  className="relative cursor-pointer"
                  style={{ color: ChaiColors.LINK }}
                  onClick={handleSearchInputBlur}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{
                    width: "auto",
                    marginLeft: "0.7rem",
                    right: -3,
                    opacity: 1,
                  }}
                  exit={{ width: 0, marginLeft: "0rem", opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                >
                  Cancel
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </AnimatePresence>

        <AnimatePresence>
          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <SpinnerIcon className="size-6" variant="ios" />
            </div>
          )}

          {/* Chat */}
          <div className="mt-2 flex flex-col">
            <AnimatePresence initial={true}>
              {filteredChat.map((chat) => (
                <Link to={`/texting/$chatId`} params={{ chatId: chat.id }} key={chat.id} className="group">
                  <motion.div
                    key={chat.id}
                    className="flex select-none items-center justify-between text-[1.05rem] *:select-none active:bg-[#3d3d44] active:text-white"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -25 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    onClick={() => setLoadingChatId(chat.id)}
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
                              <time className="text-[0.95rem] text-[#8F8F95]/90">
                                {/* TODO */}
                                {/* {formatDate(
                                  new Date(chat.lastMessage?.createdAt ?? 0),
                                )} */}
                              </time>
                              {loadingChatId === chat.id ? (
                                <SpinnerIcon variant="ios" className="size-[1.2rem]" />
                              ) : (
                                <ChevronRight className="size-[1.2rem] text-[#8F8F95]/50" />
                              )}
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
              ))}
            </AnimatePresence>
          </div>
        </AnimatePresence>
      </motion.main>
    );
  },
);
