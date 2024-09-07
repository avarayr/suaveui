import { createId } from "@paralleldrive/cuid2";
import { type z } from "zod";
import { db } from "~/server/db";
import type { TChat, TChatWithPersonas } from "../schema/Chat";
import { MessageSchemaWithID, type TMessageWithID } from "../schema/Message";
import { Persona } from "./Persona";
import invariant from "~/utils/invariant";
import { ai } from "../lib/ai";
import { WebPush } from "./WebPush";

/**
 * CRUD operations for the chats collection
 */
export const Chat = {
  /**
   * Fetches a chat by its id
   */
  async get(id: string) {
    const ref = await db.ref<TChat>(`chats/${id}`).get({ exclude: ["messages"] } as const);

    const values = ref.val();
    return values;
  },

  async allWithPersonas() {
    const chats = await this.all();
    const allPersonaIds = chats.map((chat) => chat.personaIDs).flat();

    const personas = allPersonaIds?.length ? await Persona.getByIDs(allPersonaIds) : [];

    const chatsWithPersonas = chats.map((chat) => {
      const persona = personas.find((persona) => persona.id === chat.personaIDs[0]);
      return { ...chat, persona };
    });

    return chatsWithPersonas;
  },

  async getWithPersonas(id: string): Promise<Omit<TChatWithPersonas, "messages"> | null> {
    const chat = await this.get(id);
    if (!chat) return null;

    const personas = await Persona.getByIDs(chat.personaIDs);

    return { ...chat, personas };
  },

  async getMessages({ chatId, limit = 1000, offset = 0 }: { chatId: string; limit?: number; offset?: number }) {
    return (
      (
        await db
          .ref(`chats/${chatId}/messages`)
          .query()
          .sort("createdAt", false)
          .skip(offset)
          .take(limit)
          .get<TMessageWithID>()
      ).getValues() || []
    ).toSorted((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  },

  /**
   * Gets a message by its id
   */
  async getMessage(chatId: string, messageId: string) {
    const ref = await db.ref(`chats/${chatId}/messages/${messageId}`).get();
    return ref.val<TMessageWithID>();
  },

  getTotalMessageCount(chatId: string) {
    return db.ref(`chats/${chatId}/messages`).count();
  },

  /**
   * Creates a new chat with the given id
   */
  async create(chat: Omit<TChat, "id" | "createdAt">) {
    const id = createId();
    const ref = await db.ref(`chats/${id}`).set({
      id,
      ...chat,
      createdAt: new Date(),
    });
    return (await ref.get())?.val<TChat>();
  },

  /**
   * Updates a chat with the given id
   */
  async update(id: string, chat: TChat) {
    const ref = await db.ref(`chats/${id}`).update(chat);
    return (await ref.get())?.val<TChat>();
  },

  /**
   * Deletes a chat with the given id
   */
  async delete(id: string) {
    const ref = await db.ref(`chats/${id}`).remove();
    return (await ref.get())?.val<TChat>();
  },

  /**
   * Fetches all chats from the database
   */
  async all({ limit = 1000, offset = 0, messageLimit = 10 } = {}) {
    const ref = db.query("chats").skip(offset).take(limit).sort("createdAt", false);
    const chats = (await ref.get<TChat>({ exclude: ["messages"] })).getValues();

    for (const chat of chats) {
      chat.messages = await Chat.getMessages({
        chatId: chat.id,
        limit: messageLimit,
      });
    }

    // Sort chats by last message
    chats.sort((a, b) => {
      let aMessagesTime = (a.messages.slice(-1)?.[0]?.createdAt ?? new Date(0)).getTime();
      let bMessagesTime = (b.messages.slice(-1)?.[0]?.createdAt ?? new Date(0)).getTime();

      // If a message doesn't exist, use the chat's createdAt
      if (!aMessagesTime) aMessagesTime = a.createdAt.getTime();
      if (!bMessagesTime) bMessagesTime = b.createdAt.getTime();

      return bMessagesTime - aMessagesTime;
    });

    return chats;
  },

  /**
   * Removes a message from a chat
   */
  async removeMessage(chatId: string, messageId: string) {
    const ref = await db.ref(`chats/${chatId}/messages/${messageId}`).remove();
    return (await ref.get())?.val<TMessageWithID[]>();
  },

  async sendMessage({
    chatId,
    content,
    personaID,
    messageId,
    isGenerating,
  }: {
    chatId: string;
    content: string;
    personaID: string | null;
    messageId?: string;
    isGenerating?: boolean;
  }) {
    messageId ??= createId();
    const message = MessageSchemaWithID.parse({
      id: messageId,
      content,
      createdAt: new Date(),
      personaID,
      reactions: [],
      isGenerating: isGenerating ?? false,
      role: personaID ? "assistant" : "user",
    } satisfies z.infer<typeof MessageSchemaWithID>);

    const ref = await db.ref(`chats/${chatId}/messages/${messageId}`).set(message);

    return (await ref.get<TMessageWithID>()).val();
  },

  async editMessage({
    chatId,
    messageId,
    content,
    isGenerating,
  }: {
    chatId: string;
    messageId: string;
    content: string;
    isGenerating?: boolean;
  }) {
    const ref = await db.ref(`chats/${chatId}/messages/${messageId}`).update({
      content,
      isGenerating,
    });

    return (await ref.get<TMessageWithID>()).val();
  },

  async addReaction({
    chatId,
    messageId,
    reaction,
    from,
  }: {
    chatId: string;
    messageId: string;
    reaction: string;
    from: "me" | "them";
  }) {
    let reactions = (
      await db.ref(`chats/${chatId}/messages/${messageId}/reactions`).get<{ type: string; from: "me" | "them" }[]>()
    ).val();

    let isRemoving = false;
    if (reactions) {
      // If the reaction already exists, remove it
      reactions = reactions.filter((r) => {
        if (r.from === from) {
          isRemoving = r.type === reaction;
          return false;
        }
        return true;
      });
    }
    reactions = reactions ?? [];
    if (!isRemoving) {
      reactions.push({ type: reaction, from });
    }
    await db.ref(`chats/${chatId}/messages/${messageId}/reactions`).set(reactions);
    return reactions;
  },

  /**
   * Generates a new message using the AI
   *
   * @param chatId
   * @param messageId - The target message id (the message that will be edited)
   * @param options
   */
  async generateMessageInBackground({
    chatId,
    messageId,
    options,
    prefix,
    contextMessageLimit = 100,
  }: {
    chatId: string;
    messageId: string;
    prefix?: string;
    contextMessageLimit?: number;
    options?: Parameters<typeof ai.chatStream>[0]["options"];
  }) {
    try {
      const messages = await Chat.getWithPersonas(chatId);
      if (!messages) return null;

      const persona = messages.personas?.[0];
      invariant(persona, "Persona does not exist for this chat, this shouldn't happen!");

      let contextMessages = await Chat.getMessages({ chatId, limit: contextMessageLimit });

      const targetMessageIndex = contextMessages.findIndex((m) => m.id === messageId);
      const targetMessage = contextMessages[targetMessageIndex];
      invariant(targetMessage, "Target message not found");

      // Remove the target message from the context
      contextMessages = contextMessages.slice(0, targetMessageIndex);

      // Make an OpenAI-friendly context
      const contextMessagesLLM = [
        {
          content: Persona.getPreamble(persona),
          role: "system",
        },
        ...contextMessages
          .filter((m) => m.content?.trim())
          .map((message) => ({
            content: message.content,
            role: message.role,
          })),
      ];

      // Edit the target message to indicate that it's being generated
      await Chat.editMessage({
        chatId: chatId,
        messageId: messageId,
        content: "",
        isGenerating: true,
      });

      // If steerPrefix is provided, add it to the end to guide the LLM
      if (prefix) {
        contextMessagesLLM.push({
          content: `${prefix}`,
          role: "assistant",
        });
      }

      // Generate the response in the background
      const aiResponse = await ai.chatStream({
        messageId,
        messages: contextMessagesLLM,
        options,
      });

      // Once finished, edit the message to include the generated text
      if (!aiResponse?.trim()) {
        // delete the message
        await Chat.removeMessage(chatId, messageId);
        return aiResponse;
      }

      void Chat.editMessage({
        chatId: chatId,
        messageId: messageId,
        content: aiResponse,
        isGenerating: false,
      });

      // Send a notification to the user
      void WebPush.sendNotification({
        title: persona.name,
        message: aiResponse,
      });

      return aiResponse;
    } catch (e) {
      console.error("Error generating message in background", e);
      return null;
    }
  },
};
