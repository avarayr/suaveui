import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { NewChatDrawer } from "~/components/NewChatDrawer";
import { FloatingActionButton } from "~/components/primitives/FloatingActionButton";
import { useNotifications } from "~/hooks/useNotifications";
import { ChatList } from "~/layouts/ChatList";
import { api } from "~/trpc/react";

export const Route = createFileRoute("/")({
  component: () => <IndexPage />,
});

function IndexPage() {
  const chats = api.chat.all.useQuery();

  const [isNewChatDrawerOpen, setIsNewChatDrawerOpen] = useState(false);

  const { toggleNotifications, notificationsEnabled } = useNotifications();
  const deleteChatMutation = api.chat.delete.useMutation({
    onSuccess: async () => {
      await chats.refetch();
    },
  });

  return (
    <>
      <ChatList
        layout="ChaiMessage"
        loading={chats.isPending}
        chats={chats.data ?? []}
        onNewChatClick={() => setIsNewChatDrawerOpen(true)}
        areNotificationsEnabled={notificationsEnabled}
        onNotificationToggle={(e) => void toggleNotifications(e)}
        onChatDelete={(chatId) => deleteChatMutation.mutateAsync({ chatId })}
      />

      <NewChatDrawer isOpen={isNewChatDrawerOpen} onClose={() => setIsNewChatDrawerOpen(false)} />

      <FloatingActionButton onClick={() => setIsNewChatDrawerOpen(true)} />
    </>
  );
}
