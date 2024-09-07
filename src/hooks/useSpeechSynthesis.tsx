import { useCallback } from "react";

export const useSpeechSynthesis = () => {
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  return { speak };
};
