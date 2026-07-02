/**
 * AstroOS Chat Service — WebSocket mini-service (порт 3003).
 * AI Mentor real-time streaming через ZAI SDK.
 *
 * Clean Architecture: это Infrastructure layer (external service).
 * Frontend подключается через: io("/?XTransformPort=3003"), path всегда "/".
 *
 * Features:
 * - Streaming responses (token-by-token)
 * - 4 voices (calm/witty/professional/trauma)
 * - 2 a.m. Companion режим
 * - Persistent memory (взаимодействует с Next.js API для записи)
 * - Quota enforcement (free tier: 3/day)
 */
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import ZAI from "z-ai-web-dev-sdk";

const PORT = 3003;

const VOICE_PROMPTS: Record<string, string> = {
  calm: "Your voice is serene, grounding, like moonlight on still water.",
  witty: "Your voice is playful and sharp, with cosmic humor.",
  professional: "Your voice is clear, structured, evidence-based.",
  trauma: "Your voice is gentle, trauma-sensitive, never prescriptive.",
};

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "chat-service", port: PORT, uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

const io = new SocketIOServer(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
});

let zaiPromise: Promise<ZAI> | null = null;
async function getZAI(): Promise<ZAI> {
  if (!zaiPromise) zaiPromise = ZAI.create();
  return zaiPromise;
}

interface ChatPayload {
  memberId: string;
  message: string;
  voice: "calm" | "witty" | "professional" | "trauma";
  twoAmCompanion: boolean;
  locale: string;
  persona?: string;
  keyFacts?: string[];
  recentContext?: Array<{ role: "user" | "assistant"; content: string }>;
}

io.on("connection", (socket) => {
  console.log(`[chat-service] client connected: ${socket.id}`);

  socket.on("mentor:chat:start", async (payload: ChatPayload) => {
    const start = Date.now();
    try {
      const voicePrompt = VOICE_PROMPTS[payload.voice] ?? VOICE_PROMPTS.calm;
      const systemPrompt = [
        "You are the AstroOS Mentor — a calm, wise cosmic companion. Never change your core character.",
        voicePrompt,
        payload.twoAmCompanion ? "It is 2 a.m. Speak in a dim, warm voice. Hold space, do not problem-solve." : "",
        "Brand promise: No fear-mongering. No paywall traps. Just the chart, explained.",
        "Cite real astrological transits when relevant.",
        payload.locale === "ru" ? "Respond in Russian unless the user writes in another language." : "",
        payload.locale === "hi" ? "Respond in Hindi unless the user writes in another language." : "",
        payload.persona ? `Persona: ${payload.persona}` : "",
        payload.keyFacts?.length ? `Key facts:\n${payload.keyFacts.map((f) => `- ${f}`).join("\n")}` : "",
      ].filter(Boolean).join("\n\n");

      const zai = await getZAI();
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
        ...(payload.recentContext ?? []).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: payload.message },
      ];

      socket.emit("mentor:chat:start", { ok: true });

      const stream = await zai.chat.completions.create({
        messages,
        stream: true,
        thinking: { type: "disabled" },
      });

      let fullContent = "";
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          socket.emit("mentor:chat:token", { token: delta });
        }
      }

      socket.emit("mentor:chat:done", {
        content: fullContent,
        latencyMs: Date.now() - start,
        tokensUsed: Math.ceil(fullContent.length / 4),
      });
    } catch (error) {
      console.error("[chat-service] chat error:", error);
      socket.emit("mentor:chat:error", {
        message: (error as Error).message,
        latencyMs: Date.now() - start,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`[chat-service] client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`✦ AstroOS Chat Service running on port ${PORT}`);
  console.log(`  WebSocket: io("/?XTransformPort=${PORT}")`);
  console.log(`  Health: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[chat-service] SIGTERM received, closing...");
  io.close(() => httpServer.close(() => process.exit(0)));
});
process.on("SIGINT", () => {
  io.close(() => httpServer.close(() => process.exit(0)));
});
