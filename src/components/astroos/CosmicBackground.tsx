"use client";
/**
 * CosmicBackground — анимированный звёздный фон (Hades 2 atmosphere).
 * Particle effects: drifting stars, subtle nebula glow, shooting stars.
 * Performance: requestAnimationFrame, canvas-based, 60fps.
 */
import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number; // depth (0..1)
  size: number;
  opacity: number;
  twinkle: number;
  twinkleSpeed: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export function CosmicBackground({ density = 1 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const starCount = Math.floor((width * height) / 8000 * density);
    const stars: Star[] = [];
    const shootingStars: ShootingStar[] = [];

    // Init stars
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random(),
        size: Math.random() * 1.5 + 0.3,
        opacity: Math.random() * 0.7 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
      });
    }

    let lastShootingStar = Date.now();

    const draw = () => {
      ctx.fillStyle = "rgba(11, 11, 15, 0.95)";
      ctx.fillRect(0, 0, width, height);

      // Subtle nebula glow
      const gradient = ctx.createRadialGradient(
        width * 0.3, height * 0.4, 0,
        width * 0.3, height * 0.4, width * 0.5
      );
      gradient.addColorStop(0, "rgba(232, 184, 109, 0.03)");
      gradient.addColorStop(0.5, "rgba(91, 184, 156, 0.015)");
      gradient.addColorStop(1, "rgba(11, 11, 15, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw stars
      for (const star of stars) {
        star.twinkle += star.twinkleSpeed;
        const twinkleOpacity = star.opacity * (0.6 + 0.4 * Math.sin(star.twinkle));

        // Gold/jade tinted stars
        const tint = star.z > 0.7 ? "232, 184, 109" : star.z > 0.4 ? "91, 184, 156" : "245, 240, 232";

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * star.z, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${tint}, ${twinkleOpacity})`;
        ctx.fill();

        // Glow for bright stars
        if (star.z > 0.8) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
          const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3);
          glow.addColorStop(0, `rgba(${tint}, ${twinkleOpacity * 0.3})`);
          glow.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = glow;
          ctx.fill();
        }

        // Slow drift
        star.x += 0.02 * star.z;
        if (star.x > width) star.x = 0;
      }

      // Shooting stars (rare)
      const now = Date.now();
      if (now - lastShootingStar > 8000 + Math.random() * 12000) {
        lastShootingStar = now;
        shootingStars.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.5,
          vx: 4 + Math.random() * 4,
          vy: 1 + Math.random() * 2,
          life: 0,
          maxLife: 60 + Math.random() * 40,
        });
      }

      // Draw + update shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life++;

        const lifeRatio = s.life / s.maxLife;
        const opacity = lifeRatio < 0.2 ? lifeRatio / 0.2 : 1 - (lifeRatio - 0.2) / 0.8;

        // Tail
        const tailLength = 40;
        const gradient = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * tailLength / 4, s.y - s.vy * tailLength / 4);
        gradient.addColorStop(0, `rgba(232, 184, 109, ${opacity})`);
        gradient.addColorStop(1, "rgba(232, 184, 109, 0)");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * tailLength / 4, s.y - s.vy * tailLength / 4);
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 200, ${opacity})`;
        ctx.fill();

        if (s.life >= s.maxLife) {
          shootingStars.splice(i, 1);
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}

export default CosmicBackground;
