/// <reference types="dom-speech-recognition" />
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

type SpeechRecognition = typeof window.SpeechRecognition.prototype;

export const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const createRecognitionObject = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported in this browser.");
      return null;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US"; // Set the language, adjust as needed
    return recognition as unknown as SpeechRecognition;
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      recognitionRef.current = createRecognitionObject();
    }
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  }, [createRecognitionObject]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  }, []);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results?.[current]?.[0]?.transcript;
      if (transcript) {
        setTranscript(transcript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        console.log("No speech detected. Restarting recognition.");
        stopListening();
        startListening();
      } else {
        console.error("Speech recognition error", event.error);
        stopListening();
      }
    };

    recognition.onend = () => {
      if (isListening) {
        console.log("Speech recognition ended. Restarting...");
        startListening();
      }
    };

    return () => {
      recognition.stop();
    };
  }, [isListening, startListening, stopListening]);

  return { transcript, isListening, startListening, stopListening };
};
