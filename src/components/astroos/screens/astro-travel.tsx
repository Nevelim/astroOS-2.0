"use client";
/**
 * AstroTravelScreen — unified "Астра-путешествия" section.
 *
 * Merges three former screens (Family Map, Astro Travel / world map, Astro
 * Space / local space) into one map-centric flow. A single toggle switches
 * between solo ("Me") and "Family" mode. The map shows planetary lines for
 * the anchor member plus abundance cities (solo: CityIndex ranking; family:
 * synergy ranking). Selecting a city overlays its local-space radial spokes.
 *
 * Data flow:
 *  - Me mode:    useMember()/mockMember() → AstroMap (fetches /api/calculate).
 *  - Family mode: MemberRoster → api.familyAbundance(/api/family-astro).
 *  - Local space: api call to /api/local-space-from-birth for the selected city.
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { GlassCard, Pill, CosmicButton, SectionHeading, FadeIn } from "../ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { useMember, mockMember } from "@/lib/astroos/real/useMember";
import {
  api,
  type FamilyAbundanceResultDTO,
  type FamilyCityReportDTO,
} from "@/lib/astroos/real/api-client";
import {
  FAMILY_CITY_SEEDS,
  FAMILY_CITY_CLIMATES,
} from "@/lib/astroos/real/family-city-seeds";
import { buildLocalSpaceSpokes, type LocalSpaceSpoke } from "@/lib/astroos/real/local-space-geo";
import { MemberRoster, type MemberEntry } from "./member-roster";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, User, Map as MapIcon, Sparkles, Star, Compass,
  AlertCircle, SlidersHorizontal, ChevronDown, ChevronUp,
} from "lucide-react";

const AstroMap = dynamic(() => import("../map/AstroMap").then((m) => m.AstroMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "#0B0B0F" }}>
      <Sparkles className="w-6 h-6 mx-auto animate-pulse" style={{ color: "#E8B86D" }} />
    </div>
  ),
});

type Mode = "me" | "family";

/** The 13 cultural regions (used as the "continent / zone" filter). */
const REGIONS = Array.from(new Set(FAMILY_CITY_SEEDS.map((c) => c.region))).sort();
const SPHERES = ["career", "love", "travel", "family", "health", "finance"] as const;

interface AstroTravelScreenProps {
  onNavigate?: (k: import("@/lib/astroos/data").ScreenKey) => void;
}

export function AstroTravelScreen({ onNavigate }: AstroTravelScreenProps) {
  const { t, locale } = useI18n();
  const { member } = useMember();
  const [mode, setMode] = useState<Mode>("me");
  const [showFilters, setShowFilters] = useState(false);
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [climateFilter, setClimateFilter] = useState<string>("all");

  // Family mode state.
  const [members, setMembers] = useState<MemberEntry[]>([
    { key: "anchor", name: "", birthUtc: "", lat: 0, lng: 0, complete: false },
  ]);
  const [familyResult, setFamilyResult] = useState<FamilyAbundanceResultDTO | null>(null);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyError, setFamilyError] = useState<string | null>(null);

  // Selected city + local-space overlay.
  const [selectedCity, setSelectedCity] = useState<FamilyCityReportDTO | null>(null);
  const [localSpaceSpokes, setLocalSpaceSpokes] = useState<LocalSpaceSpoke[]>([]);
  const [localSpaceLoading, setLocalSpaceLoading] = useState(false);

  const meMember = useMemo(() => member ?? mockMember(), [member]);

  // Anchor member birth data for planetary lines (Me mode = current user;
  // Family mode = first complete member, or the user as fallback).
  const anchorBirth = useMemo(() => {
    if (mode === "me") {
      return {
        birthDateTime: meMember.birth.isoDateTime,
        birthLat: meMember.birth.lat,
        birthLng: meMember.birth.lng,
        birthTzOffset: meMember.birth.tzOffset,
        birthPlaceName: meMember.birth.placeName,
        gender: meMember.birth.gender,
      };
    }
    const anchor = members.find((m) => m.complete) ?? members[0];
    if (anchor?.birthUtc && anchor.lat && anchor.lng) {
      return {
        birthDateTime: anchor.birthUtc,
        birthLat: anchor.lat,
        birthLng: anchor.lng,
        birthTzOffset: 0,
        birthPlaceName: anchor.name,
        gender: 0 as const,
      };
    }
    return null;
  }, [mode, meMember, members]);

  // Filtered city list for the family-abundance request (region + climate).
  const filteredCities = useMemo(() => {
    return FAMILY_CITY_SEEDS.filter((c) => {
      if (regionFilter !== "all" && c.region !== regionFilter) return false;
      if (climateFilter !== "all" && c.climate !== climateFilter) return false;
      return true;
    }).map((c) => ({
      name: c.name, country: c.country, lat: c.lat, lng: c.lng, region: c.region,
    }));
  }, [regionFilter, climateFilter]);

  const completeMembers = members.filter((m) => m.complete && m.birthUtc && m.lat && m.lng);
  const canCompute = mode === "me" || completeMembers.length >= 1;

  const computeFamily = useCallback(async () => {
    if (completeMembers.length === 0) return;
    setFamilyLoading(true);
    setFamilyError(null);
    try {
      const payload = completeMembers.map((m) => ({
        key: m.key,
        name: m.name || `Member ${members.indexOf(m) + 1}`,
        birthUtc: m.birthUtc,
        lat: m.lat,
        lng: m.lng,
      }));
      const r = await api.familyAbundance({
        members: payload,
        cities: filteredCities,
        limit: 30,
      });
      setFamilyResult(r);
      setSelectedCity(r.topCitiesBySynergy[0] ?? null);
    } catch (e) {
      setFamilyError(t("family.error"));
    } finally {
      setFamilyLoading(false);
    }
  }, [completeMembers, filteredCities, members, t]);

  // Fetch local-space spokes when a city is selected.
  useEffect(() => {
    if (!selectedCity) {
      setLocalSpaceSpokes([]);
      return;
    }
    let cancelled = false;
    setLocalSpaceLoading(true);
    // Use the anchor member's birth moment at the selected city's location.
    const utc = mode === "me" ? meMember.birth.isoDateTime : (completeMembers[0]?.birthUtc ?? null);
    if (!utc) { setLocalSpaceLoading(false); return; }
    fetch("/api/local-space-from-birth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ utc, lat: selectedCity.city.lat, lng: selectedCity.city.lng }),
    })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        if (cancelled) return;
        setLocalSpaceSpokes(buildLocalSpaceSpokes(
          selectedCity.city.lat, selectedCity.city.lng, data.planet_lines ?? [],
        ));
        setLocalSpaceLoading(false);
      })
      .catch(() => { if (!cancelled) setLocalSpaceLoading(false); });
    return () => { cancelled = true; };
  }, [selectedCity, mode, meMember, completeMembers]);

  const topSynergy = familyResult?.topCitiesBySynergy ?? [];

  return (
    <div className="min-h-screen pb-20" style={{ background: "#0B0B0F" }}>
      {/* Header */}
      <FadeIn className="mb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "#E8B86D" }}>
              {locale === "ru" ? "Где жить и путешествовать" : locale === "hi" ? "कहां रहें और यात्रा करें" : "Where to live & travel"}
            </p>
            <h1 className="font-serif text-2xl md:text-3xl mt-1" style={{ color: "#F5F0E8" }}>
              {t("nav.astroTravel")}
            </h1>
            <p className="text-xs mt-1 max-w-xl" style={{ color: "#F5F0E860" }}>
              {locale === "ru"
                ? "Планетарные линии + города изобилия + локальное пространство — для вас и семьи"
                : locale === "hi"
                ? "ग्रह रेखाएं + बहुता शहर + स्थानीय अंतरिक्ष — आपके लिए और परिवार के लिए"
                : "Planetary lines + abundance cities + local space — for you and your family"}
            </p>
          </div>
          <Pill tone="gold"><MapIcon className="w-3 h-3 inline mr-1" /> 682</Pill>
        </div>
      </FadeIn>

      {/* Mode toggle + filters toggle */}
      <FadeIn delay={0.05}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "#2A2A35" }}>
            <button
              onClick={() => setMode("me")}
              className="px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors"
              style={{
                background: mode === "me" ? "#E8B86D20" : "transparent",
                color: mode === "me" ? "#E8B86D" : "#9A9AA8",
              }}
            >
              <User className="w-3.5 h-3.5" /> {locale === "ru" ? "Я" : locale === "hi" ? "मैं" : "Me"}
            </button>
            <button
              onClick={() => setMode("family")}
              className="px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors"
              style={{
                background: mode === "family" ? "#E8B86D20" : "transparent",
                color: mode === "family" ? "#E8B86D" : "#9A9AA8",
              }}
            >
              <Users className="w-3.5 h-3.5" /> {locale === "ru" ? "Семья" : locale === "hi" ? "परिवार" : "Family"}
            </button>
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="px-3 py-1.5 text-sm rounded-lg border flex items-center gap-1.5"
            style={{ borderColor: "#2A2A35", color: "#9A9AA8", background: showFilters ? "#5BB89C10" : "transparent" }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {locale === "ru" ? "Фильтры" : locale === "hi" ? "फ़िल्टर" : "Filters"}
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {(regionFilter !== "all" || climateFilter !== "all") && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#5BB89C" }} />
            )}
          </button>
        </div>
      </FadeIn>

      {/* Filter panel (collapsible) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard variant="neutral" className="p-3 mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs">
                  <span className="block mb-1" style={{ color: "#9A9AA8" }}>
                    {locale === "ru" ? "Регион / зона" : locale === "hi" ? "क्षेत्र / ज़ोन" : "Region / zone"}
                  </span>
                  <select
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value)}
                    className="w-full rounded px-2 py-1.5 text-sm"
                    style={{ background: "#0B0B0F", border: "1px solid #2A2A35", color: "#F5F0E8" }}
                  >
                    <option value="all">{locale === "ru" ? "Все регионы" : "All regions"}</option>
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label className="text-xs">
                  <span className="block mb-1" style={{ color: "#9A9AA8" }}>
                    {locale === "ru" ? "Климат" : locale === "hi" ? "जलवायु" : "Climate"}
                  </span>
                  <select
                    value={climateFilter}
                    onChange={(e) => setClimateFilter(e.target.value)}
                    className="w-full rounded px-2 py-1.5 text-sm"
                    style={{ background: "#0B0B0F", border: "1px solid #2A2A35", color: "#F5F0E8" }}
                  >
                    <option value="all">{locale === "ru" ? "Все климаты" : "All climates"}</option>
                    {FAMILY_CITY_CLIMATES.filter((c) => c !== "unknown").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="text-[10px] mt-2" style={{ color: "#9A9AA8" }}>
                {locale === "ru"
                  ? `Показано городов: ${filteredCities.length} из 682`
                  : `Cities shown: ${filteredCities.length} of 682`}
              </p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member input (Family mode only) */}
      {mode === "family" && (
        <FadeIn delay={0.1}>
          <div className="mb-3">
            <MemberRoster
              members={members}
              onChange={(m) => {
                setMembers(m.map((x) => ({
                  ...x,
                  complete: !!(x.birthUtc && x.lat && x.lng && x.name.trim()),
                })));
                // Reset stale result when inputs change.
                setFamilyResult(null);
              }}
            />
            <div className="mt-2 flex items-center gap-2">
              <CosmicButton onClick={computeFamily} disabled={!canCompute || familyLoading} variant="gold">
                {familyLoading
                  ? (locale === "ru" ? "Расчёт..." : "Computing...")
                  : (locale === "ru" ? "Рассчитать города" : "Compute cities")}
              </CosmicButton>
              {completeMembers.length > 0 && (
                <span className="text-[11px]" style={{ color: "#5BB89C" }}>
                  {completeMembers.length} {locale === "ru" ? "готово" : "ready"}
                </span>
              )}
            </div>
            {familyError && (
              <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "#D98E7A" }}>
                <AlertCircle className="w-3.5 h-3.5" /> {familyError}
              </p>
            )}
          </div>
        </FadeIn>
      )}

      {/* Map */}
      <FadeIn delay={0.15}>
        <GlassCard
          variant="gold"
          ornamental
          className="p-0 overflow-hidden mb-4"
          style={{ height: "50vh", minHeight: 380 }}
        >
          {anchorBirth ? (
            <AstroMap
              birthData={anchorBirth}
              abundanceCities={mode === "family" ? topSynergy : undefined}
              onAbundanceCitySelect={setSelectedCity}
              selectedAbundanceCityName={selectedCity?.city.name ?? null}
              localSpaceSpokes={localSpaceSpokes}
              fetchChart={mode === "me"}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-sm" style={{ color: "#9A9AA8" }}>
                {mode === "family"
                  ? (locale === "ru" ? "Заполните данные якорного участника" : "Fill the anchor member's data")
                  : ""}
              </p>
            </div>
          )}
        </GlassCard>
      </FadeIn>

      {/* Local-space toggle hint (shown when a city is selected) */}
      {selectedCity && localSpaceSpokes.length > 0 && (
        <FadeIn delay={0.18}>
          <GlassCard variant="jade" className="p-2 mb-4">
            <p className="text-xs flex items-center gap-1.5" style={{ color: "#5BB89C" }}>
              <Compass className="w-3.5 h-3.5" />
              {locale === "ru"
                ? `Локальное пространство: ${selectedCity.city.name} — ${localSpaceSpokes.length} радиальных линий`
                : `Local space: ${selectedCity.city.name} — ${localSpaceSpokes.length} radial lines`}
            </p>
          </GlassCard>
        </FadeIn>
      )}

      {/* Ranking — solo (CityIndex) or family (synergy) */}
      {mode === "family" && topSynergy.length > 0 && (
        <FadeIn delay={0.2}>
          <SectionHeading
            title={<><Star className="w-4 h-4 inline mr-1" style={{ color: "#E8B86D" }} />{t("family.topSynergy")}</>}
          />
          <div className="space-y-2 mb-4">
            {topSynergy.slice(0, 8).map((c, i) => (
              <motion.div key={`${c.city.name}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard
                  variant={i === 0 ? "gold" : i < 3 ? "jade" : "neutral"}
                  className="p-3 cursor-pointer hover:scale-[1.01] transition-transform"
                  onClick={() => setSelectedCity(c)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0" style={{ background: "#E8B86D20", color: "#E8B86D" }}>#{i + 1}</span>
                      {c.allMembersAllPositive && <span title={t("family.strict")}>🏆</span>}
                      <div className="min-w-0">
                        <h3 className="font-serif text-base leading-tight truncate" style={{ color: "#F5F0E8" }}>{c.city.name}</h3>
                        <p className="text-[11px] truncate" style={{ color: "#F5F0E860" }}>{c.city.region || c.city.country}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-mono tabular-nums" style={{ color: "#E8B86D" }}>{c.totalSynergy.toFixed(1)}</div>
                      <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>{t("family.totalSynergy")}</div>
                    </div>
                  </div>
                  {/* Sphere tags — classification by line type */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {SPHERES.map((s) => {
                      const v = c.familyAvg[s];
                      if (Math.abs(v) < 0.3) return null;
                      const positive = v >= 0;
                      return (
                        <span key={s} className="text-[9px] px-1.5 py-0.5 rounded" style={{
                          background: positive ? "#5BB89C15" : "#D98E7A15",
                          color: positive ? "#5BB89C" : "#D98E7A",
                        }}>
                          {sphereLabel(s, locale)} {v.toFixed(1)}
                        </span>
                      );
                    })}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </FadeIn>
      )}

      {/* Selected city detail drawer with local-space recommendations */}
      <AnimatePresence>
        {selectedCity && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 p-3"
          >
            <GlassCard variant="gold" ornamental className="p-4 max-w-2xl mx-auto max-h-[70vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-serif text-xl" style={{ color: "#F5F0E8" }}>
                    {selectedCity.city.name} {selectedCity.allMembersAllPositive && "🏆"}
                  </h3>
                  <p className="text-xs" style={{ color: "#F5F0E860" }}>
                    {selectedCity.city.country} · {selectedCity.city.region}
                  </p>
                </div>
                <button onClick={() => setSelectedCity(null)} className="text-sm" style={{ color: "#F5F0E860" }}>✕</button>
              </div>

              {/* Headline metrics */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <Metric label={t("family.totalSynergy")} value={selectedCity.totalSynergy.toFixed(1)} color="#E8B86D" />
                <Metric label={t("family.abundance")} value={selectedCity.abundanceIndex.toFixed(2)} color="#5BB89C" />
                <Metric label={t("family.resonance")} value={selectedCity.resonanceScore.toFixed(1)} color="#E8B86D" />
                <Metric label={t("family.harmony")} value={selectedCity.harmonyScore.toFixed(2)} color="#5E8FA8" />
              </div>

              {/* Local-space recommendations */}
              {localSpaceSpokes.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#F5F0E860" }}>
                    {locale === "ru" ? "🧭 Локальное пространство (направления)" : "🧭 Local space (directions)"}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {localSpaceSpokes.filter((s) => s.aboveHorizon).slice(0, 6).map((s, i) => (
                      <div key={i} className="text-[11px] flex items-center justify-between" style={{ color: "#F5F0E8" }}>
                        <span>{s.planet}</span>
                        <span style={{ color: "#9A9AA8" }}>{s.sector} · {s.azimuthDeg.toFixed(0)}°</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: "#5BB89C" }}>
                    {locale === "ru"
                      ? "↑ Над горизонтом — благоприятные сектора для жилья; окна в эту сторону."
                      : "↑ Above horizon — favorable sectors for housing; windows facing this way."}
                  </p>
                </div>
              )}

              {/* Sphere leaders */}
              {selectedCity.sphereLeaders.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#F5F0E860" }}>{t("family.sphereLeaders")}</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedCity.sphereLeaders.map((l) => (
                      <span key={l.sphere} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#5BB89C15", color: "#5BB89C" }}>
                        {sphereLabel(l.sphere, locale)}: {l.leader}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-mono" style={{ color }}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>{label}</div>
    </div>
  );
}

function sphereLabel(sphere: string, locale: string): string {
  const map: Record<string, { ru: string; en: string; hi: string }> = {
    career: { ru: "Карьера", en: "Career", hi: "करियर" },
    love: { ru: "Любовь", en: "Love", hi: "प्रेम" },
    travel: { ru: "Путешествия", en: "Travel", hi: "यात्रा" },
    family: { ru: "Семья", en: "Family", hi: "परिवार" },
    health: { ru: "Здоровье", en: "Health", hi: "स्वास्थ्य" },
    finance: { ru: "Финансы", en: "Finance", hi: "वित्त" },
  };
  const m = map[sphere];
  if (!m) return sphere;
  return locale === "ru" ? m.ru : locale === "hi" ? m.hi : m.en;
}

export default AstroTravelScreen;
