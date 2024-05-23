import cuid2 from "@paralleldrive/cuid2";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { Texting } from "~/layouts/Texting";
import { Reaction } from "~/layouts/types";
import { api } from "~/trpc/react";

export const Route = createFileRoute("/texting/$chatId")({
  component: () => <TextingPage />,
});

const abortControllers = new Map<string, AbortController>();
const followingMessageIds = new Map<string, boolean>();

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
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const editMessageLocally = useCallback(
    ({
      messageId,
      content,
      mode,
      isGenerating,
    }: {
      messageId: string;
      content: string;
      mode: "replace" | "append";
      isGenerating?: boolean;
    }) => {
      // Cancel outgoing fetches
      void utils.chat.getMessages.cancel(queryOpts);

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
          messages: [
            ...old!.messages.filter((m) => m.id !== messageId),
            {
              ...message,
              isGenerating: isGenerating !== undefined ? isGenerating : message.isGenerating,
              content: newContent,
            },
          ] satisfies (typeof message)[],
        };
        return result;
      });
    },
    [queryOpts, utils.chat.getMessages],
  );

  const interruptGenerationMutation = api.chat.interruptGeneration.useMutation({
    onSuccess: async (data, { messageId }) => {
      if (data.success) {
        const content = data.result?.trim();
        if (content) {
          editMessageLocally({ messageId, content, mode: "replace" });
        }
        return;
      }
      // invalidate the query
      await utils.chat.getMessages.invalidate(queryOpts);
    },
  });

  const tryFollowMessageGeneration = useCallback(
    async ({ chatId, messageId }: { chatId: string; messageId: string }) => {
      try {
        // if there's abort controller, abort it
        if (abortControllers.get(messageId)) {
          abortControllers.get(messageId)?.abort();
          abortControllers.delete(messageId);
        }

        // set the abort controller
        abortControllers.set(messageId, new AbortController());

        const fetchResult = await fetch(`/api/follow-message/${chatId}/${messageId}`, {
          method: "GET",
          headers: {
            Connection: "keep-alive",
          },
          signal: abortControllers.get(messageId)?.signal,
        });

        if (!fetchResult.ok) {
          return;
        }

        const reader = fetchResult.body?.getReader();

        if (!reader) {
          return;
        }

        const textDecoder = new TextDecoder();
        let { done, value } = await reader.read();
        while (!done && abortControllers.get(messageId)?.signal?.aborted === false) {
          const chunk = textDecoder.decode(value);
          editMessageLocally({ messageId: messageId, content: chunk, mode: "append", isGenerating: true });
          ({ done, value } = await reader.read());
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          // ignore abort errors
          return;
        }
        console.error(e);
      } finally {
        // set isLoading to false
        editMessageLocally({ messageId: messageId, content: "", mode: "append", isGenerating: false });
        // clean up the abort controller
        abortControllers.delete(messageId);
      }
    },
    [editMessageLocally],
  );

  useEffect(() => {
    void (async () => {
      const lastMessages = messagesQuery.data?.messages;
      for (const message of lastMessages ?? []) {
        if (followingMessageIds.has(message.id)) {
          continue;
        }

        if (message.isGenerating) {
          followingMessageIds.set(message.id, true);
          await tryFollowMessageGeneration({ chatId, messageId: message.id });
          followingMessageIds.delete(message.id);
        }
      }
    })();
  }, [chatId, messagesQuery.data?.messages, tryFollowMessageGeneration]);

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
      await utils.chat.getMessages.invalidate(queryOpts);
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
      editMessageLocally({ messageId: message.messageId, content: message.content, mode: "replace" });

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
      moreMessagesAvailable={moreMessagesAvailable}
      loading={false}
    />
  );
}
