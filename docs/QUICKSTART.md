# AstroOS — Quick Start для Full-stack Analyst

> **Прочитай это первым.** Полная документация — в `docs/fullstack-analyst-handover.md`.

## Что это
AstroOS — космическая астрологическая SaaS. Цель: $160M ARR / 12M MAU / 5 лет. **17 экранов** high-fidelity прототипа на Next.js 16 + TypeScript + Tailwind 4. **Прототип, не production** — все данные mock.

## Запуск за 3 команды
```bash
bun install
bun run db:push
bun run dev        # старт dev-сервера на :3000
```
Проверка: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000` → **200**

Открой в браузере: `http://localhost:3000`

## Lint
```bash
bun run lint       # 0 errors, 0 warnings
```

## Что посмотреть первым делом (в этом порядке)
1. **`worklog.md`** (~1356 строк) — вся история разработки от v1 до v4.0
2. **`docs/PROMPT-FOR-FULLSTACK-DEV.md`** — промт для разработчика с Clean Architecture, Hades 2, Git
3. **`docs/analyst-implementation-guide.md`** (1636 строк) — 67 API routes, 27 Prisma моделей, P0/P1/P2 backlog
4. **`docs/product-designer-proposal.md`** — продуктовое видение, конкуренты, метрики

## Архитектура (кратко)
- **Next.js 16** App Router, single route `/`, client-side навигация через `useState<ScreenKey>`
- **17 экранов** в `src/components/astroos/screens/` (~6233 строки)
- **Mock data** в `src/lib/astroos/data.ts` (618 строк) — USER hardcoded как Aeliana
- **i18n** RU/EN/HI в `src/lib/astroos/i18n.ts` (660 ключей × 3)
- **Growth primitives** в `src/components/astroos/growth-ui.tsx` (11 компонентов + computeCityIndex)
- **Cosmic theme** в `src/app/globals.css` (#0B0B0F + #E8B86D + #5BB89C + #D98E7A)

## Дизайн-язык (НЕ нарушать)
- **Палитра:** cosmic dark `#0B0B0F` + gold `#E8B86D` + jade `#5BB89C` + rose `#D98E7A` + cream `#F5F0E8`
- **Шрифты:** Cormorant Garamond (display) + Inter (body) + JetBrains Mono (numbers)
- **ЗАПРЕЩЕНО:** indigo, blue, 1990s tables, fear-mongering, dark patterns
- **Brand promise:** "No fear-mongering. No paywall traps. Just your chart, explained."

## Onboarding flow (first-visit)
```
Welcome → Auth (1-tap) → BirthData → Reveal (90-sec) → Today (first ritual)
```
Returning user → Today. Tour на Today в первый визит (3 шага).

## Top-6 P0 для production (подробно в analyst-implementation-guide.md §9)
1. **Auth** — NextAuth.js + Google OAuth + httpOnly session [3d]
2. **Birth-data → /api/calculate** — astronomy-engine, 44 AstroLine[], CalculationCache [10d]
3. **/api/bazi/calculate** — Python service + TS fallback [5d]
4. **AI mentor /api/ai/chat** — z-ai-web-dev-sdk + RAG + persistent memory [7d]
5. **Billing** — Stripe + Apple/Google IAP + 7-day reverse trial [5d]
6. **Карта react-leaflet** — 44 great-circle линии, CityIndex production-ize [15d]

## Что РЕАЛЬНО работает в прототипе
- ✅ 17 экранов, навигация, i18n (RU/EN/HI)
- ✅ Onboarding flow (Welcome→Auth→Birth→Reveal→Today)
- ✅ localStorage (themes progress, tour seen, first-visit)
- ✅ Clipboard + Web Speech API (voice preview)
- ✅ Social share (WhatsApp/Telegram/X/Email)
- ✅ 11 growth primitives (SoftPaywall, SocialProof, TourSpotlight, InfoTip, ...)

## Что MOCK (нужно build)
- ❌ Auth (hardcoded Aeliana)
- ❌ Chart calculation (astronomy-engine, 44 линии)
- ❌ Карта react-leaflet (сейчас SVG)
- ❌ BaZi (Python service)
- ❌ AI mentor (ZAI SDK + RAG)
- ❌ Billing (Stripe/IAP)
- ❌ Notifications (WebSocket)

## Ключевые метрики
- **North Star:** WARD (Weekly Active Ritual Days ≥4/7) — 25% (Y1) → 42% (Y5)
- **MAU:** 500K (Y1) → 12M (Y5)
- **ARR:** $2M (Y1) → $160M (Y5)
- **Viral k:** 0.55 (Y1) → 1.40 (Y5)

## Pricing (locked)
- Free — habit + viral
- Pro Monthly $12.99/mo
- Pro Annual $99/yr (**"Most popular"**)
- Lifetime $199
- 7-day reverse trial
- B2B HR $9/seat/mo

## Git
```bash
git init
git remote add origin https://github.com/Nevelim/astroOS-2.0.git
git add -A
git commit -m "chore: initial prototype v4.0"
git push -u origin main
```

## Частые проблемы
- **500 error?** Проверь `tail dev.log` — скорее всего потерян файл (было с local-space.tsx)
- **Lint error?** Проверь french quotes «» как внешние кавычки строк — замени на `"..."`
- **Tour не продвигается?** Sticky CTA + scrollIntoView — нужен double-measure (RAF + setTimeout 280ms), уже фикс в growth-ui.tsx

---

**Вопросы?** Читай `worklog.md` — там вся история. Прототип работает на `http://localhost:3000`.
