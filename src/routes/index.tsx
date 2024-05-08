import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { NewChatDrawer } from "~/components/NewChatDrawer";
import { FloatingActionButton } from "~/components/primitives/FloatingActionButton";
import { ChatList } from "~/layouts/ChatList";
import { api } from "~/trpc/react";

export const Route = createFileRoute("/")({
  component: () => <IndexPage />,
});

function IndexPage() {
  const [isNewChatDrawerOpen, setIsNewChatDrawerOpen] = useState(false);
  const chats = api.chat.all.useQuery();

  return (
    <>
      <ChatList
        loading={chats.isPending}
        layout="ChaiMessage"
        chats={chats.data ?? []}
        onNewChatClick={() => setIsNewChatDrawerOpen(true)}
      />

      <NewChatDrawer isOpen={isNewChatDrawerOpen} onClose={() => setIsNewChatDrawerOpen(false)} />

      <FloatingActionButton onClick={() => setIsNewChatDrawerOpen(true)} />
    </>
  );
}
