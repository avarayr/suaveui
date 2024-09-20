import React, { useState, useEffect, useCallback, useRef } from "react";
import { AlertCircle, Triangle, TriangleAlert } from "lucide-react";
import type { TMessageWithID } from "~/server/schema/Message";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "~/components/primitives/Dialog";
import { Button } from "~/components/primitives/Button";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-markdown";
import "prismjs/themes/prism.css"; // Or any other theme you prefer
import "~/utils/prismCustomLanguage"; // Import our custom language definition
import { AnimatePresence, motion } from "framer-motion";

interface ImportConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
  currentMessages: TMessageWithID[];
}

export const ImportConversationDialog: React.FC<ImportConversationDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentMessages,
}) => {
  const [content, setContent] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [showUnsavedChangesAlert, setShowUnsavedChangesAlert] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [hasSyntaxError, setHasSyntaxError] = useState(false);
  const [syntaxErrors, setSyntaxErrors] = useState<string[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const formattedContent = currentMessages
      .map(
        (message) =>
          `<message role="${message.role}" timestamp="${message.createdAt?.toISOString()}">${message.content.trim()}</message>`,
      )
      .join("\n\n");
    setContent(formattedContent);
    setInitialContent(formattedContent);
  }, [currentMessages]);

  useEffect(() => {
    if (!isOpen) return;

    // scroll to bottom
    setTimeout(() => {
      editorRef.current?.scrollTo({
        top: editorRef.current.scrollHeight,
        behavior: "instant",
      });
    }, 100);
  }, [isOpen]);

  const checkSyntaxErrors = useCallback((text: string) => {
    const lines = text.split("\n");
    const errors: string[] = [];

    lines.forEach((line, index) => {
      if (line.trim().startsWith("<message")) {
        const validProps = ["role", "timestamp"];
        const propRegex = /(\w+)=/g;
        let match;
        while ((match = propRegex.exec(line)) !== null) {
          const prop = match[1];
          if (prop && !validProps.includes(prop)) {
            errors.push(`Line ${index + 1}: Unidentified property "${prop}" in message tag`);
          }
        }
      }
    });

    const openTags = text.match(/<message[^>]*>/g) || [];
    const closeTags = text.match(/<\/message>/g) || [];
    if (openTags.length !== closeTags.length) {
      errors.push("Unclosed message tags detected");
    }

    console.log("Syntax check:", { errors });
    setSyntaxErrors(errors);
  }, []);

  useEffect(() => {
    checkSyntaxErrors(content);
  }, [content, checkSyntaxErrors]);

  const handleSubmit = useCallback(async () => {
    setIsImporting(true);
    try {
      await onSubmit(content);
      onClose();
    } catch (error) {
      console.error("Error importing conversation:", error);
      // Optionally, show an error message to the user
    } finally {
      setIsImporting(false);
    }
  }, [content, onSubmit, onClose]);

  const handleClose = useCallback(() => {
    if (content !== initialContent) {
      setShowUnsavedChangesAlert(true);
    } else {
      onClose();
    }
  }, [content, initialContent, onClose]);

  const handleConfirmClose = useCallback(() => {
    setShowUnsavedChangesAlert(false);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex h-[calc(100vh-2rem)] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>Import Conversation</DialogTitle>
        </DialogHeader>
        <div className="o mt-4 flex-1 overflow-auto rounded-md" ref={editorRef}>
          <Editor
            value={content}
            onValueChange={setContent}
            highlight={(code: string) => highlight(code, languages.customMessage!, "customMessage")}
            padding={10}
            style={{
              fontFamily: "monospace",
              fontSize: 13,
              caretColor: "white",
              backgroundColor: "black",
              borderRadius: "0.5rem",
            }}
            textareaClassName="outline-none whitespace-pre"
          />
        </div>
        <AnimatePresence>
          {syntaxErrors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-sm text-red-500"
            >
              <ul className="ml-4 list-inside list-disc">
                {syntaxErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
        <DialogFooter className="mt-4 flex flex-row *:flex-1">
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} loading={isImporting}>
            {syntaxErrors.length > 0 && <TriangleAlert className="mr-1 h-4 w-4 text-orange-500" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>

      {showUnsavedChangesAlert && (
        <Dialog open={showUnsavedChangesAlert} onOpenChange={setShowUnsavedChangesAlert}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unsaved Changes</DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex items-start gap-3">
              <AlertCircle className="size-5 text-yellow-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Are you sure you want to close without saving?</p>
            </div>
            <DialogFooter className="mt-4 flex flex-row gap-3 *:flex-1">
              <Button variant="outline" onClick={() => setShowUnsavedChangesAlert(false)}>
                Keep editing
              </Button>
              <Button onClick={handleConfirmClose}>Close anyway</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
