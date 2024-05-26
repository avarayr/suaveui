import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";
import type OpenAI from "openai";

export function readableStreamAsyncIterable<T>(stream: ReadableStream<T>): AsyncIterableIterator<T> {
  // check if stream is already an async iterable (polyfill not needed)
  if (
    (
      stream as {
        [Symbol.asyncIterator]?: () => AsyncIterableIterator<T>;
      }
    )[Symbol.asyncIterator]
  )
    return stream as unknown as AsyncIterableIterator<T>;

  const reader = stream.getReader();
  return {
    async next(): Promise<IteratorResult<T, any>> {
      try {
        const result = await reader.read();
        if (result?.done) reader.releaseLock(); // release lock when stream becomes closed
        return result as IteratorResult<T, any>;
      } catch (e) {
        reader.releaseLock(); // release lock when stream becomes errored
        throw e;
      }
    },
    async return() {
      const cancelPromise = reader.cancel();
      reader.releaseLock();
      await cancelPromise;
      return { done: true, value: undefined };
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

export async function* OpenAIStream({
  baseUrl,
  payload,
  apiKey,
  signal,
}: {
  baseUrl: string;
  apiKey?: string;
  payload: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming;
  signal?: AbortSignal;
}) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      // callback

      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;
          controller.enqueue(encoder.encode(data));
        }
      };

      if (res.status !== 200) {
        const data = {
          status: res.status,
          statusText: res.statusText,
          body: await res.text(),
        };
        console.error(`Error: receieved non-200 status code, ${JSON.stringify(data)}`);
        controller.close();
        return;
      }

      const parser = createParser(onParse);

      if (res.body === null) {
        controller.close();
        return;
      }

      for await (const chunk of readableStreamAsyncIterable(res.body)) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  const stream = readableStreamAsyncIterable(readableStream) as AsyncIterableIterator<Uint8Array>;

  for await (const chunk of stream) {
    const data = decoder.decode(chunk);
    if (data === "[DONE]") {
      break;
    }

    try {
      const json = JSON.parse(data) as OpenAI.Chat.Completions.ChatCompletionChunk;
      const text = json?.choices?.[0]?.delta?.content || "";
      const finishReason = json.choices?.[0]?.finish_reason;
      yield text;

      if (finishReason) {
        break;
      }
    } catch (e) {
      console.error("Error in OpenAIStream:", e);
    }
  }
}
