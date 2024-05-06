"use client";

import { Plus } from "lucide-react";
import { twMerge } from "tailwind-merge";

type Props = React.ComponentPropsWithoutRef<"button"> & {
  icon?: React.ReactNode;
};
export function FloatingActionButton(props: Props) {
  return (
    <button
      {...props}
      className={twMerge(
        "fixed bottom-4 right-4 flex size-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg",
        props.className,
      )}
    >
      {props.icon ?? <Plus className="size-5" />}
    </button>
  );
}
