import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Texting } from "~/layouts/Texting";
import { Reaction } from "~/layouts/types";
import { api } from "~/trpc/react";

export const Route = createFileRoute("/texting/$chatId")({
  component: () => <TextingPage />,
});

function TextingPage() {
  const { chatId } = Route.useParams();
  const utils = api.useUtils();
  const [editingMessageId, setEditingMessageId] = useState<string | undefined>(undefined);

  const messagesQuery = api.chat.getMessages.useQuery(
    { chatId },
    {
      enabled: typeof chatId === "string",
      trpc: { ssr: false },
    },
  );

  const sendMessageMutation = api.chat.sendMessage.useMutation({
    /**
     * Optimistic update
     */
    onMutate: async ({ chatId, content }) => {
      // Cancel outgoing fetches (so they don't overwrite our optimistic update)
      await utils.chat.getMessages.cancel({ chatId: String(chatId) });

      // Get the data from the queryCache
      const prevData = utils.chat.getMessages.getData({ chatId });

      // Optimistically update the data with our new post
      utils.chat.getMessages.setData(
        {
          chatId,
        },
        (old) => ({
          chat: old!.chat,
          ...old,
          messages: [
            ...(old?.messages ?? []),
            {
              id: new Date().toISOString(),
              content,
              createdAt: new Date(),
              personaID: null,
              reactions: [],
              role: "user",
            },
          ],
        }),
      );

      // Return the previous data so we can revert if something goes wrong
      return { prevData };
    },
    /**
     * Revert on error
     */
    onError: (error, variables, context) => {
      utils.chat.getMessages.setData({ chatId: String(chatId) }, context?.prevData);
    },
    onSettled: () => {
      void utils.chat.getMessages.invalidate({ chatId: String(chatId) });
    },
  });

  const deleteMessageMutation = api.chat.deleteMessage.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate({ chatId: String(chatId) });
    },

    onMutate: async (message) => {
      // Cancel outgoing fetches (so they don't overwrite our optimistic update)
      await utils.chat.getMessages.cancel({ chatId: String(chatId) });

      // Get the data from the queryCache
      const prevData = utils.chat.getMessages.getData({
        chatId,
      });

      // Optimistically update the data with our new post
      utils.chat.getMessages.setData(
        {
          chatId,
        },
        (old) => ({
          chat: old!.chat,
          messages: old?.messages?.filter((m) => m.id !== message.messageId) ?? [],
        }),
      );

      // Return the previous data so we can revert if something goes wrong
      return { prevData };
    },

    onError: (error, variables, context) => {
      utils.chat.getMessages.setData({ chatId: chatId }, context?.prevData);
    },
  });

  const steerMessageMutation = api.chat.steerMessage.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate({ chatId: String(chatId) });
    },
  });

  const regenerateMessageMutation = api.chat.regenerateMessage.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate({ chatId: String(chatId) });
    },
  });

  const reactMessageMutation = api.chat.reactMessage.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate({ chatId: String(chatId) });
    },

    onMutate: async (message) => {
      // Cancel outgoing fetches (so they don't overwrite our optimistic update)
      await utils.chat.getMessages.cancel({ chatId: String(chatId) });

      // Get the data from the queryCache
      const prevData = utils.chat.getMessages.getData({
        chatId,
      });

      // Optimistically update the data with our new post
      utils.chat.getMessages.setData(
        {
          chatId,
        },
        (old) => ({
          chat: old!.chat,
          messages:
            old?.messages?.map((m) =>
              m.id === message.messageId
                ? { ...m, reactions: [...(m.reactions ?? []), { type: message.reaction, from: "user" } as const] }
                : m,
            ) ?? [],
        }),
      );

      // Return the previous data so we can revert if something goes wrong
      return { prevData };
    },

    onError: (error, variables, context) => {
      utils.chat.getMessages.setData({ chatId }, context?.prevData);
    },
  });

  const editMessageMutation = api.chat.editMessage.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate({ chatId: String(chatId) });
    },

    onMutate: async (message) => {
      // Cancel outgoing fetches (so they don't overwrite our optimistic update)
      await utils.chat.getMessages.cancel({ chatId: String(chatId) });

      // Get the data from the queryCache
      const prevData = utils.chat.getMessages.getData({
        chatId,
      });

      // Optimistically update the data with our new post
      utils.chat.getMessages.setData(
        {
          chatId,
        },
        (old) => ({
          chat: old!.chat,
          messages:
            old?.messages?.map((m) => (m.id === message.messageId ? { ...m, content: message.content } : m)) ?? [],
        }),
      );

      // Return the previous data so we can revert if something goes wrong
      return { prevData };
    },

    onError: (error, variables, context) => {
      utils.chat.getMessages.setData({ chatId }, context?.prevData);
    },
  });

  if (typeof chatId !== "string") {
    return null;
  }

  const handleMessageSend = async (message: string) => {
    await sendMessageMutation.mutateAsync({ chatId, content: message });
  };

  const handleMessageDelete = async (messageId: string) => {
    await deleteMessageMutation.mutateAsync({ chatId, messageId });
  };

  const handleMessageSteer = async (messageId: string) => {
    await steerMessageMutation.mutateAsync({ chatId, messageId });
  };

  const handleMessageReact = async (messageId: string, reaction: Reaction["type"]) => {
    await reactMessageMutation.mutateAsync({ chatId, messageId, reaction });
  };

  const handleMessageRegenerate = async (messageId: string) => {
    await regenerateMessageMutation.mutateAsync({ chatId, messageId });
  };

  const handleMessageEditStart = (messageId: string) => {
    setEditingMessageId(messageId);
  };

  const handleMessageEditDismiss = (messageId: string) => {
    setEditingMessageId(undefined);
  };

  const handleMessageEditSubmit = async (messageId: string, newContent: string) => {
    await editMessageMutation.mutateAsync({ chatId: String(chatId), messageId, content: newContent });
    setEditingMessageId(undefined);
  };

  return (
    <Texting
      layout="ChaiMessage"
      chatId={chatId}
      data={messagesQuery.data}
      onMessageSend={handleMessageSend}
      onMessageDelete={handleMessageDelete}
      onMessageSteer={handleMessageSteer}
      onMessageReact={handleMessageReact}
      onMessageRegenerate={handleMessageRegenerate}
      onMessageEditStart={handleMessageEditStart}
      onMessageEditDismiss={handleMessageEditDismiss}
      onMessageEditSubmit={handleMessageEditSubmit}
      editingMessageId={editingMessageId}
    />
  );
}
