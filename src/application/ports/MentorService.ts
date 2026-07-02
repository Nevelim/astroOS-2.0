/**
 * MentorService — порт для AI-наставника.
 * 4 голоса, persistent memory, 2 a.m. Companion режим.
 */
import type { VoiceProfile } from "../../domain/entities/Member";

export interface MentorMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
  citedTransits?: ReadonlyArray<{ description: string; date: string }>;
  voice?: VoiceProfile;
}

export interface MentorMemory {
  memberId: string;
  persona: string; // stable persona description
  keyFacts: ReadonlyArray<string>;
  recentMessages: ReadonlyArray<MentorMessage>;
}

export interface MentorChatRequest {
  memberId: string;
  message: string;
  voice: VoiceProfile;
  twoAmCompanion: boolean;
  locale: string;
  context?: {
    cityId?: string;
    screenKey?: string;
  };
}

export interface MentorChatResponse {
  message: MentorMessage;
  tokensUsed: number;
  cached: boolean;
}

export interface MentorService {
  chat(request: MentorChatRequest): Promise<MentorChatResponse>;
  streamChat(request: MentorChatRequest): AsyncIterable<string>;
  recallMemory(memberId: string): Promise<MentorMemory>;
  appendMemory(memberId: string, message: MentorMessage): Promise<void>;
}

export interface MentorMemoryRepository {
  get(memberId: string): Promise<MentorMemory | null>;
  save(memory: MentorMemory): Promise<void>;
  appendMessage(memberId: string, message: MentorMessage): Promise<void>;
}
