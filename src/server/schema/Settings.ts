import { z } from "zod";

export const ProviderDefaults = {
  Ollama: {
    host: "http://127.0.0.1:11434",
  },
  "LM Studio": {
    host: "http://127.0.0.1:1234",
  },
  Jan: {
    host: "http://127.0.0.1:1337",
  },
  OpenAI: {
    apiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  OpenRouter: {
    apiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  "Any OpenAI-compatible": {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
} as const;

export const SettingsSchemas = {
  provider: z.discriminatedUnion("type", [
    z.object({ type: z.literal("Ollama"), host: z.string().default(ProviderDefaults.Ollama.host) }),
    z.object({
      type: z.literal("LM Studio"),
      host: z.string().default(ProviderDefaults["LM Studio"].host),
    }),
    z.object({
      type: z.literal("Jan"),
      host: z.string().default(ProviderDefaults.Jan.host),
    }),
    z.object({
      type: z.literal("OpenAI"),
      apiKey: z.string().default(ProviderDefaults.OpenAI.apiKey),
    }),
    z.object({
      type: z.literal("OpenRouter"),
      apiKey: z.string().default(ProviderDefaults.OpenRouter.apiKey),
    }),
    z.object({
      type: z.literal("Any OpenAI-compatible"),
      baseUrl: z.string().default(ProviderDefaults["Any OpenAI-compatible"].baseUrl),
      apiKey: z.string().default(ProviderDefaults["Any OpenAI-compatible"].apiKey),
    }),
  ]),
};
