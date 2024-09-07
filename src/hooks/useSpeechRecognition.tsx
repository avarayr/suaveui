/// <reference types="dom-speech-recognition" />
import { useState, useEffect, useCallback, useRef } from "react";

type SpeechRecognition = typeof window.SpeechRecognition.prototype;

export const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [timeoutProgress, setTimeoutProgress] = useState(100);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const lastSpeechTimestamp = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef("");

  const audioContextRef = useRef<AudioContext | null>(null);

  const TIMEOUT_DURATION = 2500;

  const createRecognitionObject = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported in this browser.");
      return null;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    return recognition as unknown as SpeechRecognition;
  }, []);

  const startListening = useCallback(() => {
    setIsListening(true);
    if (!recognitionRef.current) {
      recognitionRef.current = createRecognitionObject();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        if (!(error as Error).message.includes("recognition has already started.")) {
          // serious error
          console.error("Error starting speech recognition", error);
          return;
        }
      }

      lastSpeechTimestamp.current = Date.now();
      setTimeoutProgress(100);
    }
  }, [createRecognitionObject]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current.abort();
      recognitionRef.current = null; // Destroy the recognition object
    }
    setIsListening(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const updateTimeoutProgress = useCallback(() => {
    const timeSinceLastSpeech = Date.now() - lastSpeechTimestamp.current;
    const newProgress = Math.max(0, 100 - (timeSinceLastSpeech / TIMEOUT_DURATION) * 100);
    setTimeoutProgress(newProgress);

    if (newProgress > 0) {
      animationFrameRef.current = requestAnimationFrame(updateTimeoutProgress);
    }
  }, []);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    const handleResult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let newFinalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i]?.isFinal) {
          newFinalTranscript += event.results[i]?.[0]?.transcript || "";
        } else {
          interimTranscript += event.results[i]?.[0]?.transcript || "";
        }
      }

      setTranscript((prev) => prev + newFinalTranscript);
      finalTranscriptRef.current += newFinalTranscript;
      setInterimTranscript(interimTranscript);

      lastSpeechTimestamp.current = Date.now();
      setTimeoutProgress(100);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(updateTimeoutProgress);
    };

    const handleError = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    const handleEnd = () => {
      if (isListening) {
        console.log("Speech recognition ended. Restarting...");
        recognition.start();
      } else {
        setIsListening(false);
      }
    };

    recognition.addEventListener("result", handleResult);
    recognition.addEventListener("error", handleError);
    recognition.addEventListener("end", handleEnd);

    return () => {
      recognition.removeEventListener("result", handleResult);
      recognition.removeEventListener("error", handleError);
      recognition.removeEventListener("end", handleEnd);
    };
  }, [isListening, startListening, stopListening, updateTimeoutProgress]);

  // Add a cleanup function
  const cleanup = useCallback(() => {
    stopListening();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current.abort(); // Abort any ongoing recognition
      recognitionRef.current = null;
    }
  }, [stopListening]);

  const resetInterimTranscript = useCallback(() => {
    setInterimTranscript("");
    setTranscript("");
  }, []);

  const resetFinalTranscript = useCallback(() => {
    finalTranscriptRef.current = "";
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    timeoutProgress,
    finalTranscript: finalTranscriptRef.current,
    resetInterimTranscript,
    resetFinalTranscript,
    cleanup,
  };
};
