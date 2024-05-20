import { CheckIcon, CopyIcon } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    hljs: {
      highlightElement: (el: HTMLElement) => void;
    };
  }
}

export const CodeBlock = ({ lang, children }: { lang: string; children: React.ReactNode }) => {
  const ref = useRef<HTMLElement>(null);

  // Don't let touch-hold events prevent selection
  const stopPropagation = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className="select-text overflow-hidden rounded-md bg-black"
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      onClick={stopPropagation}
      onTouchStart={stopPropagation}
      onTouchEnd={stopPropagation}
    >
      <CodeBar lang={lang} codeRef={ref} />
      <div className="overflow-y-auto">
        <code className={`hljs block w-full !whitespace-pre p-3 language-${lang}`} ref={ref}>
          {children}
        </code>
      </div>
    </div>
  );
};

const CodeBar = React.memo(({ lang, codeRef }: { lang: string | undefined; codeRef: React.RefObject<HTMLElement> }) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  return (
    <div className="relative flex items-center bg-gray-800 px-3 py-2 font-sans text-xs text-gray-200">
      <span className="font-mono">{lang}</span>
      <button
        className="ml-auto flex items-center gap-2"
        aria-label="copy codeblock"
        onClick={() => {
          const codeString = codeRef.current?.textContent?.trim();
          if (codeString)
            void navigator?.clipboard
              ?.writeText(codeString)
              .then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 3000);
              })
              .catch(() => {
                /* ignore */
              });
        }}
      >
        {isCopied ? (
          <>
            <CheckIcon className="size-4" />
            Copied!
          </>
        ) : (
          <>
            <CopyIcon className="size-4" />
            Copy code
          </>
        )}
      </button>
    </div>
  );
});
