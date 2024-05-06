"use client";

import { motion, type Variants } from "framer-motion";
import * as React from "react";

const maxX = 25;

const variants: Variants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? maxX : -maxX,
      opacity: 0,
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? maxX : -maxX,
      opacity: 0,
    };
  },
};

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const AnimatedStep: React.FC<Props> = React.memo(
  ({ children, className }) => {
    return (
      <motion.div
        custom={0}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        className={className}
      >
        {children}
      </motion.div>
    );
  },
);
