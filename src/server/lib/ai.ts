import OpenAI from "openai";
import invariant from "~/utils/invariant";
import { StreamBuffer } from "./streamBuffer";

export interface AIChatMessage {
  role: "system" | "user" | "assistant" | Omit<string, "system" | "user" | "assistant">;
  content: string;
}

export interface AIOptions {
  seed?: number;
  num_predict?: number;
  temperature?: number;
}

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

const openai = new OpenAI({
  apiKey: "",
  baseURL: "http://localhost:1234/v1",
});

export const ai = {
  /**
   * @internal
   */
  chatStreamBuffer: new Map<string, StreamBuffer>(),

  chat: async ({ messages, model, options }: ChatProps) => {
    const response = await openai.chat.completions.create({
      model,
      stream: false,
      messages: messages.filter((m) => m.content?.trim()) as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      max_tokens: options?.num_predict,
      temperature: options?.temperature,
      seed: options?.seed,
    } as const);

    const content = response.choices?.[0];

    if (!content) {
      return null;
    }

    return content;
  },

  chatStream: async function ({ messages, model, options, messageId }: ChatProps & { messageId: string }) {
    const streamBuffer = new StreamBuffer(messageId);
    this.chatStreamBuffer.set(messageId, streamBuffer);

    try {
      const stream = await openai.chat.completions.create({
        model,
        stream: true,
        messages: messages.filter((m) => m.content?.trim()) as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        max_tokens: options?.num_predict,
        temperature: options?.temperature,
        seed: options?.seed,
      } as const);

      for await (const chunk of stream) {
        const token = chunk.choices[0];

        if (token?.finish_reason === "stop" || streamBuffer.isAborted()) {
          break;
        }

        const text = token?.delta.content;
        if (text) {
          streamBuffer.append(text);
        }
      }

      streamBuffer.finish();

      const result = streamBuffer.getResult();
      return result;
    } catch (error) {
      console.error("Error in chatStream:", error);
      throw error;
    } finally {
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
