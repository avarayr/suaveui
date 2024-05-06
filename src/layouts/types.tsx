import { type RouterOutput } from "~/trpc/react";

export interface ChatListProps {
  chats: RouterOutput["chat"]["all"];
  onNewChatClick: () => void;
  loading?: boolean;
}

export interface TextingProps {
  data: RouterOutput["chat"]["getMessages"] | undefined;
  loading?: boolean;
  onMessageSend: (message: string) => Promise<void>;
  onMessageDelete: (messageId: string) => Promise<void>;
  onMessageSteer: (messageId: string) => Promise<void>;
}

export interface Chat {
  id: string;
  persona: Persona;
  isUnread?: boolean;
  lastMessage?: Message;
}

export interface Persona {
  id: string;
  name: string;
  avatar?: string;
}

export interface Message {
  id: string;
  attachments: Attachment[];
  content: string;
  createdAt: string;
  sender: Persona;
}

export interface Attachment {
  id: string;
  type: "image" | "video" | "audio" | "file";
  base64: string;
  name: string;
  size?: number;
}

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  date: string;
  reactions?: Reaction[];
}

export interface Reaction {
  type: "heart" | "thumbs-up" | "thumbs-down";
  from: "me" | "them";
}
