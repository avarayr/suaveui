import { Hono } from "hono";
import { stream } from "hono/streaming";
import { ai } from "~/server/lib/ai";
import { Chat } from "~/server/models/Chat";

const hono = new Hono();

hono.get("/follow-message/:chatId/:messageId", (c) => {
  return stream(c, async (stream) => {
    // This is not actually an event-stream, but it's necessary for Cloudflare Tunnels to support streaming
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Transfer-Encoding", "chunked");

    // hono: need to write something to the stream to make abort work
    await stream.write("");

    const { chatId, messageId } = c.req.param();

    const message = await Chat.getMessage(chatId, messageId);
    if (!message?.isGenerating) {
      // Result has been ready
      await stream.write(message?.content ?? "");
      return;
    }

    const generator = ai.followMessage({ messageId });

    for await (const chunk of generator) {
      if (c.req.raw.signal.aborted) {
        return;
      }

      if (!chunk) continue;
      await stream.write(chunk);
    }
  });
});

export default hono;
