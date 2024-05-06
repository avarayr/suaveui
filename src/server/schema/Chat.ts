import { z } from "zod";
import { MessageSchema } from "./Message";
import type { TPersona } from "./Persona";

export const ChatSchema = z.object({
  id: z.string(),
  messages: z.array(MessageSchema).default([]),
  personaIDs: z.array(z.string()),
  createdAt: z.date(),
});

export type TChat = z.infer<typeof ChatSchema>;

export type TChatWithPersonas = TChat & {
  personas: TPersona[];
};
