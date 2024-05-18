import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { ai } from "~/server/lib/ai";
import { Chat } from "~/server/models/Chat";

const hono = new Hono();

hono.get("/generate-message/:chatId/:messageId", (c) => {
  return streamText(c, async (stream) => {
    const { chatId, messageId } = c.req.param();

    const message = await Chat.getMessage(chatId, messageId);
    if (!message?.isGenerating) {
      console.log("Result has been ready!");
      await stream.write(message?.content ?? "");
      return;
    }

    const generator = ai.followMessage({ messageId });

    for await (const chunk of generator) {
      if (!chunk) continue;
      await stream.write(chunk);
    }
    // const chat = await Chat.getWithPersonas(chatId);
    // if (!chat) return stream.close();

    // const persona = chat.personas?.[0];

    // invariant(persona, "Persona does not exist for this chat, this shouldn't happen!");

    // const messages = await Chat.getMessages({ chatId, limit: 500 }).then((messages) =>
    //   messages.map<Message>((message) => ({
    //     id: message.id,
    //     content: message.content,
    //     role: message.role,
    //   })),
    // );

    // // Remove all messages after the message we want to generate a response for
    // messages.splice(messages.findIndex((m) => m.id === messageId));

    // messages.unshift({
    //   id: cuid2.createId(),
    //   content: Persona.getPreamble(persona),
    //   role: "system",
    // });

    // const result = ai.chatStream({
    //   model: process.env.MODEL!,
    //   stream: false,
    //   messages,
    // });

    // const buffer: string[] = [];

    // for await (const chunk of result) {
    //   if (c.req.raw.signal.aborted) {
    //     console.log("Aborted");
    //     // edit the message to what's already been generated
    //     await Chat.editMessage({
    //       chatId: chatId,
    //       messageId: messageId,
    //       content: buffer.join(""),
    //     });

    //     await stream.close();
    //     return;
    //   }

    //   await stream.write(chunk);
    //   buffer.push(chunk);
    // }

    // const responseText = buffer.join("");

    // // store the response in the database
    // await Chat.editMessage({
    //   chatId: chatId,
    //   messageId: messageId,
    //   content: responseText,
    // });

    // await stream.close();
  });
});

export default hono;
