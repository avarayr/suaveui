import cuid2 from "@paralleldrive/cuid2";
import { createFileRoute } from "@tanstack/react-router";
import debounce from "lodash/debounce";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { Texting } from "~/layouts/Texting";
import { Reaction } from "~/layouts/types";
import { api } from "~/trpc/react";

export const Route = createFileRoute("/texting/$chatId")({
  component: () => <TextingPage />,
});

// map of message id to abort controller

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
  });

  const interruptGenerationMutation = api.chat.interruptGeneration.useMutation({
    onSuccess: () => {
      void utils.chat.getMessages.invalidate(queryOpts);
    },
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

  const tryFollowMessageGeneration = useCallback(
    async ({ chatId, messageId }: { chatId: string; messageId: string }) => {
      try {
        // set the abort controller
        abortControllers.set(messageId, new AbortController());

        const fetchResult = await fetch(`/api/follow-message/${chatId}/${messageId}`, {
          method: "GET",
          headers: {
            Connection: "keep-alive",
          },
          signal: abortControllers.get(messageId)?.signal,
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
      const lastMessages = messagesQuery.data?.messages.slice(-5);
      for (const message of lastMessages ?? []) {
        if (followingMessageIds.has(message.id)) {
          console.log("Already following this!", { followingMessageIds });
          continue;
        }
        if (message.isGenerating) {
          console.log("Trying to follow", { followingMessageIds });
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

    onSuccess: (data, error) => {
      void utils.chat.getMessages.invalidate(queryOpts);
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

  const continueGeneratingMutation = api.chat.continueGenerating.useMutation({
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

  const handleMessageInterrupt = async (messageId: string) => {
    abortControllers.get(messageId)?.abort("User aborted");
    await interruptGenerationMutation.mutateAsync({ chatId, messageId });
  };

  const handleMessageContinue = async (messageId: string) => {
    await continueGeneratingMutation.mutateAsync({ chatId, messageId });
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
