import { createId } from "@paralleldrive/cuid2";
import { db } from "~/server/db";
import type { TChatWithPersonas, TChat } from "../schema/Chat";
import { MessageSchema, MessageSchemaWithID, type TMessageWithID, type TMessage } from "../schema/Message";
import { Persona } from "./Persona";
import { type z } from "zod";
import { Reaction } from "~/layouts/types";

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

    return chats;
  },

  /**
   * Removes a message from a chat
   */
  async removeMessage(chatId: string, messageId: string) {
    const ref = await db.ref(`chats/${chatId}/messages/${messageId}`).remove();
    return (await ref.get())?.val<TMessageWithID[]>();
  },

  async sendMessage({ chatId, content, personaID }: { chatId: string; content: string; personaID: string | null }) {
    const messageId = createId();

    const message = MessageSchemaWithID.parse({
      id: messageId,
      content,
      createdAt: new Date(),
      personaID,
      reactions: [],
      role: personaID ? "assistant" : "user",
    } satisfies z.infer<typeof MessageSchemaWithID>);

    const ref = await db.ref(`chats/${chatId}/messages/${messageId}`).set(message);

    return (await ref.get<TMessageWithID>()).val();
  },

  async editMessage({ chatId, messageId, content }: { chatId: string; messageId: string; content: string }) {
    const ref = await db.ref(`chats/${chatId}/messages/${messageId}`).update({
      content,
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
};
