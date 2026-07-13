# AstroOS — Handover для Full-stack Analyst

> **Версия прототипа:** v4.0 (post-hotfix)
> **Дата:** 26 июня 2026
> **Цель документа:** передать full-stack аналитику весь контекст диалога от начала, архитектуру прототипа, инструкции по развёртыванию и план production-изации.

---

## 0. TL;DR — что это и зачем

AstroOS — космическая астрологическая SaaS-платформа. Цель: **$160M ARR / 12M MAU / 5 years**. Сочетает западную астрологию (астрокартография) + восточный BaZi + AI-наставник + Cosmic Match + I-Ching/Tarot + B2B HR.

**Текущий артефакт:** high-fidelity прототип на Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + framer-motion. **17 экранов**, ~14 000 строк кода, 3 локали (RU/EN/HI), 660 i18n-ключей, cosmic-дизайн (dark + gold/jade/rose + Cormorant Garamond).

**Прототип — НЕ production.** Все данные mock, backend-логика не подключена. Это дизайнерский/продуктовый прототип, на основе которого нужно строить реальный продукт.

---

## 1. История диалога — как мы сюда пришли

### Фаза 1: Product Designer (v1 → v3.0)
- Заказчик прислал Founder Portfolio с PRD v1.0 и 8-экранным прототипом, который ему не нравился.
- 3 параллельных субагента: (a) извлечение PRD, (b) конкурентный анализ 2024–2025 (32 web-поиска), (c) рынок+growth.
- Клонирован GitHub `Nevelim/astroos` (381M) → reference для real functionality.
- Формула: warm cosmic design + GitHub's data-density (44 planetary lines, 84 weights, narrative, radar, per-member, BaZi, synastry).
- Построена v3.0: 12 экранов, i18n RU/EN/HI, GitHub-fused data-density.

### Фаза 2: Growth-layer (v3.1 → v3.3)
- 2 аудита: Product Owner / E-commerce Growth Manager + UX/Cognitive specialist.
- Growth-ui.tsx (11 primitives), shell fix, World CityIndex, Upgrade popular→Annual, Today sandwich, Connect Premium gate, Mentor scarcity.
- Welcome + BirthData onboarding экраны, TourSpotlight, починен first-visit flow.

### Фаза 3: Feature expansion (v3.4 → v4.0)
- InfoTip tooltips (17 на 6 экранах), Themes экран (6 life themes), onboarding tour.
- Connect/Divine tooltips, Past themes archive, mobile ARIA.
- Local-space tooltip, Tarot tooltips, Profile tabs (5), Themes progress tracking.
- Themes localStorage persistence, Tarot spread selector, Connect breakdown tooltip, Profile Account tab.
- Connect clipboard, Themes reset, Tarot real spread logic, Mentor progressive disclosure.
- Themes export insights, Connect social share, Profile edit modal.
- Tarot Celtic 10 cards, Mentor Web Speech API voice preview, Themes single insight share, Connect QR code.

### Фаза 4: Hotfix
- Файл local-space.tsx был потерян (500 error). Восстановлен.

---

## 2. Целевая метрика и бизнес-модель

### North Star: WARD (Weekly Active Ritual Days ≥4/7)
- Цели: 18% (M6) → 25% (M12) → 35% (M24). Когорта 4+/7 конвертируется в paid в 6–8× чаще.

### Траектория
| Phase | MAU | ARR | WARD | Viral k | LTV |
|-------|-----|-----|------|---------|-----|
| Year 1 | 500K | $2M | 25% | 0.55 | $80 |
| Year 2 | 3M | $15M | 35% | 1.05 | $150 |
| Year 3 | 6M | $48M | 38% | 1.20 | $180 |
| Year 4 | 9M | $96M | 40% | 1.30 | $210 |
| Year 5 | 12M | $160M | 42% | 1.40 | $240 |

### Pricing (locked)
- Free — habit formation + viral surface
- Pro Monthly $12.99/mo — anchor
- Pro Annual $99/yr (save 37%, $8.25/mo equiv) — **"Most popular" badge**, anti-churn
- Lifetime $199 one-time — anti-subscription segment
- 7-day reverse trial, PPP по geoip, B2B HR $9/seat/mo

---

## 3. Дизайн-язык (LOCKED)

| Token | HEX | Назначение |
|-------|-----|-----------|
| bg | `#0B0B0F` | основной фон |
| gold | `#E8B86D` | primary accent |
| jade | `#5BB89C` | success/harmony |
| rose | `#D98E7A` | love/upsell |
| text | `#F5F0E8` | cream text |

**Шрифты:** Cormorant Garamond (display) + Inter (body) + JetBrains Mono (numbers).
**ЗАПРЕЩЕНО:** indigo, blue, 1990s tables, fear-mongering, dark patterns.
**Brand promise:** "No fear-mongering. No paywall traps. Just your chart, explained."

---

## 4. Архитектура прототипа

### Tech stack
Next.js 16 (App Router) + TypeScript 5 + Tailwind 4 + shadcn/ui + framer-motion + Prisma ORM (SQLite).

### Структура файлов
```
src/
├── app/{layout.tsx, page.tsx, globals.css, api/route.ts}
├── components/astroos/{ui.tsx, growth-ui.tsx, screens/ (17 файлов)}
├── lib/astroos/{data.ts, i18n.ts, i18n-context.tsx}
prisma/schema.prisma
docs/ · research/ · worklog.md
```

### Routing (client-side)
`page.tsx` использует `useState<ScreenKey>("today")` + `SCREENS` registry. Single route `/`.

### Onboarding flow
```
localStorage("astroos:seen") === null
  → Welcome → Auth → BirthData → Reveal → Today (TourSpotlight 3 шага)
Returning user → Today
```

---

## 5. Growth-ui.tsx — 11 primitives

| Primitive | Назначение |
|-----------|-----------|
| SoftPaywall | Blurred overlay + CTA + dismiss |
| SocialProof | "12,408 rituals cast today" live-tick |
| TrialCountdown | Jade countdown bar |
| ScarcityBadge | Genuine daily-limit (3 free questions) |
| SandwichPosition | Top-3 rank labels |
| StickyCTA | Bottom-anchored primary CTA + haptic |
| UpsellNudge | Inline mini-CTA card |
| NotificationsBell | Top-bar dropdown |
| InfoTip | Cosmic tooltip (WCAG, aria) |
| TourSpotlight | Onboarding tour overlay |
| OnboardingStepper | 4-step progress |
| computeCityIndex | PURE: `CityIndex = (M × V) / (1 + K_irr)` |

---

## 6. 17 экранов

| # | Screen | Что делает |
|---|--------|-----------|
| 1 | Overview | $160M ARR trajectory, 9 shifts |
| 2 | Reveal | 90-sec onboarding cinematic |
| 3 | Today | Daily ritual + sandwich + sticky CTA + tour |
| 4 | Self | Western natal + BaZi 4 pillars + Ten Gods |
| 5 | World | Astrocartography: CityIndex, sandwich, paywall, map |
| 6 | Local Space | 8 секторов + рекомендации |
| 7 | Mentor | AI + 2 a.m. Companion + voice preview |
| 8 | Divine | I-Ching + Tarot (3 спреда) |
| 9 | Connect | Compatibility + Premium gate + QR + social |
| 10 | Members | Family hub |
| 11 | Themes | 6 life themes × 4-week arc + localStorage |
| 12 | Upgrade | 4 tiers, Apple/Google Pay, FAQ |
| 13 | Business | B2B HR (white space) |
| 14 | Profile | 5 tabs + edit modal |
| 15 | Auth | 1-tap register |
| 16 | Welcome | Onboarding entry |
| 17 | BirthData | Birth form + city autocomplete |

---

## 7. Что MOCK vs что нужно production

### MOCK
USER (hardcoded Aeliana), CITIES, BAZI, COMPATIBILITY, ICHING_CAST, TAROT_DRAW, MENTOR_CHAT, TIERS, social proof counters, trial state, notifications.

### Что РЕАЛЬНО работает
Навигация, i18n, onboarding flow, localStorage persistence, clipboard, Web Speech API, social share, 11 growth primitives, CityIndex формула (mock data), mobile responsive + ARIA.

### Что нужно build
Auth, chart calculation (astronomy-engine), карта react-leaflet, BaZi (Python), AI mentor (ZAI SDK + RAG), billing, notifications, social proof (Redis), real QR, 78-card Tarot, multi-user.

---

## 8. Инструкция по развёртыванию

```bash
bun install
bun run db:push
bun run db:generate
bun run lint        # 0 errors
bun run dev         # http://localhost:3000 → 200
```

---

## 9. План production-изации (Top-6 P0)

1. **Auth** — NextAuth + Google OAuth [3d]
2. **Birth-data → /api/calculate** — astronomy-engine, 44 AstroLine[], CalculationCache [10d]
3. **/api/bazi/calculate** — Python service + TS fallback [5d]
4. **AI mentor** — ZAI SDK + RAG + pgvector memory [7d]
5. **Billing** — Stripe + IAP + reverse trial [5d]
6. **Карта react-leaflet** — 44 great-circle линии, CityIndex [15d]

---

## 10. Ключевые файлы для изучения

1. `worklog.md` — полная история
2. `docs/analyst-implementation-guide.md` — 67 API routes, 27 Prisma моделей
3. `docs/product-designer-proposal.md` — продуктовое видение
4. `src/app/page.tsx` — shell, routing
5. `src/lib/astroos/data.ts` — mock data
6. `src/components/astroos/growth-ui.tsx` — 11 primitives + computeCityIndex
7. `astroos-github/` — reference production (32 API routes, react-leaflet карта)

---

**Документ подготовлен для Full-stack Analyst. Прототип работает на `http://localhost:3000`.**
