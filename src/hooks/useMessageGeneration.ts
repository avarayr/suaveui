import { useCallback, useEffect, useMemo, useRef } from "react";
import { api } from "~/trpc/react";
import { ClientConsts } from "~/utils/client-consts";

export function useMessageGeneration(chatId: string) {
  const utils = api.useUtils();
  const abortControllers = useRef(new Map<string, AbortController>());
  const followingMessageIds = useRef(new Map<string, boolean>());

  const queryOpts = useMemo(() => ({ chatId, limit: ClientConsts.MessageLoadLimit }) as const, [chatId]);

  const editMessageLocally = useCallback(
    async ({
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
      await utils.chat.getMessages.cancel(queryOpts);

      utils.chat.getMessages.setData(queryOpts, (old) => {
        if (!old) return old;
        const message = old.messages.find((m) => m.id === messageId);
        if (!message) return old;

        const newContent = mode === "replace" ? content : message.content + content;

        return {
          ...old,
          messages: old.messages.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isGenerating: isGenerating !== undefined ? isGenerating : m.isGenerating,
                  content: newContent,
                }
              : m,
          ),
        };
      });
    },
    [queryOpts, utils.chat.getMessages],
  );

  const tryFollowMessageGeneration = useCallback(
    async (messageId: string) => {
      let result = "";
      try {
        if (abortControllers.current.get(messageId)) {
          abortControllers.current.get(messageId)?.abort();
          abortControllers.current.delete(messageId);
        }

        abortControllers.current.set(messageId, new AbortController());

        const fetchResult = await fetch(`/api/follow-message/${chatId}/${messageId}`, {
          method: "GET",
          headers: {
            Connection: "keep-alive",
          },
          signal: abortControllers.current.get(messageId)?.signal,
        });

        if (!fetchResult.ok) {
          console.error("Failed to fetch message generation");
          return;
        }

        const reader = fetchResult.body?.getReader();
        if (!reader) {
          console.error("Failed to get reader");
          return;
        }

        const textDecoder = new TextDecoder();
        let { done, value } = await reader.read();
        while (!done && !abortControllers.current.get(messageId)?.signal?.aborted) {
          const chunk = textDecoder.decode(value);
          result += chunk;
          await editMessageLocally({ messageId, content: chunk, mode: "append", isGenerating: true });
          ({ done, value } = await reader.read());
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          return;
        }
        console.error(e);
      } finally {
        await editMessageLocally({ messageId, content: "", mode: "append", isGenerating: false });
        abortControllers.current.delete(messageId);
      }

      // Return the finished message content
      return result;
    },
    [chatId, editMessageLocally],
  );

  const followNewMessages = useCallback(
    (messages: { id: string; isGenerating: boolean }[]) => {
      void (async () => {
        for (const message of messages ?? []) {
          if (followingMessageIds.current.has(message.id)) {
            continue;
          }

          if (message.isGenerating) {
            followingMessageIds.current.set(message.id, true);
            await tryFollowMessageGeneration(message.id);
            followingMessageIds.current.delete(message.id);
          }
        }
      })();
    },
    [tryFollowMessageGeneration],
  );

  useEffect(() => {
    const followMessageIdsClone = followingMessageIds.current;
    const abortControllersClone = abortControllers.current;

    return () => {
      abortControllersClone.forEach((controller) => controller.abort());
      followMessageIdsClone.clear();
      abortControllersClone.clear();
    };
  }, []);

  return {
    editMessageLocally,
    tryFollowMessageGeneration,
    followNewMessages,
  };
}
