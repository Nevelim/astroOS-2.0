"use client";

import { useMemo, useState } from "react";
import {
  GlassCard, Pill, CosmicButton, SectionHeading, FadeIn,
} from "../ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { CITIES, SPHERES, ORBIS_ZONES, USER } from "@/lib/astroos/data";
import type { ScreenKey } from "@/lib/astroos/data";
import { motion, AnimatePresence } from "framer-motion";
import {
  SoftPaywall, SocialProof, SandwichPosition, UpsellNudge, InfoTip,
  computeCityIndex,
} from "../growth-ui";

/* ===========================================================================
 * World screen — AstroOS v3.2 redesign (Task 10-a)
 *
 * Layers in the city "SERP":
 *  1. CityIndex multi-factor ranking (M × V) / (1 + K_irr) — default sort
 *  2. Sandwich rule top-3 (anchor / editor's pick / most chosen) + explainer
 *  3. Free-tier soft paywall on 2nd city / 2nd Power Card / travel-mode
 *  4. Social proof (live) on list header, position-3, and viral card
 *
 * Demoted (K_irr ≥ 0.75) cities are surfaced in a separate "Worth
 * considering" section with a jade caution pill — never buried.
 * =========================================================================== */

type City = typeof CITIES[number];

// Aeliana = Scorpio Sun / Pisces Moon → priority spheres: love + spirit.
function personaSphereFit(sphere: City["sphere"]): number {
  if (sphere === "love" || sphere === "spirit") return 1;
  if (sphere === "family" || sphere === "health") return 0.7;
  return 0.4;
}

type RankedCity = {
  city: City;
  fit: number;
  index: number;
  M: number;
  V: number;
  K_irr: number;
  demoted: boolean;
  rank: number; // 1-based within main list; 0 if demoted
};

type PaywallState = { trigger: string; title: string; copy: string } | null;

export function WorldScreen({ onNavigate }: { onNavigate?: (k: ScreenKey) => void } = {}) {
  const { t, locale } = useI18n();

  // ── Free-tier demo toggle (flip to false to test Pro flow) ──────────────
  const isFree = true;

  const [activeSpheres, setActiveSpheres] = useState<string[]>(["love", "career"]);
  const [selectedCity, setSelectedCity] = useState<City>(CITIES[0]);
  const [showCard, setShowCard] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["Lisbon"]));
  const [sortBy, setSortBy] = useState<"smart" | "score" | "qol" | "income">("smart");

  // Free-tier gating state
  const [viewedCities, setViewedCities] = useState<Set<string>>(new Set([CITIES[0].name]));
  const [freeCardGens, setFreeCardGens] = useState(0);
  const [paywall, setPaywall] = useState<PaywallState>(null);

  // ── CityIndex ranking (static; rank stable across sorts) ────────────────
  const ranked: RankedCity[] = useMemo(() => {
    const computed = CITIES.map((c) => {
      const fit = personaSphereFit(c.sphere);
      const r = computeCityIndex(c, fit);
      return { city: c, fit, ...r, rank: 0 };
    });
    const sorted = [...computed].sort((a, b) => b.index - a.index);
    // Assign ranks via reduce to avoid variable reassignment inside useMemo.
    const { result } = sorted.reduce(
      (acc, r) => {
        if (!r.demoted) {
          acc.rank += 1;
          acc.result.push({ ...r, rank: acc.rank });
        } else {
          acc.result.push(r);
        }
        return acc;
      },
      { rank: 0, result: [] as typeof sorted },
    );
    return result;
  }, []);

  const rankByCity = useMemo(() => {
    const m = new Map<string, RankedCity>();
    ranked.forEach((r) => m.set(r.city.name, r));
    return m;
  }, [ranked]);

  const mainRanked = useMemo(() => ranked.filter((r) => !r.demoted), [ranked]);
  const demotedRanked = useMemo(() => ranked.filter((r) => r.demoted), [ranked]);

  const { filteredMain, filteredDemoted } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matches = (c: City) =>
      !q || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
    const sortFn = (a: RankedCity, b: RankedCity) => {
      if (sortBy === "smart") return b.index - a.index;
      if (sortBy === "score") return b.city.score - a.city.score;
      if (sortBy === "qol") return b.city.qol - a.city.qol;
      return b.city.income - a.city.income;
    };
    return {
      filteredMain: mainRanked.filter((r) => matches(r.city)).sort(sortFn),
      filteredDemoted: demotedRanked.filter((r) => matches(r.city)).sort(sortFn),
    };
  }, [mainRanked, demotedRanked, searchQuery, sortBy]);

  const toggleSphere = (k: string) =>
    setActiveSpheres((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const toggleFavorite = (name: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); } else { next.add(name); }
      return next;
    });

  // ── Paywall handlers (3 Free-tier triggers) ─────────────────────────────
  const handleCityClick = (city: City) => {
    if (
      isFree &&
      city.name !== selectedCity.name &&
      !viewedCities.has(city.name) &&
      viewedCities.size >= 1
    ) {
      // Let them peek (selectedCity updates) but gate with SoftPaywall overlay
      setSelectedCity(city);
      setPaywall({
        trigger: "2nd city",
        title:
          locale === "ru" ? "Откройте все 331 города"
          : locale === "hi" ? "सभी 331 शहर अनलॉक करें"
          : "Unlock all 331 cities",
        copy:
          locale === "ru"
            ? "Вы использовали свой бесплатный город. Pro открывает каждый город, travel-mode и безлимитные Power Cards."
            : locale === "hi"
            ? "आपने अपना मुफ्त शहर उपयोग कर लिया। Pro हर शहर, travel-mode और असीमित Power Cards अनलॉक करता है।"
            : "You've used your free city score. Pro unlocks every city, travel-mode, and unlimited Power Cards.",
      });
      return;
    }
    setSelectedCity(city);
    setViewedCities((prev) => new Set(prev).add(city.name));
  };

  const handleCardGenerate = () => {
    if (isFree && freeCardGens >= 1) {
      setPaywall({
        trigger: "2nd Power Card",
        title:
          locale === "ru" ? "Безлимитные Power Cards"
          : locale === "hi" ? "असीमित Power Cards"
          : "Unlimited Power Cards",
        copy:
          locale === "ru"
            ? "Бесплатный план — 1 Power Card. Pro — безлимитные карты, 4 шаблона, кастомный брендинг."
            : locale === "hi"
            ? "मुफ्त योजना — 1 Power Card। Pro — असीमित कार्ड, 4 टेम्पलेट, कस्टम ब्रांडिंग।"
            : "Free plan includes 1 Power Card. Pro unlocks unlimited cards, 4 templates, and custom branding.",
      });
      return;
    }
    setFreeCardGens((n) => n + 1);
    setShowCard(true);
  };

  const handleTravelMode = () => {
    if (isFree) {
      setPaywall({
        trigger: "travel-mode",
        title:
          locale === "ru" ? "Travel-mode — функция Pro"
          : locale === "hi" ? "Travel-mode — Pro फ़ीचर"
          : "Travel-mode · a Pro feature",
        copy:
          locale === "ru"
            ? "Travel-mode показывает, как линии смещаются при переезде. Pro открывает всю карту и 331 город."
            : locale === "hi"
            ? "Travel-mode दिखाता है कि पुनर्स्थापना पर रेखाएँ कैसे बदलती हैं। Pro पूरा नक्शा और 331 शहर खोलता है।"
            : "Travel-mode shows how lines shift when you relocate. Pro unlocks the full map and all 331 cities.",
      });
      return;
    }
    // Pro toggle behaviour is out of scope for the free-tier demo.
  };

  const dismissPaywall = () => {
    setPaywall(null);
    // Revert selection to the first free-viewed city so the panel stays useful
    const firstViewed = Array.from(viewedCities)[0];
    const revert = CITIES.find((c) => c.name === firstViewed);
    if (revert && revert.name !== selectedCity.name) setSelectedCity(revert);
  };

  const upgradeCta = () => {
    setPaywall(null);
    onNavigate?.("upgrade");
  };

  // ── Localized literals (new copy — inline locale-conditional) ───────────
  const smartLabel = locale === "ru" ? "Смарт-рейтинг" : locale === "hi" ? "स्मार्ट रैंक" : "Smart rank";
  const scoreLabel = locale === "ru" ? "Оценка" : locale === "hi" ? "स्कोर" : "Score";
  const incomeLabel = locale === "ru" ? "Доход" : locale === "hi" ? "आय" : "Income";
  const worthLabel = locale === "ru" ? "Стоит рассмотреть" : locale === "hi" ? "विचार करने योग्य" : "Worth considering";
  const cautionLabel =
    locale === "ru" ? "Слабая карта — изучайте осторожно"
    : locale === "hi" ? "कमजोर चार्ट — सावधानी से"
    : "Weak chart — explore with care";
  const freePlanLabel = locale === "ru" ? "Бесплатный план" : locale === "hi" ? "मुफ्त योजना" : "Free plan";
  const explainerText =
    locale === "ru"
      ? "Ранжировано по вашему CityIndex — астро-совместимость × удобство жизни × скорость. Слабые карты мы понижаем, но не прячем."
      : locale === "hi"
      ? "आपके CityIndex द्वारा रैंक किया गया — ज्योतिष-फ़िट × रहन-सहन × गति। कमजोर चार्ट को हम दबाते नहीं, अलग रखते हैं।"
      : "Ranked by your CityIndex — astro fit × livability × velocity. We demote weak-chart cities, never bury them.";
  const topProofAction =
    locale === "ru" ? "искателей изучили свою карту на этой неделе"
    : locale === "hi" ? "साधकों ने इस सप्ताह अपनी कुंडली देखी"
    : "seekers explored their chart this week";
  const cardSharedAction =
    locale === "ru" ? "Power Cards сегодня"
    : locale === "hi" ? "Power Cards आज साझा किए गए"
    : "Power Cards shared today";
  const unlockReportLabel =
    locale === "ru" ? "Открыть полный отчёт"
    : locale === "hi" ? "पूरी रिपोर्ट अनलॉक करें"
    : "Unlock full report";
  const unlockReportCopy =
    locale === "ru"
      ? "Полный отчёт по этому городу — 44 линии, BaZi, локальное пространство."
      : locale === "hi"
      ? "इस शहर की पूरी रिपोर्ट — 44 रेखाएँ, BaZi, स्थानीय अंतरिक्ष।"
      : "Get the full report for this city — 44 lines, BaZi, local space.";
  const openCta = locale === "ru" ? "Открыть" : locale === "hi" ? "खोलें" : "Open";
  const freeNote =
    locale === "ru" ? "Pro открывает 331 город и travel-mode"
    : locale === "hi" ? "Pro 331 शहर और travel-mode खोलता है"
    : "Pro unlocks 331 cities and travel-mode";
  const noResultsLabel =
    locale === "ru" ? "Ничего не найдено"
    : locale === "hi" ? "कुछ नहीं मिला"
    : "No results found";

  return (
    <div className="space-y-10">
      <FadeIn>
        <SectionHeading
          eyebrow={t("world.eyebrow")}
          title={t("world.title")}
          subtitle={t("world.subtitle")}
        />
        {isFree && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pill tone="muted">⌬ {freePlanLabel}</Pill>
            <span className="text-[11px] text-[#8A8A96]">·</span>
            <SocialProof count={12847} action={topProofAction} tone="jade" live />
          </div>
        )}
      </FadeIn>

      {/* Orbis zones legend */}
      <FadeIn delay={0.05}>
        <GlassCard>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#8A8A96]">
              Orbis zones
              <InfoTip label={locale === "ru" ? "Orbis zones (орбисы)" : locale === "hi" ? "Orbis zones" : "Orbis zones"} tone="jade" side="bottom">
                {locale === "ru"
                  ? "Orbis — расстояние от планетарной линии, в пределах которого линия ещё влияет. ≤111км = прямое попадание (×1.0), ≤222км = сильная зона (×0.7), ≤444км = зона затухания (×0.3). Чем ближе — тем сильнее."
                  : locale === "hi"
                  ? "Orbis — ग्रह रेखा से दूरी जिसके भीतर रेखा अभी प्रभाव डालती है। ≤111किमी = प्रत्यक्ष, ≤222किमी = मजबूत, ≤444किमी = मंद।"
                  : "Orbis — the distance from a planetary line within which the line still influences. ≤111km = direct hit (×1.0), ≤222km = strong zone (×0.7), ≤444km = fading zone (×0.3). Closer = stronger."}
              </InfoTip>
            </span>
            {ORBIS_ZONES.map((z) => (
              <div key={z.key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: z.color }} />
                <span className="text-[11px] text-[#9A9AA8]">≤{z.maxKm}km</span>
                <span className="text-[10px] text-[#8A8A96]">×{z.factor}</span>
              </div>
            ))}
            <span className="flex items-center gap-1.5 text-[10px] text-[#8A8A96]">
              · Paran bonus +50% (max, ≤111km)
              <InfoTip label={locale === "ru" ? "Paran (парана)" : locale === "hi" ? "Paran" : "Paran"} tone="gold" side="bottom">
                {locale === "ru"
                  ? "Paran (planetary angle) — когда 2+ планетарных линий пересекаются в одной точке на Земле. Это место, где энергии нескольких планет сливаются. Даёт +50% бонус к CityIndex — самые сильные места на карте."
                  : locale === "hi"
                  ? "Paran — जब 2+ ग्रह रेखाएँ पृथ्वी पर एक ही बिंदु पर मिलती हैं। +50% बोनस।"
                  : "Paran (planetary angle) — when 2+ planetary lines cross at one point on Earth. Energies of multiple planets merge here. Gives +50% CityIndex bonus — the most powerful spots on the map."}
              </InfoTip>
            </span>
          </div>
        </GlassCard>
      </FadeIn>

      {/* 8-sphere filter */}
      <FadeIn delay={0.1}>
        <GlassCard>
          <div className="flex items-center justify-between">
            <Pill tone="gold">{t("world.filter")}</Pill>
            <span className="text-[11px] text-[#8A8A96]">{activeSpheres.length} {t("world.active")} · {CITIES.length} {t("world.cities.ranked")}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {SPHERES.map((s) => {
              const active = activeSpheres.includes(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => toggleSphere(s.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-all ${
                    active ? "border-[#E8B86D]/50 bg-[#E8B86D]/15 text-[#E8B86D]" : "border-[#2A2A35] bg-[#0B0B0F]/40 text-[#9A9AA8] hover:border-[#9A9AA8]/40"
                  }`}
                  style={active ? { boxShadow: `0 0 14px ${s.color}30` } : undefined}
                >
                  <span style={{ color: s.color }}>{s.icon}</span>
                  {t(`sphere.${s.key}`)}
                </button>
              );
            })}
          </div>
        </GlassCard>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Stylized world map with 44 lines */}
        <FadeIn delay={0.15}>
          <GlassCard className="h-full">
            <div className="flex items-center justify-between">
              <Pill tone="jade">{t("world.map.3d")}</Pill>
              <Pill tone="muted">{t("world.map.polar")}</Pill>
            </div>
            <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-lg border border-[#2A2A35] bg-[#0B0B0F]">
              <div className="absolute inset-0 starfield opacity-40" />
              <svg viewBox="0 0 800 500" className="absolute inset-0 h-full w-full">
                <defs>
                  <radialGradient id="oceanGlow" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="#1C1C26" /><stop offset="100%" stopColor="#0B0B0F" />
                  </radialGradient>
                </defs>
                <rect width="800" height="500" fill="url(#oceanGlow)" />
                {/* continents */}
                <g fill="#16161D" stroke="#2A2A35" strokeWidth="1">
                  <path d="M120,140 Q180,100 260,130 Q300,180 280,240 Q220,260 160,230 Q110,190 120,140 Z" />
                  <path d="M310,260 Q360,250 390,300 Q380,360 340,370 Q300,350 310,260 Z" />
                  <path d="M380,120 Q460,100 540,140 Q560,200 520,230 Q440,240 400,200 Q370,160 380,120 Z" />
                  <path d="M540,160 Q620,140 680,180 Q700,240 660,270 Q600,280 560,240 Q530,200 540,160 Z" />
                  <path d="M620,300 Q680,290 700,340 Q680,380 640,375 Q610,350 620,300 Z" />
                </g>
                {/* 44 planetary great-circle lines (stylized, real density) */}
                <g fill="none" strokeWidth="1.5" opacity="0.5">
                  <path d="M80,180 Q400,40 720,260" stroke="#FBBF24" />
                  <path d="M100,340 Q400,480 700,200" stroke="#5BB89C" />
                  <path d="M150,120 Q450,300 680,360" stroke="#F472B6" />
                  <path d="M200,400 Q450,80 720,160" stroke="#A78BFA" />
                  <path d="M120,260 Q400,360 700,300" stroke="#5E8FA8" />
                  <path d="M60,220 Q400,60 740,280" stroke="#EF4444" opacity="0.4" />
                  <path d="M180,80 Q400,280 720,420" stroke="#60A5FA" opacity="0.4" />
                  <path d="M140,380 Q400,180 700,120" stroke="#94A3B8" opacity="0.4" />
                  <path d="M220,160 Q400,420 680,380" stroke="#22D3EE" opacity="0.35" />
                  <path d="M100,280 Q400,100 720,340" stroke="#2DD4BF" opacity="0.35" />
                </g>
                {/* buffer corridors around selected city */}
                {selectedCity && (
                  <circle cx={180 + (selectedCity.lng / 180) * 320} cy={250 - (selectedCity.lat / 90) * 120} r="28" fill="none" stroke="#10B981" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
                )}
                {/* city markers */}
                {[
                  { x: 180, y: 200, name: "Lisbon", c: "#E8B86D", s: 92 },
                  { x: 260, y: 350, name: "Buenos Aires", c: "#5BB89C", s: 87 },
                  { x: 660, y: 200, name: "Tokyo", c: "#D98E7A", s: 81 },
                  { x: 470, y: 250, name: "Tbilisi", c: "#E8B86D", s: 78 },
                  { x: 250, y: 280, name: "Mexico City", c: "#5BB89C", s: 74 },
                  { x: 540, y: 310, name: "Dubai", c: "#D98E7A", s: 69 },
                ].map((m) => (
                  <g key={m.name}>
                    <circle cx={m.x} cy={m.y} r="6" fill={m.c} opacity="0.3">
                      <animate attributeName="r" values="6;14;6" dur="3s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={m.x} cy={m.y} r="4" fill={m.c} />
                    <text x={m.x + 10} y={m.y + 4} fill="#F5F0E8" fontSize="11" fontFamily="JetBrains Mono, monospace">{m.name}</text>
                    <text x={m.x + 10} y={m.y + 16} fill={m.c} fontSize="9" fontFamily="JetBrains Mono, monospace">{m.s}</text>
                  </g>
                ))}
              </svg>
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                <span className="rounded bg-[#0B0B0F]/80 px-2 py-0.5 text-[10px] text-[#FBBF24]">— Sun</span>
                <span className="rounded bg-[#0B0B0F]/80 px-2 py-0.5 text-[10px] text-[#94A3B8]">— Moon</span>
                <span className="rounded bg-[#0B0B0F]/80 px-2 py-0.5 text-[10px] text-[#F472B6]">— Venus</span>
                <span className="rounded bg-[#0B0B0F]/80 px-2 py-0.5 text-[10px] text-[#A78BFA]">— Jupiter</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-[#8A8A96]">{t("world.buffer")}</span>
              <CosmicButton variant="outline" className="!py-1.5 !px-3 !text-[12px]" onClick={handleTravelMode}>
                {t("world.travelmode")} {isFree ? "🔒" : "☾"}
              </CosmicButton>
            </div>
          </GlassCard>
        </FadeIn>

        {/* City list + detail */}
        <FadeIn delay={0.2}>
          <div className="space-y-4">
            {/* Search + sort bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A8A96]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={locale === "ru" ? "Поиск города или страны..." : locale === "hi" ? "शहर या देश खोजें..." : "Search city or country..."}
                  className="w-full rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 py-2 pl-9 pr-3 text-[12px] text-[#F5F0E8] placeholder:text-[#8A8A96] outline-none focus:border-[#E8B86D]/50 transition-colors"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "smart" | "score" | "qol" | "income")}
                className="rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-2 py-2 text-[11px] text-[#9A9AA8] outline-none focus:border-[#E8B86D]/50 cursor-pointer"
              >
                <option value="smart">{smartLabel}</option>
                <option value="score">{scoreLabel}</option>
                <option value="qol">QoL</option>
                <option value="income">{incomeLabel}</option>
              </select>
            </div>

            {/* Explainer above top-3 */}
            <div className="rounded-lg border border-[#2A2A35]/70 bg-[#0B0B0F]/40 px-3 py-2 text-[11px] leading-relaxed text-[#9A9AA8]">
              <span className="font-display text-[#E8B86D] font-medium">CityIndex</span> · {explainerText}
            </div>

            {/* City list — main (non-demoted) */}
            <div className="max-h-[280px] space-y-2 overflow-y-auto scrollbar-astro pr-1">
              {filteredMain.map((r) => {
                const c = r.city;
                const isSelected = selectedCity.name === c.name;
                const isTop3 = r.rank >= 1 && r.rank <= 3;
                const isEditorsPick = r.rank === 2;
                return (
                  <div
                    key={c.name}
                    className={`group rounded-lg border p-3 text-left transition-all ${
                      isSelected ? "border-[#E8B86D]/50 bg-[#E8B86D]/8" : "border-[#2A2A35] bg-[#0B0B0F]/40 hover:border-[#9A9AA8]/40"
                    } ${isEditorsPick && isFree ? "border-[#E8B86D]/55 shadow-[0_0_22px_rgba(232,184,109,0.22)]" : ""}`}
                  >
                    {isTop3 && (
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <SandwichPosition rank={r.rank as 1 | 2 | 3} />
                        {r.rank === 3 && (
                          <SocialProof
                            count={8412}
                            action={
                              locale === "ru" ? `Скорпионы выбрали ${c.name} на этой неделе`
                              : locale === "hi" ? `सप्ताह में वृश्चिकों ने ${c.name} चुना`
                              : `Scorpios chose ${c.name} this week`
                            }
                            tone="jade"
                          />
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <button onClick={() => handleCityClick(c)} className="flex flex-1 items-center justify-between">
                        <div>
                          <div className="font-display text-base font-semibold text-[#F5F0E8] flex items-center gap-1.5">
                            {favorites.has(c.name) && <span className="text-[#E8B86D] text-[10px]">★</span>}
                            {c.name}
                          </div>
                          <div className="text-[11px] text-[#8A8A96]">{c.country} · {t(`sphere.${c.sphere}`)} · QoL {c.qol}</div>
                          {/* CityIndex breakdown — analyst tooltip row */}
                          <div className="mt-1 font-mono text-[10px] text-[#8A8A96]">
                            CityIndex <span className="text-[#E8B86D]">{r.index.toFixed(3)}</span>
                            <span className="mx-1.5">·</span>
                            M <span className="text-[#9A9AA8]">{r.M.toFixed(2)}</span>
                            <span className="mx-1.5">·</span>
                            V <span className="text-[#9A9AA8]">{r.V.toFixed(2)}</span>
                            <span className="mx-1.5">·</span>
                            K_irr <span className="text-[#5BB89C]">{r.K_irr.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-xl font-semibold" style={{ color: c.tone === "gold" ? "#E8B86D" : c.tone === "jade" ? "#5BB89C" : "#D98E7A" }}>{c.score}</div>
                          <div className="text-[10px] text-[#8A8A96]">{t("world.relocation")}</div>
                        </div>
                      </button>
                      <button
                        onClick={() => toggleFavorite(c.name)}
                        className="ml-2 shrink-0 p-1.5 rounded transition-colors hover:bg-[#1C1C26]"
                        aria-label="Toggle favorite"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={favorites.has(c.name) ? "#E8B86D" : "none"} stroke={favorites.has(c.name) ? "#E8B86D" : "#8A8A96"} strokeWidth="2" className="transition-colors">
                          <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6L12 2z" />
                        </svg>
                      </button>
                    </div>
                    {/* Editor's pick (rank 2) — high-margin upsell target with gold glow + UpsellNudge */}
                    {isEditorsPick && isFree && (
                      <div className="mt-3">
                        <UpsellNudge
                          icon="✦"
                          title={unlockReportLabel}
                          copy={unlockReportCopy}
                          cta={openCta}
                          tone="gold"
                          onClick={() => onNavigate?.("upgrade")}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredMain.length === 0 && (
                <div className="py-8 text-center text-[12px] text-[#8A8A96]">{noResultsLabel}</div>
              )}
            </div>

            {/* Demoted — "Worth considering" (not buried) */}
            {filteredDemoted.length > 0 && (
              <div className="mt-2 rounded-lg border border-[#5BB89C]/20 bg-[#5BB89C]/5 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="jade">⚠ {worthLabel}</Pill>
                  <span className="text-[10px] text-[#8A8A96]">{cautionLabel}</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {filteredDemoted.map((r) => {
                    const c = r.city;
                    const isSelected = selectedCity.name === c.name;
                    return (
                      <button
                        key={c.name}
                        onClick={() => handleCityClick(c)}
                        className={`flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-left transition-all ${
                          isSelected ? "border-[#5BB89C]/50 bg-[#5BB89C]/8" : "border-[#2A2A35]/60 bg-[#0B0B0F]/30 hover:border-[#5BB89C]/40"
                        }`}
                      >
                        <div>
                          <div className="text-[12px] font-medium text-[#F5F0E8]">{c.name}</div>
                          <div className="text-[10px] text-[#8A8A96]">{c.country} · score {c.score} · K_irr {r.K_irr.toFixed(2)}</div>
                        </div>
                        <div className="font-mono text-[10px] text-[#9A9AA8]">{r.index.toFixed(3)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected city detail panel — with SoftPaywall overlay if gated */}
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCity.name}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                >
                  <GlassCard variant={selectedCity.tone}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display text-xl font-semibold">{selectedCity.name}, {selectedCity.country}</h3>
                        <div className="text-[11px] text-[#9A9AA8]">{t("world.detail.sphere")}: {t(`sphere.${selectedCity.sphere}`)} · {selectedCity.climate}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-3xl font-semibold text-[#E8B86D]">{selectedCity.score}</div>
                        <div className="text-[10px] text-[#8A8A96]">/ 100</div>
                      </div>
                    </div>

                    {/* CityIndex chip on detail */}
                    {(() => {
                      const r = rankByCity.get(selectedCity.name);
                      if (!r) return null;
                      return (
                        <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-full border border-[#E8B86D]/25 bg-[#E8B86D]/8 px-2.5 py-0.5 text-[10px]">
                          <span className="text-[#8A8A96]">CityIndex</span>
                          <span className="font-mono text-[#E8B86D]">{r.index.toFixed(3)}</span>
                          <span className="text-[#8A8A96]">· M {r.M.toFixed(2)} · V {r.V.toFixed(2)} · K_irr {r.K_irr.toFixed(2)}</span>
                          {r.demoted && <Pill tone="jade">demoted</Pill>}
                        </div>
                      );
                    })()}

                    {/* City stats */}
                    <div className="mt-3 grid grid-cols-4 gap-2 text-[10px]">
                      <div className="rounded bg-[#0B0B0F]/50 p-1.5 text-center">
                        <div className="text-[#8A8A96]">QoL</div><div className="font-mono text-[#E8B86D]">{selectedCity.qol}</div>
                      </div>
                      <div className="rounded bg-[#0B0B0F]/50 p-1.5 text-center">
                        <div className="text-[#8A8A96]">Pop</div><div className="font-mono text-[#9A9AA8]">{(selectedCity.population / 1000).toFixed(0)}K</div>
                      </div>
                      <div className="rounded bg-[#0B0B0F]/50 p-1.5 text-center">
                        <div className="text-[#8A8A96]">Income</div><div className="font-mono text-[#5BB89C]">${selectedCity.income}</div>
                      </div>
                      <div className="rounded bg-[#0B0B0F]/50 p-1.5 text-center">
                        <div className="text-[#8A8A96]">Housing</div><div className="font-mono text-[#D98E7A]">${selectedCity.housing}</div>
                      </div>
                    </div>

                    {/* Planet lines breakdown (data-density) */}
                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-1.5">Planet lines · {selectedCity.lines.length} active</div>
                      <div className="space-y-1">
                        {selectedCity.lines.map((l, i) => {
                          const zone = ORBIS_ZONES.find((z) => z.key === l.zone);
                          return (
                            <div key={i} className="flex items-center gap-2 text-[11px]">
                              <span className="w-16 text-[#F5F0E8]">{l.planet} {l.type}</span>
                              <span className="font-mono text-[#9A9AA8] w-14">{l.distKm}km</span>
                              <div className="flex-1 h-1.5 rounded-full bg-[#1C1C26] overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${(1 - l.distKm / 444) * 100}%`, background: zone?.color }} />
                              </div>
                              <span className="text-[9px] w-10 text-right" style={{ color: zone?.color }}>{l.zone}</span>
                              <span className="font-mono w-10 text-right" style={{ color: l.weight >= 0 ? "#5BB89C" : "#D98E7A" }}>{l.weight > 0 ? "+" : ""}{l.weight.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Narrative */}
                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-wider text-[#5BB89C] mb-1">{t("world.detail.positives")}</div>
                      {selectedCity.narrative[locale].map((sentence, idx) => (
                        <p key={idx} className="text-[11px] text-[#F5F0E8]/85 leading-relaxed mb-1 flex gap-1.5">
                          <span className="text-[#5BB89C] shrink-0">+</span>
                          <span>{sentence}</span>
                        </p>
                      ))}
                    </div>
                    {selectedCity.watch[locale].length > 0 && (
                      <div className="mt-2">
                        <div className="text-[10px] uppercase tracking-wider text-[#D98E7A] mb-1">{t("world.detail.watch")}</div>
                        {selectedCity.watch[locale].map((w, idx) => (
                          <p key={idx} className="text-[11px] text-[#9A9AA8] mb-1 flex gap-1.5">
                            <span className="text-[#D98E7A] shrink-0">−</span>
                            <span>{w}</span>
                          </p>
                        ))}
                      </div>
                    )}
                    {selectedCity.parans.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <Pill tone="gold">⚡ Paran</Pill>
                        {selectedCity.parans.map((p) => (
                          <span key={p.desc} className="text-[10px] text-[#E8B86D]">{p.desc} (+{(p.bonus * 100).toFixed(0)}%)</span>
                        ))}
                      </div>
                    )}

                    {/* Actions — Power Card generate is gated for Free after 1st */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <CosmicButton variant="primary" className="!py-1.5 !px-3 !text-[12px]" onClick={handleCardGenerate}>
                        ✦ {t("world.detail.generate")}
                      </CosmicButton>
                      {selectedCity.travelMode && <Pill tone="jade">{t("world.travel.ready")}</Pill>}
                      {isFree && (
                        <span className="text-[10px] text-[#8A8A96]">{freeNote}</span>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              </AnimatePresence>

              {/* Soft paywall overlay — covers the detail panel only */}
              <AnimatePresence>
                {paywall && (
                  <SoftPaywall
                    trigger={paywall.trigger}
                    title={paywall.title}
                    copy={paywall.copy}
                    onCta={upgradeCta}
                    onDismiss={dismissPaywall}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Radar chart — 8 spheres for selected city */}
      <FadeIn delay={0.25}>
        <GlassCard>
          <Pill tone="gold">8-sphere radar · {selectedCity.name}</Pill>
          <div className="mt-4 flex justify-center">
            <svg viewBox="0 0 300 300" className="h-auto w-full max-w-[320px]">
              {/* concentric polygons */}
              {[0.25, 0.5, 0.75, 1].map((r) => (
                <polygon key={r} points={SPHERES.map((_, i) => {
                  const a = (i * 45 - 90) * Math.PI / 180;
                  return `${150 + 110 * r * Math.cos(a)},${150 + 110 * r * Math.sin(a)}`;
                }).join(" ")} fill="none" stroke="#2A2A35" strokeWidth="0.5" />
              ))}
              {/* axes */}
              {SPHERES.map((_, i) => {
                const a = (i * 45 - 90) * Math.PI / 180;
                return <line key={i} x1="150" y1="150" x2={150 + 110 * Math.cos(a)} y2={150 + 110 * Math.sin(a)} stroke="#2A2A35" strokeWidth="0.5" />;
              })}
              {/* data polygon — deterministic from city score */}
              <polygon
                points={SPHERES.map((s, i) => {
                  const val = s.weight * (selectedCity.score / 100);
                  const a = (i * 45 - 90) * Math.PI / 180;
                  return `${150 + 110 * val * Math.cos(a)},${150 + 110 * val * Math.sin(a)}`;
                }).join(" ")}
                fill="#E8B86D" fillOpacity="0.2" stroke="#E8B86D" strokeWidth="1.5" />
              {/* labels */}
              {SPHERES.map((s, i) => {
                const a = (i * 45 - 90) * Math.PI / 180;
                return <text key={i} x={150 + 125 * Math.cos(a)} y={150 + 125 * Math.sin(a) + 3} fill={s.color} fontSize="9" textAnchor="middle">{t(`sphere.${s.key}`).slice(0, 4)}</text>;
              })}
            </svg>
          </div>
        </GlassCard>
      </FadeIn>

      {/* Viral card modal — with social proof */}
      <AnimatePresence>
        {showCard && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setShowCard(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()} className="w-full max-w-md"
            >
              <div className="relative overflow-hidden rounded-2xl glass-gold p-8">
                <div className="absolute inset-0 starfield opacity-50" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="font-display text-xl text-[#E8B86D]">AstroOS</div>
                    <Pill tone="gold">{t("world.card.title")}</Pill>
                  </div>
                  <h3 className="mt-6 font-display text-3xl font-semibold">{USER.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Pill tone="gold">{USER.sun} Sun</Pill>
                    <Pill tone="jade">{USER.rising} Rising</Pill>
                    <Pill tone="rose">{USER.dayMaster}</Pill>
                  </div>
                  <div className="mt-5 rounded-lg border border-[#2A2A35] bg-[#0B0B0F] p-3">
                    <svg viewBox="0 0 300 140" className="h-auto w-full">
                      <path d="M40,70 Q150,20 260,80" stroke="#FBBF24" fill="none" strokeWidth="1.5" />
                      <path d="M30,100 Q150,130 270,60" stroke="#A78BFA" fill="none" strokeWidth="1.5" />
                      <path d="M60,40 Q150,90 250,110" stroke="#F472B6" fill="none" strokeWidth="1.5" />
                      {[
                        { x: 70, y: 78, n: "Lisbon" }, { x: 170, y: 30, n: "Tokyo" }, { x: 200, y: 100, n: "BA" },
                      ].map((m) => (
                        <g key={m.n}>
                          <circle cx={m.x} cy={m.y} r="3.5" fill="#E8B86D" />
                          <text x={m.x + 6} y={m.y + 3} fill="#F5F0E8" fontSize="8" fontFamily="monospace">{m.n}</text>
                        </g>
                      ))}
                    </svg>
                  </div>
                  <div className="mt-4">
                    <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">{t("world.card.cities")}</div>
                    <div className="mt-1 font-display text-lg text-[#E8B86D]">{USER.powerCities.join(" · ")}</div>
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <div className="text-[10px] text-[#8A8A96]">/r/{USER.name.toLowerCase()}-card</div>
                    <div className="h-12 w-12 rounded bg-[#F5F0E8] p-1">
                      <div className="grid h-full w-full grid-cols-5 gap-px">
                        {Array.from({ length: 25 }).map((_, i) => (
                          <div key={i} className={Math.random() > 0.5 ? "bg-[#0B0B0F]" : "bg-transparent"} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Social proof on Power Card */}
                  <div className="mt-4">
                    <SocialProof count={2300} action={cardSharedAction} tone="rose" live />
                  </div>
                </div>
              </div>
              {/* Viral loops stay free — share buttons are never gated */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <CosmicButton variant="primary" className="!py-2 !px-4 !text-[12px]">Instagram Story</CosmicButton>
                <CosmicButton variant="jade" className="!py-2 !px-4 !text-[12px]">WhatsApp</CosmicButton>
                <CosmicButton variant="rose" className="!py-2 !px-4 !text-[12px]">Telegram</CosmicButton>
                <CosmicButton variant="ghost" className="!py-2 !px-4 !text-[12px]">X / Twitter</CosmicButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FadeIn delay={0.3}>
        <GlassCard variant="jade">
          <Pill tone="jade">{t("world.growth.eyebrow")}</Pill>
          <p className="mt-3 text-[13px] leading-relaxed text-[#9A9AA8]">
            The Power City card is the single highest-ROI engineering investment. Compounding ~5–10 days/cycle.
            At k=1.4 (Year 5), every 1,000 users generates ~1,400 new users every cycle. Free: 1 card. Pro: unlimited (4 templates).
            Each "best city" report is a viral TikTok unit.
          </p>
        </GlassCard>
      </FadeIn>
    </div>
  );
}
