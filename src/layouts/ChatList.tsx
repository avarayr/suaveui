"use client";

import React from "react";
/**
 * This React component is a multiplexer for different chat layouts.
 * It takes a layout name and the rest of the props are inferred from the layout.
 */
import { ChatList as ChaiMessageChatList } from "./ChaiMessage/screens/ChatList";
import { ChatList as UnsolicitedChatList } from "./Unsolicited/screens/ChatList";
import { ChatList as ZuckMadeChatList } from "./ZuckMade/screens/ChatList";

type Layouts = "ChaiMessage" | "Unsolicited" | "ZuckMade";

type PropsOfLayout<TLayout extends Layouts> = TLayout extends "ChaiMessage"
  ? React.ComponentProps<typeof ChaiMessageChatList>
  : TLayout extends "Unsolicited"
    ? React.ComponentProps<typeof UnsolicitedChatList>
    : TLayout extends "ZuckMade"
      ? React.ComponentProps<typeof ZuckMadeChatList>
      : never;

export const ChatList = <TLayout extends Layouts>(props: { layout: TLayout } & PropsOfLayout<TLayout>) => {
  const { layout, ...rest } = props;

  switch (layout) {
    case "ChaiMessage":
      return <ChaiMessageChatList {...(rest as any)} />;
    case "Unsolicited":
      return <UnsolicitedChatList {...(rest as any)} />;
    case "ZuckMade":
      return <ZuckMadeChatList {...(rest as any)} />;
    default:
      throw new Error(`Unknown layout: ${layout}`);
  }
};
