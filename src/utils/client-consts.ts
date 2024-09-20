export const ClientConsts = {
  LocalStorageKeys: {
    areNotificationsEnabled: "areNotificationsEnabled",
    dbSubscriptionID: "dbSubscriptionID",
    areSilentNotifications: "areSilentNotifications",
    selectedVoice: "selectedVoice",
  },
  /**
   * TODO: Reduce this number once we figure out how to handle:
   * 1. Chat scroll animation on new message when old messages get cut off and scroll jitters after new message
   * 2. Editing old messages and keeping infinite load state in sync with optimistic updates
   */
  MessageLoadLimit: 1000,
} as const;

export const codeLanguageSubset = [
  "python",
  "javascript",
  "java",
  "go",
  "bash",
  "c",
  "cpp",
  "csharp",
  "css",
  "diff",
  "graphql",
  "json",
  "kotlin",
  "less",
  "lua",
  "makefile",
  "markdown",
  "objectivec",
  "perl",
  "php",
  "php-template",
  "plaintext",
  "python-repl",
  "r",
  "ruby",
  "rust",
  "scss",
  "shell",
  "sql",
  "swift",
  "typescript",
  "vbnet",
  "wasm",
  "xml",
  "yaml",
];
