/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import Prism from "prismjs";

if (typeof Prism !== "undefined" && Prism.languages) {
  Prism.languages.customMessage = {
    tag: {
      pattern: /<\/?message[^>]*>/i,
      inside: {
        tag: {
          pattern: /^<\/?[^\s>/]+/i,
          inside: {
            punctuation: /^<\/?/,
            namespace: /^[^\s>/:]+:/,
          },
        },
        "attr-value": {
          pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/i,
          inside: {
            punctuation: [/^=/, { pattern: /^(\s*)["']|["']$/, lookbehind: true }],
          },
        },
        punctuation: /\/?>/,
        "attr-name": {
          pattern: /[^\s>/]+/,
          inside: {
            namespace: /^[^\s>/:]+:/,
          },
        },
      },
    },
    content: {
      pattern: /[\s\S]+/,
      inside: Prism.languages.markdown ?? {},
    },
  };
}
