import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  opacity: number;
  fadeInSpeed: number;
  fadeOutSpeed: number;
  isFadingOut: boolean;
}

/**
 * A particle effect that creates a sparkly backdrop.
 * Requires parent container to have `relative` positioning.
 * and wrapped in <AnimatePresence> to animate in and out.
 */
export const SpoilerParticles = React.memo(
  (
    props: React.ComponentPropsWithoutRef<typeof motion.div> & {
      parentClassName?: string;
    },
  ) => {
    const particles = useRef<Particle[]>([]);

    const sparklesRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const canvas = sparklesRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;

      const batchParticleCount = 1;
      const spawnInterval = 8; // Spawn interval in milliseconds
      // Set canvas dimensions to match parent container
      const resizeCanvas = () => {
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        // ...then set the internal size to match
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      };

      resizeCanvas();

      // Spawn particles
      const spawnParticle = () => {
        for (let i = 0; i < batchParticleCount; i++) {
          particles.current.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speedX: Math.random() > 0.5 ? Math.random() : -Math.random(),
            speedY: Math.random() > 0.5 ? Math.random() : -Math.random(),
            opacity: 0,
            fadeInSpeed: 0.05,
            fadeOutSpeed: 0.01,
            isFadingOut: false,
          });
        }
      };

      // Animation loop
      const animate = () => {
        if (!ctx) return;
        if (!canvas) return;
        if (!sparklesRef.current) return;
        if (!particles.current) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.current.forEach((particle, index) => {
          particle.x += particle.speedX * 0.05;
          particle.y += particle.speedY * 0.05;

          // Fade in particles
          if (!particle.isFadingOut) {
            particle.opacity = Math.min(particle.opacity + particle.fadeInSpeed, 1);
            if (particle.opacity === 1) {
              particle.isFadingOut = true;
            }
          } else {
            // Fade out particles
            particle.opacity = Math.max(particle.opacity - particle.fadeOutSpeed, 0);
          }

          ctx.beginPath();
          const size = 0.8;
          ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
          ctx.fill();
          ctx.closePath();

          // Remove particles that have faded out
          if (particle.opacity <= 0) {
            particles.current.splice(index, 1);
          }
        });

        requestAnimationFrame(animate);
      };

      // Start spawning particles
      const spawnIntervalId = setInterval(spawnParticle, spawnInterval);

      // Start animation loop
      animate();

      // Clean up
      return () => {
        clearInterval(spawnIntervalId);
      };
    }, [sparklesRef]);

    return (
      <motion.div className={props.parentClassName} exit={{ opacity: 0 }}>
        <AnimatePresence>
          {/* Sparkles */}
          <motion.canvas
            className="sparkles-canvas absolute inset-0 z-[11]"
            width="100"
            height="100"
            ref={sparklesRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            {...(props as any)}
          />
        </AnimatePresence>

        <AnimatePresence>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-10 mx-[-2px] flex h-full w-[calc(100%+4px)] animate-shimmer items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-r from-transparent
          via-[#146FFD]/10
          to-transparent bg-[length:200%_100%] backdrop-blur-3xl repeat-infinite
          `}
          />
        </AnimatePresence>
      </motion.div>
    );
  },
);
