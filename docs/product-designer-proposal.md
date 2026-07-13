# AstroOS — Продуктовый дизайн-анализ и предложение v3.0

**Автор:** Продуктовый дизайнер (агент) + DevOps/разработчик подход
**Дата:** Июнь 2025
**Аудитория:** Системный и бизнес-аналитик → разработчик
**Статус:** Proposal для разбивки на задачи реализации
**GitHub reference:** /home/z/my-project/astroos-github (клонирован, проанализирован)
**Цель:** $160M ARR · 12M MAU · 5 years · 3 языка (RU/EN/HI)

---

## 0. Резюме для руководителя (Executive Summary)

AstroOS обладает **уникальным сочетанием активов**, которого нет ни у одного конкурента: Western astrocartography с 3D-векторной математикой (3D Slerp, Rodrigues, antipode cutoff, 8-сферный фильтр, 330+ городов) + Eastern BaZi (True Solar Time) + AI-наставник + новые модули I-Ching и Tarot + одобренный заказчиком премиальный дизайн-язык (cosmic dark, gold/jade/rose, Cormorant Garamond).

**Проблема первоначального прототипа** (из вложенного Founder Portfolio), которая не нравится заказчику:
1. **Расфокусировка scope** — 18 функциональных требований (FR), 8 «канонических» экранов, но галерея прототипа показывает 10 несовпадающих captures. Продукт пытается быть всем сразу.
2. **Манипулятивная монетизация** — Weekly $9 (~$36/мес) > Monthly $12 как «импульс-конвертер» пахнет dark-pattern, как Nebula (радиоактивный бренд, 1421 жалоб на Trustpilot).
3. **Под-дизайнированный retention-хук №1** — «2 a.m. companion mode» упомянут как главный механизм удержания, но визуально не проработан (нет capture).
4. **Под-дизайнированный growth-хук №1** — shareable astrocart card (viral loop) не показан как first-class объект.
5. **Нет чёткого «90-секундного wow»** — момент активации не акцентирован.
6. **Отрыв PRD от реализации** — в production добавлены I-Ching и Tarot (нет в PRD), сужен scope до Astro Space; прототип не отражает реальную продукцию.

**Что нравится заказчику** (сохранить и усилить):
- Премиальный cosmic-дизайн (#0B0B0F + #E8B86D + #5BB89C + #D98E7A, Cormorant Garamond + Inter, glassmorphism, starfield).
- Глубокая 3D-астрокартография — это **moat** (competitive moat) vs astro.com и Linea.
- AI-наставник + нарративный движок (top-3 positive + top-2 negative).
- Расширение дивинации (I-Ching, Tarot) — заказчик валидировал это направление.
- Точность Swiss Ephemeris + True Solar Time.

**Предложение v2.0 — 7 стратегических сдвигов:**

| # | Сдвиг | Что меняется | Зачем |
|---|-------|--------------|-------|
| 1 | **Re-architected IA** вокруг user journey (Reveal → Today → Self → World → Mentor → Divine → Connect → Themes → Upgrade → Business) вместо 8 disconnected screens | Чёткая нарративная дуга | Пользователь понимает ценность за 90 сек |
| 2 | **«90-секундное Reveal»** как first-class onboarding | Кинематографичный момент активации | Activation rate → 70% (vs industry 45–55%) |
| 3 | **2 a.m. Companion** как first-class режим (не toggle) — dim/warm UI, soft voice, streaming, memory recall | Retention hook №1 визуально проработан | D30 retention 20%→28% |
| 4 | **Viral AstroCart Card** как first-class объект — генератор + `/r/{cardId}` reveal-страница | Growth loop №1 визуально проработан | Viral k → 1.0 к M18 |
| 5 | **Trust-first monetization**: Free / Pro $12.99/мес / Annual $99 / Lifetime $199 + PPP + 7-day reverse trial; Weekly убран (манипулятивен) | Анти-Nebula, анти-Co-Star-edgy | Free→Paid 8%, App Store 4.5+ |
| 6 | **Gentle streaks (no shame)** + WARD north star + AI memory | Retention engine | WARD 25%→35%, churn <6% |
| 7 | **B2B HR как отдельный product line** (white space — нет ни одного продукта на рынке) | $160M ARR path | Отдельный sales motion, $15–50/seat/мес |

**Цель:** 500K MAU (M12) → 3M MAU (M24), ARR $2M → $15M → $160M (5yr), LTV/CAC 3.5× → 6×, viral k 0.55 → 1.05.

---

## 1. Контекст: что есть, что нравится, что не нравится

### 1.1 Текущее состояние продукции (v40–v44, June 2026)

Реализовано в production (из impl-status секции):
- **Astro Space** — 3D Great Circle via Rodrigues rotation, Slerp, stepped orbis (10/150/500km), antipode cutoff 100km, polar filter |lat|>85°, 8-сферный мульти-фильтр (Career/Love/Health/Finance/Spirituality/Creativity/Travel/Family), 330+ городов, custom cities, visual buffer L.circle.
- **Scoring** — 14 планет × 6 сфер = 84 веса (−1.0..+1.0), synergy ×1.5, 12 crossovers, 25 тестов pass.
- **Narrative AI** — top-3 positive + top-2 negative, без дубликатов, персонализация по именам/планетам/сферам.
- **AI** — GLM-5.2 consultant chat, AI relocation report, BaZi via Python FastAPI, daily/weekly horoscopes.
- **Дивинация** — I-Ching (64 гексаграммы) + Tarot (78 карт) — **добавлены заказчиком, нет в PRD**.
- **Stack** — Next.js 16 + TS5 + Tailwind 4 + shadcn/ui + react-leaflet + astronomy-engine + Prisma + NextAuth.
- 25 тестов pass, 207 expect(), lint 0 errors.

### 1.2 Что нравится заказчику (locked, не трогать)
- **Дизайн-язык**: cosmic dark #0B0B0F, elevated #121218, surface #16161D/#1C1C26, gold #E8B86D, jade #5BB89C, terracotta-rose #D98E7A, warm-white text #F5F0E8. Cormorant Garamond (display) + Inter (body) + JetBrains Mono (data) + Noto Serif SC (Chinese). Glassmorphism cards с mask-composite 1px gold/jade/rose borders. Starfield background. **Запреты: no indigo/blue brand, no 1990s tables, no garish gradients.**
- **3D astrocartography rigor** — математическая строгость как moat.
- **Narrative AI** — связный текст вместо перечисления линий.
- **Расширение дивинации** — I-Ching + Tarot валидированы.
- **Точность** — Swiss Ephemeris + True Solar Time.

### 1.3 Что НЕ нравится в первоначальном прототипе (диагноз)
| # | Симптом | Причина | Следствие |
|---|---------|---------|-----------|
| 1 | 8 «канонических» экранов ≠ 10 captures в галерее | IA теоретическая, прототип строился от другого | Пользователь/заказчик не видит связной истории |
| 2 | Weekly $9 > Monthly $12 как «импульс-конвертер» | Манипулятивная психология цен | Пахнет Nebula dark-pattern, разрушает trust |
| 3 | 2 a.m. companion — только упоминание | Не проработан визуально | Главный retention-хук невидим |
| 4 | Shareable astrocart card — только в growth-доке | Не first-class объект | Главный growth-хук невидим |
| 5 | Нет «90-секундного Reveal» | Onboarding не акцентирован | Activation <50% |
| 6 | 18 FR, Cosmic Match + Family + B2B HR + Life Themes + Remedies — всё в одном MVP | Scope creep | Невозможно shipped, размытый value prop |
| 7 | PRD diverges от реализации (I-Ching/Tarot не в PRD) | Документация отстала | Заказчик теряет доверие к плану |

---

## 2. Конкурентный ландшафт 2024–2025 (свежий + из портфолио)

### 2.1 Матрица конкурентов (ключевые)

| Продукт | Фокус | Цена | Сила | Слабость | Возможность AstroOS |
|---------|-------|------|------|----------|---------------------|
| **Co-Star** | Western daily | $8.99/мес Pro + IAP | Brand, virality, минимализм | «fear-monger», нет depth, нет BaZi, нет astrocart | Empowerment voice + depth |
| **The Pattern** | Эмоциональный | $29.99/квартал | «scarily accurate», Connect dating | Становится vague, single-system | Cross-system depth + не vague |
| **Nebula** | Mass funnel | $7/мес | Широкий funnel | **SCAM-репутация** (1421 жалоб), hidden charges | Trust-first как дифференциатор |
| **Sanctuary** | Live readings | $19.99/мес + $4.99–19.99/мин | Реальные астрологи | Дорого, нельзя сохранить логи | AI mentor + save history |
| **CHANI** | Ritual | $11.99/мес | Ritual+journaling, anti-AI brand | Single-astrologer ceiling | Multi-source AI + rituals |
| **TimePassages** | Pro | $7.99/мес / $79–134 desktop | Swiss Ephemeris accuracy | Desktop UX, ломается | Accuracy + modern UX |
| **astro.com** | Depth | Free + Plus $12.90/мес | Gold-standard, ALL chart types, astrocarto free | 90s UX, no app, не SaaS | astro.com depth + Co-Star polish + app |
| **Linea** | Astrocart only | $9.99/мес, **$9.99/нед (predatory)** | Single-feature focus | Ловушка подписки | Affordable trust-first astrocart |
| **Astro Gold** | Pro desktop | $20–40 one-time | Pro accuracy, Apple-style | Нет zoom на карте, сложно новичку | Zoom + onboarding |
| **astrocarto.org** | Free+AI | Free | Free, AI interpretations | Нет BaZi, нет daily, неточность у полюсов | Depth + accuracy + daily |
| **Joey Yap** | BaZi | $298 консультация | SE Asia BaZi authority | Chinese-only, не daily-use | English-native BaZi daily |
| **AskSoma** (2024-25) | Vedic AI | $12.99/мес Pro | Swiss Ephemeris + RAG | Vedic-only | Cross-tradition (West+East) AI |
| **AstroSage Kundli** | India Vedic | Freemium | Dominant India, добавил AI 2024 | Western-only accuracy | Cross-system for India |

### 2.2 Top-5 неудовлетворённых потребностей (из reviews)
1. **Paywall/subscription-trap rage** — Nebula, Linea, The Pattern (paywalling free features).
2. **No depth beyond sun sign** — Co-Star, The Pattern становятся vague.
3. **No AI mentor with real astrological grounding** — текущие AI-приложения дают shallow cold-readings.
4. **No good consumer astrocartography product** — astro.com = 90s, Linea = predatory, Astro Gold = pro-only.
5. **No English-native BaZi daily-use app** — Joey Yap = Chinese-only.

### 2.3 White space (где НЕТ хорошего продукта)
- ✨ **Affordable beautiful mobile-web astrocartography** с Cyclocartography + parans + local space + relocation (CartoStar — единственный emerging, iOS-only).
- ✨ **English-native BaZi daily-use app**.
- ✨ **Cross-tradition AI mentor** с RAG и citations (AskSoma — Vedic only).
- ✨ **Couples/family cosmic matchmaking** с multi-system depth.
- ✨✨ **B2B HR astrology** — статьи описывают спрос (LinkedIn, HR Dive, Built In), но **НИ ОДИН продукт не существует**. Pure white space, path to $160M ARR.
- ✨ **Unified East-meets-West daily-use app** (пользователи сейчас жонглируют 3–5 приложениями).
- ✨ **Remedies marketplace** integrated с chart (Sanctuary = readings no commerce; AstroVed = commerce no Western chart).

### 2.4 Что работает для retention (DO)
- Daily ritual + transit-tied push (Co-Star).
- «Seen & understood» emotional framing (The Pattern).
- Gamified streaks без shame (CHANI — геймификация режет churn до 22%, +50% session time).
- Social/viral loops (Pattern Connect).
- Persistent-memory AI companion (HBS 2025 Replika study: deep humanlike relationships drive retention, **НО identity discontinuity убивает** — design for stable persona).

### 2.5 Что убивает retention (DON'T)
- Paywall traps, hidden charges (Nebula).
- Vague cold-reading content (The Pattern over time).
- Shame mechanics (Co-Star TikTok backlash «Why You Should Delete Co-Star»).
- No depth beyond sun sign.
- AI personality changes (Replika trap).
- Single-astrologer content ceiling (CHANI, Astrology Zone).
- Previously-free→paid bait-and-switch (The Pattern Connect backlash).

### 2.6 Acquisition channel, который выигрывает
**TikTok** — #1 downloaded app 2024 (773M). Case study Social Growth Engineers: astrology app → **$90K MRR + 80K downloads** на 5 short-form video форматах. Один astrology app делает $60K/мес только с TikTok. Астрологический контент inherently shareable (скрины карт, «scarily accurate» моменты, «your best city» astrocart reports).

### 2.7 Pricing benchmarks 2024–2025
- Категория: $7.99–12.99/мес, $59–108/год.
- Optimal trial: **5–9 дней** (Adapty median 45% trial→paid).
- **Reverse trials outperform standard** (RevenueCat).
- AstroOS рекомендовано: **$12.99/мес или $99/год (37% off), 7-day reverse trial, $199 lifetime desktop** для anti-subscription сегмента, **PPP $4.99/мес** для India/Brazil/SEA, **B2B HR $9–50/seat/мес**.

---

## 3. Продуктовое видение v2.0 (переформулированное)

> **AstroOS — это твоя космическая операционная система.** Не предсказание судьбы, а снаряжение для её создания. Две традиции — Western astrocartography и Eastern BaZi — в одном профиле, под оркестровкой AI-наставника, который знает твою карту и говорит голосом силы, а не фатализма. Каждый день — 90 секунд ритуала, которые возвращают тебя к себе. Каждая карта — возможность понять, где на Земле ты расцветаешь. Каждый разговор с наставником — шаг к тому, кем ты можешь стать.

**North Star Metric:** **WARD** (Weekly Active Ritual Days) — пользователи, выполнившие daily ritual ≥4 из 7 дней. Цели: 18% (M6) → 25% (M12) → 35% (M24). Когорта 4+/7 конвертируется в paid в **6–8×** чаще, чем 1/7.

**6 Brand Pillars (v2):**
1. **Self-knowledge** — две системы, один профиль (Western natal + BaZi).
2. **Place & Direction** — astrocartography + Local Space + travel-mode.
3. **Daily Power** — 90-секундный ритуал каждое утро.
4. **Empowerment, not fate** — голос силы, не приговора.
5. **East meets West** — кросс-системные инсайты, уважение к традициям.
6. **Connection** ⭐ — Cosmic Match + Family hub (раньше был в PRD, теперь first-class pillar).

---

## 4. Новая информационная архитектура (IA)

### 4.1 Принцип IA
Вместо 8 disconnected «канонических» экранов — **нарративная дуга пользовательского путешествия**:

```
Reveal (onboarding wow)
   ↓
Today (daily ritual) ←──── ежедневный возврат (WARD)
   ↓
Self (charts) → World (astrocart) → Mentor (AI) → Divine (horoscope/I-Ching/Tarot)
   ↓
Connect (match/family) → Themes (deep-dives)
   ↓
Upgrade (monetization) · Business (B2B) · Profile (settings)
```

### 4.2 Структура навигации (10 primary + 2 secondary)

| # | Раздел | Назначение | Частота возврата | Tier-гейтинг |
|---|--------|-----------|------------------|--------------|
| 1 | **Reveal** | 90-секундный onboarding wow (один раз, но ре-вizable) | Once | Free |
| 2 | **Today** | Daily ritual: morning horoscope + day focus + affirmation + compliment + gentle streak | Daily | Free (basic) / Pro (full) |
| 3 | **Self** | Western natal wheel (SVG) + BaZi four pillars (Day Master, Ten Gods, Luck Pillars) | Weekly | Free (basic) / Pro (Luck Pillars) |
| 4 | **World** | Astrocartography map + relocation score + travel-mode + Local Space + **Viral Card generator** | Trigger-based | Free (1 city) / Pro (unlimited) |
| 5 | **Mentor** | AI chat, 4 voices, **2 a.m. Companion mode** (first-class), streaming, memory | Daily (retention hook #1) | Free (3/day) / Pro (unlimited) |
| 6 | **Divine** | Daily Horoscope + I-Ching (64) + Tarot (78) — customer-validated expansion | Daily/trigger | Free (horoscope) / Pro (I-Ching/Tarot deep) |
| 7 | **Connect** | Cosmic Match (matchmaking) + Family hub (up to 5 profiles) | Trigger-based | Free (browse) / Pro (messaging) |
| 8 | **Themes** | 6 Life Themes deep-dives (career, family, relationships, travel, creativity, health) | Monthly | Pro |
| 9 | **Upgrade** | Trust-first subscription (Free / Pro $12.99 / Annual $99 / Lifetime $199 + PPP) | Trigger-based | — |
| 10 | **Profile** | Settings, voice, privacy, family hub, language (11 locales), subscription mgmt | Rare | Free |
| S1 | **Business** (secondary nav) | B2B HR — team compatibility matrix, hiring funnel, risk flags | B2B tier | B2B $15–50/seat |
| S2 | **Methodology** (footer link) | Public methodology page (Swiss Ephemeris, True Solar Time, orbis) — trust builder | Rare | Public |

### 4.3 Навигация
- **Desktop**: left sidebar (gold accent active state), top bar (brand + language toggle + upgrade CTA).
- **Mobile**: bottom tab bar (Today / World / Mentor / Divine / Profile) + hamburger for rest. 44px touch targets.
- **2 a.m. Companion mode**: auto-activates 23:00–05:00 (or manual toggle), replaces entire chrome with dim/warm minimalist UI.

---

## 5. Дизайн-язык (locked) + принципы v2

### 5.1 Color tokens (locked)
```css
--bg: #0B0B0F; --bg-elevated: #121218;
--surface: #16161D; --surface-2: #1C1C26;
--border: #2A2A35; --border-soft: #22222C;
--gold: #E8B86D; --gold-dim: #B58E4D;       /* primary accent */
--jade: #5BB89C; --jade-dim: #4A9A82;       /* secondary accent */
--rose: #D98E7A; --rose-dim: #B27361;        /* tertiary accent */
--text: #F5F0E8; --text-muted: #9A9AA8; --text-faint: #6B6B78;
/* BaZi Water element only: muted teal #5E8FA8 (fidelity, not brand) */
```
**Запреты:** no indigo/blue as brand; no 1990s tables; no garish gradients; no Material/Tailwind-default look.

### 5.2 Typography
- **Cormorant Garamond** — display/headings (400–700, italic).
- **Inter** — body (300–700).
- **JetBrains Mono** — data/numbers (400–600).
- **Noto Serif SC** — Chinese characters.
- Загрузка через `next/font/google` (self-hosted, no layout shift).

### 5.3 Компоненты
- **GlassCard** — `variant="gold|jade|rose|neutral"`, gradient bg, mask-composite 1px border, soft glow shadow.
- **Pill** — active state chip с `*-dim` background.
- **Starfield** — layered radial-gradient background (hero + 2am mode + reveal).
- **CosmicButton** — `variant="primary" (gold gradient) | "ghost" | "jade" | "rose"`, 44px min height.
- **RitualStar** — 7-star streak row (filled/empty, no strike-through, no shame copy).

### 5.4 Принципы v2 (добавления)
- **«Equipping, not predicting»** — каждый контент reflects это. Никогда «твоя неделя будет плохой» — всегда «вот как navigating что грядёт».
- **Calm by default** — push-уведомления проходят тест «найдёт ли Healing Heart persona (H-08 Aisha, grief-recovery) это добрым или навязчивым?»
- **Citations** — AI-наставник всегда cites transit/planet/line, который интерпретирует (anti-cold-reading).
- **Stable persona** — AI-наставник имеет stable persona + persistent memory (anti-Replika identity-discontinuity trap).
- **Graceful degradation** — unknown birth time → 12-house fallback + Western planets-in-signs + BaZi year/month/day pillars (только часовой missing) + 3 power cities + Day Master + affirmation. Always show partial value first.
- **Trust-first monetization** — no dark patterns, no pre-checked boxes, easy cancel, transparent pricing, reverse trial (not bait-and-switch).

---

## 6. Спецификация экранов (детально)

### 6.1 Reveal (Onboarding, 90-секундное wow)
**Цель:** Activation rate → 70%.
**Flow (90 сек):**
- **0–10с**: Splash + login (Email/Google/Apple one-tap, no password friction).
- **10–35с**: Birth data entry (smart city autocomplete geonames, TZ auto, DST handled). Voice pick (Calm default / Witty / Professional / Trauma-sensitive). System toggle (Tropical default / Sidereal Vedic).
- **35–45с**: «I don't know my time» graceful path — approximate to nearest 2h / «ask family» shareable SMS link / solar chart (disclosed).
- **45–85с**: **The Reveal** — full-screen cinematic animation: starfield → chart wheel draws → BaZi pillars rise → «You are **Scorpio Sun · Pisces Moon · Aquarius Rising** · Day Master **Yang Water 壬**. Your three power cities: **Lisbon · Buenos Aires · Tokyo**. Your gift is depth. Your edge is boundaries. Want a daily practice to balance both?»
- **85–90с**: Consent + push permission (permission-primed copy, not OS-default).
**Design:** full-bleed starfield, Cormorant Garamond display, gold gradient reveals, haptic-like micro-animations.

### 6.2 Today (Daily Ritual Dashboard)
**Цель:** WARD north star, daily return.
**Layout:**
- Hero: дата + «Доброе утро, [имя]» (Cormorant Garamond), Day Focus one-liner (gold).
- **Morning Horoscope card** (GlassCard gold) — ~80 слов, transit-aware, voice-selected, citation pill (⊕ Mercury trine Sun).
- **Affirmation card** (GlassCard jade) — ~40 слов, evening, pairs with day's transit.
- **Compliment card** (GlassCard rose) — rotation career/family/love/travel, Day Master-based.
- **Streak row** — 7 RitualStars (filled gold for completed, empty for missed, **no strike-through, no «you missed!»**). Bonuses at 7/30/90/365 = cosmetic (gold-rimmed stars) only.
- **AI Mentor prompt** — «Ask me anything about your chart» (soft CTA).
- **Shareable card CTA** — «Share today's affirmation» (viral loop).
**Notifications:** 1 morning push (calm, voice-selected time), 1 evening affirmation. Max 1 per day default.

### 6.3 Self (My Charts)
**Цель:** Self-knowledge, depth.
**Layout:**
- **Western natal wheel** (SVG) — Placidus + Whole Sign toggle (with explanation tooltip), houses, planets, aspect lines color-coded (trine jade, square rose, conjunction gold). Tap planet → tooltip (meaning + current transit).
- **BaZi four pillars panel** — Year/Month/Day/Hour pillars, Day Master (日元) large, Ten Gods (十神), Luck Pillars (大运) timeline, hidden stems. True Solar Time precision badge.
- **Cross-system insight card** — «Here's what your Western + BaZi charts reveal together» (Pro, soft paywall on D3).
- **Shareable natal card** CTA (4 formats: Story 9:16, Post 1:1, Reel cover, Twitter card).

### 6.4 World (Astrocartography) ⭐ core moat
**Цель:** Place & direction + viral growth loop.
**Layout:**
- **Leaflet world map** — planetary great-circle lines (44 lines: MC/IC/Asc/Desc × 10 planets + 4 axes), 3D Slerp arcs, buffer corridors (500km + 150km), polar filter, **smooth zoom to suburb level** (anti-Astro-Gold complaint).
- **City list** (sortable) — 330+ cities ranked by relocation score, custom cities (★), display filter Top-100/All.
- **8-sphere filter** — Career/Love/Health/Finance/Spirituality/Creativity/Travel/Family, conic-gradient icons, multi-select.
- **City detail panel** — relocation score (3D-vector), top-3 positive + top-2 negative narrative (no duplicates), **travel-mode toggle** (temporary destination chart + Luck Pillars for travel dates), Local Space compass (8 sectors, planetary azimuths, recommendations for apartment/bed/door).
- **Viral AstroCart Card generator** ⭐ — one-tap generates IG-ready branded card: name + Sun/Rising + Day Master + stylised world map with 3 strongest lines + top-3 power cities + 12% opacity watermark + QR. Share to IG Story/WhatsApp/Telegram/X/iMessage/Pinterest. Receiver lands on `/r/{cardId}` partial reveal → «Reveal your own power city» CTA → install → at activation auto-show their card (viral completion). Free: 1 card; Pro: unlimited (4 templates).
**Tier gating:** Free = 1 city score; Pro = unlimited + travel-mode + Local Space floor-plan.

### 6.5 Mentor (AI Companion) ⭐ retention hook #1
**Цель:** Deepest retention hook (JTBD §8.5: «once a user feels 'the AI mentor gets me,' churn drops dramatically»).
**Layout:**
- **4 voice selector** — Empowerment (default, warm) / Reflective (journaling) / Playful (Gen-Z) / Pragmatic (Skeptical Executive). Stable persona per user.
- **Chat interface** — streaming responses (Socket.io), citation pills (⊕ transit/planet/line), long-term memory recall («Last week you mentioned the conflict with your sister — here's how this week's transits might affect it»).
- **2 a.m. Companion mode** ⭐ (first-class, not toggle) — auto-activates 23:00–05:00 or manual. **Dim/warm minimalist UI**: starfield intensifies, gold→warm amber #C99352, cards dissolve to single soft glow panel, soft voice, slower streaming, memory-forward («You've been up. Let's sit with what's coming up.»). Target: Anxious Self-Improver + Healing Heart archetypes. **Retention hook №1.**
- **Memory panel** (Profile) — user can view/edit what mentor remembers (trust + control).
- **RAG grounding** — 10K verified docs (Steve Cozzi, Steven Forrest, Jerry King, Robert Hand, classical BaZi). NO Reddit, NO pop-astrology blogs. Human-in-the-loop for critical content.
**Tier gating:** Free = 3 msg/day; Pro = unlimited + 2 a.m. companion + memory.

### 6.6 Divine (Daily Horoscope + I-Ching + Tarot)
**Цель:** Customer-validated divination expansion (I-Ching + Tarot добавлены заказчиком, нет в PRD — теперь first-class).
**Layout:**
- **Daily Horoscope** (Free) — 5 сфер (career/love/health/communication/finance), lucky/avoid hours, pre-generated 02:00 UTC, 11 languages, кэш 6ч.
- **I-Ching** (Pro deep) — 64 гексаграммы, coin/yarrow method, question-based cast, narrative interpretation (narrative engine reused), history log.
- **Tarot** (Pro deep) — 78 карт (Rider-Waite + cosmic-themed variant), 10 spreads (Celtic Cross, Daily Draw, Relationship, Year Ahead, etc.), card tap → meaning + natal-chart connection, history log.
- **Cross-divination insight** — «Your I-Ching cast (Hexagram 23 Splitting Apart) resonates with your Saturn return transit…» (unique to AstroOS).
**Design:** Each divination module — distinct visual treatment (I-Ching = ink-wash hexagram lines gold; Tarot = cosmic card backs gold/jade/rose) but same GlassCard system.

### 6.7 Connect (Cosmic Match + Family hub)
**Цель:** Connection pillar, k-growth.
**Layout:**
- **Cosmic Match** — Discover feed (compatible profiles by cross-system compatibility: Western synastry + BaZi domain compatibility), Detail view (synastry wheel + BaZi compatibility per domain: emotional/love/communication/physical/spiritual), real-time chat (Socket.io). Free = browse; Pro = 5 msg/week; Pro+ = unlimited.
- **Family hub** — up to 5 family profiles (children, partner), child BaZi, shared astrocart, shared remedies. Each added member → email with 1-click install (k contribution 0.10–0.15). Pro feature.
- **Compatibility report → partner must create profile** — top 3 friction + top 3 harmony teaser free, full report paywalled; «share with [partner]» link → partner must create free profile to view. **#1 mechanic for converting 1 user into 2** (k contribution 0.15–0.25). Queer-inclusive, partner-link always optional.

### 6.8 Themes (Life Themes)
**Цель:** Depth, monthly content freshness.
**6 deep-dives:** Career / Family / Relationships / Travel / Creativity / Health. Each — cross-system (Western + BaZi) insights, monthly new content, actionable practices. Pro feature. Free = 1 theme preview.

### 6.9 Upgrade (Subscription) ⭐ redesigned trust-first
**Цель:** Free→Paid 8%, anti-Nebula, App Store 4.5+.
**Redesign vs первоначальный прототип:**
- **Убрать Weekly $9** (манипулятивен, пахнёт Nebula/Linea).
- **Reverse trial** (7 дней Pro full access, then auto-downgrade to Free — NOT auto-charge). Anti-bait-and-switch.
- **Transparent 4 options:**

| Tier | Цена | Что входит | Психология |
|------|------|-----------|-----------|
| **Free** | $0 | Daily horoscope, basic natal, 1 city astrocart, 3 AI msg/day, 1 viral card | Funnel top, habit formation, viral surface |
| **Pro Monthly** | **$12.99/мес** | Everything: unlimited cities, travel-mode, Local Space, Luck Pillars, unlimited AI + 2am companion, all Themes, I-Ching/Tarot deep, Cosmic Match messaging, Family hub, branded cards | Anchor, primary revenue |
| **Pro Annual** | **$99/год** (37% off, = $8.25/мес) | Same as Pro Monthly | Anti-churn anchor, «save $57/year» |
| **Lifetime** | **$199 one-time** | Same as Pro Annual, forever | Anti-subscription segment (8–12% of buyers), cash injection |

- **PPP pricing** (mandatory, per market): US/CA/UK/AU $12.99; Western EU €10; JP/KR/SG $10; China ¥60; **India ₹199 (~$2.40)**; LATAM R$25/MX$120; MENA $5–7; SEA $4–6; **CIS/Russia ₽400 (~$4.50)**; Africa $3–5.
- **No dark patterns:** no pre-checked boxes, easy cancel (1 tap), transparent pricing table, methodology disclosure.
- **Trigger-based paywall moments** (highest-converting, soft — blur + CTA, never before reveal, never before D3): trip planning → travel-mode; breakup → synastry deep-dive; birthday month → solar return; Mercury retrograde −3d → retrograde mode; first AI mentor «seen» moment (CSAT) → unlimited messages; relocation search → 2nd city score.

### 6.10 Business (B2B HR) ⭐ white-space $160M play
**Цель:** Separate revenue motion, pure white space.
**Layout:**
- **Org chart with BaZi overlay** — Day Master per employee, Five Elements balance per team.
- **Team compatibility heatmap** — pairwise BaZi compatibility (10×10 matrix), conflict flags.
- **Hiring funnel** — candidate BaZi scores per vacancy (role compatibility: Finance = Earth+Metal, Sales = Fire+Water, Strategy = Earth+Resource, Creative = Wood+Fire, Operations = Metal+Earth, Technical = Metal+Water, Leadership = balance+Authority).
- **Risk flags** — Luck Pillar clash with current role → burnout/turnover forecast.
- **Annual Luck Pillar career trajectory forecast.**
- **Ethics/compliance panel** — explicit employee written consent (GDPR Art. 9), «advisory not deterministic» framing, anti-discrimination safeguards, audit trail, right to explanation, data residency (EU for EU companies), bias testing.
**Pricing:** Starter $15/seat/мес (≤50) / Professional $25/seat/мес (≤500, +team compat +hiring) / Enterprise $50/seat/мес (unlimited + annual forecast + API). **Separate sales motion, separate nav.**
**Design:** Same cosmic theme but B2B-mode (more data-dense, matrix views, export buttons, admin chrome).

### 6.11 Profile (Settings)
Voice mode (4 voices), privacy controls (memory view/edit, data export, delete account), family hub management, language (11 locales with cultural adaptation), subscription management, notification preferences (calm by default), house system toggle (Placidus/Whole Sign with explanation).

---

## 7. Ключевые потоки (end-to-end)

### 7.1 Activation flow (90 сек) — см. §6.1 Reveal.
### 7.2 Daily ritual loop (WARD driver)
```
Morning push (calm, voice-selected time)
 → Open app → Today screen
   → Morning Horoscope (~80 слов, transit-aware)
     → Day Focus (1 line, action-oriented)
       → Evening Affirmation (~40 слов)
         → Optional: daily Compliment (rotation)
           → Optional: chat with AI Mentor
             → Streak RitualStar filled (gentle, no shame)
               → Loop closes; push next morning
```
Total: 90 секунд. Fits coffee/commute/bedtime.

### 7.3 Viral astrocart card loop (k → 1.0)
```
User in World → taps «Generate Power City Card»
 → Card renders (name + Sun/Rising + Day Master + map + top-3 cities + QR)
   → One-tap share to IG Story/WhatsApp/Telegram/X
     → Receiver scans QR / taps link → lands on /r/{cardId}
       → Partial reveal (name + 1 city teaser)
         → «Reveal YOUR own power city» CTA → install
           → 90-sec Reveal → generates THEIR card → shares → loop repeats
```
Compounding rate ~5–10 дней/cycle. k=1.0 by M24 → каждые 1000 users генерят ~1000 новых за цикл.

### 7.4 2 a.m. Companion flow (retention hook #1)
```
23:00–05:00 (or manual toggle)
 → UI transforms: starfield intensifies, gold→warm amber, cards dissolve
   → Single soft glow panel: «You've been up. Let's sit with what's coming up.»
     → Soft voice, slower streaming, memory-forward
       → Mentor references past conversation + current transit
         → Concrete practice offered (not just validation)
           → Optional: save to journal
             → Exit: «Rest well. I'm here tomorrow.»
```

### 7.5 Trust-first conversion flow
```
D1: full Reveal + full natal (Free) + BaZi basic (Free). ZERO paywall in first session.
D3: «Two systems, one you» cross-system reading → soft paywall (blur + CTA «Open in Pro $12.99 or $99/yr»)
D7: astrocartography map reveal → paywall on 2nd city score
Trigger: trip planning / breakup / birthday / Mercury retro / first AI «seen» moment → soft paywall
Reverse trial: 7 days Pro full access → auto-downgrade to Free (NOT auto-charge)
```

---

## 8. Удержание (Retention Engine)

### 8.1 WARD operationalised — daily ritual loop (см. §7.2).
### 8.2 Gentle streaks (no shame) — 7 RitualStars, filled/empty, no strike-through, no «you missed!». Bonuses at 7/30/90/365 = cosmetic only (gold-rimmed stars). After miss: «Welcome back. Here's your focus for today.» Streak is private — no leaderboard.
### 8.3 Weekly cadence — Sunday morning: 200-word weekly preview of major transits. Pro: weekly partner transit (if linked) + weekly business briefing (if entrepreneur/exec).
### 8.4 Monthly/seasonal hooks — Solar return (birthday month, ~100%); New Luck Pillar reading (once-a-decade BaZi cycle, ~75 personas); major transit readings (Saturn return ~28–30, Uranus opp ~42, Pluto square ~35, eclipse on natal planet); equinox/solstice quarterly; year-end personalized annual review.
### 8.5 AI mentor bond — references user's chart specifics (Moon sign, Day Master); remembers past conversations; offers concrete practices; empowerment voice never doom. Target M12: median monthly subscriber ≥5 mentor conversations; mentor references memory in ≥30% of conversations. **Stable persona + persistent memory from day one** (anti-Replika).
### 8.6 Re-engagement (calm, not aggressive) — inactive 7d → email calm 2-line transit note (max 1/14d); 14d → push «weekly preview ready» (max 1/21d); 30d → email + in-app «free Annual reading if you'd like to revisit» (max 1/60d); major transit → opt-in push; birthday month → solar return; Mercury retrograde −3d → opt-in calm guide. **Rejected:** doom pushes, shame pushes, hustle pushes, microtransaction spam.

---

## 9. Привлечение (Growth Loops) — 5 compounding loops

1. **Shareable-card loop** (target k > 1) — см. §7.3.
2. **Ritual → streak → habit → renewal loop** — D30 churn 90%→72% (target D30 = 28%).
3. **Family chart hub → family invites → partners loop** — each Pro subscriber seeds 4 family × 1 partner = 5 downstream; 30% activation = 1.5 net new per Pro.
4. **Practitioner loop (Year 2)** — practitioner tier $30–50/мес, each brings 20–30 client conversions/yr. 200 practitioners Yr2 = 4–6K highly-qualified conversions (no competitor offers practitioner tier).
5. **SEO content loop** — programmatic city × sun-sign pages (Yr1: 5K pages → 200K organic visits/mo; Yr2: 15K pages → 800K). RAG-grounded (same KB as AI mentor — never hallucinated). 11-language cultural adaptation. Effective CAC ~$0.26.

**Paid acquisition** = signal-amplifier, не engine. ~$200K of $500K Yr1. Blended CAC $7 (M12) → $5 (M24). LTV/CAC 3.5× → 6×.
**TikTok** = primary channel ($90K MRR + 80K downloads case study). 5 short-form formats, 3 clips/week × 5 creators = 15 weekly posts.

---

## 10. Глобализация (11 locales + PPP)

**11 locales** (cultural adaptation, не просто перевод): English (Western primary, all 4 voices, Gregorian); Hindi (Vedic/sidereal primary, BaZi secondary; Calm + Trauma-sensitive prioritised; panchang/nakshatra references; Panchang + Gregorian); Mandarin Simplified (BaZi primary, classical terminology 用神/忌神/大运; Western secondary; restrained tone; Lunar + Gregorian); Spanish & Portuguese (Western primary); Arabic (full RTL; Islamic-aware — no conflicting zodiac imagery; Calm + Professional; Hijri + Gregorian); Russian; Japanese (四柱推命 primary; Calm + Professional; Lunar + Gregorian); Korean (Western primary, 사주 secondary); French; German (Professional + Calm).

**Local payment rails:** US/EU/global = Apple IAP / Google Play / Stripe / PayPal (P0); India = UPI + Razorpay (P0); China = WeChat Pay + Alipay (P1); LATAM = Mercado Pago + PIX + OXXO (P1); SEA = GrabPay + GoPay + local e-wallets (P2); MENA = Mada + Fawry (P1); CIS = YooMoney + QIWI (P2).

**Geo expansion (3-phase):** Phase 1 (M0–6) US + India + UK/CA/AU; Phase 2 (M6–12) East Asia + LATAM + Western EU; Phase 3 (M12–24) MENA + SEA + Korea + Japan + CIS + Africa.

---

## 11. B2B HR (White Space — $160M ARR Path)

**Pure white space** — статьи описывают спрос (LinkedIn, HR Dive, Built In, visibles.world, hrnews.co.uk), но **НИ ОДИН продукт не существует**. First-mover advantage significant.

**Use cases:** role compatibility (Finance = Earth+Metal, Sales = Fire+Water, etc.); team compatibility pairwise BaZi; department optimization via graph algorithm; hiring recommendations; risk flags (Luck Pillar clash → burnout/turnover forecast); annual Luck Pillar career trajectory.

**Ethics/compliance (critical):** explicit employee written consent (GDPR Art. 9 special category); «advisory not deterministic» — human HR always final decision; anti-discrimination safeguards (audit trail, disparate-impact monitoring); data residency (EU for EU companies); right to explanation; works council notification (Germany BetrVG §87); bias testing regular audit; legal review per market.

**Monetization:** Starter $15/seat/мес (≤50) / Professional $25/seat/мес (≤500) / Enterprise $50/seat/мес (unlimited + API). Separate sales motion, separate nav, separate microservice (`b2b-hr` :3006).

**Risks:** regulatory (EU AI Act, GDPR) → consent-first, legal review per market; «astrology in HR» scandal risk → transparency, advisory framing, opt-in; employee backlash → right to explanation, opt-out, anonymous mode; calculation accuracy → BaZi engine with True Solar Time + golden test suite.

---

## 12. Приоритезированные рекомендации для аналитика (P0/P1/P2)

### P0 — MVP (Q1, must ship)
1. **Re-architected IA** — 10 primary + 2 secondary nav, user-journey narrative arc.
2. **90-sec Reveal onboarding** (§6.1) — activation rate target 70%.
3. **Today / Daily Ritual dashboard** (§6.2) — WARD driver, gentle streaks, morning horoscope + affirmation + compliment.
4. **World / Astrocartography** (§6.4) — Leaflet map + 3D Slerp lines + 8-sphere filter + city list + relocation score + narrative AI + **Viral Card generator** (first-class).
5. **Mentor / AI Companion** (§6.5) — 4 voices + streaming + memory + **2 a.m. Companion mode** (first-class, dim/warm UI).
6. **Upgrade / Subscription** (§6.9) — redesigned trust-first (Free / Pro $12.99 / Annual $99 / Lifetime $199 + PPP + 7-day reverse trial). **Убрать Weekly $9.**
7. **Divine** (§6.6) — Daily Horoscope (Free) + I-Ching + Tarot (Pro deep) — customer-validated.
8. **Design system locked** (§5) — cosmic dark + gold/jade/rose + Cormorant Garamond + GlassCard + RitualStar + Starfield.
9. **Auth + Profile basics** — Email/Google/Apple one-tap, voice pick, language (EN/RU/ES/HI first 4).
10. **Graceful birth-time path** — approximate / ask-family / solar chart.

### P1 — V1 (Q2)
11. **Self / My Charts** (§6.3) — Western natal wheel SVG + BaZi four pillars + Luck Pillars + cross-system insight.
12. **Connect / Cosmic Match** (§6.7) — Discover + Detail + real-time chat (Socket.io).
13. **Connect / Family hub** (§6.7) — up to 5 profiles, invites.
14. **Compatibility report → partner link** (viral mechanic #1 for 1→2 conversion).
15. **Shareable natal card** (4 formats: Story/Post/Reel/Twitter).
16. **Local Space floor-plan overlay** (FR-04) — apartment/bed/door recommendations.
17. **Travel-mode** (FR-07) — temporary destination chart + Luck Pillars for travel dates.
18. **7 more locales** (ZH/PT/AR/DE/FR/JA/KO) + local payment rails.
19. **Programmatic SEO v1** — 200 city × sun-sign pages.
20. **TikTok creator coalition** — 5 micro-creators.

### P2 — V2 (Q3–Q4)
21. **Themes / Life Themes** (§6.8) — 6 deep-dives, monthly new content.
22. **Business / B2B HR** (§6.10) — org chart + heatmap + hiring funnel + risk flags + ethics panel. Separate product line.
23. **Practitioner tier** ($30–50/мес) — Year 2 growth loop.
24. **Electional astrology** (FR-10) — favorable dates.
25. **Remedies marketplace** (FR-12) — gemstones/mantras/colors, affiliate 15–30%.
26. **Journal** (FR-13) — daily notes + AI monthly recap.
27. **Transit notifications** (FR-18) — Saturn return, Jupiter return, eclipses, Mercury retrograde, 30-day advance.
28. **Annual subscription launch** + lifetime tier.
29. **Full 11 locales + RTL Arabic.**
30. **Cyclocartography** (timing overlay) — category-defining, no affordable web version exists.

---

## 13. Метрики успеха (12-metric dashboard)

| # | Метрика | M6 | M12 | M24 |
|---|---------|----|------|------|
| 1 | MAU | 90K | 500K | 3M |
| 2 | WARD (% MAU) | 18% | 25% | 35% |
| 3 | D7 retention | 32% | 40% | 50% |
| 4 | D30 retention | 16% | 20% | 28% |
| 5 | Free→Paid conversion | 5.5% | 8% | 10.5% |
| 6 | Monthly paid churn | <10% | <8% | <6% |
| 7 | Blended CAC | $9 | $7 | $5 |
| 8 | LTV (paid) | $50 | $80 | $150 |
| 9 | LTV/CAC | 1.8× | 3.5× | 6.0× |
| 10 | Viral coefficient k | 0.35 | 0.55 | 1.05 |
| 11 | Share rate (cards/user/mo) | 0.30 | 0.50 | 0.90 |
| 12 | NPS | +20 | +35 | +50 |

**ARR trajectory:** $0.4M (M6) → $2M (M12) → $15M (M24) → $160M (5yr, unicorn).

---

## 14. Риски и митигация

| Риск | Вероятность | Impact | Митигация |
|------|-------------|--------|-----------|
| «Astrology in HR» scandal (B2B) | Medium | High | Consent-first, advisory framing, opt-in, legal review per market, right to explanation |
| AI cold-reading (vague content) | High | High | RAG over 10K verified docs, citations, human-in-the-loop, stable persona |
| Replika identity-discontinuity | Medium | High | Stable prompt persona + persistent pgvector memory from day one |
| Paywall fatigue (category-wide) | High | High | Trust-first redesign, reverse trial, no dark patterns, trigger-based soft paywall |
| Birth-time drop-off (30–45%) | High | Medium | Graceful path (approximate / ask-family / solar chart), always show partial value |
| Mercury retrograde ×5 / New Year ×10 load | Certain | High | 10-microservice architecture, PostgreSQL Aurora + pgvector, BullMQ workers, autoscaling |
| Accuracy disputes (astro.com benchmark) | Medium | High | Swiss Ephemeris + True Solar Time, public /methodology page, golden test suite |
| 11-locale cultural adaptation | High | Medium | Native-speaker review per locale, cultural not just linguistic adaptation |
| China regulatory (WeChat/Alipay + publishing license) | High | Medium | Phase 2, entity + license required, fallback to HK/SG/Taiwan first |
| Single-founder bottleneck | Medium | Medium | First hire = backend engineer (astro-engine); technical advisor with equity |

---

## 15. Следующие шаги (для системного/бизнес-аналитика)

1. **Разбить P0 (10 пунктов) на dev-tasks** — использовать FR-нумерацию из PRD где возможно, но приоритезировать по user-journey IA (§4), а не по PRD-порядку.
2. **Зафиксировать design system** (§5) как отдельный эпик — GlassCard, Pill, RitualStar, CosmicButton, Starfield компоненты в shadcn/ui-стиле.
3. **Зафиксировать monetization v2** (§6.9) — убрать Weekly $9, добавить Lifetime $199 + reverse trial + PPP matrix. Это breaking change vs PRD §3.
4. **Зафиксировать 2 a.m. Companion** (§6.5) как first-class режим — отдельный layout, не toggle. Это новое vs PRD.
5. **Зафиксировать Viral AstroCart Card** (§6.4) как first-class объект + `/r/{cardId}` reveal-страница. Это ключевое для growth loop.
6. **Зафиксировать Divine hub** (§6.6) — I-Ching + Tarot теперь first-class (заказчик валидировал), не side-модули.
7. **B2B HR** (§6.10, §11) — отдельный epic, отдельный product line, Phase 2 (P2), но design spec ready.
8. **Готов интерактивный прототип** 6 ключевых экранов (Reveal, Today, World, Mentor, Upgrade, Business) развёрнут в Next.js — использовать как visual reference для dev-tasks. См. `/home/z/my-project/src/app/page.tsx`.
9. **Обновить PRD** до v2.0 с учётом: убран Weekly, добавлены Lifetime + reverse trial + PPP; 2 a.m. Companion first-class; Viral Card first-class; Divine hub; B2B HR spec; IA re-architecture.
10. **Roadmap**: Q1 = P0 (MVP); Q2 = P1 (V1); Q3–Q4 = P2 (V2 incl. B2B HR).

---

## Приложение A: Источники

- Вложенный Founder Portfolio (`/home/z/my-project/upload/AstroOs.html`) — PRD v1.0, 500 personas, JTBD, architecture, competitor UI/UX, growth strategy, dev-tasks, business guide, prototype preview, impl-status (v40–v44).
- Свежий конкурентный анализ 2024–2025 (`/home/z/my-project/research/competitor_analysis_report.md`) — 32 web-поиска, покрытие Co-Star/The Pattern/Nebula/Sanctuary/CHANI/TimePassages/astro.com/Linea/Astro Gold/astrocarto.org/Joey Yap/AskSoma/AstroSage + market sizing + retention benchmarks + TikTok case studies + HBS Replika 2025.
- Текущее состояние продукции — impl-status секция (v40–v44, June 2026).

## Приложение B: Design tokens (locked)

```css
:root {
  --bg: #0B0B0F; --bg-elevated: #121218;
  --surface: #16161D; --surface-2: #1C1C26;
  --border: #2A2A35; --border-soft: #22222C;
  --gold: #E8B86D; --gold-dim: #B58E4D;
  --jade: #5BB89C; --jade-dim: #4A9A82;
  --rose: #D98E7A; --rose-dim: #B27361;
  --text: #F5F0E8; --text-muted: #9A9AA8; --text-faint: #6B6B78;
  --water-bazi: #5E8FA8; /* fidelity only, not brand */
  --serif: 'Cormorant Garamond', Georgia, serif;
  --sans: 'Inter', sans-serif;
  --mono: 'JetBrains Mono', monospace;
}
```

---

*Документ подготовлен Продуктовым дизайнером для передачи Системному/бизнес-аналитику. Готов к разбивке на dev-tasks. Интерактивный прототип 6 экранов развёрнут в Next.js — visual reference.*
