import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { NewChatDrawer } from "~/components/NewChatDrawer";
import { FloatingActionButton } from "~/components/primitives/FloatingActionButton";
import { useNotifications } from "~/hooks/useNotifications";
import { ChatList } from "~/layouts/ChatList";
import { api } from "~/trpc/react";
import { ClientConsts } from "~/utils/client-consts";

export const Route = createFileRoute("/")({
  component: () => <IndexPage />,
});

function IndexPage() {
  const chats = api.chat.all.useQuery();

  const [isNewChatDrawerOpen, setIsNewChatDrawerOpen] = useState(false);

  const { toggleNotifications, notificationsEnabled } = useNotifications();

  return (
    <>
      <ChatList
        loading={chats.isPending}
        layout="ChaiMessage"
        chats={chats.data ?? []}
        onNewChatClick={() => setIsNewChatDrawerOpen(true)}
        areNotificationsEnabled={notificationsEnabled}
        onNotificationToggle={(e) => void toggleNotifications(e)}
      />

      <NewChatDrawer isOpen={isNewChatDrawerOpen} onClose={() => setIsNewChatDrawerOpen(false)} />

      <FloatingActionButton onClick={() => setIsNewChatDrawerOpen(true)} />
    </>
  );
}
