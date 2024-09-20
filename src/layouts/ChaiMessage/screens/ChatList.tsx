import { AnimatePresence, motion } from "framer-motion";
import { BellOff, BellRing, Search, Settings, Trash } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { SpinnerIcon } from "~/components/primitives/SpinnerIcon";
import { RouterOutput } from "~/trpc/react";
import { Input } from "../../../components/primitives/Input";
import { type ChatListProps } from "../../types";
import { ChatListItem } from "../components/ChatListItem";
import { Padded } from "../components/Padded";
import { Tapback } from "../components/Tapback";
import { ChaiColors } from "../types";
import { useRouteTransitioning } from "~/hooks/useRouteTransitioning";

type Chat = RouterOutput["chat"]["all"][number];

export const ChatList = React.memo(
  ({ chats, loading, areNotificationsEnabled, onNotificationToggle, onChatDelete, onSettingsClick }: ChatListProps) => {
    const [tapbackChatID, setTapbackChatID] = useState<string | undefined>();
    const [searchValue, setSearchValue] = useState("");
    const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);

    const filteredChats = useMemo<Chat[]>(() => {
      if (!isSearchInputFocused) return chats;

      const searchTerm = searchValue.toLowerCase();
      const filteredChat = chats.filter((chat) => chat.persona?.name.toLowerCase().includes(searchTerm));
      return filteredChat;
    }, [chats, isSearchInputFocused, searchValue]);

    return (
      <motion.main className="flex h-dvh w-dvw flex-col overflow-x-hidden bg-black text-white antialiased">
        <AnimatePresence initial={false}>
          {!isSearchInputFocused && (
            <Header
              areNotificationsEnabled={areNotificationsEnabled}
              onNotificationToggle={onNotificationToggle}
              onSettingsClick={onSettingsClick}
            />
          )}
        </AnimatePresence>

        <ActivityBar
          isSearchInputFocused={isSearchInputFocused}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          setIsSearchInputFocused={setIsSearchInputFocused}
        />

        {loading ? (
          <Loading />
        ) : (
          <ChatListItems
            chats={filteredChats}
            tapbackChatID={tapbackChatID}
            setTapbackChatID={setTapbackChatID}
            onChatDelete={onChatDelete}
          />
        )}
      </motion.main>
    );
  },
);

export const Header = React.memo(
  ({
    areNotificationsEnabled,
    onNotificationToggle,
    onSettingsClick,
  }: {
    areNotificationsEnabled: boolean | undefined;
    onNotificationToggle?: (enabled: boolean) => void;
    onSettingsClick?: () => void;
  }) => {
    return (
      <motion.div
        initial={{ height: 0, y: -50, opacity: 0 }}
        animate={{ height: "auto", y: 0, opacity: 1 }}
        exit={{ height: 0, y: -50, opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="overflow-visible"
        key="header"
      >
        <Padded className="mt-16 flex items-center justify-between">
          <h1 className="text-4xl font-bold">ChaiMessages</h1>

          <section className="header--actions flex items-center gap-3">
            <button
              className="text-2xl text-white/50 hover:text-white"
              onClick={() => onNotificationToggle?.(!areNotificationsEnabled)}
              aria-label={areNotificationsEnabled ? "Disable Notifications" : "Enable Notifications"}
            >
              {areNotificationsEnabled ? <BellRing /> : <BellOff />}
            </button>

            <button className="text-2xl text-white/50 hover:text-white" aria-label="Settings" onClick={onSettingsClick}>
              <Settings />
            </button>
          </section>
        </Padded>
      </motion.div>
    );
  },
);

export const ActivityBar = React.memo(
  ({
    isSearchInputFocused,
    searchValue,
    setSearchValue,
    setIsSearchInputFocused,
  }: {
    isSearchInputFocused: boolean;
    searchValue: string;
    setSearchValue: (value: string) => void;
    setIsSearchInputFocused: (focused: boolean) => void;
  }) => {
    const handleSearchInputFocus = useCallback(() => {
      setIsSearchInputFocused(true);
      document.querySelector("meta[name='theme-color']")?.setAttribute("content", ChaiColors.ACTIVITYBAR);
      document.body.style.backgroundColor = ChaiColors.ACTIVITYBAR;
    }, [setIsSearchInputFocused]);

    const handleSearchInputBlur = useCallback(() => {
      setIsSearchInputFocused(false);
      setSearchValue("");
      document.querySelector("meta[name='theme-color']")?.setAttribute("content", ChaiColors.BACKGROUND);
      document.body.style.backgroundColor = ChaiColors.BACKGROUND;
    }, [setIsSearchInputFocused, setSearchValue]);

    return (
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
                className="relative ml-2 cursor-pointer"
                style={{ color: ChaiColors.LINK }}
                onClick={handleSearchInputBlur}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                Cancel
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AnimatePresence>
    );
  },
);

export const Loading = React.memo(() => {
  return (
    <motion.div className="absolute inset-0 flex items-center justify-center">
      <SpinnerIcon className="size-6" variant="ios" />
    </motion.div>
  );
});

const ChatListItems = React.memo(
  ({
    chats,
    tapbackChatID,
    setTapbackChatID,
    onChatDelete,
  }: {
    chats: Chat[];
    tapbackChatID: string | undefined;
    setTapbackChatID: (chatID: string | undefined) => void;
    onChatDelete?: (chatID: string) => unknown;
  }) => {
    const [, , routeTransitioningClassName] = useRouteTransitioning();

    return (
      <div className="mt-2 flex flex-col">
        <AnimatePresence initial={false}>
          {chats.map((chat) => (
            <Tapback
              key={chat.id}
              blur
              blurClassName="bg-white/5"
              className={twMerge(chat.id === tapbackChatID && "fixed left-0 right-0 top-4 mx-auto w-fit")}
              menuClassName="w-[250px]"
              onOpenChange={(isOpen) => setTapbackChatID(isOpen ? chat.id : undefined)}
              isOpen={chat.id === tapbackChatID}
              actions={[
                {
                  label: "Delete",
                  className: "text-red-500",
                  icon: <Trash className="size-5" />,
                  onPress: () => onChatDelete?.(chat.id),
                },
              ]}
            >
              {chat.id === tapbackChatID ? (
                <ChatPreviewFrame chatId={chat.id} />
              ) : (
                <motion.div
                  layoutId={`chat_list_item_${chat.id}`}
                  transition={{ type: "spring", stiffness: 260, damping: 27, duration: 0.4 }}
                  className={twMerge("overflow-hidden", routeTransitioningClassName)}
                >
                  <ChatListItem chat={chat} />
                </motion.div>
              )}
            </Tapback>
          ))}
        </AnimatePresence>
      </div>
    );
  },
);

const ChatPreviewFrame = React.memo(({ chatId }: { chatId: string }) => {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <motion.div
      layoutId={`chat_list_item_${chatId}`}
      transition={{ type: "spring", stiffness: 260, damping: 27, duration: 0.4 }}
      className="relative mx-auto mt-auto w-[90dvw] max-w-[600px] rounded-2xl bg-[#1C1C1E] shadow-2xl shadow-white/[2%]"
    >
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#1C1C1E]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.3 } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <SpinnerIcon variant="ios" className="size-6" />
          </motion.div>
        )}
      </AnimatePresence>
      <iframe
        id={`texting-iframe${chatId}`}
        src={`/texting/${chatId}?frameless=true`}
        className="h-[calc(80dvh-50px)] w-full rounded-2xl border-none bg-transparent"
        onLoad={handleLoad}
      />
    </motion.div>
  );
});
