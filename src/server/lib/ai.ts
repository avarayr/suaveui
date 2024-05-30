import invariant from "~/utils/invariant";
import { StreamBuffer } from "./streamBuffer";
import type OpenAI from "openai";
import { OpenAIStream } from "./OpenAIStream";

export interface AIChatMessage {
  role: "system" | "user" | "assistant" | Omit<string, "system" | "user" | "assistant">;
  content: string;
}

export type AIOptions = OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming;

export interface ChatProps {
  model: string;
  messages: AIChatMessage[];
  options?: AIOptions;
}

export interface CompletionProps {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: AIOptions;
}

const AI_BASE_URL = "https://openrouter.ai/api/v1";
// const AI_BASE_URL = "http://127.0.0.1:1234/v1";
const COMPLETIONS_ENDPOINT = "/chat/completions";

export const ai = {
  /**
   * @internal
   */
  chatStreamBuffer: new Map<string, StreamBuffer>(),

  chat: async ({ messages, model, options }: ChatProps) => {
    const response = await fetch(`${AI_BASE_URL}${COMPLETIONS_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        ...options,
        model,
        stream: false,
        messages: messages.filter((m) => m.content?.trim()) as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      }),
    });

    const responseJson = (await response.json()) as OpenAI.Chat.Completions.ChatCompletion;
    const content = responseJson.choices?.[0];

    if (!content) {
      return null;
    }

    return content;
  },

  chatStream: async function ({ messages, model, options, messageId }: ChatProps & { messageId: string }) {
    const streamBuffer = new StreamBuffer(messageId);
    this.chatStreamBuffer.set(messageId, streamBuffer);

    let generatedTokens = 0;
    try {
      const stream = OpenAIStream({
        baseUrl: AI_BASE_URL,
        apiKey: process.env.AI_API_KEY,
        payload: {
          ...options,
          model,
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
