import { useCallback, useState, useEffect } from "react";
import Worker from "../workers/ttsWorker?worker";
import { VoiceId } from "@diffusionstudio/vits-web";

type WorkerMessage =
  | { type: "loadingProgress"; progress: number }
  | { type: "loadingComplete" }
  | { type: "availableVoices"; voices: VoiceId[] }
  | { type: "result"; audio: Blob }
  | { type: "error"; message: string };

export const useSpeechSynthesis = ({
  enabled = true,
  selectedVoice,
}: {
  enabled?: boolean;
  selectedVoice: VoiceId;
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [availableVoices, setAvailableVoices] = useState<VoiceId[]>([]);

  useEffect(() => {
    const ttsWorker = new Worker();

    ttsWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      switch (event.data.type) {
        case "loadingProgress":
          setLoadingProgress(event.data.progress);
          break;
        case "loadingComplete":
          setIsLoading(false);
          break;
        case "availableVoices":
          setAvailableVoices(event.data.voices);
          break;
        case "error":
          console.error("Error in TTS worker:", event.data.message);
          break;
      }
    };
    setWorker(ttsWorker);

    ttsWorker.postMessage({ type: "getVoices" });

    return () => {
      ttsWorker.terminate();
      setWorker(null);
    };
  }, []);

  useEffect(() => {
    if (worker && selectedVoice && enabled) {
      setIsLoading(true);
      worker.postMessage({ type: "init", voiceId: selectedVoice });
    }

    return () => {
      if (worker) {
        worker.postMessage({ type: "terminate" });
      }
    };
  }, [worker, selectedVoice, enabled]);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!worker) return;

      const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
      const cleanedText = text.replace(emojiRegex, "");

      return new Promise((resolve, reject) => {
        let audio: HTMLAudioElement | null = null;

        const messageHandler = (event: MessageEvent<WorkerMessage>) => {
          switch (event.data.type) {
            case "result":
              audio = new Audio(URL.createObjectURL(event.data.audio));
              audio.onended = () => {
                setIsSpeaking(false);
                cleanup();
                resolve();
              };
              setIsSpeaking(true);
              void audio.play();
              break;
            case "error":
              cleanup();
              reject(new Error(event.data.message));
              break;
          }
        };

        const cleanup = () => {
          worker.removeEventListener("message", messageHandler);
          if (audio) {
            audio.onended = null;
          }
        };

        worker.addEventListener("message", messageHandler);
        worker.postMessage({ type: "speak", text: cleanedText });
      });
    },
    [worker],
  );

  return { speak, isSpeaking, isLoading, loadingProgress, availableVoices, selectedVoice };
};
