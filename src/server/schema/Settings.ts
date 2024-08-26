import { z } from "zod";

export const SettingsSchemas = {
  provider: z.discriminatedUnion("type", [
    // all values must be strings and optional/have defaults
    z.object({
      type: z.literal("Ollama"),
    }),
    z.object({
      type: z.literal("LM Studio"),
      host: z.string().default("http://127.0.0.1:1234"),
    }),
    z.object({
      type: z.literal("Jan"),
      host: z.string().default("http://127.0.0.1:1234"),
    }),
    z.object({
      type: z.literal("OpenAI"),
      apiKey: z.string().default("sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"),
    }),
    z.object({
      type: z.literal("OpenRouter"),
      apiKey: z.string().default("sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"),
    }),
    z.object({
      type: z.literal("Any OpenAI-compatible"),
      baseUrl: z.string().default("https://api.openai.com/v1"),
      apiKey: z.string().default("sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"),
    }),
  ]),
};
