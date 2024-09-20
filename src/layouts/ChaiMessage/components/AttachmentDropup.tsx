import React, { useState } from "react";
import { Camera, Mic, ScrollText } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { AnimatePresence, motion } from "framer-motion";
import { ImportConversationDialog } from "./ImportConversationDialog"; // New import
import type { TMessageWithID } from "~/server/schema/Message";

interface AttachmentDropupProps {
  onClose: () => void;
  onImportConversation: (content: string) => void | Promise<void>;
  currentMessages: TMessageWithID[];
}

interface AttachmentOption {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}

export const AttachmentDropup: React.FC<AttachmentDropupProps> = ({
  onClose,
  onImportConversation,
  currentMessages,
}) => {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const attachmentOptions: AttachmentOption[] = [
    { icon: <Camera className="size-6 text-gray-400" />, label: "Camera", disabled: true },
    {
      icon: <div className="size-6 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500" />,
      label: "Photos",
      disabled: true,
    },

    { icon: <Mic className="size-6 text-red-400" />, label: "Audio", disabled: true },
    { icon: <ScrollText className="size-6 text-gray-400" />, label: "Import Conversation" },
  ];

  const handleImportConversation = () => {
    setIsImportDialogOpen(true);
  };

  return (
    <>
      <motion.div
        key="attachment-dropup"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={twMerge("fixed bottom-full left-0 h-lvh w-full rounded-lg bg-black/95 p-4 backdrop-blur-xl")}
        onClick={onClose}
      >
        <motion.div
          key="attachment-dropup-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute -left-[5%] bottom-0 z-20 flex size-64 flex-col gap-1 rounded-full bg-white/10 p-2 blur-3xl"
        />
        <div className="absolute bottom-0 z-20 flex w-64 flex-col gap-1 rounded-lg p-2">
          <AnimatePresence>
            {attachmentOptions.map((option, index, array) => (
              <motion.button
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: (array.length - index) * 0.05 }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (option.label === "Import Conversation") {
                    handleImportConversation();
                  }
                }}
                className={twMerge(
                  "flex w-full items-center space-x-3 rounded-md px-3 py-2 transition-colors hover:bg-zinc-800/50",
                  option.disabled && "pointer-events-none cursor-not-allowed font-sans-rounded text-lg text-gray-500",
                )}
              >
                <div className={twMerge("flex items-center justify-center", option.disabled && "opacity-30")}>
                  {option.icon}
                </div>
                <span>
                  {option.label}
                  {option.disabled ? <span className="text-xs text-gray-400/50"> (Soon)</span> : ""}
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
      <AnimatePresence>
        <ImportConversationDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onSubmit={async (content) => {
            await onImportConversation(content);
            setIsImportDialogOpen(false);
            onClose();
          }}
          currentMessages={currentMessages}
        />
      </AnimatePresence>
    </>
  );
};
