# AstroOS 2.0 — Agent Handover Document

> **Last updated:** Session boundary (Tasks 0–20 complete)
> **Purpose:** Copy-paste this entire document into a new chat so the new AI agent immediately understands the project context, architecture, current state, and priorities.

---

## 1. Project Overview

**AstroOS 2.0** is a production-grade astrology web application built with **Next.js 16 + TypeScript 5 + Prisma (SQLite)**. It combines Western astrology (astronomy-engine), Chinese BaZi (Four Pillars), AI mentorship (ZAI SDK), and interactive maps (react-leaflet) into a single "cosmic operating system."

### Key Metrics
- **~33,000 lines of TypeScript/TSX** across the `src/` directory
- **17 interactive screens** (all functional with real backend data)
- **36 API endpoints** (auth, calculate, bazi, cities, horoscope, etc.)
- **3 running services**: main Next.js (:3000), chat-service (:3003), bazi-service (:3004)
- **0 lint errors**, **0 runtime errors**, dev server stable
- **Prisma schema**: 27 models (Member, MentorMemory, City, IChingCast, TarotDraw, etc.)

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui + custom cosmic CSS |
| Database | Prisma ORM (SQLite) |
| State | Zustand (client), TanStack Query (server) |
| Auth | NextAuth v4 (Google OAuth + Credentials) |
| Astronomy | astronomy-engine@2.1.19 |
| Maps | react-leaflet@5 + leaflet@1.9 |
| AI | ZAI SDK (z-ai-web-dev-sdk) for LLM, VLM, TTS, etc. |
| Realtime | Socket.io (chat-service mini-service) |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |

---

## 3. Architecture — Clean Architecture (Martin)

The project follows **Clean Architecture** with the Dependency Rule (inner layers don't depend on outer layers):

```
src/
├── app/
│   ├── page.tsx                    ← Main SPA shell (single / route)
│   ├── api/                        ← 36 API route handlers
│   │   ├── auth/                   ← register, login, me, logout, [...nextauth]
│   │   ├── calculate/              ← Natal chart (44 great-circle lines + ranked cities)
│   │   ├── bazi/calculate/         ← BaZi with fallback pattern
│   │   ├── cities/                 ← 331 cities, case-insensitive search
│   │   ├── ai/chat/               ← ZAI mentor (4 voices + 2 a.m. companion)
│   │   ├── horoscope/             ← Daily horoscope (real transits + ZAI narrative)
│   │   ├── affirmation/           ← Daily affirmation
│   │   ├── iching/                ← Crypto-random I-Ching cast
│   │   ├── tarot/                 ← 78-card RWS deck, 3 spreads
│   │   ├── cosmic-match/          ← Western + BaZi compatibility
│   │   ├── transits/              ← Current planetary transits
│   │   ├── transit-forecast/      ← 7-day planetary forecast
│   │   ├── moon-phase/            ← Real-time moon phase
│   │   ├── planetary-hours/       ← Chaldean planetary hours
│   │   ├── synastry/              ← Cross-aspects between two charts
│   │   ├── spheres/               ← 8 life sphere scores
│   │   ├── members/               ← Family hub + compatibility
│   │   ├── profile/               ← Member profile (GET + PATCH)
│   │   ├── ritual/                ← WARD tracking
│   │   ├── streak-calendar/       ← Ritual streak calendar
│   │   ├── notifications/         ← 5 notification types
│   │   ├── power-card/            ← Viral share cards
│   │   ├── partner-link/          ← Viral loop
│   │   ├── ab-test/               ← A/B testing
│   │   ├── b2b/                   ← B2B HR (GDPR Art.9)
│   │   ├── billing/               ← Reverse trial + PPP
│   │   ├── geo/resolve-birth/     ← City → UTC resolution
│   │   ├── local-space/           ← Local space directions
│   │   └── health/                ← Cache metrics + DB ping
│   └── globals.css                 ← Hades 2 cosmic theme (1200+ lines)
│
├── components/astroos/
│   ├── ui.tsx                      ← Shared UI: GlassCard, SectionHeading, StatTile, Pill, Starfield, etc.
│   ├── growth-ui.tsx               ← NotificationsBell, StickyCTA
│   ├── CosmicBackground.tsx        ← Canvas particle system (twinkling stars, nebula, shooting stars)
│   ├── CosmicOrb.tsx               ← Floating decorative orbs (gold/jade/rose)
│   ├── CosmicSkeleton.tsx          ← 4 skeleton variants with astro-shimmer
│   ├── ParticleBurst.tsx           ← Canvas particles on I-Ching/Tarot cast
│   ├── AuthGate.tsx                ← Empty state with login prompt
│   ├── map/AstroMap.tsx            ← react-leaflet with 44 great-circle lines
│   ├── real/                       ← All real-data panels (20+ components)
│   │   ├── NatalChartWheel.tsx     ← SVG 3-ring natal chart with aspect lines
│   │   ├── AspectGrid.tsx          ← Triangular planet×planet SVG matrix
│   │   ├── RealSelfPanel.tsx       ← Natal chart wheel integration
│   │   ├── RealBaZiPanel.tsx       ← 4 pillars + Luck Pillars + Ten Gods
│   │   ├── RealAspectsPanel.tsx    ← 5 aspect types, SVG grid + list
│   │   ├── PlanetaryStrengthsPanel.tsx ← Essential dignity scores, bar chart
│   │   ├── RealHoroscopePanel.tsx  ← Daily horoscope with transit pills
│   │   ├── RealAffirmationPanel.tsx ← Daily affirmation
│   │   RealMoonPhasePanel.tsx      ← SVG moon with terminator ellipse
│   │   RealPlanetaryHoursPanel.tsx ← Chaldean hours timeline
│   │   RealTransitForecastPanel.tsx ← 7-day forecast with sign ingresses
│   │   TransitDetailDrawer.tsx     ← Slide-in aspect detail panel
│   │   TransitTimeline.tsx         ← 24h horizontal timeline
│   │   RealDivinationPanel.tsx     ← I-Ching + Tarot integration
│   │   RealTarotPanel.tsx          ← SVG card imagery + crypto-random draw
│   │   RealConnectPanel.tsx        ← Cosmic Match UI
│   │   SynastryChartOverlay.tsx    ← Bi-wheel SVG + cross-aspects
│   │   RealCosmicInsightsPanel.tsx ← 5 dynamic cross-system insights
│   │   RealMembersPanel.tsx        ← Family hub with SVG compatibility rings
│   │   RealProfilePanel.tsx        ← WARD ring + partner-link + power-cards
│   │   RealRevealPanel.tsx         ← Cinematic sign reveal
│   │   RealLocalSpacePanel.tsx     ← Local space directions
│   │   RealThemesPanel.tsx         ← SVG sphere wheel
│   │   RealStreakCalendar.tsx      ← Ritual streak calendar
│   │   CityAutocomplete.tsx        ← Debounced city search + UTC resolution
│   │   └── useRankedCities.ts      ← Hook for real ranked cities
│   └── screens/                    ← 17 screen components
│       ├── today.tsx               ← Horoscope + Moon + Planetary Hours + Transits + Forecast
│       ├── self.tsx                ← Natal Chart + Aspects + BaZi + Strengths + Insights
│       ├── reveal.tsx              ← Cinematic sign reveal
│       ├── divine.tsx              ← I-Ching + Tarot
│       ├── connect.tsx             ← Cosmic Match + Synastry
│       ├── mentor.tsx              ← AI Mentor chat
│       ├── world-map.tsx           ← react-leaflet map
│       ├── local-space.tsx         ← Local space directions
│       ├── members.tsx             ← Family hub
│       ├── themes.tsx              ← Life spheres
│       ├── profile.tsx             ← Member profile
│       ├── birth.tsx               ← Birth data input with city autocomplete
│       ├── auth.tsx                ← Google OAuth + email/password
│       ├── upgrade.tsx             ← Billing
│       ├── business.tsx            ← B2B
│       ├── overview.tsx            ← Dashboard overview
│       └── welcome.tsx             ← First-visit onboarding
│
├── lib/
│   ├── auth.ts                     ← NextAuth config (Google + Credentials)
│   ├── db.ts                       ← Prisma client singleton
│   ├── utils.ts                    ← Tailwind merge utility
│   └── astroos/
│       ├── data.ts                 ← NAV_ITEMS, mock USER, screen definitions
│       ├── i18n.ts                 ← 660+ keys × 3 locales (EN/RU/HI)
│       ├── i18n-context.tsx        ← I18nProvider + useI18n
│       └── real/
│           ├── api-client.ts       ← Typed API calls
│           ├── useMember.ts        ← Member data hook (with mockMember fallback)
│           ├── useMentorChat.ts    ← Socket.io + REST fallback
│           ├── useProfileData.ts   ← Combined member + natal + BaZi
│           ├── useRankedCities.ts  ← Real city ranking from API
│           ├── utc-resolver.ts     ← IANA timezone UTC conversion (DST-aware)
│           ├── llm-cache.ts        ← Map-based TTL cache with stale fallback
│           ├── horoscope-fallbacks.ts ← 12 hand-written horoscopes × 3 locales
│           ├── affirmation-fallbacks.ts ← 12 hand-written affirmations × 3 locales
│           └── city-seeds.ts       ← 331 cities with lat/lng/IANA tz/qol/cost/climate
│
├── infrastructure/ (Clean Architecture)
│   ├── domain/                     ← Entities: Member, AstroLine, BaZi, CityIndex + Value Objects
│   ├── application/                ← Ports (repositories, calculators) + Use Cases
│   └── infrastructure/             ← Adapters: AstronomyEngineChartCalculator, TypeScriptBaZiCalculator,
│                                      ZAIMentorService, PrismaMemberRepository, InMemoryCache, etc.
│
mini-services/
├── chat-service/                   ← Socket.io WS service (:3003), ZAI streaming
└── bazi-service/                   ← HTTP BaZi calculator (:3004), Bun.serve
```

---

## 4. Visual Theme — Hades 2 Cosmic Dark

The entire UI follows a **Hades 2 inspired** cosmic dark theme:

| Token | Value | Usage |
|-------|-------|-------|
| `--astro-bg` | `#0B0B0F` | Main background |
| `--astro-bg-elevated` | `#121218` | Elevated surfaces |
| `--astro-surface` | `#16161D` | Cards |
| `--astro-border` | `#2A2A35` | Borders |
| `--astro-gold` | `#E8B86D` | Primary accent, Sun, Earth element |
| `--astro-jade` | `#5BB89C` | Secondary accent, Wood element, trines |
| `--astro-rose` | `#D98E7A` | Destructive/tension, Fire element, squares |
| `--astro-water` | `#5E8FA8` | Water element, info |
| `--astro-text` | `#F5F0E8` | Main text |
| `--astro-text-muted` | `#9A9AA8` | Muted text |

### CSS Animation Utilities (40+ classes)
- `astro-wheel-ambient-rotate` — 90s slow rotation for decorative rings
- `astro-aspect-draw` — stroke-dashoffset draw-in for aspect lines
- `astro-planet-hover` — brightness + drop-shadow + scale
- `astro-border-flow` — animated border color cycling gold→jade→rose
- `astro-text-rainbow` — animated 4-color gradient text
- `astro-card-sheen` — diagonal light sweep on hover
- `astro-aura` / `astro-breathing` — pulsing radial glow + scale
- `astro-orbital-ring` — counter-rotating dashed circle
- `astro-premium-border` — animated 4-color gradient border
- `astro-glow-ring` — expanding sonar ring for CTAs
- `astro-ingress-flash` — pulsing background for sign ingress items
- And 30+ more (see globals.css lines 100-1200)

### Key UI Components
- **GlassCard** — glassmorphism card with `variant` (gold/jade/rose/neutral/water), `ornamental` corners, `hover`, `shimmer`, `sheen` props
- **SectionHeading** — heading with `variant` prop, animated gradient underline
- **StatTile** — stat with `percentage` progress bar, cosmic-float animation
- **CosmicOrb** — floating decorative sphere (3 sizes, 3 colors)
- **CosmicSkeleton** — loading skeleton (card/line/circle/hexagram variants)

---

## 5. Key Architectural Decisions

### 5.1 Clean Architecture (Dependency Rule)
- **Domain layer** (entities, value objects): Pure TypeScript, zero framework dependencies
- **Application layer** (ports, use cases): Defines interfaces, no implementation details
- **Infrastructure layer** (adapters): AstronomyEngineChartCalculator, PrismaMemberRepository, ZAIMentorService
- **Composition Root**: DI assembly in API routes

### 5.2 Dual Auth System
- **NextAuth** (Google OAuth): JWT strategy, 30-day sessions, auto-create Member
- **Cookie session** (email/password): bcrypt hashing, httpOnly cookies
- `/api/auth/me` checks NextAuth first, then cookie session

### 5.3 LLM Caching Strategy (3-tier)
1. **HIT** (instant): Fresh cache served (6h horoscope, 12h affirmation)
2. **STALE** (instant): LLM fails but previous cache exists → serve stale + `X-Cache: STALE`
3. **FALLBACK** (instant): No cache + LLM fails → serve hand-written per-sign content + `X-Cache: FALLBACK`
- Cache key: `${prefix}:${sign}:${locale}:${YYYY-MM-DD}` (UTC date for determinism)
- Current: in-memory Map (documented limitation → Redis upgrade path)

### 5.4 Astronomy Engine Integration
- **Lazy-loaded** via `loadEngine()` in AstronomyEngineChartCalculator
- Correct API calls: `SunPosition()` for Sun, `EclipticGeoMoon()` for Moon, `EclipticLongitude()` for planets
- **Placidus** house system
- 44 great-circle astro lines with Rodrigues rotation + antimeridian wrapping + polar filter

### 5.5 UTC Resolution (Birth Data)
- Uses Node.js `Intl.DateTimeFormat` with `timeZoneName: "longOffset"` — zero external deps
- 100% historically accurate DST (e.g., Moscow 1989 = UTC+4 DST, Moscow 2020 = UTC+3 no DST)
- City database: 331 cities with IANA timezone strings

### 5.6 Mini-Services Architecture
- **chat-service** (:3003): Socket.io + ZAI SDK streaming, 4 voices, 2 a.m. companion
- **bazi-service** (:3004): HTTP BaZi calculator with `withFallback` pattern (primary: service, fallback: in-process TS calculator)
- Frontend connects via `io("/?XTransformPort=3003")` (Caddy gateway)

### 5.7 Rate Limiting + Security
- Sliding window rate limiter per endpoint (auth/login 10/15min, ai/chat 10/1min)
- Security headers middleware (X-Content-Type-Options, X-Frame-Options DENY, etc.)
- Memory-bounded (eviction at 100k entries)

---

## 6. Screen-by-Screen Status

| # | Screen | Real Data? | Key Components | Status |
|---|--------|-----------|----------------|--------|
| 1 | Today | ✅ | RealHoroscopePanel, RealAffirmationPanel, RealMoonPhasePanel, RealPlanetaryHoursPanel, TransitTimeline, TransitDetailDrawer, RealTransitForecastPanel, Top 3 Ranked Cities | Complete |
| 2 | Self | ✅ | NatalChartWheel, AspectGrid, RealAspectsPanel, RealBaZiPanel, PlanetaryStrengthsPanel, RealCosmicInsightsPanel | Complete |
| 3 | Reveal | ✅ | RealRevealPanel (cinematic sign reveal) | Complete |
| 4 | Divine | ✅ | RealDivinationPanel (I-Ching + Tarot), RealTarotPanel, ParticleBurst | Complete |
| 5 | Connect | ✅ | RealConnectPanel (Cosmic Match), SynastryChartOverlay | Complete |
| 6 | Mentor | ✅ | RealMentorPanel (4 voices, WS streaming) | Complete |
| 7 | World Map | ✅ | AstroMap (react-leaflet, 44 lines, 321 cities) | Complete |
| 8 | Local Space | ✅ | RealLocalSpacePanel | Complete |
| 9 | Members | ✅ | RealMembersPanel + AuthGate | Complete |
| 10 | Themes | ✅ | RealThemesPanel (sphere wheel) + AuthGate | Complete |
| 11 | Profile | ✅ | RealProfilePanel, useProfileData hook | Complete |
| 12 | Birth | ✅ | CityAutocomplete, UTC resolver, step indicators | Complete |
| 13 | Auth | ✅ | Google OAuth + email/password | Complete |
| 14 | Upgrade | ⚠️ | Billing mock provider | Functional |
| 15 | Business | ⚠️ | B2B GDPR framework | Functional |
| 16 | Overview | ⚠️ | Dashboard summary | Partial |
| 17 | Welcome | ✅ | Onboarding flow | Complete |

---

## 7. Data Flow Patterns

### Member Data (useMember hook)
```typescript
// All real panels use this pattern:
const { member, loading } = useMember();
const m = member || mockMember(); // Graceful fallback when not authenticated
```

### API Client Pattern
```typescript
// src/lib/astroos/real/api-client.ts
export const api = {
  calculate: (data) => fetch('/api/calculate', ...),
  bazi: (data) => fetch('/api/bazi/calculate', ...),
  horoscope: (sign, locale) => fetch(`/api/horoscope?sign=${sign}&locale=${locale}`),
  // ... 20+ typed methods
};
```

### LLM Endpoint Pattern
```typescript
// 3-tier response strategy in horoscope/route.ts and affirmation/route.ts:
const { value, status } = await getOrComputeWithStatus(cacheKey, TTL.HOROSCOPE, computeFn);
// HIT → cached response | MISS → fresh compute | STALE → previous cache | FALLBACK → hand-written
```

---

## 8. Unresolved Issues & Priority Recommendations

### P0 (Critical)
1. **Redis for LLM cache** — Currently in-memory Map (documented limitation, per-process only)

### P1 (High)
2. **Real notifications push** — SSE endpoint exists but is polling-based; needs WebSocket or SSE streaming
3. **E2E tests** — No test coverage exists; need tests for: auth flow, birth data → chart, mentor chat, tarot draw
4. **Mobile responsive testing** — Bottom nav z-index conflict with mobile sheet (both z-50)
5. **MemberRelation table** — Members screen returns empty list; need Prisma model for family relationships

### P2 (Medium)
6. **Locale completion** — 8 of 11 locales are partial (nav only); full translations needed for ES/PT/AR/ZH/JA/KO/DE/FR
7. **B2B practitioner clients persistence** — Currently 3 hardcoded demo entries
8. **Saturn return transit** — Major life transit calculation (astronomy-engine can support this)
9. **Tarot card AI imagery** — Currently text/SVG only; could use image-generation skill for major arcana
10. **Natal chart comparison with celebrity charts** — Fun viral feature

### P3 (Nice to have)
11. **Real Swiss Ephemeris** — Currently astronomy-engine (good but not Swiss-grade precision)
12. **Social proof with Redis INCR** — CitySocialProof currently uses SQLite increments
13. **GDPR data export** — Right to data portability (B2B compliance)

---

## 9. Environment Setup

```bash
# Start all services
cd /home/z/my-project
bun run dev          # Main Next.js on :3000 (background)

cd mini-services/chat-service && bun run dev   # Socket.io on :3003
cd mini-services/bazi-service && bun run dev   # BaZi on :3004

# Database
bun run db:push      # Push Prisma schema to SQLite
bun run db:generate   # Generate Prisma client

# Lint
bun run lint          # ESLint (should be 0 errors)

# Key files
# worklog.md          ← Complete development log (1500+ lines)
# prisma/schema.prisma ← 27 models
# src/app/page.tsx    ← Single-page shell (all 17 screens)
```

### Google OAuth Setup
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`

### Gateway Notes
- All API requests must use relative paths (no `http://localhost:3000`)
- Cross-port requests use `?XTransformPort=XXXX` query parameter
- WebSocket: `io("/?XTransformPort=3003")` (path always `/`)

---

## 10. Prisma Schema Summary (27 Models)

```
Member, MemberStats (embedded), MentorMemory, MentorMessage,
CalculationCache, BaZiCache, City, CustomCity, CitySocialProof,
Ritual, IChingCast, TarotDraw, Subscription, Payment,
PartnerLink, PowerCard, Notification, ABTest, ABAssignment,
FeatureFlag, AuditLog, B2BOrg, B2BSeat, JobProfile
```

Key indexes: email, tier, createdAt on Member; cacheKey on caches; name/country on City; memberId on ritual/notifications.

---

## 11. Cron Job

A `webDevReview` cron job (ID: 234431) runs every 15 minutes to:
1. Read `/home/z/my-project/worklog.md` for project status
2. QA test via agent-browser
3. Fix bugs if found, or propose new features
4. Improve styling details
5. Add more functionality
6. Update worklog.md

---

## 12. Git Status

- **16 commits** ready on local `main` branch
- **Remote**: https://github.com/Nevelim/astroOS-2.0.git
- **Push requires**: GitHub credentials (GH_TOKEN or SSH key)
- Working tree is clean

---

## Quick Start for New Agent

1. Read `/home/z/my-project/worklog.md` for full development history
2. Run `bun run lint` to verify 0 errors
3. Check dev server is running on :3000
4. Use agent-browser to QA current state
5. Pick from the Priority Recommendations above
6. **Always update worklog.md after completing work**
7. **Always improve styling with more details**
8. **Always add more features and functionality**
