import { motion } from "framer-motion";
import { JsxRuntimeComponents } from "node_modules/react-markdown/lib";
import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CodeBlock } from "~/components/primitives/CodeBlock";
import { codeLanguageSubset } from "~/utils/client-consts";

const code = React.memo(
  ({ children, className, inline }: { className?: string; children?: React.ReactNode; inline?: boolean }) => {
    const match = /language-(\w+)/.exec(className || "");
    const lang = match?.[1];

    if (inline) {
      return <code className={className}>{children}</code>;
    } else {
      return <CodeBlock lang={lang || "text"}>{children}</CodeBlock>;
    }
  },
);

const p = React.memo((props?: { children?: React.ReactNode; className?: string }) => {
  return <motion.p className="whitespace-pre-wrap">{props?.children}</motion.p>;
});

const a = React.memo((props: { href?: string; children: React.ReactElement }) => {
  return (
    <a href={props.href} target="_blank" rel="noopener noreferrer" className="text-[#377AE8] underline">
      {props.children}
    </a>
  );
});

export const ChatMarkdown = React.memo(({ children }: { children: string | null | undefined }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [
          rehypeHighlight,
          {
            detect: true,
            ignoreMissing: true,
            subset: codeLanguageSubset,
          },
        ],
      ]}
      components={
        {
          a,
          code,
          p,
        } as Partial<JsxRuntimeComponents>
      }
    >
      {children}
    </ReactMarkdown>
  );
});
