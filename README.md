# AstroOS · Multi-Service Repository

Astrology platform: Western astrology × BaZi × AI mentor × Cosmic Match.
This repo hosts the **Python microservices** (the computation core) plus the
**Next.js BFF** (the web layer, under `src/`).

## Architecture

Clean / Hexagonal architecture per service. Each service is independent and
owns its port + cache namespace. Cross-service contracts: REST + RFC 7807
problem+json errors + immutable `ETag` caching.

```
services/
├── birth_time/      Port 3009 · UTC/LMT/TST + DST resolution (the foundation)
├── bazi_engine/     Port 3002 · Four Pillars, Day Master, Ten Gods, Luck
└── astro_engine/    Port 3001 · Natal chart (skyfield/DE421), houses, aspects
src/                 Port 3000 · Next.js BFF (NextAuth, Prisma, aggregation)
```

The Birth-Time service produces a `birth_data_hash` that both engines read.
This hash folds in date, time, coordinates, IANA zone, time quality, the
tzdata version, and the Equation of Time — equal inputs ⇒ equal hash ⇒
perfect cache identity across services.

## Verified canonical case

**Pavlodar, Kazakhstan, 15 April 1989, 16:40 local clock time**

```
Birth-Time  →  UTC 09:40  →  LMT 14:47:48  →  TST 14:47:33  →  shichen 未(wei)
BaZi        →  Day Master 乙(yin_wood) · Year/Month/Day/Hour 己巳|戊辰|乙巳|癸未
Astro       →  Sun 25.55° Aries · Moon 23.92° Leo · 17 aspects
```

The TST correction is load-bearing: naive clock time 16:40 would place the
hour pillar in 申(shen) — a different reading entirely. BaZi uses True Solar
Time, never clock time.

## Run

```bash
# One-time: install deps
python3 -m venv .venv && .venv/bin/pip install -e .[dev]

# Start all 3 Python services (background, logs in logs/*.log)
./start-services.sh
./start-services.sh stop

# Swagger UI per service:
#   http://127.0.0.1:3009/docs   (Birth-Time)
#   http://127.0.0.1:3002/docs   (BaZi)
#   http://127.0.0.1:3001/docs   (Astro)
```

## Test

```bash
.venv/bin/python -m pytest services -v
.venv/bin/python -m pytest services --cov=services --cov-report=term
```

**166 tests, 80%+ coverage on domain + use-case layers.**

| Suite | Tests | Verifies |
|---|---|---|
| Birth-Time unit | 45 | domain + usecase with fake ports |
| Birth-Time golden | 12 | real adapters; Pavlodar + DST fold/gap |
| Birth-Time API | 14 | RFC 7807, ETag, immutable, validation |
| BaZi golden | 26 | **verified against sxtwl** (canonical C++ lib) |
| BaZi unit | 25 | Ten Gods, Day Master, favorable elements |
| BaZi API | 5 | endpoint, 404, 3-pillar mode |
| Astro unit | 30 | signs, aspects, sidereal time, MC/ASC, houses |
| Astro golden | 9 | skyfield positions vs known astronomy (Sun ~25° Aries mid-Apr, Capricorn stellium 1988-89, retrogrades) |

## Project layout (per service)

```
services/<service>/
├── domain/        # PURE — no I/O. Entities, value objects, pure math.
├── usecase/       # Application orchestration. Defines PORTS (Protocol).
├── adapter/       # OUTER ring — skyfield, zoneinfo, httpx. Implements ports.
├── api/           # FastAPI + composition root. create_app(deps) factory.
└── tests/
    ├── unit/      # fake ports, pure logic
    ├── golden/    # REAL adapters, frozen reference values
    └── integration/ # full HTTP stack (TestClient)
```

## Decisions

- **Python 3.9 + stdlib `zoneinfo` + `tzdata`** for historical DST accuracy.
  The Architecture ADR lists Go (`time/tzdata`) as the production target for
  Astro/BaZi; this Python implementation is the verified reference.
- **NASA JPL DE421 ephemeris** via skyfield for planet positions — agrees with
  Swiss Ephemeris to < 0.01°.
- **sxtwl** as the golden-reference library for BaZi pillar math (dev/test dep).
- **Placidus + Whole Sign** house systems; Placidus falls back to Whole Sign
  above polar circles (~±66° latitude).
- **NOAA Equation of Time** formula (sub-minute accuracy; the ~2-hour shichen
  granularity needs far less).

## Roadmap (per Architecture ADR / Dev Backlog)

- ✅ Birth-Time Resolution
- ✅ BaZi Engine
- ✅ Astro Engine
- ⬜ BFF aggregation (Next.js `/api` → services)
- ⬜ Identity (NextAuth + Prisma Member + birth_data_hash)
- ⬜ Daily Content (batch horoscopes 02:00 UTC)
- ⬜ AI Mentor (streaming, RAG, crisis detection)
- ⬜ Cosmic Match (Socket.io, 3-layer compatibility)
- ⬜ Remedies, Notification, B2B HR
- ⬜ Load testing k6 (LT-1…LT-9)
