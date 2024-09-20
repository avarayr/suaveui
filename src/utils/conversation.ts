import { createId } from "@paralleldrive/cuid2";
import type { TMessageWithID } from "~/server/schema/Message";

export function parseImportedConversation(content: string, personaId: string): TMessageWithID[] {
  const regex = /<message role="([^"]+)"(?:\s+timestamp="([^"]+)")?>([^]*?)<\/message>/g;
  const matches = content.matchAll(regex);
  const messages: TMessageWithID[] = [];
  let lastTimestamp: Date | null = null;

  for (const match of matches) {
    const [, rawRole, timestamp, messageContent] = match;
    const role = normalizeRole(rawRole?.toLowerCase() ?? "");
    let messageTimestamp: Date;

    if (timestamp) {
      messageTimestamp = new Date(timestamp);
    } else if (lastTimestamp) {
      messageTimestamp = new Date(lastTimestamp.getTime() + 1000); // Add 1 second
    } else {
      messageTimestamp = new Date(); // Fallback to current time if no previous timestamp
    }

    lastTimestamp = messageTimestamp;

    messages.push({
      id: createId(),
      content: messageContent?.trim() ?? "",
      createdAt: messageTimestamp,
      personaID: role === "assistant" ? personaId : null,
      reactions: [],
      role: role,
      isGenerating: false,
    });
  }

  return messages;
}

function normalizeRole(role: string): "user" | "assistant" {
  if (role === "user" || role === "me" || role === "user1" || role === "self") {
    return "user";
  }
  return "assistant";
}
