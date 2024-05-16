import React from "react";
import { twMerge } from "tailwind-merge";

type AvatarProps = {
  className?: string;
  src?: string | undefined | null;
  displayName?: string;
};

export const Avatar = React.memo(({ className, src, displayName }: AvatarProps) => {
  if (!src && !displayName) {
    return null;
  }

  return src ? (
    // Image
    <img alt="Avatar" src={src} className={twMerge("aspect-square size-[2.8rem] rounded-full", className)} />
  ) : (
    // Placeholder
    <div
      className={twMerge(
        "flex size-[2.8rem] items-center justify-center rounded-full bg-gradient-to-b from-[#9CA0AE] to-[#7D8089] font-sans-rounded text-xl font-bold uppercase text-white",
        className,
      )}
    >
      {displayName && displayName.length > 0
        ? displayName
            ?.split(" ")
            ?.map((part) => part[0])
            .slice(0, 2)
            .join("")
        : ""}
    </div>
  );
});
