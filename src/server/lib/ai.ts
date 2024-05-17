import OpenAI from "openai";
import { OpenAIStream } from "ai";

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

  chatStream: async function* ({ messages, model, options }: ChatProps): AsyncGenerator<string> {
    const stream = await openai.chat.completions.create({
      model,
      stream: true,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      messages: messages.filter((m) => m.content?.length) as any,
      max_tokens: options?.num_predict,
      temperature: options?.temperature,
      seed: options?.seed,
    } as const);

    for await (const chunk of stream) {
      const tok = chunk.choices[0];
      if (tok?.finish_reason === "stop") {
        return;
      }

      yield tok?.delta.content ?? "";
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
      stream: false,
      options,
    });

    return response?.message.content;
  },
};
