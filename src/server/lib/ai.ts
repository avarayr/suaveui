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

    // if response.error, throw an error
    // happens with ollama when the model is not set/found
    if (
      typeof responseJson === "object" &&
      "error" in responseJson &&
      typeof responseJson.error === "object" &&
      responseJson.error !== null &&
      "message" in responseJson.error
    ) {
      throw new Error((responseJson.error as { message: string }).message);
    }

    const content = responseJson.choices?.[0];

    if (!content) {
      return null;
    }

    return content;
  },

  chatStream: async function ({ messages, model, options, messageId }: ChatProps & { messageId: string }) {
    let generatedTokens = 0;
    const streamBuffer = this.createStreamBuffer(messageId);

    try {
      const baseUrl = await ai.getBaseUrl();
      const apiKey = await ai.getApiKey();

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

      return streamBuffer.getResult();
    } catch (error) {
      console.error("Error in chatStream:", error);
      return generatedTokens === 0 ? "" : streamBuffer.getResult();
    } finally {
      streamBuffer.finish();
      this.cleanupStreamBuffer(messageId);
    }
  },

  interruptChatStream: function ({ messageId }: { messageId: string }) {
    const streamBuffer = this.chatStreamBuffer.get(messageId);

    if (!streamBuffer) {
      return false;
    }

    streamBuffer.abort();

    const result = streamBuffer.getResult();
    this.cleanupStreamBuffer(messageId);
    return result;
  },

  followMessage: async function* ({
    messageId,
  }: {
    messageId: string;
  }): AsyncGenerator<string | undefined, void, unknown> {
    const streamBuffer = this.chatStreamBuffer.get(messageId);
    if (!streamBuffer) {
      console.warn(
        `StreamBuffer not found for messageId: ${messageId}. The message generation may have already completed.`,
      );
      return;
    }

    try {
      yield* streamBuffer.iterator();
    } finally {
      // Ensure cleanup happens even if the iteration is interrupted
      if (streamBuffer.isFinished()) {
        this.cleanupStreamBuffer(messageId);
      }
    }
  },

  createStreamBuffer: function (messageId: string) {
    // Clean up existing StreamBuffer if it exists
    this.cleanupStreamBuffer(messageId);

    // Create a new StreamBuffer
    const newStreamBuffer = new StreamBuffer(messageId);
    this.chatStreamBuffer.set(messageId, newStreamBuffer);
    return newStreamBuffer;
  },

  cleanupStreamBuffer: function (messageId: string) {
    const existingBuffer = this.chatStreamBuffer.get(messageId);
    if (existingBuffer) {
      existingBuffer.finish(); // Ensure any ongoing operations are completed
      existingBuffer.removeAllListeners(); // Remove all event listeners
      this.chatStreamBuffer.delete(messageId);
    }
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
