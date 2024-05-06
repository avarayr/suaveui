"use client";

/**
 * This React component is a multiplexer for different chat layouts.
 * It takes a layout name and the rest of the props are inferred from the layout.
 */
import type { Chat, TextingProps } from "./types";
import { Texting as ChaiMessageTexting } from "./ChaiMessage/screens/Texting";
import { Texting as UnsolicitedTexting } from "./Unsolicited/screens/Texting";
import { Texting as ZuckMadeTexting } from "./ZuckMade/screens/Texting";

type Props<TLayout extends Layouts> = {
  layout: TLayout;
  chatId: Chat["id"];
};

type Layouts = "ChaiMessage" | "Unsolicited" | "ZuckMade";

type PropsOfLayout<TLayout extends Layouts> = TLayout extends "ChaiMessage"
  ? React.ComponentProps<typeof ChaiMessageTexting>
  : TLayout extends "Unsolicited"
    ? React.ComponentProps<typeof UnsolicitedTexting>
    : TLayout extends "ZuckMade"
      ? React.ComponentProps<typeof ZuckMadeTexting>
      : never;

export const Texting = <TLayout extends Layouts>(
  props: Props<TLayout> & PropsOfLayout<TLayout>,
) => {
  const { layout, ...rest } = props;

  switch (layout) {
    case "ChaiMessage":
      return <ChaiMessageTexting {...(rest as any)} />;
    case "Unsolicited":
      return <UnsolicitedTexting {...(rest as any)} />;
    case "ZuckMade":
      return <ZuckMadeTexting {...(rest as any)} />;
    default:
      throw new Error(`Unknown layout: ${layout}`);
  }
};
