"use client";
/**
 * ParticleBurst — взрыв частиц при действии (cast, reveal, mentor message).
 * Hades 2 style: gold/jade/rose sparks с затуханием.
 * Canvas-based для производительности.
 */
import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface ParticleBurstProps {
  trigger: number; // меняется → триггерит взрыв
  color?: string;
  count?: number;
  className?: string;
}

export function ParticleBurst({ trigger, color = "#E8B86D", count = 30, className }: ParticleBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const lastTriggerRef = useRef<number>(0);

  useEffect(() => {
    if (trigger !== lastTriggerRef.current && trigger > 0) {
      lastTriggerRef.current = trigger;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const colors = [color, "#5BB89C", "#D98E7A", "#F5F0E8"];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = 2 + Math.random() * 4;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 40 + Math.random() * 30,
          size: 1.5 + Math.random() * 2.5,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }
  }, [trigger, color, count]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity
        p.vx *= 0.98;
        p.life++;

        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio >= 1) {
          particles.splice(i, 1);
          continue;
        }
        const opacity = 1 - lifeRatio;
        const size = p.size * (1 - lifeRatio * 0.5);

        // Glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 4);
        glow.addColorStop(0, p.color + Math.round(opacity * 255).toString(16).padStart(2, "0"));
        glow.addColorStop(1, p.color + "00");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = p.color + Math.round(opacity * 255).toString(16).padStart(2, "0");
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (particles.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 ${className ?? ""}`}
      style={{ zIndex: 50 }}
      aria-hidden="true"
    />
  );
}

export default ParticleBurst;
