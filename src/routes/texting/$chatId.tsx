import cuid2 from "@paralleldrive/cuid2";
import { createFileRoute } from "@tanstack/react-router";
import debounce from "lodash/debounce";
import { useCallback, useMemo, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
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
  const messageFetchLimit = 50;
  const queryOpts = { chatId, limit: messageFetchLimit } as const satisfies Parameters<
    typeof api.chat.getMessages.useQuery
  >[0];
  const messagesQuery = api.chat.getMessages.useQuery(queryOpts, {
    enabled: typeof chatId === "string",
    trpc: { ssr: false },
  });

  const editMessageLocally = useCallback(
    (messageId: string, content: string, mode: "replace" | "append") => {
      // Cancel outgoing fetches (so they don't overwrite our optimistic update)
      // await utils.chat.getMessages.cancel(queryOpts);

      // find the message
      const message = utils.chat.getMessages.getData(queryOpts)?.messages.find((m) => m.id === messageId);
      if (!message) {
        console.error("Message not found");
        return false;
      }

      const newContent = mode === "replace" ? content : message.content + content;
      // Optimistically update the data with our new message
      utils.chat.getMessages.setData(queryOpts, (old) => {
        const result = {
          ...old!,
          messages: [...old!.messages.filter((m) => m.id !== messageId), { ...message, content: newContent }],
        };
        console.log(result);
        return result;
      });
    },
    [queryOpts, utils.chat.getMessages],
  );

  const sendMessageMutation = api.chat.sendMessage.useMutation({
    /**
     * Optimistic update
     */
    onMutate: async ({ chatId, content, messageId }) => {
      // Cancel outgoing fetches (so they don't overwrite our optimistic update)
      await utils.chat.getMessages.cancel();

      // Get the data from the queryCache
      const prevData = utils.chat.getMessages.getData(queryOpts);

      // Optimistically update the data with our new post
      utils.chat.getMessages.setData(queryOpts, (old) => ({
        ...old!,
        totalMessageCount: (old?.totalMessageCount ?? 0) + 1,
        messages: [
          ...(old?.messages ?? []),
          {
            id: messageId!,
            content,
            createdAt: new Date(),
            personaID: null,
            reactions: [],
            role: "user",
          },
        ],
      }));

      // Return the previous data so we can revert if something goes wrong
      return { prevData };
    },
    /**
     * Revert on error
     */
    onError: (error, variables, context) => {
      utils.chat.getMessages.setData(queryOpts, context?.prevData);
    },
    onSettled: async (data, error) => {
      void utils.chat.getMessages.invalidate(queryOpts);

      if (!data) return;

      const { chatId: followChatId, followMessageId } = data;

      const fetchResult = await fetch(`/api/direct/generate-message/${followChatId}/${followMessageId}`, {
        method: "GET",
      });

      // this will be a stream
      if (!fetchResult.ok) {
        return;
      }

      const reader = fetchResult.body?.getReader();

      if (!reader) {
        return;
      }

      const textDecoder = new TextDecoder();
      let { done, value } = await reader.read();
      while (!done) {
        const chunk = textDecoder.decode(value);
        editMessageLocally(followMessageId, chunk, "append");
        ({ done, value } = await reader.read());
      }
    },
  });

  const deleteMessageMutation = api.chat.deleteMessage.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate(queryOpts);
    },

    onMutate: async (message) => {
      // Cancel outgoing fetches (so they don't overwrite our optimistic update)
      await utils.chat.getMessages.cancel(queryOpts);

      // Get the data from the queryCache
      const prevData = utils.chat.getMessages.getData(queryOpts);

      // Optimistically update the data with our new post
      utils.chat.getMessages.setData(queryOpts, (old) => ({
        ...old!,
        totalMessageCount: (old?.totalMessageCount ?? 0) - 1,
        messages: old?.messages?.filter((m) => m.id !== message.messageId) ?? [],
      }));

      // Return the previous data so we can revert if something goes wrong
      return { prevData };
    },

    onError: (error, variables, context) => {
      utils.chat.getMessages.setData(queryOpts, context?.prevData);
    },
  });

  const steerMessageMutation = api.chat.steerMessage.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate(queryOpts);
    },
  });

  const regenerateMessageMutation = api.chat.regenerateMessage.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate(queryOpts);
    },
  });

  const reactMessageMutation = api.chat.reactMessage.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate(queryOpts);
    },

    onMutate: async (message) => {
      // Cancel outgoing fetches (so they don't overwrite our optimistic update)
      await utils.chat.getMessages.cancel(queryOpts);

      // Get the data from the queryCache
      const prevData = utils.chat.getMessages.getData({
        chatId,
      });

      // Optimistically update the data with our new post
      utils.chat.getMessages.setData(queryOpts, (old) => ({
        ...old!,
        messages:
          old?.messages?.map((m) =>
            m.id === message.messageId
              ? { ...m, reactions: [...(m.reactions ?? []), { type: message.reaction, from: "user" } as const] }
              : m,
          ) ?? [],
      }));

      // Return the previous data so we can revert if something goes wrong
      return { prevData };
    },

    onError: (error, variables, context) => {
      utils.chat.getMessages.setData(queryOpts, context?.prevData);
    },
  });

  const editMessageMutation = api.chat.editMessage.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate(queryOpts);
    },

    onMutate: async (message) => {
      // Get the data from the queryCache
      await utils.chat.getMessages.cancel(queryOpts);
      const prevData = utils.chat.getMessages.getData(queryOpts);
      editMessageLocally(message.messageId, message.content, "replace");

      // Return the previous data so we can revert if something goes wrong
      return { prevData };
    },

    onError: (error, variables, context) => {
      utils.chat.getMessages.setData(queryOpts, context?.prevData);
    },
  });

  const handleLoadMore = useDebounceCallback(async () => {
    const data = await utils.chat.getMessages.fetch({
      chatId,
      limit: messageFetchLimit,
      offset: (messagesQuery.data?.messages.length ?? 0) + 1,
    });

    if (data) {
      utils.chat.getMessages.setData(queryOpts, (old) => ({
        ...old!,
        messages: [...old!.messages, ...data.messages],
      }));
    }
  }, 200) as () => Promise<void>;

  const moreMessagesAvailable = useMemo(() => {
    return (messagesQuery?.data?.totalMessageCount ?? 0) > (messagesQuery.data?.messages.length ?? 0);
  }, [messagesQuery?.data]);

  const handleMessageSend = async (message: string) => {
    return await sendMessageMutation.mutateAsync({ chatId, content: message, messageId: cuid2.createId() });
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

  if (typeof chatId !== "string") {
    return null;
  }

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
      onLoadMore={handleLoadMore}
      moreMessagesAvailable={moreMessagesAvailable}
      loading={false}
    />
  );
}
