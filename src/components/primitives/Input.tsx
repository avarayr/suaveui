"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, motion } from "framer-motion";
import { CircleX, Mic, WandSparkles } from "lucide-react";
import { type ChangeEvent, forwardRef, useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { api } from "~/trpc/react";
import { useFormContext } from "react-hook-form";

const input = cva("input", {
  variants: {
    intent: {
      primary: ["bg-[#1C1C1F]", "[&:has(input:focus)]:brightness-105"],
      secondary: ["bg-input", "[&:has(input:focus)]:brightness-105", "[&_input]:placeholder-[#777777]"],
    },
  },
  defaultVariants: {
    intent: "primary",
  },
});

type InputProps = Omit<React.ComponentPropsWithoutRef<"input">, "name"> & {
  onMicClick?: () => void;
  icon?: React.ReactNode;
  label?: string;
  generative?: GenerativeOpts;
  loading?: boolean;
  name: string;
} & VariantProps<typeof input>;

type GenerativeOpts = {
  prompt: string | ((value: React.ComponentPropsWithoutRef<"input">["value"]) => string);
  system?: string;
  max_tokens: number;
  temperature?: number;
};

const InputComponent = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  let context: ReturnType<typeof useFormContext> | undefined;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    context = useFormContext();
  } catch (e) {
    /** We allow using inputs without form context */
  }

  const hasText = props.value !== undefined && props.value !== "";
  const aiGenerateMutation = api.ai.generate.useMutation();

  const error = useMemo(() => {
    if (!context?.formState.errors[props.name]) return null;
    return context?.formState.errors[props.name]?.message as string;
  }, [context?.formState.errors, props.name]);

  const onClear = () => {
    props.onChange?.({
      target: { value: "" },
    } as ChangeEvent<HTMLInputElement>);
  };

  const onGenerateClick = async () => {
    if (!props.generative) return;

    let generativePrompt = "";
    if (typeof props.generative.prompt === "function") {
      generativePrompt = props.generative.prompt(props.value);
    } else {
      generativePrompt = props.generative.prompt.replace("{{value}}", String(props.value));
    }

    const { text } = await aiGenerateMutation.mutateAsync({
      prompt: generativePrompt,
      system: props.generative.system,
      max_tokens: props.generative.max_tokens,
      temperature: props.generative.temperature,
    });

    props.onChange?.({
      target: { value: text },
    } as ChangeEvent<HTMLInputElement>);

    context?.setValue(props.name, text);
  };

  const hasRightIcon = props.onMicClick || props.generative;

  return (
    <div ref={ref} className="w-full">
      {props.label && <label className="mb-2 pl-[0.1rem] text-xs font-medium text-[#8F8F95]">{props.label}</label>}
      <div
        className={twMerge(
          "relative flex w-full flex-row items-center justify-between gap-[0.3rem] overflow-hidden rounded-lg bg-inherit p-[0.45rem] text-[1.05rem] text-current transition-colors",
          input({ intent: props.intent }),
          props.className,
          error && "border border-red-500",
        )}
      >
        <div className={twMerge("flex items-center justify-center", props.icon && "size-5")}>{props.icon}</div>

        {/* Reveal effect */}

        <AnimatePresence>
          {(props.loading || aiGenerateMutation.isPending) && (
            <motion.div
              className="absolute inset-0 z-10 flex h-full w-full animate-text-reveal items-center justify-center bg-gradient-to-r from-[#1C1C1F]/50 via-[#8F8F95]/20 to-[#1C1C1F]/50 bg-[length:200%_100%]"
              initial={{ opacity: 0, backdropFilter: "blur(0px) " }}
              animate={{
                opacity: 1,
                backdropFilter: "blur(10px)",
              }}
              exit={{
                opacity: 0,
                x: 200,
                backdropFilter: "blur(0px)",
                transition: { duration: 0.3, ease: "easeInOut" },
              }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
            />
          )}
        </AnimatePresence>

        <input
          {...props}
          type={props.type}
          className={twMerge(
            "h-full w-full border-none bg-transparent text-current placeholder-[#8F8F95] outline-none focus:border-0 focus:ring-0",
            hasRightIcon && "pr-6",
          )}
          placeholder={props.placeholder}
          value={props.value}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
        />

        <AnimatePresence mode="popLayout" initial={false}>
          {/* Clear button */}
          {hasText && (
            <motion.button
              type="button"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              key="search-clear"
              className="absolute bottom-0 right-0 top-0 flex h-full flex-shrink-0 items-center pr-2 text-[#8F8F95]"
              onClick={onClear}
            >
              <CircleX className="size-4" />
            </motion.button>
          )}
          {!hasText && props.onMicClick && !props.generative && (
            <motion.button
              type="button"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              key="search-mic"
              className="absolute bottom-0 right-0 top-0 flex h-full flex-shrink-0 items-center pr-2 text-[#8F8F95]"
              onClick={() => void props.onMicClick?.()}
            >
              <Mic className="size-4" />
            </motion.button>
          )}
          {!hasText && props.generative && (
            <motion.button
              type="button"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              key="search-mic"
              className="absolute bottom-0 right-0 top-0 flex h-full flex-shrink-0 items-center pr-2 text-[#8F8F95]"
              onClick={() => void onGenerateClick?.()}
            >
              <WandSparkles className="size-4 text-orange-300" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
});

export const Input = motion(InputComponent);
