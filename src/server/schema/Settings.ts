import { z } from "zod";

export const ProviderDefaults = {
  Ollama: {
    baseUrl: "http://127.0.0.1:11434/v1",
  },
  "LM Studio": {
    baseUrl: "http://127.0.0.1:1234/v1",
  },
  Jan: {
    baseUrl: "http://127.0.0.1:1337/v1",
  },
  OpenAI: {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  OpenRouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  "Any OpenAI-compatible": {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
} as const;

export const SettingsSchemas = {
  provider: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("Ollama"),
      baseUrl: z.string().default(ProviderDefaults.Ollama.baseUrl),
      model: z.string(),
    }),
    z.object({
      type: z.literal("LM Studio"),
      baseUrl: z.string().default(ProviderDefaults["LM Studio"].baseUrl),
      model: z.string().optional(),
    }),
    z.object({
      type: z.literal("Jan"),
      baseUrl: z.string().default(ProviderDefaults.Jan.baseUrl),
    }),
    z.object({
      type: z.literal("OpenAI"),
      apiKey: z.string().default(ProviderDefaults.OpenAI.apiKey),
      model: z.string(),
    }),
    z.object({
      type: z.literal("OpenRouter"),
      apiKey: z.string().default(ProviderDefaults.OpenRouter.apiKey),
      model: z.string(),
    }),
    z.object({
      type: z.literal("Any OpenAI-compatible"),
      baseUrl: z.string().default(ProviderDefaults["Any OpenAI-compatible"].baseUrl),
      apiKey: z.string().default(ProviderDefaults["Any OpenAI-compatible"].apiKey),
      model: z.string().optional(),
    }),
  ]),
};
