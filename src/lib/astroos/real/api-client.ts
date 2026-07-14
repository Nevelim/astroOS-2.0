/**
 * api-client — типизированные client-side вызовы к AstroOS backend.
 * Clean Architecture: это Interface Adapter (client side), не содержит бизнес-логики.
 */

export interface MemberDTO {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  tier: "free" | "trial" | "pro_monthly" | "pro_annual" | "lifetime" | "b2b";
  trialEndsAt?: string;
  subscriptionRenewsAt?: string;
  locale: "ru" | "en" | "hi";
  voice: "calm" | "witty" | "professional" | "trauma";
  streak: number;
  wardThisWeek: number;
  isPremium: boolean;
  age?: number | null;
  bazi: { dayMaster: string; dayMasterElement: string } | null;
  birth: {
    isoDateTime: string;
    placeName: string;
    lat: number;
    lng: number;
    tzOffset: number;
    gender: 0 | 1;
  };
}

export interface CityDTO {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  tzOffsetHours: number;
  population?: number;
  qolIndex?: number;
  costIndex?: number;
  climate?: string;
  iso2?: string;
  displayName: string;
}

export interface ResolvedBirthDTO {
  city: CityDTO;
  birth: {
    utcISO: string;
    offsetHours: number;
    dstActive: boolean;
    ianaTimezone: string;
    standardOffsetHours: number;
    offsetLabel: string;
    tzAbbr: string;
  };
  calculatePayload: {
    birthDateTime: string;
    birthLat: number;
    birthLng: number;
    birthTzOffset: number;
    birthPlaceName: string;
  };
}

export interface AstroLineDTO {
  planet: string;
  type: string;
  points: Array<{ lat: number; lng: number }>;
  weight: number;
  tone: "gold" | "jade" | "rose" | "neutral";
  id: string;
}

export interface RankedCityDTO {
  rank: number;
  city: {
    id: string; name: string; country: string;
    lat: number; lng: number;
    qolIndex?: number; costIndex?: number; population?: number; climate?: string;
  };
  index: {
    index: number; tone: string; matchType: string; demoted: boolean;
    magnetism: number; visibility: number; irrationality: number;
  };
  influences: Array<{ planet: string; type: string; distKm: number; zone: string; weight: number }>;
  sandwichPosition: "anchor" | "editor" | "chosen" | null;
}

export interface CalculateResult {
  lines: AstroLineDTO[];
  planetPositions: Array<{ planet: string; eclipticLonDeg: number; eclipticLatDeg: number }>;
  ascendantLonDeg: number;
  midheavenLonDeg: number;
  engineVersion: string;
  cached: boolean;
  rankedCities?: RankedCityDTO[];
}

export interface BaZiDTO {
  yearPillar: { stem: string; branch: string; stemElement: string; stemYinYang: string };
  monthPillar: { stem: string; branch: string; stemElement: string; stemYinYang: string };
  dayPillar: { stem: string; branch: string; stemElement: string; stemYinYang: string };
  timePillar: { stem: string; branch: string; stemElement: string; stemYinYang: string };
  dayMaster: string;
  dayMasterElement: string;
  dayMasterYinYang: string;
  luckPillars: Array<{ stem: string; branch: string; startAge: number; endAge: number }>;
  elementBalance: Record<string, number>;
  tenGods: string[];
}

export interface IChingHexagramDTO {
  primaryNumber: number;
  primaryName: string;
  primaryNameRu: string;
  changingLines: number[];
  secondaryNumber?: number;
  secondaryName?: string;
  secondaryNameRu?: string;
  judgment: { en: string; ru: string };
  image: { en: string; ru: string };
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(err.error ?? `HTTP ${r.status}`);
  }
  return r.json() as Promise<T>;
}

export const api = {
  // Auth
  register: (data: {
    email: string; password: string; displayName: string;
    birthDateTime: string; birthLat: number; birthLng: number;
    birthTzOffset: number; birthPlaceName: string; gender: 0 | 1;
    locale?: "ru" | "en" | "hi";
  }) => request<{ member: MemberDTO }>("/api/auth/register", {
    method: "POST", body: JSON.stringify(data),
  }),

  login: (email: string, password: string) =>
    request<{ member: MemberDTO }>("/api/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  getMe: () => request<{ member: MemberDTO | null }>("/api/auth/me"),

  // Calculate
  calculate: (birth: {
    birthDateTime: string; birthLat: number; birthLng: number;
    birthTzOffset: number; birthPlaceName: string; gender: 0 | 1;
    rankCities?: boolean; cityLimit?: number;
  }) => request<CalculateResult>("/api/calculate", {
    method: "POST", body: JSON.stringify(birth),
  }),

  // BaZi
  calculateBaZi: (birth: {
    birthDateTime: string; birthLat: number; birthLng: number;
    birthTzOffset: number; birthPlaceName: string; gender: 0 | 1;
  }) => request<{ bazi: BaZiDTO; source: string; latencyMs: number; recommendations: unknown }>(
    "/api/bazi/calculate", { method: "POST", body: JSON.stringify(birth) }
  ),

  // Cities
  getCities: (q?: string, limit?: number) =>
    request<{ cities: CityDTO[]; total: number }>(
      `/api/cities${q ? `?q=${encodeURIComponent(q)}` : ""}${limit ? `${q ? "&" : "?"}limit=${limit}` : ""}`
    ),

   // Geo / Birth UTC resolution
  resolveBirth: (data: {
    cityId?: string; cityName?: string; country?: string;
    birthDateTime: string;
  }) => request<ResolvedBirthDTO>("/api/geo/resolve-birth", {
    method: "POST", body: JSON.stringify(data),
  }),

  // AI Mentor
  mentorChat: (data: {
    message: string; voice: "calm" | "witty" | "professional" | "trauma";
    twoAmCompanion?: boolean; context?: { cityId?: string; screenKey?: string };
  }) => request<{
    message: { id: string; role: string; content: string; createdAt: string; citedTransits?: Array<{ description: string; date: string }>; voice?: string };
    tokensUsed: number; cached: boolean;
    quota: { used: number; total: number; remaining: number };
  }>("/api/ai/chat", { method: "POST", body: JSON.stringify(data) }),

  // I-Ching
  castIChing: (question?: string) =>
    request<{ hexagram: IChingHexagramDTO; question: string | null }>("/api/iching", {
      method: "POST", body: JSON.stringify({ question }),
    }),

  // Billing
  getBillingStatus: () => request<{
    tier: string; isPremium: boolean; isTrialActive: boolean;
    trialEndsAt?: string; subscriptionRenewsAt?: string;
    pricing: { monthly: number; annual: number; lifetime: number };
  }>("/api/billing/status"),

  subscribe: (tier: "pro_monthly" | "pro_annual" | "lifetime", provider?: "stripe" | "apple" | "google", pppCountry?: string) =>
    request<{ status: string; tier: string; amount: number; currency: string; pppApplied: boolean }>(
      "/api/billing/subscribe", { method: "POST", body: JSON.stringify({ tier, provider, pppCountry }) }
    ),

  cancelSubscription: () =>
    request<{ status: string; message: string }>("/api/billing/cancel", { method: "POST" }),

  // Health
  health: () => request<{
    status: string; uptime: number; db: { memberCount: number; cityCount: number; latencyMs: number };
    cache: { chart: { size: number; hits: number; misses: number; hitRate: number }; bazi: { size: number; hits: number; misses: number; hitRate: number } };
    sessions: number;
  }>("/api/health"),
};
