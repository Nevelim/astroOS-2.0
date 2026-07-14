# AstroOS · Multi-Service Repository

Premium astrology SaaS: Western astrology × BaZi × AI mentor × Cosmic Match × Divination.
This repo hosts **11 Python microservices** (the computation core) plus the
**Next.js BFF** (the web layer, under `src/`).

## Architecture

Clean / Hexagonal architecture per service. Each service is independent and
owns its port + cache namespace. Cross-service contracts: REST + RFC 7807
problem+json errors + immutable `ETag` caching. OpenTelemetry traces in all
services. Redis Streams event bus (BAZI-6 / MATCH-10 / DAILY-5).

```
services/
├── birth_time/      Port 3009 · UTC/LMT/TST + DST resolution (the foundation)
├── bazi_engine/     Port 3002 · Four Pillars, Day Master, Ten Gods, Luck, 用神
├── astro_engine/    Port 3001 · Natal chart, synastry, transits, astrocartography
├── daily_content/   Port 3007 · Transit-based dynamic horoscopes + affirmations
├── ai_mentor/       Port 3003 · Streaming chat, 4 voices, crisis detection
├── cosmic_match/    Port 3004 · Compatibility + realtime Socket.IO chat
├── remedies/        Port 3005 · Favorable-element remedies + marketplace
├── notification/    Port 3008 · Tone-gated push/inapp, crisis follow-up
├── divination/      Port 3011 · Tarot (78-card) + I Ching (64 hexagrams)
├── b2b_hr/          Port 3006 · GDPR Art.9 consent + advisory team analysis
└── common/          Shared: event bus, OpenTelemetry, typed event contracts
src/                 Port 3000 · Next.js BFF (NextAuth, Prisma, aggregation)
```

## Verified canonical case

**Pavlodar, Kazakhstan, 15 April 1989, 16:40 local clock time**

```
Birth-Time  →  UTC 09:40  →  TST 14:47:33  →  shichen 未(wei)
BaZi        →  Day Master 乙(yin_wood) · Pillars 己巳|戊辰|乙巳|癸未
              用神: balanced (得令 −20, 得地 +0, 得势 +5)
Astro       →  Sun 25.55° Aries · Moon 23.92° Leo · Nodes ☊332° Pisces
              17 aspects · Part of Fortune 31.63°
```

## Run

```bash
# One-time: install deps
python3 -m venv .venv && .venv/bin/pip install -e .[dev]

# Start all 11 Python services (background, logs in logs/*.log)
./start-services.sh
./start-services.sh stop

# Next.js BFF (separate terminal)
npx next dev -p 3000

# Swagger UI per service:
#   http://127.0.0.1:3009/docs   Birth-Time
#   http://127.0.0.1:3002/docs   BaZi
#   http://127.0.0.1:3001/docs   Astro
#   http://127.0.0.1:3007/docs   Daily Content
#   http://127.0.0.1:3003/docs   AI Mentor
#   http://127.0.0.1:3004/docs   Cosmic Match
#   http://127.0.0.1:3005/docs   Remedies
#   http://127.0.0.1:3008/docs   Notification
#   http://127.0.0.1:3011/docs   Divination
#   http://127.0.0.1:3006/docs   B2B HR
```

## Test

```bash
.venv/bin/python -m pytest services -q       # Python (908+ tests)
npx tsc --noEmit                              # TypeScript (0 errors)
npx eslint .                                  # Lint
```

## Key features by service

| Service | Highlights |
|---|---|
| **birth_time** | True Solar Time via NOAA Equation of Time + zoneinfo/tzdata; birth_data_hash (SHA-256) as canonical cache key |
| **bazi_engine** | Four Pillars (sxtwl golden-verified), Day Master strength (得令/得地/得势), traditional 用神 selection (扶抑 method), Luck Pillars |
| **astro_engine** | NASA JPL DE421 (skyfield), Placidus+Whole Sign houses, Lunar Nodes ☊☋, Arabic Parts (PF/PoS), synastry (soulmate indicators), transits, astrocartography, lunar phase, retrogrades, planetary returns |
| **daily_content** | Dynamic transit-based horoscopes (not templates), 12 signs × 4 voices × 11 languages |
| **ai_mentor** | Streaming chat, 4 voice modes, 3-layer crisis guardrails, crisis safety override (bypasses rate limits) |
| **cosmic_match** | 3-layer compatibility (western synastry + BaZi + astrocartography), Socket.IO realtime chat with moderation |
| **remedies** | Favorable-element → stones/colors/metals catalog, whitelist (rating ≥ 4.0), REMED-4 ethics (sort by rating, not affiliate) |
| **notification** | Tone-gated (calm-framing invariant), quiet hours, frequency caps, crisis follow-up (NOTIF-6), GDPR Art.9 consent |
| **divination** | Rider-Waite 78-card Tarot (full interpretations) + I Ching 64 hexagrams (judgment + image EN/RU) |
| **b2b_hr** | GDPR Art.9 consent flow, advisory team analysis (role suitability + compatibility), audit trail, AI Act disclaimers |

## Roadmap status

- ✅ Birth-Time Resolution (port 3009)
- ✅ BaZi Engine with strength-aware 用神 (port 3002)
- ✅ Astro Engine: natal, synastry, transits, nodes, returns, astrocartography (port 3001)
- ✅ Daily Content: transit-based dynamic horoscopes (port 3007)
- ✅ AI Mentor: streaming + crisis detection (port 3003)
- ✅ Cosmic Match: synastry-enriched + realtime chat (port 3004)
- ✅ Remedies: catalog + ethics-graded marketplace (port 3005)
- ✅ Notification: tone-gate + crisis follow-up (port 3008)
- ✅ Divination: Tarot + I Ching (port 3011)
- ✅ B2B HR: consent + advisory analysis (port 3006)
- ✅ Redis Streams event bus (BAZI-6 / MATCH-10 / DAILY-5)
- ✅ OpenTelemetry instrumentation (all services)
- ✅ BFF aggregation (Next.js /api → Python services)
- ⬜ LLM provider integration (pending API token)
- ⬜ Secondary progressions
- ⬜ Composite chart (midpoint)
