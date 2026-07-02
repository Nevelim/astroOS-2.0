"use client";
/**
 * useMentorChat — hook для AI Mentor с WebSocket streaming + fallback на REST.
 * Clean Architecture: Interface Adapter, bridge между chat-service (WS :3003) и UI.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { api } from "./api-client";

export interface MentorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  citedTransits?: Array<{ description: string; date: string }>;
  voice?: string;
  streaming?: boolean;
}

interface UseMentorChatOptions {
  voice: "calm" | "witty" | "professional" | "trauma";
  twoAmCompanion: boolean;
  locale: string;
  memberId?: string;
}

export function useMentorChat(options: UseMentorChatOptions) {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<{ used: number; total: number; remaining: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof import("socket.io-client")["io"]> | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);

    const userMsg: MentorMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date(),
    };
    const assistantMsg: MentorMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: new Date(),
      voice: options.voice,
      streaming: true,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      // Сначала пробуем WebSocket streaming через chat-service (:3003)
      await sendViaSocket(text, assistantMsg.id);
    } catch (wsError) {
      // Fallback на REST API
      try {
        const response = await api.mentorChat({
          message: text,
          voice: options.voice,
          twoAmCompanion: options.twoAmCompanion,
        });
        setMessages((prev) => prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: response.message.content, streaming: false, citedTransits: response.message.citedTransits }
            : m
        ));
        setQuota(response.quota);
      } catch (restError) {
        setError((restError as Error).message);
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
      }
    } finally {
      setLoading(false);
    }
  }, [loading, options.voice, options.twoAmCompanion]);

  const sendViaSocket = useCallback((text: string, assistantId: string) => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const { io } = await import("socket.io-client");
        if (!socketRef.current) {
          socketRef.current = io("/?XTransformPort=3003", { transports: ["websocket"] });
        }
        const socket = socketRef.current;
        const timeout = setTimeout(() => {
          socket.off("mentor:chat:token");
          socket.off("mentor:chat:done");
          socket.off("mentor:chat:error");
          reject(new Error("WS timeout"));
        }, 30000);

        socket.off("mentor:chat:token").off("mentor:chat:done").off("mentor:chat:error");
        socket.on("mentor:chat:token", (data: { token: string }) => {
          setMessages((prev) => prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + data.token } : m
          ));
        });
        socket.on("mentor:chat:done", (data: { content: string; latencyMs: number; tokensUsed: number }) => {
          clearTimeout(timeout);
          setMessages((prev) => prev.map((m) =>
            m.id === assistantId ? { ...m, content: data.content, streaming: false } : m
          ));
          setQuota({ used: 1, total: 3, remaining: 2 });
          resolve();
        });
        socket.on("mentor:chat:error", (data: { message: string }) => {
          clearTimeout(timeout);
          reject(new Error(data.message));
        });

        socket.emit("mentor:chat:start", {
          memberId: options.memberId ?? "anonymous",
          message: text,
          voice: options.voice,
          twoAmCompanion: options.twoAmCompanion,
          locale: options.locale,
          recentContext: [],
        });
      } catch (e) {
        reject(e);
      }
    });
  }, [options.voice, options.twoAmCompanion, options.locale, options.memberId]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { messages, loading, error, quota, sendMessage };
}
