import { z } from "zod";

export const ReactionSchema = z.object({
  type: z.string(),
  from: z.union([z.literal("persona"), z.literal("user")] as const),
});

export const MessageSchema = z.object({
  role: z.union([z.literal("user"), z.literal("assistant")]),
  content: z.string(),
  personaID: z.string().nullable(),
  reactions: z.array(ReactionSchema).nullable(),
  createdAt: z.date().nullable(),
});

export const MessageSchemaWithID = MessageSchema.extend({
  id: z.string(),
});

export type TMessage = z.infer<typeof MessageSchema>;
export type TMessageWithID = z.infer<typeof MessageSchemaWithID>;
