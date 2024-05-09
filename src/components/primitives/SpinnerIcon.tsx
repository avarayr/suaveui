import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { twMerge } from "tailwind-merge";
export type SpinnerIconProps = {
  className?: string;
  variant?: "primary" | "ios";
};

export const SpinnerIcon = ({ className, variant = "primary" }: SpinnerIconProps) => {
  if (variant === "primary") {
    return <LoaderCircle className={twMerge("size-5 animate-spin", className)} />;
  }

  if (variant === "ios") {
    return (
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 2400 2400"
        width="24"
        height="24"
        className={twMerge("size-5 animate-ios-spin", className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <g strokeWidth="200" strokeLinecap="round" stroke="#fff" fill="none">
          <path d="M1200 600V100" />
          <path opacity=".5" d="M1200 2300v-500" />
          <path opacity=".917" d="M900 680.4l-250-433" />
          <path opacity=".417" d="M1750 2152.6l-250-433" />
          <path opacity=".833" d="M680.4 900l-433-250" />
          <path opacity=".333" d="M2152.6 1750l-433-250" />
          <path opacity=".75" d="M600 1200H100" />
          <path opacity=".25" d="M2300 1200h-500" />
          <path opacity=".667" d="M680.4 1500l-433 250" />
          <path opacity=".167" d="M2152.6 650l-433 250" />
          <path opacity=".583" d="M900 1719.6l-250 433" />
          <path opacity=".083" d="M1750 247.4l-250 433" />
        </g>
      </motion.svg>
    );
  }

  // exhaustiveness check
  variant satisfies never;
};
