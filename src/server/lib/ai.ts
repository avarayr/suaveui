import OpenAI from "openai";
import { OpenAIStream } from "ai";
import invariant from "~/utils/invariant";

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
  stream: boolean;
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
  chatStreamBuffer: new Map<
    string,
    {
      buffer: string[];
      finished: boolean;
      abortController: AbortController;
      iterator: () => { [Symbol.asyncIterator]: () => AsyncGenerator<string | undefined | null> };
    }
  >(),

  chat: async ({ messages, model, stream, options }: ChatProps) => {
    const response = await openai.chat.completions.create({
      model,
      stream: false, // TODO
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      messages: messages as any,
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
    ai.chatStreamBuffer.set(messageId, {
      buffer: [],
      finished: false,
      abortController: new AbortController(),
      iterator: async function* () {
        let i = 0;
        while (!this.finished) {
          if (this.abortController.signal.aborted) return;

          while (this.buffer[i + 1] === undefined) {
            if (this.abortController.signal.aborted) return;

            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          yield this.buffer[i++];
        }
        while (this.buffer[i + 1] !== undefined) {
          yield this.buffer[i++];
        }
      },
    });

    const stream = await openai.chat.completions.create({
      model,
      stream: true,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      messages: messages.filter((m) => m.content?.length) as any,
      max_tokens: options?.num_predict,
      temperature: options?.temperature,
      seed: options?.seed,
    } as const);

    const streamBuffer = this.chatStreamBuffer.get(messageId);

    invariant(streamBuffer);

    for await (const chunk of stream) {
      const tok = chunk.choices[0];
      if (tok?.finish_reason === "stop" || streamBuffer.abortController.signal.aborted) {
        streamBuffer.finished = true;
        break;
      }

      // yield tok?.delta.content ?? "";
      const text = tok?.delta.content;
      if (text) {
        streamBuffer.buffer.push(text);
      }
    }

    const resultText = streamBuffer.buffer.join("");

    // clean up
    this.chatStreamBuffer.delete(messageId);

    return resultText;
  },

  interruptChatStream: function ({ messageId }: { messageId: string }) {
    const streamBuffer = this.chatStreamBuffer.get(messageId);

    if (!streamBuffer) {
      return false;
    }

    const result = streamBuffer?.abortController.abort();
    return true;
  },

  followMessage: function ({ messageId }: { messageId: string }) {
    const streamBuffer = this.chatStreamBuffer.get(messageId);
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
      stream: false,
      options,
    });

    return response?.message.content;
  },
};
