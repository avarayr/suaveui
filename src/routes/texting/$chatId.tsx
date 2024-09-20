import cuid2 from "@paralleldrive/cuid2";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { useMessageGeneration } from "~/hooks/useMessageGeneration";
import { useRouteTransitioning } from "~/hooks/useRouteTransitioning";
import { Texting } from "~/layouts/Texting";
import { Reaction } from "~/layouts/types";
import { api } from "~/trpc/react";
import { ClientConsts } from "~/utils/client-consts";

export const Route = createFileRoute("/texting/$chatId")({
  component: () => <TextingPage />,
});

const abortControllers = new Map<string, AbortController>();
const followingMessageIds = new Map<string, boolean>();

function TextingPage() {
  const { chatId } = Route.useParams();
  const { editMessageLocally, followNewMessages } = useMessageGeneration(chatId);

  const utils = api.useUtils();
  const [editingMessageId, setEditingMessageId] = useState<string | undefined>(undefined);

  const queryOpts = { chatId, limit: ClientConsts.MessageLoadLimit } as const satisfies Parameters<
    typeof api.chat.getMessages.useQuery
  >[0];

  const messagesQuery = api.chat.getMessages.useQuery(queryOpts, {
    enabled: typeof chatId === "string",
    trpc: { ssr: false },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const interruptGenerationMutation = api.chat.interruptGeneration.useMutation({
    onSuccess: async (data, { messageId }) => {
      if (data.success) {
        const content = data.result?.trim();
        if (content) {
          await editMessageLocally({ messageId, content, mode: "replace" });
        }
        return;
      }
      // invalidate the query
      await utils.chat.getMessages.invalidate(queryOpts);
    },
  });

  useEffect(() => {
    if (messagesQuery.data?.messages) {
      followNewMessages(messagesQuery.data.messages.map((m) => ({ id: m.id, isGenerating: m.isGenerating ?? false })));
    }
  }, [messagesQuery.data?.messages, followNewMessages]);

  useEffect(() => {
    return () => {
      abortControllers.forEach((controller) => controller.abort());
      followingMessageIds.clear();
      abortControllers.clear();
    };
  }, []);

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
            loading: false,
            isGenerating: false,
            role: "user",
          },
        ],
      }));

      // wait a little before sending the message (optimistic update will appear instantly)
      // this is for good UX purposes
      await new Promise((resolve) => setTimeout(resolve, 700));

      // Return the previous data so we can revert if something goes wrong
      return { prevData };
    },
    /**
     * Revert on error
     */
    onError: (error, variables, context) => {
      utils.chat.getMessages.setData(queryOpts, context?.prevData);
    },

    onSuccess: async (data, error) => {
      await utils.chat.getMessages.invalidate(queryOpts);
    },
  });

  const deleteMessageMutation = api.chat.deleteMessage.useMutation({
    onSuccess: async () => {
      // TODO: figure out how to make this work with pagination
      // await utils.chat.getMessages.invalidate(queryOpts);
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
    onSuccess: async () => {
      await utils.chat.getMessages.invalidate(queryOpts);
    },
  });

  const regenerateMessageMutation = api.chat.regenerateMessage.useMutation({
    onSuccess: async () => {
      // TODO: figure out how to make this work with pagination
      await utils.chat.getMessages.invalidate(queryOpts);
    },
  });

  const continueGeneratingMutation = api.chat.continueGenerating.useMutation({
    onSuccess: async () => {
      await utils.chat.getMessages.invalidate(queryOpts);
    },
  });

  const reactMessageMutation = api.chat.reactMessage.useMutation({
    onSuccess: async () => {
      await utils.chat.getMessages.invalidate(queryOpts);
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
    onSuccess: async () => {
      await utils.chat.getMessages.invalidate(queryOpts);
    },

    onMutate: async (message) => {
      // Get the data from the queryCache
      await utils.chat.getMessages.cancel(queryOpts);
      const prevData = utils.chat.getMessages.getData(queryOpts);
      await editMessageLocally({ messageId: message.messageId, content: message.content, mode: "replace" });

      // Return the previous data so we can revert if something goes wrong
      return { prevData };
    },

    onError: (error, variables, context) => {
      utils.chat.getMessages.setData(queryOpts, context?.prevData);
    },
  });

  const importConversationMutation = api.chat.importConversation.useMutation({
    onSuccess: async () => {
      await utils.chat.getMessages.invalidate(queryOpts);
    },
  });

  const handleImportConversation = useCallback(
    async (content: string) => {
      await importConversationMutation.mutateAsync({ chatId, content });
    },
    [chatId, importConversationMutation],
  );

  const handleLoadMore = useDebounceCallback(async () => {
    const data = await utils.chat.getMessages.fetch({
      chatId,
      limit: ClientConsts.MessageLoadLimit,
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

  const handleMessageSend = useCallback(
    async (message: string) => {
      return await sendMessageMutation.mutateAsync({ chatId, content: message, messageId: cuid2.createId() });
    },
    [chatId, sendMessageMutation],
  );

  const handleMessageDelete = useCallback(
    async (messageId: string) => {
      await deleteMessageMutation.mutateAsync({ chatId, messageId });
    },
    [chatId, deleteMessageMutation],
  );

  const handleMessageSteer = useCallback(
    async (messageId: string) => {
      await steerMessageMutation.mutateAsync({ chatId, messageId });
    },
    [chatId, steerMessageMutation],
  );

  const handleMessageReact = useCallback(
    async (messageId: string, reaction: Reaction["type"]) => {
      await reactMessageMutation.mutateAsync({ chatId, messageId, reaction });
    },
    [chatId, reactMessageMutation],
  );

  const handleMessageRegenerate = useCallback(
    async (messageId: string) => {
      await regenerateMessageMutation.mutateAsync({ chatId, messageId });
    },
    [chatId, regenerateMessageMutation],
  );

  const handleMessageEditStart = useCallback((messageId: string) => {
    setEditingMessageId(messageId);
  }, []);

  const handleMessageEditDismiss = useCallback((messageId: string) => {
    setEditingMessageId(undefined);
  }, []);

  const handleMessageEditSubmit = useCallback(
    async (messageId: string, newContent: string) => {
      await editMessageMutation.mutateAsync({ chatId: String(chatId), messageId, content: newContent });
      setEditingMessageId(undefined);
    },
    [chatId, editMessageMutation],
  );

  const handleMessageInterrupt = useCallback(
    async (messageId: string) => {
      abortControllers.get(messageId)?.abort("User aborted");
      await interruptGenerationMutation.mutateAsync({ chatId, messageId });
    },
    [chatId, interruptGenerationMutation],
  );

  const handleMessageContinue = useCallback(
    async (messageId: string) => {
      await continueGeneratingMutation.mutateAsync({ chatId, messageId });
    },
    [chatId, continueGeneratingMutation],
  );

  const handleRefetchChat = useCallback(async () => {
    await utils.chat.getMessages.invalidate(queryOpts);
  }, [utils.chat.getMessages, queryOpts]);

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
      onMessageContinue={handleMessageContinue}
      onMessageReact={handleMessageReact}
      onMessageRegenerate={handleMessageRegenerate}
      onMessageEditStart={handleMessageEditStart}
      onMessageEditDismiss={handleMessageEditDismiss}
      onMessageEditSubmit={handleMessageEditSubmit}
      onMessageInterrupt={handleMessageInterrupt}
      editingMessageId={editingMessageId}
      onLoadMore={handleLoadMore}
      onRefetchChat={handleRefetchChat}
      moreMessagesAvailable={moreMessagesAvailable}
      loading={false}
      onImportConversation={handleImportConversation}
    />
  );
}
