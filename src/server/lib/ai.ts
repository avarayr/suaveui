import invariant from "~/utils/invariant";
import { StreamBuffer } from "./streamBuffer";
import type OpenAI from "openai";
import { OpenAIStream } from "./OpenAIStream";
import { Settings } from "~/server/models/Settings";
import { ProviderDefaults, SettingsSchemas } from "../schema/Settings";
import { z } from "zod";

export interface AIChatMessage {
  role: "system" | "user" | "assistant" | Omit<string, "system" | "user" | "assistant">;
  content: string;
}

export type AIOptions = Partial<OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming>;

export interface ChatProps {
  model?: string;
  messages: AIChatMessage[];
  options?: AIOptions;
}

export interface CompletionProps {
  model?: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: AIOptions;
}

const COMPLETIONS_ENDPOINT = "/chat/completions";

export const ai = {
  /**
   * @internal
   */
  chatStreamBuffer: new Map<string, StreamBuffer>(),

  trimEndSlash: (url: string) => {
    return url.endsWith("/") ? url.slice(0, -1) : url;
  },

  getBaseUrl: async () => {
    const provider = await Settings.getValue<z.infer<typeof SettingsSchemas.provider>>("provider");

    // if not set, return the default from the defaults const
    if (!provider) {
      return ProviderDefaults.Ollama.baseUrl;
    }

    if ("baseUrl" in provider) {
      return ai.trimEndSlash(provider.baseUrl);
    }

    // return the default by provider
    return ai.trimEndSlash(ProviderDefaults[provider.type].baseUrl);
  },

  getApiKey: async () => {
    const provider = await Settings.getValue<z.infer<typeof SettingsSchemas.provider>>("provider");

    if (!provider) {
      return "";
    }

    if ("apiKey" in provider) {
      return provider.apiKey;
    }

    return "";
  },

  getModel: async () => {
    const provider = await Settings.getValue<z.infer<typeof SettingsSchemas.provider>>("provider");

    if (!provider) {
      return "";
    }

    if ("model" in provider && provider.model) {
      return provider.model;
    }

    return "";
  },

  chat: async ({ messages, model, options }: ChatProps) => {
    const baseUrl = await ai.getBaseUrl();
    const apiKey = await ai.getApiKey();

    const response = await fetch(`${baseUrl}${COMPLETIONS_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        ...options,
        model: model ?? (await ai.getModel()),
        stream: false,
        messages: messages.filter((m) => m.content?.trim()) as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      }),
    });

    const responseJson = (await response.json()) as OpenAI.Chat.Completions.ChatCompletion;
    console.log({ responseJson });
    const content = responseJson.choices?.[0];

    if (!content) {
      return null;
    }

    return content;
  },

  chatStream: async function ({ messages, model, options, messageId }: ChatProps & { messageId: string }) {
    const streamBuffer = new StreamBuffer(messageId);
    this.chatStreamBuffer.set(messageId, streamBuffer);

    const baseUrl = await ai.getBaseUrl();
    const apiKey = await ai.getApiKey();

    let generatedTokens = 0;

    try {
      const stream = OpenAIStream({
        baseUrl,
        apiKey,
        payload: {
          ...options,
          model: model ?? (await ai.getModel()),
          stream: true,
          messages: messages.filter((m) => m.content?.trim()) as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        },
      });

      for await (const chunk of stream) {
        if (chunk) {
          generatedTokens++;
          streamBuffer.append(chunk);
        }

        if (streamBuffer.isAborted()) {
          break;
        }
      }

      const result = streamBuffer.getResult();
      return result;
    } catch (error) {
      console.error("Error in chatStream:", error);

      if (generatedTokens === 0) {
        return "";
      }
    } finally {
      streamBuffer.finish();
      this.chatStreamBuffer.delete(messageId);
    }
  },

  interruptChatStream: function ({ messageId }: { messageId: string }) {
    const streamBuffer = this.chatStreamBuffer.get(messageId);

    if (!streamBuffer) {
      return false;
    }

    streamBuffer.abort();

    const result = streamBuffer.getResult();
    return result;
  },

  followMessage: ({ messageId }: { messageId: string }): AsyncGenerator<string | undefined, void> => {
    const streamBuffer = ai.chatStreamBuffer.get(messageId);
    invariant(
      streamBuffer,
      "Streambuffer not found! this shouldn't happen, the message in the db should've been edited to be marked as done generating after it's been generated.",
    );

    return streamBuffer.iterator();
  },

  generate: async ({ model, prompt, system, options }: CompletionProps) => {
    const response = await ai.chat({
      model,
      messages: [
        {
          role: "system",
          content: system ?? "",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      options,
    });

    return response?.message.content;
  },
};
