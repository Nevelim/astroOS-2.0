# AstroOS — Analyst Implementation Guide (v1.0)

> **Audience:** System analyst → dev leads → sprint planning.
> **Purpose:** Translate the v3.2 prototype (`src/components/astroos/screens/`, 14 screens + growth layer + onboarding being built) into concrete, Jira-ready dev tasks. Each screen maps to: mocked vs real data, API contract, Prisma model, FE/BE/DB tasks, dependencies, acceptance criteria, effort.
> **Author:** Technical Analyst agent · Task 11-a · 2025-06.
> **Status:** Reference doc for sprint breakdown — copy any screen section straight into Jira as Epic + Stories.

---

## Section 0 — How to read this guide

AstroOS is a cosmic astrology SaaS built on **Next.js 16 (App Router) + TypeScript strict + Tailwind 4 + shadcn/ui + Prisma + SQLite (dev) / Postgres (prod target)**. The UI you are looking at today in `/src/components/astroos/` is a **mock prototype** — every screen renders against hard-coded data in `src/lib/astroos/data.ts` (USER, TODAY, CITIES, BAZI, ICHING_CAST, TAROT_DRAW, MEMBERS, COMPATIBILITY, TIERS, etc.). No API calls, no database, no auth session — the `USER` object is the fictional persona "Aeliana" (Scorpio Sun / Pisces Moon / Aquarius Rising / Yang Water 壬 Day Master, born Saint-Petersburg 1989-11-07 04:17 UTC+3).

The **real production codebase** is cloned at `/home/z/my-project/astroos-github/` (381 MB, v96+). It is a working multi-module astrological workbench: Next.js 16 + react-leaflet + Prisma (SQLite, 5 models, 6+ indexes) + a **Python proxy mini-service** (BaZi, I-Ching, Tarot, Horoscope, schema-driven forms) + **astronomy-engine** for the 44 planetary lines. It exposes **32 API routes** under `/src/app/api/` and uses a Clean-Architecture `withFallback` pattern: Python service → TypeScript fallback → static templates. The customer-validated "data-density" aesthetic (multi-card stacks, matrices, parallel arrays, mono-tabular numbers) comes from this repo — read `/home/z/my-project/research/github-ui-pattern-analysis.md` for the full pattern catalog (855 lines).

This guide's job: for every screen the analyst sees, mark (a) what's mocked vs real, (b) the API contract needed, (c) the Prisma model, (d) FE + BE + DB dev tasks, (e) dependencies, (f) acceptance criteria, (g) effort estimate. **Tech stack**: Next.js 16 · TypeScript · Tailwind 4 · shadcn/ui · Prisma · SQLite→Postgres · Redis (caching, social-proof counters) · NextAuth (sessions) · Stripe / Apple IAP / Google Play (subscriptions) · OpenAI-compatible LLM (mentor) · pgvector (mentor memory) · astronomy-engine (44 lines) · Python FastAPI (BaZi/I-Ching/Tarot) · Socket.io (mentor streaming) · Swiss Ephemeris (planet positions).

**The north-star metric is WARD** — Weekly Active Ritual Days: users completing the daily ritual (Today screen) on ≥4 of the last 7 days. The 4+/7 cohort converts to paid at **6–8×** the rate of the 1-day/week cohort (data.ts target). Every screen, every growth primitive, every paywall is tuned against WARD. Year-5 target: 42 % WARD on 12M MAU → $160M ARR.

---

## Section 1 — Onboarding flow (the critical path)

This is the flow the customer just asked about ("аналитику нужно понимать по прототипу как реализовывать экраны"). It is the **highest-leverage 90 seconds in the product** — activation target **70 %** vs industry 45–55 %.

### CJM step 1 — Welcome / entry (NEW screen, being built)

| Field | Value |
|---|---|
| **Screen file** | `src/components/astroos/screens/welcome.tsx` *(to be created — currently the entry is split between `overview.tsx` hero and `auth.tsx`'s `WelcomeScene` component)* |
| **What it does** | First paint for any visitor with no `astroos:seen` localStorage flag. Starfield breathes, brand name fades in, single primary CTA "Begin the 90-sec Reveal". **No pricing, no auth form, no email field on this screen** — pure invitation. |
| **Mock data consumed** | `t("brand.tagline")`, `t("brand.equipping")` from i18n.ts. |
| **Real data needed** | None — static marketing surface. Locale detection from `Accept-Language` header to pre-pick RU/EN/HI. |
| **API contract** | `GET /api/geo/locale` (NEW) — returns `{locale: "ru"|"en"|"hi"}` from `Accept-Language`, override-able by `?force=`. |
| **FE dev tasks** | [ ] Create `welcome.tsx` with starfield + Cormorant Garamond hero + single CTA. [ ] Wire CTA → `onNavigate("auth")`. [ ] Detect locale on mount via `fetch("/api/geo/locale")` and call `setLocale()`. [ ] Add `welcome` to `ScreenKey` type and `SCREENS` map in `src/app/page.tsx`. |
| **BE dev tasks** | [ ] `GET /api/geo/locale` route — parse `Accept-Language`, map to closest of `ru|en|hi`. |
| **DB schema** | none. |
| **Dependencies** | i18n-context (exists), page.tsx shell (exists). |
| **Acceptance criteria** | First-time visitor with `Accept-Language: ru` sees Russian copy within 1 render. CTA routes to Auth. No layout shift (SSR-safe locale pick via cookie, not effect). |
| **Effort** | **S** (0.5 day) |
| **Reference** | `auth.tsx::WelcomeScene` (lines 197–223) — reuse the visual but make it a standalone screen. |

### CJM step 2 — Auth (1-tap register)

| Field | Value |
|---|---|
| **Screen file** | `src/components/astroos/screens/auth.tsx` (224 lines, exists) |
| **What it does** | One-tap registration: Google · Apple · email+password. Mode toggle login/register. After submit → `WelcomeScene` (celebratory) → CTA "Begin Reveal" → `onNavigate("reveal")`. Pricing preview on the right shows all 4 tiers (Free / Pro Monthly / Pro Annual / Lifetime) with "No paywall in first session" promise. |
| **Mock data consumed** | `TIERS` array (4 entries — `free|pro|annual|lifetime` with price, cadence, tagline, features, cta, highlight). |
| **Real data needed** | `User` model (Prisma) — `email, name, passwordHash, plan="free", createdAt`. `Session` model — `userId, token, expiresAt`. OAuth provider accounts (Google / Apple) — new `Account` model. |
| **API contract** | `POST /api/auth/register` `{email, password, name?}` → `{user, sessionToken}` (sets httpOnly cookie). `POST /api/auth/login` `{email, password}`. `POST /api/auth/logout`. `POST /api/auth/oauth/google` & `/apple` (NEW — exchange OAuth code for session). `GET /api/me` → `{id, email, name, plan, locale, voice, …}`. |
| **FE dev tasks** | [ ] Replace `setStep("welcome")` mock with real `fetch("/api/auth/register")` + cookie handling. [ ] Wire Google/Apple buttons to OAuth flows (NextAuth `signIn("google")` / `signIn("apple")`). [ ] Persist returned `user` in Zustand store (replaces `USER` mock). [ ] Show real pricing preview from `GET /api/tiers` (or hard-code TIERS in shared lib). [ ] After auth success, redirect to `reveal` (not `welcome` sub-step). [ ] Add error states (email taken, weak password, OAuth failure) — currently none. |
| **BE dev tasks** | [ ] `POST /api/auth/register` — bcrypt(password), CSPRNG token, httpOnly cookie, 30-day expiry, create User + Session rows. [ ] `POST /api/auth/login` — verify bcrypt, rotate session token. [ ] `POST /api/auth/logout` — delete Session row, clear cookie. [ ] Google/Apple OAuth: NextAuth providers, redirect URL `https://astroos.app/api/auth/callback/{provider}`. [ ] Email verification flow (NEW — currently absent): sendmagic-link to email, `GET /api/auth/verify?token=`. |
| **DB schema** | `User { id, email @unique, name?, passwordHash, plan, locale, voice, houseSystem, pushEnabled, pushTime, memoryEnabled, twoAmCompanion, createdAt, updatedAt }` · `Session { id, userId, token @unique, expiresAt, createdAt }` · `Account { id, userId, provider, providerAccountId, accessToken?, refreshToken? }` (new for OAuth). |
| **Dependencies** | NextAuth.js, bcrypt, nodemailer (for magic-link), Google + Apple OAuth credentials. |
| **Acceptance criteria** | New user with email registers → cookie set → redirected to Reveal with their (still-empty) profile. Returning user logs in → redirected to Today. OAuth flow completes in ≤2 taps. Session persists across browser restart for 30 days. httpOnly + Secure + SameSite=Lax. |
| **Effort** | **M** (3 days — OAuth + email verify + session) |
| **Reference** | `astroos-github/src/app/api/auth/{login,logout,register}/route.ts` — exists, copy & extend with OAuth. |

### CJM step 3 — Birth data input (NEW screen, being built)

| Field | Value |
|---|---|
| **Screen file** | `src/components/astroos/screens/birth-data.tsx` *(to be created — currently the only path is Members → Add member form)* |
| **What it does** | Collects: full name, date of birth (DD.MM.YYYY), time of birth (HH:MM, with "I don't know" path), place of birth (city autocomplete → lat/lng/timezone auto), gender (0/1 for BaZi luck pillars), preferred mentor voice (4 options). The "I don't know time" graceful path: (a) approximate to nearest 2h → 12-house fallback, (b) "ask a family member" → shareable SMS link, (c) solar chart (disclosed). 25 seconds typical, 45s with graceful path. |
| **Mock data consumed** | None — pure input form. Will populate the future `Member` row for the user's own chart. |
| **Real data needed** | `Member` Prisma model. `CalculationCache` (keyed by `sha1(lat,lng,dob,tz)`). GeoNames / Nominatim OSM for city autocomplete. Historical IANA timezone DB for `dob` (handles Pavlodar UTC+7→+6→+5 changes). |
| **API contract** | `GET /api/geo/cities?q=` (exists in astroos-github) — autocomplete, Python → DB → Nominatim OSM fallback. `GET /api/geo/timezone?lat=&lng=&dob=` (exists) — historical IANA timezone lookup. `POST /api/members` (exists) — create Member, also kicks off async `/api/calculate` to populate CalculationCache. `POST /api/bazi/calculate` (exists) — Python-first BaZi. |
| **FE dev tasks** | [ ] Create `birth-data.tsx` with masked date input `MaskedDateInput` (DD.MM.YYYY HH:MM, auto-insert dots/colons at positions 2/4/8/10). [ ] City autocomplete component (debounced fetch to `/api/geo/cities?q=`, results show city + country + coords). [ ] Timezone auto-fill on city pick — call `/api/geo/timezone?lat=&lng=&dob=`. [ ] "Unknown time" toggle → reveals 3-option graceful path. [ ] Voice selector (4 cards: Empowerment / Reflective / Playful / Pragmatic — copy from `MENTOR_VOICES`). [ ] Submit → `POST /api/members` → on 200, navigate to `reveal`. [ ] Show inline progress "Calculating your chart… (~5s)" with skeleton. |
| **BE dev tasks** | [ ] Verify `/api/geo/cities` and `/api/geo/timezone` work as in astroos-github. [ ] `/api/members` POST — parse DD.MM.YYYY HH:MM → ISO, kick off async `/api/calculate` (44 lines), `/api/bazi/calculate` (4 pillars), `/api/v1/horoscope?member_id=` (precompute today's horoscope). [ ] NEW: `/api/onboarding/complete` — sets `User.onboardedAt = now()`, marks WARD eligibility. |
| **DB schema** | `Member { id, userId, firstName, lat, lng, dob ISO, tz Float, gender Int, city?, country?, isPrimary Boolean @default(false), createdAt, updatedAt }` — add `isPrimary` flag (the user's own chart vs family members). |
| **Dependencies** | `reveal` screen (next step), city autocomplete, historical timezone DB. |
| **Acceptance criteria** | User types "Saint Pe" → autocomplete shows "Saint Petersburg, RU · 59.93°, 30.34°" within 200ms. Picks city → timezone auto-fills `+3`. Time unknown path discloses solar-chart fallback. Submit in <30s typical. After submit, the next screen (Reveal) has real chart data, not USER mock. |
| **Effort** | **L** (5 days — masked input, autocomplete, graceful paths, async calc pipeline) |
| **Reference** | `astroos-github/src/components/schema-form.tsx` (779 lines) — has MaskedDateInput + CityAutocomplete patterns to port. |

### CJM step 4 — Reveal (90-second cinematic)

| Field | Value |
|---|---|
| **Screen file** | `src/components/astroos/screens/reveal.tsx` (130 lines, exists) |
| **What it does** | Two-phase animation: `intro` (poetic line + "Begin my Reveal" CTA) → `revealed` (starfield → chart wheel draws → BaZi pillars rise → cosmic identity named: "You are Scorpio Sun · Pisces Moon · Aquarius Rising · Day Master 壬 · Yang Water"). Shows 3 power cities as gold pills. Timeline below documents the 5 beats (0-10s / 10-35s / 35-45s / 45-85s / 85-90s). Ends with "Yes — start my ritual" CTA → `onNavigate("today")`. |
| **Mock data consumed** | `USER` (name, sun, moon, rising, dayMaster, powerCities, gift, edge). `t("reveal.*")` (10+ i18n keys). Locale-conditional inline copy for the poetic line. |
| **Real data needed** | Member's natal chart (Sun/Moon/Rising signs from `/api/calculate`), BaZi Day Master (from `/api/bazi/calculate`), top-3 power cities (from `/api/cities/match` ranked by `computeCityIndex`). |
| **API contract** | `GET /api/me/primary-member` (NEW) → returns the user's own Member + computed chart (Sun, Moon, Rising, Day Master, top-3 cities). Internally calls `/api/calculate` + `/api/bazi/calculate` + `/api/cities/match` and caches via CalculationCache. `GET /api/v1/horoscope?member_id=` (exists) for the day's transit. |
| **FE dev tasks** | [ ] Replace `USER.sun/moon/rising/dayMaster/powerCities` with real `useAstroStore().primaryMember` data. [ ] Framer Motion sequence: phase=intro (0.6s scale-in) → on CTA, phase=revealed (0.9s y-fade). [ ] Within `revealed`: staggered delays — identity headline at 0.3s, Day Master at 0.7s, power cities at 1.0s, gift copy at 1.4s, CTAs at 1.8s. [ ] SVG natal wheel draws itself (stroke-dashoffset animation) — currently uses Self screen's static wheel. [ ] "Replay" button restarts the sequence. [ ] Loading state: if `primaryMember` not yet computed, show "Calculating your chart…" with starfield-only. |
| **BE dev tasks** | [ ] `GET /api/me/primary-member` — orchestrates CalculationCache lookup, BaZi, top-3 city match. Cache 24h. [ ] NEW: `/api/onboarding/reveal-viewed` — POST on first reveal render, sets `User.revealedAt = now()` (activation metric). |
| **DB schema** | `User` adds `onboardedAt DateTime?`, `revealedAt DateTime?` (WARD activation tracking). |
| **Dependencies** | birth-data step, `today` screen (next), `self` screen (uses same chart data). |
| **Acceptance criteria** | Reveal completes in 90s. All shown data matches the user's actual chart. Animation is smooth (60fps). User can replay. After "Yes — start my ritual", lands on Today with no paywall. **No paywall in the first session** — promise kept (this is the anti-Nebula differentiator). |
| **Effort** | **M** (3 days — animation polish + real data wiring) |
| **Reference** | `astroos-github/src/components/astro-map.tsx` for chart-wheel SVG drawing pattern. |

### CJM step 5 — Today (first ritual) → activation

| Field | Value |
|---|---|
| **Screen file** | `src/components/astroos/screens/today.tsx` (383 lines, exists, v3.2 with sticky CTA + sandwich rule) |
| **What it does** | Daily ritual hub. Sandwich rule: Card 1 anchor (horoscope, free) → Card 2 target (Mentor upsell, rose glow) → Card 3 proof (power city + social proof). Secondary: gentle notes (affirmation + compliment). 5 horoscope spheres with % bars + lucky/avoid hours. WARD explainer + ritual loop. Sticky CTA "✦ Cast today's reading" with haptic + toast. |
| **Mock data consumed** | `USER.name, USER.streak, USER.powerCities[0]`, `TODAY` (date, focus, horoscope, affirmation, compliment, transitPills), `HOROSCOPE_SPHERES` (5 entries). |
| **Real data needed** | `DailyHoroscope` Prisma model (precomputed at 02:00 UTC). `User.streak` (computed from `RitualCast` rows). `Member.topCity` (from primary member's match). `Transit` model (planet ingress data). |
| **API contract** | `GET /api/v1/horoscope?member_id=&date=` (exists, cached 6h). `POST /api/today/cast` (NEW) — marks today's ritual cast, increments streak, returns updated streak + tomorrow's-preview-unlock-time. `GET /api/today/streak` (NEW) — returns current streak + WARD status. `GET /api/social-proof?action=today-cast` (NEW) — returns live count. |
| **FE dev tasks** | [ ] Replace `TODAY` mock with `useToday()` hook fetching `/api/v1/horoscope`. [ ] Replace `USER.streak` with `useStreak()` hook. [ ] Wire `handleCast` to `POST /api/today/cast` (currently just toggles local state). [ ] Replace `USER.powerCities[0]` with real primary member's top city. [ ] `SocialProof count={12408}` → live count from `/api/social-proof?action=today-cast` (SSE or 30s polling). [ ] Tomorrow's preview unlock time returned from API (currently hard-coded "18:33"). |
| **BE dev tasks** | [ ] Cron job (02:00 UTC): precompute daily horoscope for every active member, store in `DailyHoroscope` table. 11 languages × ~500K members = ~5.5M rows/day — partition by date. [ ] `POST /api/today/cast` — insert `RitualCast { userId, date, createdAt }`, recompute streak (count consecutive days back from today), update `User.streak`, return `{streakFilled, wardStatus, tomorrowPreviewAt}`. [ ] `GET /api/social-proof?action=today-cast` — Redis `INCR astroos:proof:today-cast:{date}` on every cast, return current count. |
| **DB schema** | `DailyHoroscope { id, memberId, date, locale, focus, horoscope, affirmation, compliment, transitPills JSON, spheres JSON, luckyHours JSON, avoidHours JSON, createdAt }` — index `(memberId, date) @unique`. `RitualCast { id, userId, date, createdAt }` — index `(userId, date) @unique`. `User` adds `streak Int @default(0)`. |
| **Dependencies** | reveal (lands here), mentor (Card 2 link), world (Card 3 link). |
| **Acceptance criteria** | User lands on Today, sees their horoscope (not mock). Tap sticky CTA → haptic fires, toast "Tomorrow's preview unlocks at HH:MM ✦", streak star fills by 1 (max 7). WARD visualization reflects today's cast. If user misses a day, no strike-through, no red, "Welcome back" copy next visit. |
| **Effort** | **L** (5 days — cron pipeline, streak logic, social proof SSE) |
| **Reference** | `astroos-github/src/app/api/v1/horoscope/route.ts` + `/api/horoscope/daily/route.ts`. |

### ⚠️ Current onboarding bug (the fix being built)

The shell (`src/app/page.tsx` lines 66–76) currently routes **first-visit users directly to Reveal using a `localStorage` flag (`astroos:seen`)**, skipping Auth and birth-data entirely. This means Reveal renders against the **demo `USER` data (Aeliana)**, not the visitor's real chart — the activation moment is fake. Returning users land on Today (also with Aeliana's data).

**The fix being built (Tasks 10-shell + 11-a)**: introduce the proper sequence **Welcome → Auth → Birth data → Reveal → Today**. New `welcome.tsx` and `birth-data.tsx` screens need to be created (they don't exist yet — the `WelcomeScene` component lives inside `auth.tsx` and the birth form lives inside `members.tsx`'s add-member panel). Acceptance for the fix: first-visit user without `astroos:seen` flag → Welcome → Auth (registers) → Birth data → Reveal (with THEIR chart) → Today (with THEIR horoscope). The localStorage flag is set after Reveal completes, not before.

---

## Section 2 — Screen-by-screen implementation matrix

### 1. Overview (`overview`)

**What it does:** Hero pitch deck for AstroOS — the $160M ARR / 12M MAU 5-year trajectory table, 8 stat tiles, 9 strategic design shifts (PROPOSAL_SHIFTS), "locked / rejected / fused" three-column summary, footer link to the full proposal doc. Used as the "what is AstroOS" landing for investors and power users.

**Mock data consumed:** `TRAJECTORY` (5 rows: Year 1–5 with mau/arr/ward/k/ltv), `PROPOSAL_SHIFTS` (9 entries: n, title, change, why), `t("overview.*")` (15+ i18n keys).

**Real data needed:** None for v1 — this is a marketing/pitch surface. Long-term: real WARD/MAU/ARR numbers from analytics (admin-only).

**Frontend dev tasks:**
- [ ] Keep as static pitch surface — no API calls.
- [ ] Replace TRAJECTORY hard-coded numbers with `useAnalytics()` hook returning real MAU/ARR/WARD (admin-only, gated by `User.role === "admin"`).
- [ ] Hide this screen from regular users — promote it to `/about` route or behind admin role.

**Backend dev tasks:**
- [ ] NEW `/api/admin/metrics` — returns `{mau, arr, ward, viralK, cac, ltv}` from analytics warehouse (admin-only).

**DB schema:** `User.role String @default("user")` (values: `user|admin|b2b`).

**Dependencies:** none.

**Acceptance criteria:** Screen renders without API calls (works offline). Admin users see live numbers; regular users see the static trajectory.

**Effort:** **S** (1 day)

**Reference:** none — this is prototype-only.

---

### 2. Reveal (`reveal`)

(Full spec in **Section 1, CJM step 4**.)

**Effort:** **M** (3 days)

**Reference:** `astroos-github/src/components/astro-map.tsx` (chart-wheel SVG).

---

### 3. Today (`today`)

(Full spec in **Section 1, CJM step 5**.)

**Effort:** **L** (5 days)

**Reference:** `astroos-github/src/app/api/v1/horoscope/route.ts` (cached 6h), `/api/horoscope/daily/route.ts`.

---

### 4. Self · Charts (`self`)

**What it does:** Two-column deep view of the user's natal chart — left: Western natal wheel (SVG, 360°, 12 houses, 10 planet positions, aspect lines) + planet positions table (10 planets in sign°) + Asc/Mc pills; right: BaZi Day Master hero + four pillars grid (Year/Month/Day/Hour — stem, branch, hidden stems) + Luck Pillars timeline (8×10-year cycles, current highlighted) + Five Elements balance (5 bars) + Ten Gods (十神) list + recommendations (stones, colors, professions, directions) + cross-system insight + risk years.

**Mock data consumed:** `USER` (sun/moon/rising/dayMaster), `BAZI` (dayMaster, fourPillars[4], tenGods[4], luckPillars[8], elements[5], recommendations{stones, colors, professions, directions, luckyNumber, homeArtifacts}, riskYears[1]), `PLANETS` (10 planets with key/symbol/color).

**Real data needed:** `Member` (birth data). `CalculationCache` (44 AstroLine[] for natal chart positions). `BaZiCache` (4 pillars, 10 gods, luck pillars, elements, recommendations — computed by Python service). ` NatalChart` (Sun/Moon/Rising/Asc/Mc + 10 planet positions).

**Frontend dev tasks:**
- [ ] Replace `BAZI` mock with `useBaZi(memberId)` hook → `GET /api/bazi/calculate?member_id=`.
- [ ] Replace hard-coded planet positions table (Sun Scorpio 15°, Moon Pisces 22°, etc.) with real positions from `GET /api/calculate?member_id=`.
- [ ] SVG natal wheel needs to plot real planet positions (currently hard-coded SVG circles at fixed coordinates).
- [ ] Luck Pillars timeline: highlight current based on `member.dob` age calculation, not `lp.current` flag.
- [ ] Recommendations (stones/colors/professions): currently in BAZI mock — these come from Python BaZi engine's `recommendations` payload.
- [ ] Risk years: real calculation from Luck Pillar clashes (Python service).

**Backend dev tasks:**
- [ ] Verify `/api/bazi/calculate` exists and returns full payload (4 pillars, 10 gods, luck pillars, elements, recommendations, risk years). Python-first with TS fallback (Clean Architecture `withFallback`).
- [ ] NEW `/api/natal-chart?member_id=` — returns 10 planet positions in signs+degrees, Asc, Mc, aspect lines. Uses astronomy-engine. Cache 24h (chart doesn't change).
- [ ] NEW `/api/bazi/recommendations?member_id=` — extract recommendations into separate cached endpoint (used by Profile + Self).

**DB schema:** `CalculationCache` (exists). NEW `BaZiCache { id, memberHash @unique (sha1 of lat,lng,dob,tz,gender), payload JSON, createdAt }` — same cross-user reuse pattern as CalculationCache.

**Dependencies:** birth-data (Member must exist), i18n (RU/EN/HI for all 10 god names, 5 elements, etc.).

**Acceptance criteria:** Western wheel shows correct planet positions for user's birth data (verified against astro.com). BaZi pillars match Joey Yap calculator output for same birth data. Luck Pillars highlight correct current cycle based on user age. Day Master card has palantir-glow. Cross-system insight copy is locale-aware (currently inline RU/HI/EN).

**Effort:** **L** (6 days — SVG wheel + BaZi payload wiring + recommendations)

**Reference:** `astroos-github/src/app/api/bazi/calculate/route.ts`, `BaziChartView` pattern in page.tsx (K.1–K.12, 8 stacked sections).

---

### 5. World · Astrocartography (`world`)

**What it does:** The flagship moat screen. Stylized world map SVG (continents + 10 great-circle planetary lines + buffer corridor around selected city + city markers) + 8-sphere multi-filter chips + Orbis zones legend + city list (ranked by CityIndex) + sandwich rule top-3 (anchor / editor's pick / most chosen) + demoted "Worth considering" section + city detail panel (stats grid, planet lines breakdown, narrative positives, watch, parans, 8-sphere radar) + viral Power Card modal (USER.name, sun/rising/dayMaster pills, share buttons). Free-tier soft paywall on 2nd city / 2nd Power Card / travel-mode.

**Mock data consumed:** `CITIES` (6 entries — Lisbon, Buenos Aires, Tokyo, Tbilisi, Mexico City, Dubai — each with name/country/lat/lng/score/tone/sphere/qol/population/income/housing/climate/matchType/lines[{planet,type,distKm,zone,weight}]/narrative{en,ru,hi}/watch/parans/travelMode), `SPHERES` (8: career/love/health/finance/spirit/create/travel/family), `ORBIS_ZONES` (3: main 111km, extended 222km, fading 444km), `USER` (for Power Card). `computeCityIndex` from growth-ui (pure function on mock city data).

**Real data needed:** `City` Prisma (331+ cities — seed file exists). `CalculationCache` (44 AstroLine[] per member, shared by hash). `Member` (user's primary chart). Real astronomy-engine great-circle computation. Real `computeCityIndex` against actual line geometry (not the simplified mock). `CustomCity` (user-added cities). Real social-proof counters (Redis).

**Frontend dev tasks:**
- [ ] Replace `CITIES` mock with `useCityMatches({memberId, spheres, sortBy})` hook → `POST /api/cities/match`.
- [ ] Replace stylized SVG map with react-leaflet `MapContainer` (port from astroos-github `astro-map.tsx`, 875 lines). Three tile layers (dark/satellite/light). 44 great-circle lines with antimeridian wrapping (3 copies at lng -360/0/+360). Buffer corridors (`buildBufferCorridor`). Antipode labels. Birthplace markers. Multi-color conic-gradient city markers. Line trimming around selected city (`trimLineAroundCity`, 350km). Zoom-based perf gating (top-50 at zoom ≤2, all at zoom ≥3). `FlyToController` on city select.
- [ ] City detail drawer (port from `CityDetails` pattern): photo banner, active participants toggle, match-type banner with real score, narrative card (`generateCityNarrative`), 8-sphere breakdown + Recharts radar chart, stat grid 2×2, per-member breakdown, AI relocation report card (Markdown), planet influences list with buffer zone indicators, relocation links per country.
- [ ] Power Card modal: replace `USER.name/sun/rising/dayMaster` with real member data. Share buttons call `/api/share/power-card` to generate `/r/{cardId}` short link.
- [ ] Replace `computeCityIndex` mock usage — call `/api/v1/city-rank?member_id=&city_id=` (NEW, server-side) OR fetch `/api/v1/astrocartography?member_id=` GeoJSON and compute client-side. Spec'd in **Section 5**.
- [ ] Free-tier paywall triggers (2nd city / 2nd Power Card / travel-mode): replace `isFree` demo toggle with real `useSession().user.plan === "free"`. Track viewed cities server-side (`User.viewedCities` array, capped at 1 for Free).
- [ ] Social proof counters (`12,847 seekers`, `8,412 Scorpios chose Lisbon`): replace hard-coded with live `/api/social-proof?action=...`.

**Backend dev tasks:**
- [ ] Verify `/api/calculate` (44 AstroLine[]) and `/api/calculate/match` (city match) work as in astroos-github.
- [ ] Verify `/api/cities` (list), `/api/cities/match` (extended matching with sphere/climate/continent filters), `/api/custom-cities` (CRUD).
- [ ] NEW `/api/v1/city-rank?member_id=&city_id=` — server-side CityIndex computation (spec in Section 5). Returns `{index, M, V, K_irr, demoted, rank, sandwichPosition}`.
- [ ] NEW `/api/share/power-card` — POST `{memberId, cityName, templateId}` → returns `{cardId, url}`. Store in `PowerCard` table.
- [ ] NEW `GET /api/r/{cardId}` — public reveal page for shared Power Card (viral k-loop). SSR-rendered for OG image generation.
- [ ] NEW `/api/social-proof?action=world-explored|city-chosen|card-shared` — Redis `INCR` per action, return count + filter (e.g., "Scorpios chose {city}" filters by sun sign).

**DB schema:** `City` (exists, 331+ rows). `CustomCity` (exists). NEW `PowerCard { id, memberId, cityName, templateId, createdAt, views Int @default(0) }`. NEW `User.viewedCities String[]` (or `CityView { userId, cityId, viewedAt }` — preferred for analytics).

**Dependencies:** birth-data (Member), Self (chart for persona-sphere-fit), Upgrade (paywall CTA), Connect (viral partner link).

**Acceptance criteria:** Map renders 331 cities + 44 lines per active member, smooth pan/zoom (60fps on mobile). CityIndex ranking matches the prototype's pattern: Lisbon #1 (Scorpio Sun, love sphere, 3 positive lines, qol 85) anchor, Tokyo #2 editor's pick, Buenos Aires #3 most chosen, Dubai demoted (0 positive lines, K_irr=1.0) to "Worth considering" — verified against Aeliana's chart. SandwichPosition pills on top-3. Free user clicking 2nd distinct city → SoftPaywall. Travel-mode button → SoftPaywall. Share buttons (Instagram/WhatsApp/Telegram/X) never gated.

**Effort:** **XL** (15 days — react-leaflet port, city detail drawer, CityIndex production-ize, social proof, Power Card pipeline)

**Reference:** `astroos-github/src/components/astro-map.tsx` (875 lines), `page.tsx::CityDetails` (L2955–3759), `comparison-panel.tsx` (394 lines).

---

### 6. Local Space (`local`)

**What it does:** 8-sector compass wheel (SVG) showing planet rays from the user's home — N/NE/E/SE/S/SW/W/NW with planets in each sector, recommendations table (sector → planets → meaning), home recommendations cards (bed / workspace / door / avoid directions), energy summary.

**Mock data consumed:** `LOCAL_SPACE` (8 sectors: dir, deg, planets[], tone, rec{en,ru,hi}), `LOCAL_SPACE.recommendations` (bed/workspace/door/avoid + energy), `PLANETS` (10).

**Real data needed:** `Member` (birth chart). Target location (user's home address or selected city). `LocalSpaceResult` (10 planet azimuths + altitudes from astronomy-engine, computed for the target lat/lng at current sidereal time).

**Frontend dev tasks:**
- [ ] Replace `LOCAL_SPACE` mock with `useLocalSpace({memberId, lat, lng})` hook → `POST /api/v1/localspace`.
- [ ] SVG wheel: plot real planet azimuths (currently hard-coded `s.deg` per sector). Each planet ray from center at real azimuth.
- [ ] Below-horizon planets (altitude < 0): dashed rays, opacity 0.4 (currently no altitude logic).
- [ ] Location picker: Nominatim search + manual lat/lng + saved locations chips (port from `AstroLocalSection` in astroos-github page.tsx L2072).
- [ ] AI interpretation card (Premium) — `POST /api/v1/localspace/ai-interpretation`. Free users see `🔒 Pro` badge over this card.
- [ ] Optional map overlay: `LocalSpaceRays` rendered inside World's react-leaflet MapContainer when local-space mode is on (port from astroos-github `local-space-rays.tsx`).

**Backend dev tasks:**
- [ ] Verify `/api/v1/localspace` (POST) returns 10 planet azimuths + altitudes + recommendations for target point.
- [ ] Verify `/api/v1/localspace/ai-interpretation` (POST, Premium) returns Markdown interpretation.
- [ ] Cache by `sha1(memberId, lat, lng, date)` — local space rotates with sidereal time, so daily cache.

**DB schema:** `LocalSpaceCache { id, memberHash @unique (sha1 of lat,lng,dob,tz,targetLat,targetLng,date), payload JSON, createdAt }`.

**Dependencies:** birth-data, World (shared map overlay).

**Acceptance criteria:** User picks their home address → wheel shows real planet rays at current time. Bed direction recommendation matches sector with most favorable planets. AI interpretation generates within 15-30s for Pro users. Free users see locked AI card.

**Effort:** **M** (4 days)

**Reference:** `astroos-github/src/app/api/v1/localspace/route.ts`, `local-space-wheel.tsx` (116 lines), `local-space-rays.tsx` (87 lines).

---

### 7. Mentor (`mentor`)

**What it does:** AI companion chat. 2 a.m. Companion toggle (rose glow, retention hook #1) — auto-on 23:00–05:00. Voice selector (4: Empowerment/Reflective/Playful/Pragmatic). Chat surface with streaming responses, cited transits/planets (anti-cold-reading), persistent pgvector memory. Free-tier scarcity: 3 questions/day normal, 1 session/night for 2 a.m. Companion (Pro: unlimited + Companion). SoftPaywall on limit reached.

**Mock data consumed:** `MENTOR_VOICES` (4 entries), `MENTOR_CHAT` (3 messages with cites).

**Real data needed:** `User.voice` (selected persona). `MentorConversation` (chat history). `MentorMemory` (pgvector — extracted facts from past conversations). `MentorQuota` (daily question count, resets at midnight user-local). Real LLM (OpenAI/Anthropic) with streaming. RAG corpus (Steve Cozzi, Steven Forrest, Robert Hand, classical BaZi texts — ~10K verified documents).

**Frontend dev tasks:**
- [ ] Replace `MENTOR_CHAT` mock with `useMentorConversation()` hook → `GET /api/ai/conversation?member_id=` (last 20 messages).
- [ ] Wire `handleSend` to `POST /api/ai/astro-chat` with SSE streaming (currently just increments counter). Stream tokens into the chat surface.
- [ ] 2 a.m. Companion auto-detection: check current time vs user-local 23:00–05:00, auto-toggle if `User.twoAmCompanion === true`.
- [ ] Companion mode UI: starfield intensifies, gold → warm amber, cards dissolve to single soft glow panel, slower streaming. (CSS class swap.)
- [ ] `ScarcityBadge total={3} used={messagesUsed}` — replace `messagesUsed` with real `MentorQuota.usedToday` from `/api/me/quota`.
- [ ] Cited pills under mentor messages — render real citations from LLM response (`cites: ["☾ Moon ☌ Scorpio Sun", "Memory · sister · 7 days ago"]`).
- [ ] Memory recall pill ("memory recall · 7 days") — fetch real memory fragments from `/api/ai/memory?member_id=&query=`.

**Backend dev tasks:**
- [ ] Verify `/api/ai/astro-chat` exists and is history-aware. Add streaming (SSE) — currently returns full response.
- [ ] NEW `/api/ai/memory/recall` — pgvector similarity search over `MentorMemory` for the user, returns top-K fragments.
- [ ] NEW `/api/ai/memory/extract` — after each conversation, run LLM extraction to populate `MentorMemory` (facts, preferences, people mentioned).
- [ ] NEW `/api/me/quota` — returns `{mentorQuestionsUsedToday, mentorQuestionsLimit, companionSessionUsed, companionSessionLimit}` based on `User.plan`.
- [ ] NEW `POST /api/ai/companion/start` — marks 2 a.m. Companion session as started (Free: 1/night, Pro: unlimited).
- [ ] Quota reset cron: midnight user-local, clear `MentorQuota.usedToday`.

**DB schema:** `MentorConversation { id, memberId, role ("user"|"mentor"), text, cites JSON, voice, createdAt }` — index `(memberId, createdAt)`. `MentorMemory { id, memberId, fragment Text, embedding Vector(1536), source (conversationId), createdAt }` — pgvector, HNSW index. `MentorQuota { id, userId, date, questionsUsed Int @default(0), companionSessionsUsed Int @default(0), @unique(userId, date) }`.

**Dependencies:** birth-data (chart context for LLM), Profile (voice + 2 a.m. Companion toggles), Upgrade (paywall CTA).

**Acceptance criteria:** Pro user sends message → streaming response appears within 1s, completes in 5-10s. Every mentor message cites at least 1 transit/planet/line (anti-cold-reading). Memory recall: ask "what did I say about my sister?" → mentor references past conversation. Free user after 3 questions → SoftPaywall, composer disabled. 2 a.m. Companion toggles automatically between 23:00–05:00 if `User.twoAmCompanion === true`.

**Effort:** **XL** (10 days — streaming, pgvector memory, RAG corpus, quota, 2 a.m. mode)

**Reference:** `astroos-github/src/app/api/ai/astro-chat/route.ts`, `/api/ai/chat/route.ts`, `/api/ai/city-report/route.ts`.

---

### 8. Divine (`divine`)

**What it does:** Three divination modules — Daily Horoscope (free, 5 spheres + lucky/avoid hours), I-Ching (Pro, 64 hexagrams, coin/yarrow cast, judgment + image + advice + changed hexagram), Tarot (Pro, 78 cards, 10 spreads, cosmic variant). Cross-divination resonance (e.g., I-Ching cast ↔ Saturn return transit).

**Mock data consumed:** `DIVINE_MODULES` (3 entries), `HOROSCOPE_SPHERES` (5 entries), `ICHING_CAST` (hexagram ䷂, number 3, name, judgment, resonance, lines[6], changingLines[2]), `TAROT_DRAW` (3 cards: Star/Queen of Cups/Ace of Swords).

**Real data needed:** I-Ching hexagram data table (64 entries: unicode, number, name, judgment, image, advice — RU/EN/HI). Tarot card data table (78 entries: name, suit, element, meaning, reversed meaning — RU/EN/HI). Real coin-cast RNG (CSPRNG). Real Tarot shuffle (Fisher-Yates with CSPRNG seed). Horoscope — precomputed daily.

**Frontend dev tasks:**
- [ ] Replace `ICHING_CAST` mock with `castIChing(question?)` → `POST /api/iching/cast {memberId, question?, method: "coins"|"yarrow"|"time"}`. Returns `{primaryHexagram, changedHexagram|null, lines[6], changingLines[], question?}`.
- [ ] Hexagram visual: 6 horizontal bars (top = upper trigram), yang = solid gold bar, yin = two 40%-width pieces with gap, changing lines = ring-2 ring-amber. (Port from `IChingResultView` in astroos-github page.tsx L1211.)
- [ ] Trigrams cards (2-col): upper + lower trigram with symbol, name, attribute, element.
- [ ] Changed hexagram card (if changing lines present): "Transition hexagram №N" + name + judgment + advice.
- [ ] Replace `TAROT_DRAW` mock with `drawTarot(spread)` → `POST /api/tarot/draw {memberId, question?, spread: "single"|"three"|"five"}`.
- [ ] Tarot card visual: 96×144 px box, 2px border in suit color, rotated 180° if reversed, suit label + card number + name. `fade-in-up` with staggered `animationDelay: i*100ms`.
- [ ] Replace `HOROSCOPE_SPHERES` mock with `useToday()` (shared with Today screen).
- [ ] Cross-divination resonance card — NEW: after I-Ching cast, fetch `GET /api/divine/resonance?hexagram=N&member_id=` → returns `{transitName, transitDate, resonanceText}` linking hexagram meaning to current transit.

**Backend dev tasks:**
- [ ] Verify `/api/iching/cast` (Python-first with TS fallback) — coin cast algorithm: 6 lines bottom→top, each = sum of 3 coins (heads=3, tails=2): 6=old yin changing→yang, 7=young yang, 8=young yin, 9=old yang changing→yin. Binary (yang=1, bit 0=bottom) → 64-entry King Wen lookup. If any 6/9 present, build changedHexagram by flipping.
- [ ] Verify `/api/tarot/draw` — supports single/3-card/5-card spreads. CSPRNG-based shuffle. Reversed card logic (50% chance for non-Major arcana).
- [ ] NEW `/api/divine/resonance?hexagram=N&member_id=` — cross-references hexagram meaning with current transits (e.g., hexagram 3 "Difficulty at Beginning" ↔ Saturn return).
- [ ] I-Ching history: `GET /api/iching/history?member_id=` (Pro feature, last 50 casts).
- [ ] Tarot history: `GET /api/tarot/history?member_id=` (Pro feature).

**DB schema:** `IChingCast { id, memberId, question?, hexagramNumber, changedHexagramNumber?, lines JSON, createdAt }` — index `(memberId, createdAt)`. `TarotDraw { id, memberId, question?, spread, cards JSON [{cardId, reversed, position}], createdAt }` — index `(memberId, createdAt)`. Static seed tables: `Hexagram { number @id, unicode, nameEn, nameRu, nameHi, judgmentEn/Ru/Hi, imageEn/Ru/Hi, adviceEn/Ru/Hi, upperTrigram, lowerTrigram }` (64 rows). `TarotCard { id @id, nameEn, nameRu, nameHi, suit, element, meaningEn/Ru/Hi, reversedMeaningEn/Ru/Hi, arcana }` (78 rows).

**Dependencies:** birth-data (for cross-divination), Today (shared horoscope), i18n (all hexagram/tarot copy).

**Acceptance criteria:** Cast button → hexagram/tarot appears within 200ms. Visual matches King Wen sequence. Changing lines correctly produce changed hexagram. Tarot card reversed rendering works. Cross-divination resonance text makes astrological sense (reviewed by human astrologer — see Section 10). Free users can cast Daily Horoscope; I-Ching/Tarot trigger SoftPaywall on first attempt.

**Effort:** **L** (7 days — Python cast algorithm port, 64+78 seed data, cross-divination)

**Reference:** `astroos-github/src/app/api/iching/cast/route.ts`, `/api/tarot/draw/route.ts`, `IChingResultView` + `TarotResultView` patterns.

---

### 9. Connect · Cosmic Match (`connect`)

**What it does:** Compatibility report between two persons. Two-person hero with overall score (78%) + level. Free preview: top-3 harmony + top-3 friction aspects. Deep synastry (Premium gate, blurred + SoftPaywall): synastry wheel SVG, 5 categories (emotional/love/communication/physical/spiritual) with bars, aspects table, strengths/challenges lists. Partner link viral (FREE, never gated) — "When they create their chart, your full report unlocks together." Family hub preview (5 profile slots, Pro).

**Mock data consumed:** `COMPATIBILITY` (person1, person2, categories[5], aspects[6], overall, level, strengths[2], challenges[1]).

**Real data needed:** Two `Member` rows (person1 = user's primary, person2 = partner — either existing Member or partner-link recipient). `Compatibility` Prisma model (cached by hash of both member hashes). Real synastry computation (cross-chart aspects: conjunction, opposition, trine, square, sextile).

**Frontend dev tasks:**
- [ ] Replace `COMPATIBILITY` mock with `useCompatibility(member1Id, member2Id)` → `POST /api/v1/compatibility`.
- [ ] Synastry wheel SVG: outer ring = person1 planets, inner ring = person2 planets, aspect lines between. Real planet positions (currently hard-coded circles).
- [ ] 5 categories bars: real scores from API (currently `c.categories[].score` mock).
- [ ] Aspects table: real aspects with orb (currently `c.aspects[]` mock).
- [ ] Partner link generation: `POST /api/connect/partner-link` → returns `/connect/{linkId}` URL. Recipient lands on `auth.tsx` → registers → birth-data → both reports unlock.
- [ ] Premium gate: replace `isPro` demo toggle with real `useSession().user.plan`. Free users see blurred deep synastry + SoftPaywall (currently `gateVisible` controlled by `locked` state).
- [ ] Family hub preview: render real `MEMBERS` from `GET /api/members`. "Add member" CTA → birth-data form.
- [ ] Social proof `2,300 partner links shared today` → live `/api/social-proof?action=partner-link-shared`.

**Backend dev tasks:**
- [ ] Verify `/api/v1/compatibility` (POST, Premium) — returns overall, level, 5 categories, aspects, strengths, challenges. Cached by `sha1(member1Hash, member2Hash)` (cross-user reuse — same birth-data pair = same result).
- [ ] NEW `POST /api/connect/partner-link` — generates signed link `/connect/{linkId}` with `linkId = CSPRNG(16)`, stored in `PartnerLink { id, fromUserId, toEmail?, createdAt, acceptedAt?, acceptedUserId? }`.
- [ ] NEW `GET /api/connect/{linkId}` — public page; if recipient registers via this link, auto-link accounts (`PartnerLink.acceptedUserId`), unlock both reports for free (viral k-loop reciprocity).
- [ ] NEW `/api/connect/family` — GET returns family members list, POST adds member.

**DB schema:** `CompatibilityCache { id, hash @unique (sha1 of sorted member hashes), payload JSON, createdAt }`. `PartnerLink { id, fromUserId, toEmail?, acceptedUserId?, createdAt, acceptedAt? }` — index `(fromUserId)`, `(toEmail)`. `Member` adds `partnerLinkId String?` (link to the PartnerLink that created this member).

**Dependencies:** birth-data, Members (family hub), Upgrade (paywall CTA).

**Acceptance criteria:** Free user opens Connect → sees person1 vs person2 (default partner = mock "Kai" until they add real). Overall score + top-3 harmony + top-3 friction visible. Deep synastry blurred + SoftPaywall. Partner link button generates shareable URL — never gated. Recipient registers via link → both reports unlock free. Pro user sees full synastry without blur.

**Effort:** **L** (6 days — synastry computation, partner-link viral flow, family hub)

**Reference:** `astroos-github/src/app/api/v1/compatibility/route.ts`, `compatibility-dialog.tsx` (244 lines).

---

### 10. Members · Family Hub (`members`)

**What it does:** Grid of family member cards (avatar, name, relation, dob, place, dayMaster, topCity, score) + add-member form preview (name, birth, place, tz, gender) + CalculationCache explainer card.

**Mock data consumed:** `MEMBERS` (4 entries — Aeliana, Kai, Lena, Mother).

**Real data needed:** `Member` Prisma (CRUD). `CalculationCache` (shared by hash — 500K users reuse). Real dayMaster + topCity per member (computed on Member creation).

**Frontend dev tasks:**
- [ ] Replace `MEMBERS` mock with `useMembers()` hook → `GET /api/members`.
- [ ] Add member form: wire to `POST /api/members` (currently just visual). Reuse birth-data form fields (masked date, city autocomplete, gender).
- [ ] Per-member "View chart" → `onNavigate("self")` with `selectedMemberId` set in Zustand.
- [ ] Per-member "Cities" → `onNavigate("world")` with that member active.
- [ ] Duplicate check pill ("✓ Duplicate check") — call `GET /api/members/check-duplicate?...` before submit.
- [ ] Pro gate on 6th member (Free ≤1, Pro ≤5): if Free user has 1 member and clicks Add → SoftPaywall.

**Backend dev tasks:**
- [ ] Verify `/api/members` (GET list, POST create), `/api/members/[id]` (PUT, DELETE) exist.
- [ ] Duplicate check: composite index `(userId, firstName, dob, lat, lng)` — already in Prisma schema.
- [ ] On Member POST: async kickoff `/api/calculate` (44 lines), `/api/bazi/calculate`, precompute top city via `/api/cities/match?member_id=&limit=1`.
- [ ] Pro limit enforcement: 1 for Free (just primary), 5 for Pro, 50 for B2B.

**DB schema:** `Member` (exists). Add `isPrimary Boolean @default(false)` — primary member is the user's own chart, created during onboarding (1 per Free user).

**Dependencies:** birth-data (shared form), Self/World (member-context navigation), Upgrade (Pro gate).

**Acceptance criteria:** User adds 2nd member → form submits → member card appears within 3s (after async calc). Duplicate detection blocks exact-same birth data. Free user blocked at 2nd add → SoftPaywall. Pro user can add up to 5. Each member card shows real dayMaster + topCity (not mock).

**Effort:** **M** (3 days — CRUD + duplicate check + Pro gate)

**Reference:** `astroos-github/src/app/api/members/route.ts`, `members/[id]/route.ts`.

---

### 11. Profile · Settings (`profile`)

**What it does:** User hero card (name, tier, chart summary, streak) + 4-card grid: Mentor voice (4 options), Privacy & memory (toggles: AI memory, push, push time, view AI memory, export data, delete account), Language + cultural adaptation (RU/EN/HI + coming soon ES/PT/AR/ZH/JA/KO/DE/FR), House system (Placidus/Whole Sign/Equal) + Family hub quick access + Subscription management (Pro Monthly → switch to Annual / cancel one-tap).

**Mock data consumed:** `USER` (name, tier, sun, moon, rising, dayMaster, birthPlace, birthTime, streak), `MEMBERS`, `LOCALES`, `BAZI.dayMaster`.

**Real data needed:** `User` model (voice, locale, houseSystem, pushEnabled, pushTime, memoryEnabled, twoAmCompanion, plan). `MentorMemory` (view/edit). Subscription via Stripe / Apple IAP / Google Play.

**Frontend dev tasks:**
- [ ] Replace all `useState` toggles with `useUser()` hook mutations (`PATCH /api/me`).
- [ ] Mentor voice selector: persist to `User.voice`.
- [ ] 2 a.m. Companion toggle: persist to `User.twoAmCompanion`.
- [ ] Push notifications: request browser Notification permission on toggle.
- [ ] "View AI memory" → modal listing `MentorMemory` fragments with delete buttons (`DELETE /api/ai/memory/{id}`).
- [ ] "Export my data" → `GET /api/me/export` returns JSON (GDPR compliance).
- [ ] "Delete account" → confirm dialog → `DELETE /api/me` (soft-delete + 30-day grace period).
- [ ] Language picker: persist `User.locale`. Coming-soon locales greyed out.
- [ ] House system picker: persist `User.houseSystem`. Triggers chart re-render on next Self visit.
- [ ] Subscription management: real Stripe Customer Portal link / Apple receipt management.

**Backend dev tasks:**
- [ ] NEW `PATCH /api/me` — partial update of User fields (voice, locale, houseSystem, push*, memory, twoAmCompanion).
- [ ] NEW `GET /api/me/export` — JSON of all user data (User, Members, Conversations, Memory, RitualCasts).
- [ ] NEW `DELETE /api/me` — soft-delete (`User.deletedAt = now()`), 30-day grace, then cascade.
- [ ] NEW `GET /api/ai/memory` — list user's MentorMemory fragments.
- [ ] NEW `DELETE /api/ai/memory/{id}` — delete single fragment (user-controllable memory).
- [ ] NEW `POST /api/billing/portal` — Stripe Customer Portal session URL.
- [ ] NEW `POST /api/billing/cancel` — cancel subscription (1-tap, no dark pattern, no retention friction).

**DB schema:** `User` adds: `voice String @default("empowerment")`, `houseSystem String @default("placidus")`, `pushEnabled Boolean @default(true)`, `pushTime String @default("08:00")`, `memoryEnabled Boolean @default(true)`, `twoAmCompanion Boolean @default(true)`, `deletedAt DateTime?`. `Subscription { id, userId, provider, providerSubscriptionId, plan, status, currentPeriodEnd, cancelAt?, createdAt }`.

**Dependencies:** auth (session), mentor (voice + memory), today (push time), i18n (locale).

**Acceptance criteria:** All toggles persist across sessions. Voice change takes effect on next mentor message. Account deletion removes data within 30 days (GDPR). Export returns valid JSON within 5s. Subscription cancel is 1-tap, no friction.

**Effort:** **M** (4 days — User mutations + GDPR export + Stripe portal)

**Reference:** `astroos-github/src/app/api/me/route.ts`.

---

### 12. Auth (`auth`)

(Full spec in **Section 1, CJM step 2**.)

**Effort:** **M** (3 days — OAuth + email verify + session)

**Reference:** `astroos-github/src/app/api/auth/{login,logout,register}/route.ts`.

---

### 13. Upgrade · Pricing (`upgrade`)

**What it does:** 4-tier pricing grid (Free / Pro Annual [popular] / Pro Monthly [decoy] / Lifetime) + sticky trial countdown bar (jade) + Apple/Google/Stripe payment buttons + social proof band + FAQ accordion + PPP (purchasing-power parity) table. Sandwich rule: Free (anchor) → Pro Annual (target) → Pro Monthly (decoy) → Lifetime (trust).

**Mock data consumed:** `TIERS` (4 entries), `PPP_SAMPLE` (7 regions with monthly price + rails).

**Real data needed:** `Subscription` model. Stripe / Apple IAP / Google Play integration. PPP detection from IP geolocation. Trial state (start date, days left).

**Frontend dev tasks:**
- [ ] Replace `TIERS` mock with `useTiers()` → `GET /api/tiers?region=` (region from IP). Apply PPP pricing.
- [ ] Replace `PPP_SAMPLE` mock with real PPP table from API.
- [ ] Sticky `TrialCountdown daysLeft={3}` — replace with real `useTrial().daysLeft` from `GET /api/me/subscription`.
- [ ] Apple Pay / Google Pay buttons → call respective SDKs. Stripe → Checkout Session.
- [ ] `SocialProof count={48213}` ("upgraded this month") → live `/api/social-proof?action=upgraded`.
- [ ] FAQ accordion: 6-8 questions (currently exists as static).
- [ ] Lifetime tier: one-time Stripe PaymentIntent.

**Backend dev tasks:**
- [ ] NEW `GET /api/tiers?region=` — returns localized pricing (PPP-aware).
- [ ] NEW `POST /api/billing/checkout` — Stripe Checkout Session for Pro Monthly / Annual / Lifetime.
- [ ] NEW `POST /api/billing/apple/verify` — Apple IAP receipt verification.
- [ ] NEW `POST /api/billing/google/verify` — Google Play RTDN.
- [ ] NEW `POST /api/billing/trial/start` — start 7-day reverse trial (Pro features, no charge, auto-downgrade to Free on day 8).
- [ ] NEW `GET /api/me/subscription` — returns `{plan, status, currentPeriodEnd, trialEndsAt, daysLeft}`.
- [ ] Webhooks: `POST /api/webhooks/stripe`, `POST /api/webhooks/apple`, `POST /api/webhooks/google` — update Subscription status.

**DB schema:** `Subscription` (above). `Trial { id, userId, startedAt, endsAt, downgradedAt? }` — index `(userId)`.

**Dependencies:** auth (logged-in to upgrade), Profile (manage subscription).

**Acceptance criteria:** User clicks "Start 7-day reverse trial" → Stripe checkout (or Apple/Google native sheet) → trial active, no charge. TrialCountdown shows real days left. Day 8: auto-downgrade to Free (no surprise charge — anti-Nebula). Annual is "Most popular" (sandwich target). PPP pricing applies based on IP (India sees ₹199, US sees $12.99). Cancel is 1-tap.

**Effort:** **L** (8 days — Stripe + Apple IAP + Google Play + PPP + trial logic + webhooks)

**Reference:** `astroos-github/src/app/api/auth/` (existing pattern for routes).

---

### 14. Business · B2B HR (`business`)

**What it does:** White-space B2B product. Stats (0 competitors, $15-50/seat/mo, 17× consumer ARPU, GDPR Art. 9). Org chart with BaZi overlay (6 employees × Day Master + role fit %). Team compatibility heatmap (10×10 matrix). Role × favorable elements table (7 roles). Ethics panel (GDPR Art. 9, works council, advisory-not-deterministic). B2B pricing 3 tiers (Starter $15 / Professional $25 / Enterprise $50 per seat/mo). Book discovery call CTA.

**Mock data consumed:** `B2B_EMPLOYEES` (6 entries), `B2B_ROLES` (7 entries).

**Real data needed:** `B2BOrganization` model. `B2BEmployee` model (consented employees). Pairwise BaZi compatibility (reuse `/api/v1/compatibility`). Role-fit algorithm (BaZi elements vs `B2B_ROLES.ideal`). Hiring funnel (candidate scoring). Luck Pillar forecast (career trajectory).

**Frontend dev tasks:**
- [ ] Replace `B2B_EMPLOYEES` mock with `useB2BEmployees()` → `GET /api/b2b/employees`.
- [ ] Heatmap: real pairwise compatibility scores from `/api/v1/compatibility` (10×10 = 100 API calls — batch via `/api/b2b/team-compatibility`).
- [ ] Role fit %: real algorithm from BaZi elements vs `B2B_ROLES.ideal`.
- [ ] Add employee flow: consent-required (GDPR Art. 9 — explicit written consent checkbox).
- [ ] Hiring funnel: candidate scoring form → `POST /api/b2b/candidates/score`.
- [ ] Luck Pillar forecast: career trajectory chart per employee.
- [ ] Discovery call CTA → Calendly embed or `POST /api/b2b/lead`.

**Backend dev tasks:**
- [ ] NEW `GET /api/b2b/employees` — list org's employees (consent-verified).
- [ ] NEW `POST /api/b2b/employees` — add employee (require `consentGiven: true` in payload).
- [ ] NEW `POST /api/b2b/team-compatibility` — batch pairwise BaZi compatibility for org.
- [ ] NEW `POST /api/b2b/candidates/score` — score candidate against role + existing team.
- [ ] NEW `GET /api/b2b/forecast?employee_id=` — Luck Pillar career trajectory.
- [ ] NEW `POST /api/b2b/lead` — sales lead capture.
- [ ] Audit trail: every B2B action logged (`B2BAuditLog { orgId, action, actorUserId, targetEmployeeId, timestamp, payload }`).
- [ ] Bias testing: quarterly audit endpoint `GET /api/b2b/audit/disparate-impact`.

**DB schema:** `B2BOrganization { id, name, domain, plan ("starter"|"professional"|"enterprise"), seats, createdAt }`. `B2BEmployee { id, orgId, member Member (relation), role, consentGivenAt, consentDocumentVersion, addedByUserId, createdAt }`. `B2BCandidate { id, orgId, name, dob, lat, lng, tz, gender, roleApplied, score, createdAt }`. `B2BAuditLog { id, orgId, action, actorUserId, targetEmployeeId?, payload JSON, createdAt }`.

**Dependencies:** Self (BaZi), Connect (pairwise compatibility), billing (B2B subscription).

**Acceptance criteria:** Org admin adds employee → consent flow (checkbox + signed document version) → employee appears in org chart with Day Master + role fit %. Heatmap shows real pairwise scores. Hiring funnel scores candidate vs role. Ethics panel visible everywhere. Audit trail complete. Works council notification template available (Germany BetrVG §87).

**Effort:** **XL** (12 days — consent flow, batch compatibility, audit, bias testing, hiring funnel)

**Reference:** None — white-space product, no prior art. Consult `/home/z/my-project/research/b2b_hr.json` for market research.

---

### 15. Welcome (`welcome`) — NEW screen

(Full spec in **Section 1, CJM step 1**.)

**Effort:** **S** (0.5 day)

---

### 16. Birth Data (`birth-data`) — NEW screen

(Full spec in **Section 1, CJM step 3**.)

**Effort:** **L** (5 days)

---

## Section 3 — Backend API contract catalog

Reference: `/home/z/my-project/astroos-github/src/app/api/` (32 routes exist). NEW = needs to be built. Existing = verified in astroos-github.

### Auth & User (4 existing + 4 NEW)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | `{email, password, name?}` | `{user, sessionToken}` (cookie) | none | none | no | exists |
| POST | `/api/auth/login` | `{email, password}` | `{user, sessionToken}` | none | none | no | exists |
| POST | `/api/auth/logout` | — | `{ok:true}` | session | none | no | exists |
| GET | `/api/me` | — | `{id, email, name, plan, locale, voice, ...}` | session | 60s | no | exists (extend) |
| POST | `/api/auth/oauth/google` | `{code}` | `{user, sessionToken}` | none | none | no | **NEW** |
| POST | `/api/auth/oauth/apple` | `{code}` | `{user, sessionToken}` | none | none | no | **NEW** |
| GET | `/api/auth/verify?token=` | — | `{ok}` or 401 | none | none | no | **NEW** (email verify) |
| PATCH | `/api/me` | `{voice?, locale?, houseSystem?, push*?, memory?, twoAmCompanion?}` | `{user}` | session | none | no | **NEW** |
| GET | `/api/me/subscription` | — | `{plan, status, currentPeriodEnd, trialEndsAt, daysLeft}` | session | 30s | no | **NEW** |
| GET | `/api/me/quota` | — | `{mentorQuestionsUsedToday, mentorQuestionsLimit, companionSessionUsed, companionSessionLimit}` | session | 30s | no (returns tier-aware limits) | **NEW** |
| GET | `/api/me/export` | — | JSON (User+Members+Conv+Memory+Rituals) | session | none | no | **NEW** (GDPR) |
| DELETE | `/api/me` | — | `{ok}` (soft-delete) | session | none | no | **NEW** |
| GET | `/api/me/primary-member` | — | `{member, chart, bazi, topCities[3]}` | session | 24h | no | **NEW** (onboarding) |
| GET | `/api/geo/locale` | — | `{locale}` | none | 1h | no | **NEW** |

### Members (4 existing + 1 NEW)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| GET | `/api/members` | — | `Member[]` | session | 60s | no (Free ≤1, Pro ≤5) | exists |
| POST | `/api/members` | `{firstName, dob, lat, lng, tz, gender, city?, country?, isPrimary?}` | `{member}` | session | none | enforce Free ≤1, Pro ≤5 | exists (extend) |
| PUT | `/api/members/[id]` | partial Member | `{member}` | session (owner) | none | no | exists |
| DELETE | `/api/members/[id]` | — | `{ok}` | session (owner) | none | no | exists |
| GET | `/api/members/check-duplicate?firstName=&dob=&lat=&lng=` | — | `{duplicate:boolean, existingId?}` | session | none | no | **NEW** |

### Calculate (4 existing)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| POST | `/api/calculate` | `{lat, lng, dob, tz}` | `{lines: AstroLine[44]}` | session | forever (CalculationCache by sha1) | no | exists |
| POST | `/api/calculate/match` | `{member_ids, favorable_planets, life_sphere, limit}` | `{cities: CityMatch[]}` | session | 1h (by user+members+planets+buffer) | no (Free ≤1 city detail, Pro unlimited) | exists |
| POST | `/api/calculate/great-circle` | `{lat, lng, azimuth, max_dist_km, step_km}` | `{points[361]}` | session | 1h | no | exists |
| POST | `/api/calculate/batch-great-circle` | `{lat, lng, dob, tz}` (44 lines batch) | `{lines[44]}` | session | forever (CalculationCache) | no | exists |

### Cities (4 existing + 1 NEW)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| GET | `/api/cities` | `?climate=&continent=` | `City[]` | session | 1h | no | exists |
| POST | `/api/cities/match` | `{member_ids, life_sphere, climate, continent, limit}` | `{cities: CityMatch[]}` | session | 1h | Free ≤1 city detail | exists |
| GET | `/api/geo/cities?q=` | — | `[{name, country, lat, lng}]` | none | 1h | no | exists |
| GET | `/api/geo/timezone?lat=&lng=&dob=` | — | `{tz, offsetHours, source}` | none | forever (IANA DB) | no | exists |
| GET | `/api/v1/city-rank?member_id=&city_id=` | — | `{index, M, V, K_irr, demoted, rank, sandwichPosition}` | session | 24h | no (but Free sees only 1st city rank) | **NEW** (spec §5) |

### Custom Cities (3 existing)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| GET | `/api/custom-cities` | — | `CustomCity[]` | session | 60s | no | exists |
| POST | `/api/custom-cities` | `{name, country, lat, lng, population, income, housing, qol, timezone}` | `{customCity}` | session | none | no | exists |
| DELETE | `/api/custom-cities/[id]` | — | `{ok}` | session (owner) | none | no | exists |

### Geo (2 existing + 1 NEW)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| GET | `/api/geo/cities?q=` | — | autocomplete | none | 1h | no | exists (dup of Cities) |
| GET | `/api/geo/timezone` | — | tz lookup | none | forever | no | exists (dup) |
| GET | `/api/geo/locale` | — | `{locale}` from Accept-Language | none | 1h | no | **NEW** (dup of Auth) |

### Divine · BaZi / I-Ching / Tarot / Horoscope (4 existing + 1 NEW)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| POST | `/api/bazi/calculate` | `{member_id}` or `{lat, lng, dob, tz, gender}` | `{dayMaster, fourPillars, tenGods, luckPillars, elements, recommendations, riskYears}` | session | 1h (BaZiCache by memberHash) | no (Free: basic; Pro: luck pillars + 10 gods + recommendations) | exists |
| POST | `/api/iching/cast` | `{member_id, question?, method}` | `{primaryHexagram, changedHexagram, lines, changingLines, question}` | session | none (RNG per cast) | Pro (Free: 1 cast total; Pro: unlimited + history) | exists |
| POST | `/api/tarot/draw` | `{member_id, question?, spread}` | `{cards: [{cardId, reversed, position, meaning}]}` | session | none | Pro (Free: 1 draw total; Pro: unlimited + history) | exists |
| GET | `/api/horoscope/daily?member_id=&date=` | — | `{focus, horoscope, affirmation, compliment, transitPills, spheres, luckyHours, avoidHours}` | session | 6h | no (free for all — retention driver) | exists |
| GET | `/api/divine/resonance?hexagram=&member_id=` | — | `{transitName, transitDate, resonanceText}` | session | 24h | Pro | **NEW** (cross-divination) |

### AI (3 existing + 4 NEW)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| POST | `/api/ai/astro-chat` | `{member_id, message, voice?, companion?}` | SSE stream `{token}` + final `{text, cites[]}` | session | none | Free 3/day, Pro unlimited; 2 a.m. Companion Free 1/night, Pro unlimited | exists (extend with SSE) |
| POST | `/api/ai/city-report` | `{city_id, member_ids}` | Markdown report | session | 1h | Pro | exists |
| POST | `/api/ai/city-report` | — | (as above) | session | 1h | Pro | exists |
| GET | `/api/ai/memory?member_id=` | — | `MentorMemory[]` | session | 30s | no | **NEW** |
| DELETE | `/api/ai/memory/[id]` | — | `{ok}` | session (owner) | none | no | **NEW** |
| POST | `/api/ai/memory/extract` | `{conversationId}` (internal trigger) | `{fragments[]}` | internal | none | no | **NEW** (post-conversation cron) |
| GET | `/api/ai/memory/recall?member_id=&query=` | — | `MentorMemory[]` (top-K) | session | 5m | no | **NEW** |

### V1 Premium (5 existing)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| GET | `/api/v1/horoscope?member_id=` | — | daily horoscope | session | 6h | no | exists |
| POST | `/api/v1/compatibility` | `{member1_id, member2_id}` | `{overall, level, categories, aspects, strengths, challenges}` | session | forever (CompatibilityCache by hash) | Pro (Free: top-3 harmony + friction only) | exists |
| POST | `/api/v1/localspace` | `{member_id, lat, lng}` | `{planets: [{name, azimuth, altitude, direction, recommendation}]}` | session | 24h (LocalSpaceCache) | no (Free: wheel only; Pro: AI interpretation) | exists |
| POST | `/api/v1/localspace/ai-interpretation` | `{member_id, lat, lng}` | Markdown | session | 24h | Pro | exists |
| GET | `/api/v1/astrocartography?member_id=` | — | GeoJSON FeatureCollection of ASC/MC/DSC/IC lines | session | forever (CalculationCache) | no | exists |

### Today / WARD (3 NEW)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| POST | `/api/today/cast` | `{member_id, date}` | `{streakFilled, wardStatus, tomorrowPreviewAt}` | session | none | no | **NEW** |
| GET | `/api/today/streak?user_id=` | — | `{streak, wardStatus, last7days: boolean[]}` | session | 30s | no | **NEW** |
| GET | `/api/social-proof?action=` | — | `{count, label}` | none | 30s | no | **NEW** (Redis INCR backend) |

### Connect / Viral (3 NEW)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| POST | `/api/connect/partner-link` | `{toEmail?, fromMemberId}` | `{linkId, url}` | session | none | no (viral — never gated) | **NEW** |
| GET | `/api/connect/{linkId}` | — | `{fromUserName, toEmail?}` (public reveal page) | none | 60s | no | **NEW** |
| GET | `/api/connect/family` | — | `Member[]` (family hub) | session | 60s | Pro (5 members) | **NEW** |

### Share / Viral (1 NEW)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| POST | `/api/share/power-card` | `{memberId, cityName, templateId}` | `{cardId, url}` | session | none | no (viral — never gated) | **NEW** |
| GET | `/api/r/{cardId}` | — | SSR HTML (public Power Card) | none | 24h | no | **NEW** |

### Billing (5 NEW + 3 webhooks)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| GET | `/api/tiers?region=` | — | `Tier[]` with PPP pricing | none | 1h | no | **NEW** |
| POST | `/api/billing/checkout` | `{plan, period}` | `{checkoutUrl}` | session | none | no | **NEW** (Stripe) |
| POST | `/api/billing/apple/verify` | `{receipt}` | `{subscription}` | session | none | no | **NEW** (Apple IAP) |
| POST | `/api/billing/google/verify` | `{purchaseToken}` | `{subscription}` | session | none | no | **NEW** (Google Play) |
| POST | `/api/billing/trial/start` | — | `{trialEndsAt}` | session | none | no | **NEW** |
| POST | `/api/billing/portal` | — | `{portalUrl}` | session | none | no | **NEW** (Stripe portal) |
| POST | `/api/billing/cancel` | — | `{cancelAt}` | session | none | no (1-tap, no friction) | **NEW** |
| POST | `/api/webhooks/stripe` | Stripe event | `{received:true}` | webhook signature | none | no | **NEW** |
| POST | `/api/webhooks/apple` | Apple event | `{received:true}` | webhook signature | none | no | **NEW** |
| POST | `/api/webhooks/google` | Google RTDN | `{received:true}` | webhook signature | none | no | **NEW** |

### B2B (5 NEW)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| GET | `/api/b2b/employees` | — | `B2BEmployee[]` | session (org admin) | 60s | B2B plan | **NEW** |
| POST | `/api/b2b/employees` | `{memberData, role, consentGiven}` | `{employee}` | session (org admin) | none | B2B plan | **NEW** |
| POST | `/api/b2b/team-compatibility` | `{employee_ids[]}` | `{matrix: [[score]]}` | session (org admin) | 24h | B2B plan | **NEW** |
| POST | `/api/b2b/candidates/score` | `{candidateData, role}` | `{score, breakdown}` | session (org admin) | none | B2B plan | **NEW** |
| GET | `/api/b2b/forecast?employee_id=` | — | `{luckPillars, careerTrajectory}` | session (org admin) | 24h | B2B plan | **NEW** |
| POST | `/api/b2b/lead` | `{name, email, company, seats}` | `{ok}` | none | none | no | **NEW** |

### Notifications (1 NEW)

| Method | Path | Request body | Response | Auth | Cache TTL | Premium-gate? | Reference |
|---|---|---|---|---|---|---|---|
| GET | `/api/notifications` | — | `AstroNotification[]` | session | 30s | no | **NEW** (for `NotificationsBell`) |
| POST | `/api/notifications/read` | `{ids[]}` | `{ok}` | session | none | no | **NEW** |

**Total: 32 existing (astroos-github) + 35 NEW = 67 routes.**

---

## Section 4 — Prisma data model

Reference: `/home/z/my-project/astroos-github/prisma/schema.prisma` (114 lines, 5 models). Below is the extended schema needed for v3.2 (16 models).

### Existing (5) — copy as-is

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  passwordHash String
  plan         String   @default("free") // "free" | "pro_monthly" | "pro_annual" | "lifetime" | "b2b_starter" | "b2b_pro" | "b2b_enterprise"
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime? // NEW: soft-delete for GDPR

  // v3.2 NEW fields
  locale       String   @default("en") // "en"|"ru"|"hi" + future ES|PT|AR|ZH|JA|KO|DE|FR
  voice        String   @default("empowerment") // "empowerment"|"reflective"|"playful"|"pragmatic"
  houseSystem  String   @default("placidus") // "placidus"|"whole-sign"|"equal"
  pushEnabled  Boolean  @default(true)
  pushTime     String   @default("08:00")
  memoryEnabled Boolean @default(true)
  twoAmCompanion Boolean @default(true)
  onboardedAt  DateTime?
  revealedAt   DateTime?
  role         String   @default("user") // "user"|"admin"|"b2b_admin"

  members      Member[]
  sessions     Session[]
  customCities CustomCity[]
  // v3.2 NEW relations
  ritualCasts  RitualCast[]
  mentorConversations MentorConversation[]
  mentorMemory MentorMemory[]
  subscriptions Subscription[]
  trials       Trial[]
  partnerLinksFrom PartnerLink[] @relation("PartnerLinkFromUser")
  partnerLinksAccepted PartnerLink[] @relation("PartnerLinkAccepted")
  powerCards   PowerCard[]
  cityViews    CityView[]
  notifications Notification[]
  b2bOrgAdmin  B2BOrganization[] @relation("B2BOrgAdmin")
  b2bEmployees B2BEmployee[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([expiresAt])
}

model Member {
  id        String   @id @default(cuid())
  userId    String
  firstName String
  lat       Float
  lng       Float
  dob       String   // ISO "1989-04-15T16:40"
  tz        Float    // offset hours
  gender    Int      @default(1) // 0=female, 1=male (BaZi luck pillars)
  city      String?
  country   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  isPrimary Boolean  @default(false) // NEW: user's own chart (1 per Free user)
  partnerLinkId String? // NEW: link to PartnerLink if created via viral flow
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  calculations CalculationCache[]
  // v3.2 NEW relations
  mentorConversations MentorConversation[]
  baziCache   BaZiCache[]
  ichingCasts IChingCast[]
  tarotDraws  TarotDraw[]
  b2bEmployee B2BEmployee?
  @@index([userId])
  @@index([userId, firstName, dob, lat, lng])
}

model CalculationCache {
  id        String   @id @default(cuid())
  memberHash String  @unique // sha1(lat,lng,dob,tz)
  lines     String   // JSON AstroLine[]
  createdAt DateTime @default(now())
  members   Member[]
}

model City {
  id        Int     @id @default(autoincrement())
  name      String
  country   String
  lat       Float
  lng       Float
  population Int    @default(0)
  income    Int     @default(0)
  housing   Int     @default(0)
  qol       Int     @default(50)
  climate   String
  continent String
  timezone  Float   @default(0)
  @@index([continent])
  @@index([climate])
  @@index([lat, lng])
  @@index([name])
  @@index([population])
  @@index([climate, continent, population])
  @@unique([name, country])
}

model CustomCity {
  id        String   @id @default(cuid())
  userId    String
  name      String
  country   String
  lat       Float
  lng       Float
  population Int    @default(0)
  income    Int     @default(0)
  housing   Int     @default(0)
  qol       Int     @default(50)
  timezone  Float   @default(0)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

### NEW (11) — for v3.2 features

```prisma
// BaZi cache — same cross-user reuse pattern as CalculationCache
model BaZiCache {
  id         String   @id @default(cuid())
  memberHash String   @unique // sha1(lat,lng,dob,tz,gender)
  payload    String   // JSON {dayMaster, fourPillars, tenGods, luckPillars, elements, recommendations, riskYears}
  createdAt  DateTime @default(now())
  members    Member[]
}

// Daily horoscope — precomputed at 02:00 UTC per active member per locale
model DailyHoroscope {
  id        String   @id @default(cuid())
  memberId  String
  date      DateTime // yyyy-mm-dd
  locale    String
  focus     String
  horoscope String
  affirmation String
  compliment  String
  transitPills String // JSON
  spheres   String   // JSON
  luckyHours String   // JSON
  avoidHours String   // JSON
  createdAt DateTime @default(now())
  @@unique([memberId, date, locale])
  @@index([memberId, date])
  @@index([date, locale]) // cron query
}

// Ritual cast — for streak + WARD
model RitualCast {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime // yyyy-mm-dd (user-local)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, date])
  @@index([userId, date])
}

// Compatibility cache — cross-user reuse
model CompatibilityCache {
  id        String   @id @default(cuid())
  hash      String   @unique // sha1(sortedMemberHashes)
  payload   String   // JSON {overall, level, categories, aspects, strengths, challenges}
  createdAt DateTime @default(now())
}

// Local Space cache — daily rotation with sidereal time
model LocalSpaceCache {
  id         String   @id @default(cuid())
  memberHash String   // sha1(memberHash, targetLat, targetLng, date)
  payload    String   // JSON {planets: [{name, azimuth, altitude, direction, recommendation}]}
  createdAt  DateTime @default(now())
  @@unique([memberHash])
}

// Mentor conversation — chat history
model MentorConversation {
  id        String   @id @default(cuid())
  memberId  String
  role      String   // "user" | "mentor"
  text      String
  cites     String?  // JSON string[]
  voice     String
  companion Boolean  @default(false) // 2 a.m. Companion mode
  createdAt DateTime @default(now())
  member    Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  @@index([memberId, createdAt])
}

// Mentor memory — pgvector
model MentorMemory {
  id         String   @id @default(cuid())
  memberId   String
  fragment   String   // extracted fact
  embedding  Unsupported("vector(1536)")? // pgvector — null for SQLite dev
  source     String?  // conversationId
  createdAt  DateTime @default(now())
  member     Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  // For Postgres: CREATE EXTENSION vector; CREATE INDEX ON "MentorMemory" USING hnsw (embedding vector_cosine_ops);
  @@index([memberId])
}

// Mentor quota — daily reset
model MentorQuota {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime // yyyy-mm-dd user-local
  questionsUsed Int  @default(0)
  companionSessionsUsed Int @default(0)
  @@unique([userId, date])
  @@index([userId, date])
}

// I-Ching cast history
model IChingCast {
  id        String   @id @default(cuid())
  memberId  String
  question  String?
  hexagramNumber Int
  changedHexagramNumber Int?
  lines     String   // JSON [6]
  createdAt DateTime @default(now())
  member    Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  @@index([memberId, createdAt])
}

// Tarot draw history
model TarotDraw {
  id        String   @id @default(cuid())
  memberId  String
  question  String?
  spread    String   // "single"|"three"|"five"
  cards     String   // JSON [{cardId, reversed, position}]
  createdAt DateTime @default(now())
  member    Member   @relation(fields: [memberId], references: [id], onDelete: Cascade)
  @@index([memberId, createdAt])
}

// Subscription — Stripe / Apple IAP / Google Play
model Subscription {
  id        String   @id @default(cuid())
  userId    String
  provider  String   // "stripe"|"apple"|"google"
  providerSubscriptionId String @unique
  plan      String   // "pro_monthly"|"pro_annual"|"lifetime"
  status    String   // "active"|"trialing"|"canceled"|"expired"
  currentPeriodEnd DateTime
  cancelAt  DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([status, currentPeriodEnd])
}

// Trial — 7-day reverse trial
model Trial {
  id         String   @id @default(cuid())
  userId     String
  startedAt  DateTime @default(now())
  endsAt     DateTime // +7 days
  downgradedAt DateTime?
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([endsAt]) // cron: auto-downgrade
}

// Partner link — viral k-loop
model PartnerLink {
  id         String   @id @default(cuid())
  fromUserId String
  toEmail    String?
  acceptedUserId String?
  acceptedAt DateTime?
  createdAt  DateTime @default(now())
  fromUser   User     @relation("PartnerLinkFromUser", fields: [fromUserId], references: [id], onDelete: Cascade)
  acceptedUser User?  @relation("PartnerLinkAccepted", fields: [acceptedUserId], references: [id])
  @@index([fromUserId])
  @@index([toEmail])
}

// Power Card — viral shareable
model PowerCard {
  id         String   @id @default(cuid())
  memberId   String
  cityName   String
  templateId String
  views      Int      @default(0)
  createdAt  DateTime @default(now())
  // member   Member   @relation — via memberId
  @@index([memberId])
  @@index([cityName])
}

// City view — Free-tier paywall tracking
model CityView {
  id        String   @id @default(cuid())
  userId    String
  cityId    Int
  viewedAt  DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, cityId])
  @@index([userId])
}

// Notification — for NotificationsBell
model Notification {
  id        String   @id @default(cuid())
  userId    String
  kind      String   // "transit"|"streak"|"city"|"trial"|"divine"
  title     String
  body      String
  actionLabel String?
  actionScreen String?
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, read, createdAt])
}

// B2B Organization
model B2BOrganization {
  id        String   @id @default(cuid())
  name      String
  domain    String?
  plan      String   // "starter"|"professional"|"enterprise"
  seats     Int
  adminUserId String
  adminUser User     @relation("B2BOrgAdmin", fields: [adminUserId], references: [id])
  employees B2BEmployee[]
  auditLogs B2BAuditLog[]
  createdAt DateTime @default(now())
}

// B2B Employee — consented
model B2BEmployee {
  id        String   @id @default(cuid())
  orgId     String
  memberId  String   @unique // links to Member (birth chart)
  role      String
  consentGivenAt DateTime
  consentDocumentVersion String
  addedByUserId String
  org       B2BOrganization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  member    Member   @relation(fields: [memberId], references: [id])
  createdAt DateTime @default(now())
  @@index([orgId])
}

// B2B Candidate — hiring funnel
model B2BCandidate {
  id        String   @id @default(cuid())
  orgId     String
  name      String
  dob       String
  lat       Float
  lng       Float
  tz        Float
  gender    Int
  roleApplied String
  score     Float?
  createdAt DateTime @default(now())
  @@index([orgId])
}

// B2B Audit Log — compliance
model B2BAuditLog {
  id        String   @id @default(cuid())
  orgId     String
  action    String
  actorUserId String
  targetEmployeeId String?
  payload   String   // JSON
  createdAt DateTime @default(now())
  org       B2BOrganization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  @@index([orgId, createdAt])
}

// Static seed: I-Ching 64 hexagrams
model Hexagram {
  number    Int      @id
  unicode   String
  nameEn    String
  nameRu    String
  nameHi    String
  judgmentEn String
  judgmentRu String
  judgmentHi String
  imageEn   String
  imageRu   String
  imageHi   String
  adviceEn  String
  adviceRu  String
  adviceHi  String
  upperTrigram String
  lowerTrigram String
}

// Static seed: Tarot 78 cards
model TarotCard {
  id        Int      @id
  nameEn    String
  nameRu    String
  nameHi    String
  suit      String   // "major"|"wands"|"cups"|"swords"|"pentacles"
  element   String
  arcana    String   // "major"|"minor"
  meaningEn String
  meaningRu String
  meaningHi String
  reversedMeaningEn String
  reversedMeaningRu String
  reversedMeaningHi String
}
```

**Total: 16 existing + 11 NEW = 27 Prisma models.** Index strategy follows V88 pattern (every foreign key + every frequent query path).

**DB provider**: SQLite for dev (matches astroos-github), Postgres for prod (pgvector extension for MentorMemory, partitioning for DailyHoroscope by date).

---

## Section 5 — The CityIndex ranking formula (production-ize)

The prototype has `computeCityIndex` in `src/components/astroos/growth-ui.tsx` (lines 415–489) — a **pure function on mock city data**. Production-ize it.

### Where it runs

**Recommended: server-side, dedicated endpoint.**

- `GET /api/v1/city-rank?member_id=&city_id=` — returns `{index, M, V, K_irr, demoted, rank, sandwichPosition}` for a single city. Cached 24h (city lines don't change; member chart doesn't change).
- `GET /api/v1/city-rank/batch?member_id=&city_ids[]=` — batch version for the full ranked list (one round-trip, used by World screen initial render).
- Internally calls `/api/calculate` (44 AstroLine[] from CalculationCache) + `/api/cities/match` + `computeCityIndex()` server-side.

**Alternative: client-side over GeoJSON.** Fetch `/api/v1/astrocartography?member_id=` (GeoJSON FeatureCollection of 44 lines), fetch `/api/cities` (331 cities), compute `computeCityIndex` per city client-side. Faster for re-renders (no API round-trip when filter changes), but ships 44-line geometry to client (~50KB) and burns client CPU. Use this only if A/B testing shows the server round-trip is too slow.

### Real inputs (vs mock)

| Input | Mock (data.ts) | Real |
|---|---|---|
| `city.lines[]` | 6 mock cities, 1-4 lines each with hand-set `{planet, type, distKm, zone, weight}` | 331 real cities, real 44 lines per member from astronomy-engine, real distance via cross-track haversine, real zone via ORBIS_KM (111/222/444km), real weight from planet×sphere×line_type×zone matrix (84 weights: 14 planets × 6 spheres — see astroos-github `constants.ts`) |
| `city.score` | hand-set 69-92 | computed from line weights (sum of positive minus negative, zone-weighted) |
| `city.qol`, `population`, `income`, `housing`, `climate` | hand-set | from `City` Prisma (real city-seeds.ts — 331 cities with Numbeo/QoL data) |
| `personaSphereFit` | hard-coded for Aeliana (love/spirit = 1.0, family/health = 0.7, else 0.4) | computed from member's natal chart — Sun sign + Moon sign → priority spheres (see below) |

### The formula (verbatim from `growth-ui.tsx`)

```
CityIndex = (M × V) / (1 + K_irr)

M  = monetizable astro relevance
   = (posMass / max(1, lines.length)) - negMass × 0.6
   where posMass = Σ (line.weight × zoneFactor(line.zone)) for weight>0
         negMass = Σ (|line.weight| × zoneFactor(line.zone)) for weight<0
         zoneFactor: main=1.0, extended=0.7, fading=0.3

V  = velocity (multi-line density + QoL)
   = (posLineCount / 4) × 0.6 + (qol / 100) × 0.4

K_irr = irrelevance penalty
      = (0.75 if score<35)
      + (1.0 if posLineCount=0)
      + (0.4 if negMass>posMass)

demoted = K_irr ≥ 0.75
```

**Weighted blend (in the index numerator):**

```
index = (M × wAstro + (qol/100) × wQol + afford × wAfford + V × wVelocity + personaSphereFit × wPersona) / (1 + K_irr)

where afford = min(1, income / max(1, housing) / 1.2)
```

### Weights config (DEFAULT_INDEX_WEIGHTS)

```ts
export const DEFAULT_INDEX_WEIGHTS: IndexWeights = {
  wAstro:    0.42,  // astro line mass — heaviest (the moat)
  wQol:      0.22,  // quality of life
  wAfford:   0.12,  // housing affordability vs income
  wVelocity: 0.14,  // multi-line density
  wPersona:  0.10,  // sphere×persona fit
};
```

**A/B test strategy**: store weights per-user in `User.indexWeights JSON?` (null = defaults). Variant A (control) = defaults. Variant B = `wAstro: 0.50, wQol: 0.18, wAfford: 0.10, wVelocity: 0.12, wPersona: 0.10` (heavier astro emphasis). Assign 20 % of new users to Variant B. Measure revenue-per-user over 30 days. Winner becomes default.

### Persona-sphere-fit computation (real)

The prototype's `personaSphereFit(sphere)` is hard-coded for Aeliana. Production:

```ts
function personaSphereFit(member: Member, sphere: string): number {
  const sunSign = member.sunSign;  // from natal chart
  const moonSign = member.moonSign;
  const dayMasterElement = member.bazi.dayMaster.element; // "Water" etc.

  // Priority spheres from Sun sign (Western)
  const sunPriorities: Record<string, string[]> = {
    Aries:       ["career", "health"],
    Taurus:      ["finance", "love"],
    Gemini:      ["communication", "travel"],
    Cancer:      ["family", "health"],
    Leo:         ["career", "creativity"],
    Virgo:       ["health", "career"],
    Libra:       ["love", "create"],
    Scorpio:     ["love", "spirit"],     // Aeliana — matches mock
    Sagittarius: ["travel", "spirit"],
    Capricorn:   ["career", "finance"],
    Aquarius:    ["create", "spirit"],
    Pisces:      ["spirit", "love"],
  };

  // Priority spheres from Moon sign (emotional needs)
  const moonPriorities = sunPriorities; // same mapping, different weight

  // Day Master element → favorable spheres (BaZi)
  const elementSpheres: Record<string, string[]> = {
    Wood:  ["create", "family"],
    Fire:  ["career", "love"],
    Earth: ["finance", "health"],
    Metal: ["career", "finance"],
    Water: ["spirit", "communication"],
  };

  const sunTop = sunPriorities[sunSign] ?? [];
  const moonTop = moonPriorities[moonSign] ?? [];
  const elementTop = elementSpheres[dayMasterElement] ?? [];

  if (sunTop.includes(sphere) || moonTop.includes(sphere)) return 1.0;
  if (elementTop.includes(sphere)) return 0.7;
  return 0.4;
}
```

### Acceptance criteria (the regression test)

On Aeliana's chart (Scorpio Sun / Pisces Moon / Yang Water 壬 Day Master, born Saint-Petersburg 1989-11-07 04:17 UTC+3):

| Rank | City | Sphere | Pos lines | Score | QoL | Expected CityIndex behavior |
|---|---|---|---|---|---|---|
| 1 | Lisbon | love | 3 (Venus IC, Jupiter MC, Sun Desc) | 92 | 85 | Anchor — `SandwichPosition rank=1`, gold "Best match for you". personaSphereFit=1.0 (love is Sun priority). K_irr=0. |
| 2 | Tokyo | career | 2 (Mercury MC, Saturn MC) | 81 | 88 | Editor's pick — `SandwichPosition rank=2`, rose "Editor's pick · deep dive". personaSphereFit=0.4 (career not in Sun/Moon priorities). K_irr=0. UpsellNudge CTA. |
| 3 | Buenos Aires | create | 2 (Neptune MC, Venus Asc) | 87 | 78 | Most chosen — `SandwichPosition rank=3`, jade "Most chosen this week" + SocialProof 8,412. personaSphereFit=0.4. K_irr=0. |
| demoted | Dubai | finance | 0 positive (Saturn MC neg, Mars Asc neg) | 69 | 82 | Demoted — K_irr=1.0 (posLineCount=0). Goes to "Worth considering" section with caution pill "Weak chart — explore with care". **Not buried.** |

**Regression test**: a snapshot test in `__tests__/city-index.test.ts` that runs `computeCityIndex` on the 6 mock cities with Aeliana's persona and asserts the rank order [Lisbon, Tokyo, Buenos Aires, Tbilisi, Mexico City] + Dubai demoted. Run on every PR touching the formula.

---

## Section 6 — Premium gating rules

Reference: `TIERS` in `data.ts` (4 tiers: free, pro, annual, lifetime). All gating uses `SoftPaywall` from `growth-ui.tsx` — dismissable, never fear-mongering, never gates viral loops.

| Feature | Free limit | Pro Monthly $12.99/mo | Pro Annual $99/yr · Lifetime $199 | Paywall trigger | SoftPaywall config |
|---|---|---|---|---|---|
| Daily Horoscope (5 spheres + lucky/avoid hours) | unlimited | unlimited | unlimited | never | — (free for all — retention driver) |
| Western natal chart (basic) | unlimited | unlimited | unlimited | never | — |
| 1st astrocartography city score | 1 city | unlimited | unlimited | never | — |
| 2nd+ astrocartography city click | blocked | unlimited | unlimited | on 2nd distinct-city click | `trigger="2nd city"`, title "Unlock all 331 cities", CTA → upgrade |
| Travel-mode (relocation lines) | blocked | unlimited | unlimited | on travel-mode button click | `trigger="travel-mode"`, title "Travel-mode · a Pro feature" |
| 1st Power Card generation | 1 card | unlimited | unlimited | never | — |
| 2nd+ Power Card | blocked | unlimited | unlimited | on 2nd card-gen click | `trigger="2nd Power Card"`, title "Unlimited Power Cards" |
| Power Card share buttons (IG/WA/TG/X) | unlimited | unlimited | unlimited | never | — (viral — never gated) |
| Local Space wheel + recommendations | unlimited | unlimited | unlimited | never | — |
| Local Space AI interpretation | blocked | unlimited | unlimited | on AI card open | `trigger="AI interpretation"`, title "Unlock AI interpretation" |
| BaZi basic (Day Master, 4 pillars) | unlimited | unlimited | unlimited | never | — |
| BaZi Luck Pillars (大运) + Ten Gods (十神) | blocked | unlimited | unlimited | on Luck Pillars section | `trigger="Luck Pillars"`, title "Unlock Luck Pillars + Ten Gods" |
| BaZi recommendations (stones, colors, professions) | blocked | unlimited | unlimited | on recommendations card | `trigger="BaZi recommendations"` |
| I-Ching cast | 1 total | unlimited + history | unlimited | on 2nd cast | `trigger="2nd I-Ching cast"` |
| Tarot draw | 1 total | unlimited + history | unlimited | on 2nd draw | `trigger="2nd Tarot draw"` |
| Cross-divination resonance | blocked | unlimited | unlimited | on resonance card | `trigger="cross-divination"` |
| Cosmic Match overall + top-3 harmony/friction | unlimited | unlimited | unlimited | never | — (free preview — reciprocity) |
| Cosmic Match deep synastry (wheel, 5 categories, aspects) | blurred + SoftPaywall | unlimited | unlimited | on deep section view | `trigger="full synastry"`, title "Unlock your full compatibility report" |
| Partner link (viral) | unlimited | unlimited | unlimited | never | — (viral — never gated) |
| AI Mentor normal mode | 3 questions/day | unlimited | unlimited | on 4th question (or daily limit reached) | `trigger="4th question"`, title "You've asked your 3 free questions", ScarcityBadge shows 0/3 |
| AI Mentor 2 a.m. Companion | 1 session/night | unlimited | unlimited | on 2nd Companion session | `trigger="2 a.m. session"`, title "Tonight's free 2 a.m. session is complete" |
| AI Mentor persistent memory | blocked | unlimited | unlimited | on memory recall feature | `trigger="persistent memory"` |
| Family hub | 1 member (primary) | up to 5 members | up to 5 members | on 2nd member add | `trigger="2nd family member"`, title "Add up to 5 family profiles" |
| All 6 Life Themes | 1 (basic) | all 6 + monthly new | all 6 + monthly new | on 2nd theme | `trigger="Life Themes"` |
| Pro shareable cards (4 templates, branded) | 1 template | 4 templates | 4 templates | on 2nd template | `trigger="branded cards"` |
| Solar return reading (birthday month) | blocked | blocked | unlimited (Annual+ only) | on solar return feature | `trigger="solar return"`, title "Annual exclusive" |
| Year-ahead personalized review | blocked | blocked | unlimited (Annual+ only) | on year-ahead feature | `trigger="year-ahead"` |
| Priority mentor memory recall | blocked | blocked | unlimited (Annual+ only) | on priority queue | `trigger="priority recall"` |
| B2B HR (org chart, heatmap, hiring funnel) | blocked | blocked | blocked (separate B2B plan) | on B2B screen | separate sales motion — `trigger="B2B"`, CTA "Book a discovery call" |

**Implementation pattern**: every gated surface checks `useSession().user.plan`. The `SoftPaywall` component is rendered conditionally; `onCta` always calls `onNavigate("upgrade")`. **Viral loops (partner link, Power Card share) are NEVER gated** — reciprocity over restriction (Task 9-a §3, Task 10-d).

---

## Section 7 — i18n production-ize

### Current state

- 3 locales: `en`, `ru`, `hi` (RU/EN/HI).
- 624 entries × 3 langs = **1,872 strings** in `src/lib/astroos/i18n.ts` (733 lines).
- Cultural adaptation (not just translation): EN = Western primary, all 4 voices; RU = Western, calm voice; HI = Vedic phrasing, panchang/nakshatra references.
- New strings (added in Tasks 10-a/10-b/10-c/10-d) use **inline locale-conditional copy** (`locale === "ru" ? "..." : locale === "hi" ? "..." : "..."`) — ~50+ inline strings across Today, World, Mentor, Connect, Upgrade screens.

### Production-ize plan

#### 7.1 Move all inline copy into i18n.ts keys

Audit `today.tsx`, `world.tsx`, `mentor.tsx`, `connect.tsx`, `upgrade.tsx` for inline `locale === ...` patterns. For each, add a key to `i18n.ts` for all 3 locales. Examples:

```ts
// In today.tsx (line ~50) — replace:
const mentorTitle = L("Ask your 2 a.m. Companion", "Спросите своего компаньона в 2 ночи", "अपने 2 बजे रात के साथी से पूछें");

// With:
const mentorTitle = t("today.mentor.title");
// And add to i18n.ts:
"today.mentor.title": { en: "Ask your 2 a.m. Companion", ru: "Спросите своего компаньона в 2 ночи", hi: "अपने 2 बजे रात के साथी से पूछें" }
```

**Effort**: S (1 day — mechanical refactor, lint rule to forbid inline `locale ===` patterns).

#### 7.2 Add 8 more locales (11 total)

| Locale | Native | RTL? | Cultural adaptation | Priority |
|---|---|---|---|---|
| `en` | English | no | Western primary, all 4 voices, Gregorian | ✅ exists |
| `ru` | Русский | no | Western, calm voice, Gregorian | ✅ exists |
| `hi` | हिन्दी | no | Vedic/sidereal phrasing, panchang/nakshatra, Calm + Trauma-sensitive | ✅ exists |
| `es` | Español | no | Western, Latin-American warmth, Gregorian | P0 — Year 1 |
| `pt` | Português | no | Western, Brazilian flavor, Gregorian | P0 — Year 1 |
| `ar` | العربية | **yes** | Western + lunar Hijri calendar overlay, formal register | P1 — Year 2 |
| `zh` | 中文 | no | **BaZi-native** — Chinese terminology first (十神, 大运, etc.) | P1 — Year 2 |
| `ja` | 日本語 | no | Western + BaZi (四柱推命), keigo register | P2 — Year 3 |
| `ko` | 한국어 | no | Western + BaZi (사주), polite register | P2 — Year 3 |
| `de` | Deutsch | no | Western, formal Sie, Gregorian | P2 — Year 3 |
| `fr` | Français | no | Western, formal vous, Gregorian | P2 — Year 3 |

#### 7.3 RTL strategy (for Arabic)

- Use Tailwind 4's `dir="rtl"` attribute on `<html>` based on `locale === "ar"`.
- Replace `left-*` / `right-*` Tailwind classes with `start-*` / `end-*` (Tailwind 4 supports logical properties).
- Replace `ml-*` / `mr-*` with `ms-*` / `me-*`.
- Replace `text-left` / `text-right` with `text-start` / `text-end`.
- SVG charts (natal wheel, local space wheel): mirror horizontally — `transform: scaleX(-1)` on the SVG element, then flip text labels back with `scaleX(-1)` on `<text>`.
- Framer Motion `x` animations: switch sign in RTL.
- Test with Egyptian Arabic first (largest market), then Gulf, then Levantine.

#### 7.4 Cultural adaptation notes (per locale)

- **HI (Hindi)**: Vedic/sidereal-aware phrasing. References to "panchang" (पंचांग), "nakshatra" (नक्षत्र), "dasha" (दशा). BaZi copy is secondary (Vedic is primary in India). Calm + Trauma-sensitive voices prioritized (per audit 9-b).
- **AR (Arabic)**: RTL layout. Lunar Hijri calendar overlay (show both Gregorian + Hijri dates). Formal register (Modern Standard Arabic). Avoid romantic/flirtatious copy in Connect screen — keep it clinical/destiny-focused.
- **ZH (Chinese)**: **BaZi-native** — use Chinese terminology first (十神, 大运, 天干, 地支), English in parentheses. This is the only locale where BaZi is the primary system (not Western). Reframe Western astrology as secondary ("西方占星"). Connect = "合婚" (marriage compatibility).
- **JA/KO**: BaZi (四柱推命 / 사주) is recognized but Western astrology is more mainstream — keep Western primary with BaZi secondary. Use polite register (keigo / 존댓말).
- **ES/PT**: Latin warmth — allow more emotional/flirtatious copy in Connect. Use informal tú/você (not usted/você-formal).
- **DE/FR**: Formal Sie/vous by default. Switch to du/tu after user opts in (in Profile).

#### 7.5 i18n infrastructure

- Move from in-file `i18n.ts` (733 lines, 624 entries × 3 langs) to **namespaced JSON files**: `src/locales/en/common.json`, `en/today.json`, `en/world.json`, etc. Reduces bundle size (load only the current screen's namespace).
- Use `next-intl` or `react-i18next` for production (current `useI18n` context is fine for prototype but doesn't scale to 11 locales × 5 namespaces × 624 keys = 34K strings).
- **Translation pipeline**: source strings in EN → machine-translate (DeepL/Google Translate) to other 10 locales → human review (native speakers, ~$0.05/word, ~$5K per locale for 624 entries × ~10 words avg).
- **Cultural adaptation pipeline**: separate from translation — astrologer + cultural consultant reviews BaZi/Vedic/RTL phrasing per locale (~$2K per locale).

---

## Section 8 — Growth/conversion layer production-ize

The `growth-ui.tsx` primitives (489 lines) are **all client-side mock**. Production-ize each.

### 8.1 SoftPaywall

**Current**: pure presentational component, visibility controlled by parent state (`locked`, `paywallVisible`).

**Production**: 
- Add `usePlan()` hook returning `user.plan`.
- Replace `isFree = true` / `isPro = false` demo toggles with `const isPro = usePlan() !== "free"`.
- Track paywall impressions: `POST /api/analytics/paywall-impression { trigger, screen, userId }` (no PII, just trigger + screen + timestamp).
- Track paywall CTA clicks: `POST /api/analytics/paywall-cta { trigger, screen }`.
- Track paywall dismissals: `POST /api/analytics/paywall-dismiss { trigger, screen }`.
- A/B test: 50 % see SoftPaywall on 2nd city click, 50 % see it on 3rd city click (measure conversion rate).

### 8.2 SocialProof

**Current**: hard-coded `count` props (`12408`, `12847`, `8412`, `2300`, `48213`).

**Production**:
- `useSocialProof(action, filter?)` hook → `GET /api/social-proof?action={action}&filter={filter}` (30s polling or SSE).
- Backend: Redis `INCR astroos:proof:{action}:{date}` on every event. Filtered counts via Redis sets (`SADD astroos:proof:city-chosen:scorpio:{date} {userId}`).
- Live-tick: animate the count up by 1 every 2-5s with a random jitter (based on real event rate, not fake).
- **Honesty contract**: counts must be REAL. Never inflate. If a count is <100, show "joined recently" instead of the raw number.

### 8.3 TrialCountdown

**Current**: hard-coded `daysLeft={3}`.

**Production**:
- `useTrial()` hook → `GET /api/me/subscription` returns `{trialEndsAt, daysLeft}`.
- Auto-downgrade cron: every hour, query `Trial` where `endsAt < now() AND downgradedAt IS NULL`, set `User.plan = "free"`, mark `Trial.downgradedAt = now()`, send "Your Pro trial ended" notification.
- Jade (not red) — urgency without fear.
- Sticky bar at top of every screen while trial active (not just Upgrade).

### 8.4 ScarcityBadge

**Current**: `total` and `used` props passed by parent (e.g., `total={3} used={messagesUsed}`).

**Production**:
- `useQuota(feature)` hook → `GET /api/me/quota` returns `{mentorQuestionsUsedToday, mentorQuestionsLimit, companionSessionUsed, companionSessionLimit, ichingCastsUsed, tarotDrawsUsed}`.
- Reset cron: midnight user-local, clear `MentorQuota` rows (or rotate by date).
- Genuine scarcity — never fake. If user is on Pro, badge says "Pro · unlimited".

### 8.5 SandwichPosition

**Current**: pure presentational, `rank: 1|2|3`.

**Production**: no change — purely presentational. The `rank` value comes from `computeCityIndex` server-side (Section 5).

### 8.6 StickyCTA

**Current**: presentational, `onClick` callback.

**Production**: no change — purely presentational. The `handleCast` callback calls `POST /api/today/cast` (Section 1, CJM step 5).

### 8.7 UpsellNudge

**Current**: presentational, `onClick` callback.

**Production**: no change. Add analytics: `POST /api/analytics/upsell-impression { screen, position, cta }` and `POST /api/analytics/upsell-click { screen, position }`.

### 8.8 NotificationsBell + dropdown

**Current**: 5 hard-coded `AstroNotification[]` in `page.tsx` (lines 46–52).

**Production**:
- `useNotifications()` hook → `GET /api/notifications` (30s polling or WebSocket).
- Mark as read: `POST /api/notifications/read { ids[] }`.
- Notification sources:
  - **Transit alerts**: cron computes planet ingresses for the user's chart, generates "Moon enters Scorpio" notifications.
  - **Streak nudges**: if `User.streak ≥ 4`, nudge "Two more days and your WARD hits gold".
  - **City matches**: when a new city match is computed (e.g., user adds a member), "New match: Porto".
  - **Trial countdown**: 3 days before trial ends, "Your Pro trial ends Sunday".
  - **Divine reminders**: if user hasn't cast I-Ching in 7 days, "You haven't cast this week".
- Push notifications (browser): integrate with Web Push API + service worker. Respect `User.pushEnabled` + `User.pushTime`.

### 8.9 Real A/B assignment infrastructure

**Current**: none.

**Production**:
- `User.abVariant JSON?` field — assigned at registration: `{cityIndexWeights: "A"|"B", paywallTrigger: "2nd-city"|"3rd-city", mentorVoice: "default"|"experimental"}`.
- Assignment: hash(`userId + experimentName`) % 100 < 20 → variant B, else A.
- Analytics: every metric event includes `abVariant` so we can slice conversion by variant.
- Decision rule: variant B wins if revenue-per-user at 30 days is ≥5 % higher with p<0.05.

---

## Section 9 — Priority backlog (P0/P1/P2)

The "what to build first" list. Ordered. The analyst turns each row into a sprint story.

### P0 — Must-have for MVP launch (Blocks all activation)

| # | Task | Screen | Effort | Dependency | Expected metric impact |
|---|---|---|---|---|---|
| 1 | **Fix onboarding sequence: Welcome → Auth → Birth-data → Reveal → Today** (the bug being built — first-visit currently lands on Reveal with mock data) | welcome + birth-data + reveal + page.tsx shell | L (8 days total) | none | Activation 45% → 70% (the headline target). Without this, every other metric is fake. |
| 2 | **Auth: register/login + Google OAuth + httpOnly session** | auth | M (3 days) | #1 | Enables any personalized experience. Currently USER is hardcoded Aeliana. |
| 3 | **Birth-data form: masked date + city autocomplete + tz auto + graceful unknown-time path** | birth-data | L (5 days) | #2 | Required for real chart. Without it, Reveal/Self/World all show mock data. |
| 4 | **`POST /api/calculate` integration** (44 AstroLine[] via astronomy-engine, CalculationCache by sha1) | reveal + self + world + connect | L (5 days BE) | #3 | Replaces mock chart. 500K-user scalability via cross-user cache. |
| 5 | **`POST /api/bazi/calculate` integration** (Python service + TS fallback, BaZiCache) | reveal + self | L (5 days BE) | #3 | Real Day Master, 4 pillars, Luck Pillars, Ten Gods, recommendations. |
| 6 | **`GET /api/v1/horoscope?member_id=` integration + 02:00 UTC cron precompute** | today | L (5 days) | #4 | Real daily ritual content. WARD driver. |
| 7 | **`POST /api/today/cast` + streak logic + `User.streak` field** | today | M (3 days) | #6 | WARD metric tracking. 4+/7 cohort converts 6-8×. |
| 8 | **`POST /api/cities/match` + 331-city seed + 8-sphere filter + CityIndex server-side (`/api/v1/city-rank`)** | world | XL (12 days) | #4 | CityIndex replaces single-score sort. Lisbon #1 / Dubai demoted pattern (Section 5 acceptance). |
| 9 | **`POST /api/v1/compatibility` + CompatibilityCache + synastry wheel** | connect | L (6 days) | #4 | Cosmic Match becomes real. Partner-link viral flow (never gated). |
| 10 | **Free-tier paywall wiring: replace `isFree=true` / `isPro=false` demo toggles with real `usePlan()`** | world + mentor + connect | S (1 day) | #2 | 3 paywall trigger-moments on World fire correctly. Currently all structural, no real plan check. |

### P1 — Required for retention + monetization (Launch + 3 months)

| # | Task | Screen | Effort | Dependency | Expected metric impact |
|---|---|---|---|---|---|
| 11 | **Stripe + Apple IAP + Google Play billing + 7-day reverse trial + auto-downgrade cron** | upgrade | L (8 days) | #2 | Pro trial starts. Annual share +25pp (popular badge on Annual). |
| 12 | **AI Mentor with SSE streaming + RAG (Steve Cozzi, Steven Forrest, Robert Hand, classical BaZi) + cited transits** | mentor | XL (10 days) | #5 | D30 retention 20% → 28% (2 a.m. Companion hook). Anti-cold-reading citations. |
| 13 | **Mentor persistent memory (pgvector) + extraction cron** | mentor | L (6 days) | #12 | Anti-Replika identity-discontinuity trap. ≥30% of conversations recall memory by M12. |
| 14 | **`POST /api/iching/cast` + 64-hexagram seed (RU/EN/HI) + Python cast algorithm** | divine | L (5 days) | #4 | Pro feature. Cross-divination resonance (Section 8 of divine screen). |
| 15 | **`POST /api/tarot/draw` + 78-card seed (RU/EN/HI) + 10 spreads + reversed logic** | divine | L (5 days) | #4 | Pro feature. |
| 16 | **`POST /api/v1/localspace` + LocalSpaceCache (daily rotation) + AI interpretation (Pro)** | local | M (4 days) | #4 | Pro feature. Bed/workspace/door recommendations. |
| 17 | **Members CRUD + Pro gate (Free ≤1, Pro ≤5) + duplicate check** | members | M (3 days) | #2, #4 | Family hub real. |
| 18 | **Partner-link viral flow: `POST /api/connect/partner-link` + `/connect/{linkId}` reveal page + auto-unlock on registration** | connect | M (4 days) | #9 | Viral k → 1.0 by M18. k contribution 0.15-0.25 per partner link. |
| 19 | **Power Card viral: `POST /api/share/power-card` + `/r/{cardId}` SSR reveal page** | world | M (4 days) | #8 | Viral k-loop. 2,300 cards shared/day target. |
| 20 | **Move all inline locale-conditional copy into i18n.ts keys (RU/EN/HI)** | all screens | S (1 day) | none | Prep for 8 new locales. Lint rule forbids inline `locale ===`. |

### P2 — Growth, polish, B2B (Launch + 6 months)

| # | Task | Screen | Effort | Dependency | Expected metric impact |
|---|---|---|---|---|---|
| 21 | **Add ES + PT locales (P0 of 8 new locales)** | i18n | M (4 days) | #20 | LATAM market entry. |
| 22 | **Add AR locale + RTL strategy (logical Tailwind props, SVG mirror)** | i18n + all screens | L (6 days) | #20 | MENA market entry. |
| 23 | **Add ZH locale + BaZi-native phrasing** | i18n + self | L (5 days) | #20 | China market entry (BaZi is native — huge differentiator). |
| 24 | **Social proof backend: Redis INCR + SSE + honesty contract** | growth-ui | M (4 days) | #7 | Live counters on Today/World/Mentor/Connect. |
| 25 | **A/B testing infrastructure: `User.abVariant` + assignment + analytics slice** | growth-ui + analytics | M (5 days) | #11 | Tune CityIndex weights, paywall trigger timing, mentor voice. |
| 26 | **NotificationsBell real feed: WebSocket + transit cron + streak nudges + trial countdown** | growth-ui | L (6 days) | #6, #11 | New growth surface in top bar. |
| 27 | **B2B HR module: org chart + heatmap + hiring funnel + consent flow + audit log** | business | XL (12 days) | #5, #9 | Path to $160M ARR (17× consumer ARPU). White-space — no competitor. |
| 28 | **GDPR compliance: data export + soft-delete + 30-day grace + audit trail** | profile | M (4 days) | #2 | Required for EU launch. |
| 29 | **PPP (purchasing-power parity) pricing: IP geolocation + per-region pricing table** | upgrade | M (3 days) | #11 | India ₹199 vs US $12.99. LATAM R$25/MX$120. |
| 30 | **Themes screen (6 Life Themes) — currently in nav but no screen** | themes (NEW) | L (6 days) | #6 | Pro feature. Monthly new content cadence. |

---

## Section 10 — Risks & open questions

### Technical risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **astronomy-engine bundle size** (~120KB minified) ships to client if World renders client-side | LCP +30% on mobile | Lazy-load `astro-map.tsx` (only when user navigates to World). Server-side compute via `/api/calculate` — keep astronomy-engine on server only, ship GeoJSON to client. |
| 2 | **Python BaZi mini-service latency** (200-500ms per call) | Reveal activation 90s budget blown if BaZi takes >5s | Pre-compute on Member creation (async kickoff), cache via BaZiCache (cross-user reuse by `sha1(lat,lng,dob,tz,gender)`). Reveal reads from cache, never waits for Python. TS fallback (`bazi-fallback.ts` in astroos-github) if Python down. |
| 3 | **CalculationCache invalidation** — astronomy-engine updates (new ephemeris) require re-compute | Stale lines for 500K users | Version the cache: `CalculationCache.engineVersion Int @default(1)`. On engine update, bump version, lazy-migrate (recompute on next read). Background job for top-N active users. |
| 4 | **Swiss Ephemeris licensing** — commercial use requires paid license (~$200/year for individuals, more for SaaS) | Legal risk if used without license | Use `astronomy-engine` (MIT license, accurate enough for 95% of cases) for v1. Add Swiss Ephemeris as Pro feature (justifies $12.99/mo) once revenue justifies license. Document the tradeoff in `methodology` page. |
| 5 | **pgvector scalability** — 500K users × 100 memory fragments each = 50M vectors | Memory recall latency >500ms | HNSW index (already spec'd). Start with 1536-dim (OpenAI ada-002). Consider quantization (8-bit) if latency degrades. Shard by user-id hash if needed. |
| 6 | **react-leaflet performance** — 44 lines × 3 copies + 331 city markers + buffer corridors | Jank on low-end mobile | Zoom-based gating (top-50 cities at zoom ≤2 — already in astroos-github). Buffer corridors only when zoom ≥3. Web Worker for great-circle point generation. |
| 7 | **Stripe + Apple IAP + Google Play sync** — three billing systems, status drift | User pays but plan doesn't update, or vice versa | Single source of truth: `Subscription` Prisma model. Webhooks update Subscription.status. Apple/Google RTDN (Real-Time Developer Notifications) for cancellations/refunds. Reconciliation cron: query Stripe/Apple/Google APIs daily, diff against `Subscription` table, alert on mismatch. |
| 8 | **OAuth provider changes** — Google/Apple can revoke OAuth credentials | Login broken for affected users | Email+password always available as fallback. Monitor OAuth error rate, alert on spike. |
| 9 | **GDPR Art. 9 special-category data** — birth data + astrological interpretation = special category | Legal exposure in EU | Explicit consent on birth-data form. Data residency (EU for EU users — separate Postgres instance in eu-central-1). Right to explanation, right to opt-out, anonymous mode. Works council notification template for B2B. Quarterly bias audit. |
| 10 | **CalculationCache `sha1(lat,lng,dob,tz)` collisions** — extremely rare but possible | Wrong chart for one user | Use SHA-256 (or cuid-based cache key). Add `memberHash` uniqueness constraint (already in Prisma). |

### Product open questions

| # | Question | Context | Default decision (if no answer) |
|---|---|---|---|
| 1 | **CityIndex weights tuning** — `DEFAULT_INDEX_WEIGHTS` (wAstro 0.42, wQol 0.22, wAfford 0.12, wVelocity 0.14, wPersona 0.10) are reasonable defaults, but need validation on real cohort | Section 5 | Ship defaults, A/B test variant B (heavier astro) with 20% of users for 30 days, pick winner. |
| 2 | **A/B infra scope** — do we build in-house A/B or buy Optimizely/LaunchDarkly? | Section 8.9 | In-house `User.abVariant` field + analytics slice — cheaper, sufficient for v1. Re-evaluate at 1M MAU. |
| 3 | **Real astrologer review of AI mentor outputs** — the LLM will occasionally produce astrology that sounds plausible but is wrong (e.g., "Saturn return at age 25" when it's age 27-30) | Mentor screen | Hire 1-2 consulting astrologers ($200-500/hr) to review 100 mentor conversations/month. Build a "human review" queue into `/api/ai/astro-chat` (sample 1% of conversations, send to review). |
| 4 | **Cross-divination resonance quality** — "I-Ching hexagram 3 ↔ Saturn return transit" is the unique AstroOS signature, but requires careful astrological curation | Divine screen | Real astrologer curates the 64 hexagrams × N transits matrix manually. Ship with 10 curated resonances, expand to 64 over Year 1. |
| 5 | **CityIndex for non-Aeliana charts** — the formula is tuned for Aeliana (Scorpio Sun / Pisces Moon). Does it work for, say, an Aries Sun / Capricorn Moon user? | Section 5 | The `personaSphereFit` function generalizes (per-sign priority spheres), but the weight balance may need re-tuning per element. Run the regression test (Section 5 acceptance) on 10 diverse charts before launch. |
| 6 | **2 a.m. Companion content moderation** — late-night users may disclose crisis mental health situations. LLM responses need trauma-informed guardrails | Mentor screen | System prompt includes "if user mentions self-harm, respond with crisis hotline numbers (locale-aware) and disengage from astrology". Trigger word list. Human review queue for flagged conversations. Liability insurance. |
| 7 | **B2B HR ethics boundary** — where does "advisory" end and "deterministic" begin? A hiring manager using BaZi to reject a candidate is illegal in some jurisdictions | Business screen | Hard cap: B2B product NEVER outputs a "hire/don't hire" recommendation. Outputs only "team fit insights" with explicit "human HR takes final decision" disclaimer. Audit trail for every B2B action. Right-to-explanation for candidates. Legal review per market (DE BetrVG §87, EU AI Act, US EEOC). |
| 8 | **Lifetime tier economics** — $199 one-time forever is generous. Does it cannibalize Annual? | Upgrade screen | Cap Lifetime at first 1,000 buyers (founder tier). Re-evaluate pricing quarterly. Consider "Lifetime + annual maintenance" model after Year 2. |
| 9 | **Onboarding tour skip-rate** — if users skip birth-data entry, they get Reveal with mock data (the current bug). Do we force completion or allow skip? | Onboarding | Force completion — Reveal without real chart is fake and harms trust. Allow "I'll do this later" but route to Today (basic horoscope) instead of Reveal. |
| 10 | **Vedic vs Western for HI locale** — Indian users expect Vedic (sidereal) by default. Currently the prototype is Western tropical for all locales | i18n + Self | Add `User.astrologySystem: "western"|"vedic"` field, default based on locale (HI → vedic, others → western). Recompute chart on toggle. Display both for Pro users. Big effort (P2). |
| 11 | **Mobile push notifications** — Web Push API is unreliable on iOS Safari (<17.4 support). Need native app for reliable push? | Profile + growth-ui | v1: Web Push (works on Android Chrome + iOS 16.4+). v2: native iOS/Android apps via React Native or Expo. P2 for Year 2. |
| 12 | **`computeCityIndex` server vs client** — server round-trip adds latency; client compute ships 44-line geometry (~50KB) | Section 5 | Server-side default (`/api/v1/city-rank/batch`). A/B test client-side variant for power users who re-filter frequently. |

---

## Appendix A — File inventory

| Path | Lines | Purpose |
|---|---|---|
| `src/app/page.tsx` | 380 | Shell, routing, onboarding redirect (localStorage), mobile nav, NotificationsBell |
| `src/lib/astroos/data.ts` | 452 | Mock data (USER, TODAY, CITIES[6], BAZI, ICHING, TAROT, MEMBERS, COMPATIBILITY, TIERS, etc.) |
| `src/lib/astroos/i18n.ts` | 732 | 624 i18n keys × 3 locales (RU/EN/HI) |
| `src/lib/astroos/i18n-context.tsx` | 30 | React context for `useI18n()` |
| `src/components/astroos/ui.tsx` | 263 | GlassCard, Pill, CosmicButton, SectionHeading, FadeIn, etc. |
| `src/components/astroos/growth-ui.tsx` | 489 | SoftPaywall, SocialProof, TrialCountdown, ScarcityBadge, SandwichPosition, StickyCTA, UpsellNudge, NotificationsBell, computeCityIndex |
| `src/components/astroos/screens/overview.tsx` | 178 | Pitch deck |
| `src/components/astroos/screens/reveal.tsx` | 130 | 90-sec cinematic |
| `src/components/astroos/screens/today.tsx` | 383 | Daily ritual + sandwich + sticky CTA |
| `src/components/astroos/screens/self.tsx` | 287 | Western wheel + BaZi pillars |
| `src/components/astroos/screens/world.tsx` | 790 | Astrocartography + CityIndex + paywall |
| `src/components/astroos/screens/local-space.tsx` | 170 | 8-sector compass |
| `src/components/astroos/screens/mentor.tsx` | 330 | AI chat + 2 a.m. Companion |
| `src/components/astroos/screens/divine.tsx` | 138 | Horoscope + I-Ching + Tarot |
| `src/components/astroos/screens/connect.tsx` | 356 | Compatibility + partner link |
| `src/components/astroos/screens/members.tsx` | 134 | Family hub CRUD |
| `src/components/astroos/screens/profile.tsx` | 285 | Settings + GDPR |
| `src/components/astroos/screens/auth.tsx` | 223 | Register/login + WelcomeScene |
| `src/components/astroos/screens/upgrade.tsx` | ~450 | Pricing + trial countdown + Apple/Google Pay |
| `src/components/astroos/screens/business.tsx` | 229 | B2B HR |

## Appendix B — astroos-github reference inventory

| Path | Purpose |
|---|---|
| `prisma/schema.prisma` (114 lines) | 5 models: User, Session, Member, CalculationCache, City, CustomCity |
| `src/app/api/` (32 routes) | See Section 3 catalog |
| `src/components/astro-map.tsx` (875 lines) | react-leaflet world map, 44 great-circle lines, buffer corridors, antipode labels, line trimming, 3-copy antimeridian wrapping |
| `src/components/local-space-wheel.tsx` (116 lines) | 8-sector SVG compass |
| `src/components/local-space-rays.tsx` (87 lines) | Planet rays on map |
| `src/components/comparison-panel.tsx` (394 lines) | Side-by-side city comparison |
| `src/components/dashboard-panel.tsx` (324 lines) | Recharts analytics |
| `src/components/schema-form.tsx` (779 lines) | Server-driven forms, MaskedDateInput, CityAutocomplete |
| `src/components/layers-control.tsx` | Per-member/per-line-type/per-buffer-zone toggles |
| `src/components/daily-horoscope-widget.tsx` (174 lines) | Compact horoscope widget |
| `src/components/compatibility-dialog.tsx` (244 lines) | Synastry modal |
| `src/lib/constants.ts` | PLANET_COLORS, LIFE_SPHERES (8), MATCH_COLORS, BUFFER_ZONES, LINE_TYPE_MEANINGS |
| `src/lib/scoring/narrative.ts` | generateCityNarrative — top-3 positive + top-2 negative |
| `src/lib/score-display.ts` | computeDisplayScore, computeDisplayType |
| `src/lib/city-info.ts` (356 lines) | getCountryInfo — per-country relocation links |
| `src/lib/use-keyboard-shortcuts.ts` | 1-8 number-key navigation |

## Appendix C — Effort estimates legend

- **S** = 0.5–2 days (1 developer)
- **M** = 3–5 days (1 developer)
- **L** = 6–10 days (1 developer, or 3–5 days with 2 devs)
- **XL** = 11–20 days (1 developer, or 6–10 days with 2 devs)

Total estimated effort to ship P0+P1 (items 1–20): **~100 dev-days** (≈ 5 months with 1 dev, ≈ 2.5 months with 2 devs).

Total to ship P0+P1+P2 (items 1–30): **~165 dev-days** (≈ 8 months with 1 dev, ≈ 4 months with 2 devs).

---

**End of guide.** Questions / clarifications → analyst → dev lead. This document is the source of truth for screen-to-task mapping for AstroOS v3.2.
