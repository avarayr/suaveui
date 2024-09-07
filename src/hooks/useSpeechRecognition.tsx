/// <reference types="dom-speech-recognition" />
import { useState, useEffect, useCallback, useRef } from "react";

type SpeechRecognition = typeof window.SpeechRecognition.prototype;

export const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [timeoutProgress, setTimeoutProgress] = useState(100);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const lastSpeechTimestamp = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);

  const TIMEOUT_DURATION = 5000; // 5 seconds

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
    if (!recognitionRef.current) {
      recognitionRef.current = createRecognitionObject();
    }
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setIsSpeaking(true);
        lastSpeechTimestamp.current = Date.now();
        setTimeoutProgress(100);
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
      }
    }
  }, [createRecognitionObject, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        setIsSpeaking(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      } catch (error) {
        console.error("Failed to stop speech recognition:", error);
      }
    }
  }, [isListening]);

  const updateTimeoutProgress = useCallback(() => {
    const timeSinceLastSpeech = Date.now() - lastSpeechTimestamp.current;
    const newProgress = Math.max(0, 100 - (timeSinceLastSpeech / TIMEOUT_DURATION) * 100);
    setTimeoutProgress(newProgress);

    if (newProgress > 0 && isSpeaking) {
      animationFrameRef.current = requestAnimationFrame(updateTimeoutProgress);
    } else {
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    const handleResult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i]?.isFinal) {
          finalTranscript += event.results[i]?.[0]?.transcript || "";
        } else {
          interimTranscript += event.results[i]?.[0]?.transcript || "";
        }
      }

      setTranscript((prev) => prev + finalTranscript);
      setInterimTranscript(interimTranscript);

      setIsSpeaking(true);
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
      if (isListening && isSpeaking) {
        console.log("Speech recognition ended. Restarting...");
        recognition.start();
      } else if (!isSpeaking) {
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
      stopListening();
    };
  }, [isListening, isSpeaking, startListening, stopListening, updateTimeoutProgress]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    timeoutProgress,
  };
};
