import type { Message as OllamaMessage } from "ollama";
import { z } from "zod";
import { publicProcedure, router } from "~/server/api/trpc";
import { ai } from "~/server/lib/ai";
import { Chat } from "~/server/models/Chat";
import { Persona } from "~/server/models/Persona";
import { WebPush } from "~/server/models/WebPush";
import { ChatSchema } from "~/server/schema/Chat";
import invariant from "~/utils/invariant";

export const chatRouter = router({
  all: publicProcedure.query(async ({ ctx }) => {
    const chats = await Chat.allWithPersonas();
    return chats;
  }),

  create: publicProcedure.input(ChatSchema.omit({ id: true, createdAt: true })).mutation(async ({ ctx, input }) => {
    const chat = await Chat.create(input);
    return chat;
  }),

  getMessages: publicProcedure
    .input(
      z.object({
        chatId: z.string(),
        /**
         * Limit the number of messages to return (counts from the most recent message)
         */
        limit: z.number().optional(),
        /**
         * Offset the messages to return (skips the most recent messages)
         */
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const chat = await Chat.getWithPersonas(input.chatId);

      if (!chat) return null;

      const messages = await Chat.getMessages({
        chatId: input.chatId,
        limit: input.limit,
        offset: input.offset,
      });

      const totalMessageCount = await Chat.getTotalMessageCount(chat.id);

      return {
        chat,
        messages: messages.map((message) => ({
          ...message,
        })),
        totalMessageCount,
      } as const;
    }),

  sendMessage: publicProcedure
    .input(z.object({ chatId: z.string(), content: z.string(), messageId: z.string().optional() }))
    .mutation(async ({ input: { chatId, content, messageId } }) => {
      const chat = await Chat.getWithPersonas(chatId);
      const persona = chat?.personas?.[0];
      invariant(persona, "Persona does not exist for this chat");

      // Send the user message
      await Chat.sendMessage({
        messageId,
        chatId,
        content,
        personaID: null,
      });

      // Send a blank message to the chat to indicate that the AI is typing
      const blankMessage = await Chat.sendMessage({
        chatId: chatId,
        content: "",
        personaID: persona.id,
        isGenerating: true,
      });

      invariant(blankMessage, "Couldn't send the blank message!");

      // Generate the message in the background
      void Chat.generateMessageInBackground({
        chatId,
        messageId: blankMessage.id,
      });

      // Return the message id for the frontend to follow
      return {
        chatId: chatId,
        followMessageId: blankMessage.id,
      };
    }),

  interruptGeneration: publicProcedure
    .input(z.object({ chatId: z.string(), messageId: z.string() }))
    .mutation(async ({ input: { chatId, messageId } }) => {
      const result = ai.interruptChatStream({ messageId });
      if (result === false) {
        return { success: false };
      }

      if (result?.trim() === "") {
        // delete the message
        await Chat.removeMessage(chatId, messageId);
      }

      return { success: true };
    }),

  deleteMessage: publicProcedure
    .input(z.object({ chatId: z.string(), messageId: z.string() }))
    .mutation(async ({ input: { chatId, messageId } }) => {
      const messages = await Chat.removeMessage(chatId, messageId);
      return messages;
    }),

  steerMessage: publicProcedure
    .input(z.object({ chatId: z.string(), messageId: z.string() }))
    .mutation(async ({ input: { chatId, messageId } }) => {
      const chat = await Chat.getWithPersonas(chatId);
      if (!chat) return null;

      const persona = chat.personas?.[0];

      invariant(persona, "Persona does not exist for this chat");

      // Generate the steered response in the background
      void Chat.generateMessageInBackground({
        chatId,
        messageId,
        prefix: "Sure, ",
      });
    }),

  continueGenerating: publicProcedure
    .input(z.object({ chatId: z.string(), messageId: z.string() }))
    .mutation(async ({ input: { chatId, messageId } }) => {
      const chat = await Chat.getWithPersonas(chatId);
      if (!chat) return null;

      const persona = chat.personas?.[0];

      const message = await Chat.getMessage(chatId, messageId);

      invariant(message, "Message not found");
      invariant(persona, "Persona does not exist for this chat");

      if (message.isGenerating) {
        return;
      }

      // insert a blank message after the current message

      const blankMessage = await Chat.sendMessage({
        chatId,
        content: "",
        personaID: persona.id,
        isGenerating: true,
      });

      invariant(blankMessage, "Couldn't send the blank message!");

      // Generate the response in the background
      void Chat.generateMessageInBackground({
        chatId,
        messageId: blankMessage.id,
      });

      // Return the message id for the frontend to follow
      return {
        chatId: chatId,
        followMessageId: blankMessage.id,
      };
    }),

  regenerateMessage: publicProcedure
    .input(z.object({ chatId: z.string(), messageId: z.string() }))
    .mutation(async ({ input: { chatId, messageId } }) => {
      const chat = await Chat.getWithPersonas(chatId);
      if (!chat) return null;

      const persona = chat.personas?.[0];

      invariant(persona, "Persona does not exist for this chat");

      // Generate the response in the background
      void Chat.generateMessageInBackground({
        chatId,
        messageId,
      });

      return { followMessageId: messageId };
    }),

  reactMessage: publicProcedure
    .input(z.object({ chatId: z.string(), messageId: z.string(), reaction: z.string() }))
    .mutation(async ({ input: { chatId, messageId, reaction } }) => {
      const targetMessage = await Chat.getMessage(chatId, messageId);
      invariant(targetMessage, "Target message not found");

      const reactions = await Chat.addReaction({
        chatId: chatId,
        messageId: messageId,
        reaction: reaction,
        from: "me",
      });

      return reactions;
    }),

  editMessage: publicProcedure
    .input(z.object({ chatId: z.string(), messageId: z.string(), content: z.string() }))
    .mutation(async ({ input: { chatId, messageId, content } }) => {
      const targetMessage = await Chat.getMessage(chatId, messageId);
      invariant(targetMessage, "Target message not found");

      await Chat.editMessage({
        chatId: chatId,
        messageId: messageId,
        content: content,
      });

      return targetMessage;
    }),
});
