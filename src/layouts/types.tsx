import { type RouterOutput } from "~/trpc/react";

export interface ChatListProps {
  chats: RouterOutput["chat"]["all"];
  onNewChatClick: () => void;
  loading?: boolean;
  areNotificationsEnabled?: boolean;
  onNotificationToggle?: (enabled: boolean) => void;
}

export interface TextingProps {
  data: RouterOutput["chat"]["getMessages"] | undefined;
  loading?: boolean;
  editingMessageId?: string;
  moreMessagesAvailable?: boolean;
  onMessageSend: (message: string) => Promise<any>;
  onMessageDelete: (messageId: string) => Promise<void>;
  onMessageSteer: (messageId: string) => Promise<void>;
  onMessageRegenerate: (messageId: string) => Promise<void>;
  onMessageReact: (messageId: string, reaction: Reaction["type"]) => Promise<void>;
  onMessageEditStart: (messageId: string) => void;
  onMessageEditDismiss: (messageId: string) => void;
  onMessageEditSubmit: (messageId: string, newContent: string) => void | Promise<void>;
  onLoadMore?: () => Promise<void>;
  onMessageInterrupt: (messageId: string) => Promise<void>;
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
  type: "heart" | "thumbs-up" | "thumbs-down" | "haha" | "exclamation" | "question";
  from: "me" | "them";
}
