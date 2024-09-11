import { motion } from "framer-motion";
import { forwardRef, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export const Padded = motion.create(
  forwardRef<HTMLDivElement, { children: ReactNode; className?: string }>((props, ref) => {
    return (
      <div ref={ref} className={twMerge("px-5 py-2", props.className)}>
        {props.children}
      </div>
    );
  }),
);
