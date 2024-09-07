import { AnimatePresence, motion, useAnimation } from "framer-motion";
import { Loader2, Mic, Phone, Volume, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createNoise2D } from "simplex-noise";
import { useMessageGeneration } from "~/hooks/useMessageGeneration";
import { useSpeechRecognition } from "~/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "~/hooks/useSpeechSynthesis";
import { api } from "~/trpc/react";

type VideoCallModalProps = {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
};

type Particle = {
  x: number;
  y: number;
  angle: number;
  speed: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
};

const NUM_PARTICLES = 100;

export const VideoCallModal = ({ isOpen, onClose, chatId }: VideoCallModalProps) => {
  const { tryFollowMessageGeneration } = useMessageGeneration(chatId);

  const [isSpeaking, setIsSpeaking] = useState(false);

  const {
    transcript,
    interimTranscript,
    finalTranscript,
    isListening,
    startListening,
    stopListening,
    timeoutProgress,
    resetInterimTranscript,
    resetFinalTranscript,
    cleanup: cleanupSpeechRecognition,
  } = useSpeechRecognition();

  const { speak, isSpeaking: isTTSSpeaking } = useSpeechSynthesis();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const animationControls = useAnimation();
  const noise2D = useRef(createNoise2D());
  const transcriptBoxRef = useRef<HTMLDivElement>(null);
  const sentMessageRef = useRef<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const sendMessageMutation = api.chat.sendMessage.useMutation();

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!isOpen) return; // Add this line to prevent processing if the modal is closed

      stopListening();

      try {
        setIsThinking(true);
        const response = await sendMessageMutation.mutateAsync({
          chatId,
          content: message.trim(),
        });

        if (response.followMessageId && isOpen) {
          // Add isOpen check here
          const result = await tryFollowMessageGeneration(response.followMessageId);

          if (isOpen) {
            // Add isOpen check here
            setDisplayedWords(result?.split(" ") || []);

            if (result) {
              setIsSpeaking(true);
              await speak(result);
            }
            setIsSpeaking(false);
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsThinking(false);
      }

      resetInterimTranscript();
      resetFinalTranscript();

      if (isOpen) {
        startListening();
      }

      sentMessageRef.current = null;
    },
    [
      isOpen,
      stopListening,
      resetInterimTranscript,
      resetFinalTranscript,
      sendMessageMutation,
      chatId,
      tryFollowMessageGeneration,
      speak,
      startListening,
    ],
  );

  const initializeParticles = useCallback(() => {
    particlesRef.current = Array.from({ length: NUM_PARTICLES }, () => ({
      x: Math.random() * 320,
      y: Math.random() * 320,
      angle: Math.random() * Math.PI * 2,
      speed: 0.1 + Math.random() * 0.1,
      noiseOffsetX: Math.random() * 1000,
      noiseOffsetY: Math.random() * 1000,
    }));
  }, []);

  const updateAndDrawParticles = useCallback((ctx: CanvasRenderingContext2D, amplitude: number) => {
    const time = Date.now() / 1000;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Create a clipping path for the circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, ctx.canvas.width / 2, 0, Math.PI * 2);
    ctx.clip();

    particlesRef.current.forEach((particle) => {
      // Increase noise intensity based on amplitude
      const noiseIntensity = amplitude * 2; // Amplify the effect of voice
      const noiseX = noise2D.current(particle.noiseOffsetX, time * 0.5) * noiseIntensity;
      const noiseY = noise2D.current(particle.noiseOffsetY, time * 0.5) * noiseIntensity;

      // Increase particle speed based on amplitude
      const speedMultiplier = 1 + amplitude * 2; // Particles move faster with voice

      // Update particle position
      particle.x += Math.cos(particle.angle) * particle.speed * speedMultiplier + noiseX;
      particle.y += Math.sin(particle.angle) * particle.speed * speedMultiplier + noiseY;

      // Wrap particles around the canvas
      particle.x = (particle.x + ctx.canvas.width) % ctx.canvas.width;
      particle.y = (particle.y + ctx.canvas.height) % ctx.canvas.height;

      // Update noise offsets
      particle.noiseOffsetX += 0.01;
      particle.noiseOffsetY += 0.01;

      // Calculate distance from center
      const dx = particle.x - ctx.canvas.width / 2;
      const dy = particle.y - ctx.canvas.height / 2;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
      const maxRadius = ctx.canvas.width / 2;

      // Only draw particles within the circle
      if (distanceFromCenter <= maxRadius) {
        // Increase particle size based on amplitude
        const particleSize = 1 + amplitude * 2; // Particles grow with voice

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particleSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + amplitude * 0.7})`;
        ctx.fill();
      }
    });

    // Restore the canvas context
    ctx.restore();
  }, []);

  const updateVisualizer = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match its display size
    canvasRef.current.width = canvasRef.current.offsetWidth;
    canvasRef.current.height = canvasRef.current.offsetHeight;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
    const amplitude = Math.max(0.1, average / 128); // Ensure a minimum amplitude of 0.1

    updateAndDrawParticles(ctx, amplitude);

    // Update the glowing circle
    void animationControls.start({
      scale: 1 + amplitude * 0.3,
      opacity: 0.8 + amplitude * 0.2,
      transition: { duration: 0.1 },
    });

    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  }, [updateAndDrawParticles, animationControls]);

  const setupAudioAnalyser = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      initializeParticles();
      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    } catch (error) {
      console.error("Error setting up audio analyser:", error);
    }
  }, [updateVisualizer, initializeParticles]);

  const cleanupAudioAnalyser = useCallback(() => {
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  useEffect(() => {
    if (timeoutProgress === 0 && finalTranscript && !isTTSSpeaking && finalTranscript !== sentMessageRef.current) {
      void handleSendMessage(finalTranscript);
      sentMessageRef.current = finalTranscript;
    }
  }, [timeoutProgress, finalTranscript, isTTSSpeaking, handleSendMessage]);

  const cleanupAll = useCallback(() => {
    stopListening();
    cleanupSpeechRecognition();
    cleanupAudioAnalyser();
    setDisplayedWords([]);
    setIsThinking(false);
    setIsSpeaking(false);
    sentMessageRef.current = null;
    window.speechSynthesis.cancel();
  }, [stopListening, cleanupSpeechRecognition, cleanupAudioAnalyser]);

  useEffect(() => {
    if (isOpen) {
      startListening();
      void setupAudioAnalyser();
    } else {
      console.log("Closing video call modal");
      cleanupAll();
    }

    return () => {
      cleanupAll();
    };
  }, [isOpen, setupAudioAnalyser, startListening, cleanupAll]);

  useEffect(() => {
    const allWords = (transcript + " " + interimTranscript).trim().split(" ");
    setDisplayedWords(allWords);
  }, [transcript, interimTranscript]);

  useEffect(() => {
    if (transcriptBoxRef.current) {
      transcriptBoxRef.current.scrollLeft = transcriptBoxRef.current.scrollWidth;
      transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
    }
  }, [displayedWords]);

  useEffect(() => {
    const currentAbortController = abortControllerRef.current;

    return () => {
      if (currentAbortController) {
        currentAbortController.abort();
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex w-full max-w-sm flex-col items-center px-4 sm:max-w-md md:max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main circle with outer progress ring */}
            <div className="relative flex h-60 w-60 items-center justify-center sm:h-72 sm:w-72 md:h-80 md:w-80">
              {/* Progress ring */}
              <svg className="absolute inset-0 h-full w-full -rotate-90">
                <AnimatePresence>
                  {timeoutProgress <= 90 && (
                    <motion.circle
                      key="progress-circle"
                      className="text-[#a0a0a0]"
                      strokeWidth="12"
                      stroke="currentColor"
                      fill="transparent"
                      r="47%"
                      cx="50%"
                      cy="50%"
                      strokeLinecap="round"
                      initial={{ opacity: 0, pathLength: 0 }}
                      animate={{ opacity: 1, pathLength: timeoutProgress / 100 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </AnimatePresence>
              </svg>

              {/* Main circle */}
              <div className="relative flex h-[95%] w-[95%] items-center justify-center overflow-hidden rounded-full bg-[#1a1a1a] shadow-lg">
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

                <div className="z-10 flex flex-col items-center justify-center space-y-3">
                  {isListening ? (
                    <>
                      <Mic className="size-8 text-[#e0e0e0]" />
                      <span className="text-lg font-medium text-[#e0e0e0]">Listening...</span>
                    </>
                  ) : isSpeaking ? (
                    <>
                      <Volume2 className="size-8 text-[#e0e0e0]" />
                      <span className="text-lg font-medium text-[#e0e0e0]">Speaking...</span>
                    </>
                  ) : isThinking ? (
                    <>
                      <Loader2 className="size-8 animate-spin text-[#e0e0e0]" />
                      <span className="text-lg font-medium text-[#e0e0e0]">Thinking</span>
                    </>
                  ) : (
                    <>
                      <Phone className="size-8 text-[#e0e0e0]" />
                      <span className="text-lg font-medium text-[#e0e0e0]">Call Active</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Transcript box */}
            <motion.div
              className="mt-6 w-full max-w-xs overflow-hidden rounded-lg bg-[#2a2a2a] shadow-lg sm:max-w-sm md:max-w-md"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="border-b border-[#3a3a3a] px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#a0a0a0]">
                Transcript
              </div>
              <div ref={transcriptBoxRef} className="scrollbar-hide max-h-24 overflow-y-auto px-4 py-3">
                {displayedWords.length > 0 && displayedWords?.[0]?.trim() !== "" ? (
                  <p className="text-sm text-[#e0e0e0]">{displayedWords.join(" ")}</p>
                ) : (
                  <motion.div
                    className="flex h-4 w-6 animate-pulse rounded-xl bg-white/30"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="m-auto" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
