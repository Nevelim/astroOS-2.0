"use client";
/**
 * FamilyAstroScreen — multi-member astrocartography & synergy ranking.
 *
 * Computes, for the whole family, the customer's "family abundance + synergy"
 * algorithm: per-member sphere scores across 682 cities, aggregated into
 * family averages and four synergy types (resonance, cross-aspects,
 * complementarity, harmony). Cities are ranked by totalSynergy.
 *
 * Data flow: MEMBERS (mock) → POST /api/family-astro → FamilyAbundanceResultDTO.
 * The BFF proxies to the Python astro_engine :3001 /v1/family-abundance, which
 * loads cities from Prisma and computes planet longitudes via skyfield.
 */
import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { GlassCard, Pill, CosmicButton, SectionHeading, FadeIn } from "../ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { MEMBERS } from "@/lib/astroos/data";
import {
  api,
  type FamilyAbundanceResultDTO,
  type FamilyCityReportDTO,
  type FamilySphere,
} from "@/lib/astroos/real/api-client";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Sparkles, Star, Zap, GitBranch, Scale, AlertCircle, Award } from "lucide-react";

const FamilyMap = dynamic(() => import("../map/FamilyMap").then((m) => m.FamilyMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "#0B0B0F" }}>
      <Sparkles className="w-6 h-6 mx-auto animate-pulse" style={{ color: "#E8B86D" }} />
    </div>
  ),
});

const SPHERES: FamilySphere[] = ["career", "love", "travel", "family", "health", "finance"];

/**
 * Canonical reference family (Игорь/Юлия/Карина/Мирослава) from the customer's
 * FAMILY-ALGORITHM.md. The mock MEMBERS array holds different demo people; for
 * this screen we use the real family so the ranking matches the reference
 * dumps (Лангепас #1, etc.). Members are sent in mode B (birth_utc+lat+lng).
 */
const REFERENCE_FAMILY = [
  { key: "igor", name: "Игорь", birthUtc: "1989-04-15T09:40:00Z", lat: 52.2833, lng: 76.9667 },
  { key: "yulia", name: "Юлия", birthUtc: "1989-08-23T13:50:00Z", lat: 50.7889, lng: 75.6956 },
  { key: "karina", name: "Карина", birthUtc: "2013-09-07T03:00:00Z", lat: 52.2833, lng: 76.9667 },
  { key: "miroslava", name: "Мирослава", birthUtc: "2020-01-25T18:00:00Z", lat: 52.2833, lng: 76.9667 },
];

interface FamilyAstroScreenProps {
  onNavigate?: (k: import("@/lib/astroos/data").ScreenKey) => void;
}

export function FamilyAstroScreen({ onNavigate }: FamilyAstroScreenProps) {
  const { t, locale } = useI18n();
  const [result, setResult] = useState<FamilyAbundanceResultDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FamilyCityReportDTO | null>(null);

  // Use the reference family by default; fall back to MEMBERS mock if user has
  // added custom members with full birth data.
  const family = useMemo(() => {
    const custom = MEMBERS.filter((m) => m.dob && m.lat && m.lng);
    if (custom.length >= 2) {
      return custom.map((m) => ({
        key: m.id,
        name: m.name,
        birthUtc: `${m.dob}:00Z`,
        lat: m.lat,
        lng: m.lng,
      }));
    }
    return REFERENCE_FAMILY;
  }, []);

  const compute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.familyAbundance({ members: family, limit: 30 });
      setResult(r);
      setSelected(r.topCitiesBySynergy[0] ?? null);
    } catch (e) {
      setError(t("family.error"));
    } finally {
      setLoading(false);
    }
  }, [family, t]);

  const topSynergy = result?.topCitiesBySynergy ?? [];
  const topAbundance = result?.topCitiesByAbundance ?? [];
  const bestByType = result?.bestBySynergyType ?? {};

  return (
    <div className="min-h-screen pb-20" style={{ background: "#0B0B0F" }}>
      {/* Header */}
      <FadeIn className="mb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "#E8B86D" }}>
              {t("family.eyebrow")}
            </p>
            <h1 className="font-serif text-2xl md:text-3xl mt-1" style={{ color: "#F5F0E8" }}>
              {t("family.title")}
            </h1>
            <p className="text-xs mt-1 max-w-xl" style={{ color: "#F5F0E860" }}>
              {t("family.subtitle")}
            </p>
          </div>
          <Pill tone="gold">
            <Users className="w-3 h-3 inline mr-1" /> {family.length}{" "}
            {locale === "ru" ? "чел." : locale === "hi" ? "सदस्य" : "members"}
          </Pill>
        </div>
      </FadeIn>

      {/* Family roster + compute */}
      <FadeIn delay={0.05}>
        <GlassCard variant="gold" ornamental className="p-4 mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {family.map((m) => (
              <span
                key={m.key}
                className="text-[11px] px-2 py-1 rounded-full border"
                style={{ borderColor: "#E8B86D40", color: "#F5F0E8", background: "#E8B86D10" }}
              >
                {m.name}
              </span>
            ))}
          </div>
          <CosmicButton onClick={compute} disabled={loading} variant="gold">
            {loading ? t("family.computing") : t("family.compute")}
          </CosmicButton>
        </GlassCard>
      </FadeIn>

      {/* Error */}
      {error && (
        <FadeIn>
          <GlassCard variant="rose" className="p-3 mb-4">
            <p className="text-sm flex items-center gap-2" style={{ color: "#D98E7A" }}>
              <AlertCircle className="w-4 h-4" /> {error}
            </p>
          </GlassCard>
        </FadeIn>
      )}

      {/* Summary counts */}
      {result && (
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <GlassCard variant="neutral" className="p-3 text-center">
              <div className="text-2xl font-mono" style={{ color: "#E8B86D" }}>
                {result.totalCities}
              </div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
                {locale === "ru" ? "Городов" : locale === "hi" ? "शहर" : "Cities"}
              </div>
            </GlassCard>
            <GlassCard variant="jade" className="p-3 text-center">
              <div className="text-2xl font-mono" style={{ color: "#5BB89C" }}>
                {result.abundantCitiesCount}
              </div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
                {t("family.abundant")}
              </div>
            </GlassCard>
            <GlassCard variant="gold" className="p-3 text-center">
              <div className="text-2xl font-mono" style={{ color: "#E8B86D" }}>
                {result.strictCitiesCount}
              </div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
                {t("family.strict")}
              </div>
            </GlassCard>
          </div>
        </FadeIn>
      )}

      {/* Map */}
      {topSynergy.length > 0 && (
        <FadeIn delay={0.15}>
          <GlassCard
            variant="gold"
            ornamental
            className="p-0 overflow-hidden mb-4"
            style={{ height: "45vh", minHeight: 360 }}
          >
            <FamilyMap
              cities={topSynergy}
              selectedName={selected?.city.name ?? null}
              onSelect={setSelected}
            />
          </GlassCard>
        </FadeIn>
      )}

      {/* Top synergy cities ranking */}
      {topSynergy.length > 0 && (
        <FadeIn delay={0.2}>
          <SectionHeading
            title={
              <>
                <Star className="w-4 h-4 inline mr-1" style={{ color: "#E8B86D" }} />
                {t("family.topSynergy")}
              </>
            }
          />
          <div className="space-y-2 mb-4">
            {topSynergy.slice(0, 8).map((c, i) => (
              <motion.div
                key={`${c.city.name}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <GlassCard
                  variant={i === 0 ? "gold" : i < 3 ? "jade" : "neutral"}
                  className="p-3 cursor-pointer hover:scale-[1.01] transition-transform"
                  onClick={() => setSelected(c)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: "#E8B86D20", color: "#E8B86D" }}
                      >
                        #{i + 1}
                      </span>
                      {c.allMembersAllPositive && <span title={t("family.strict")}>🏆</span>}
                      <div className="min-w-0">
                        <h3 className="font-serif text-base leading-tight truncate" style={{ color: "#F5F0E8" }}>
                          {c.city.name}
                        </h3>
                        <p className="text-[11px] truncate" style={{ color: "#F5F0E860" }}>
                          {c.city.region || c.city.country}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-mono tabular-nums" style={{ color: "#E8B86D" }}>
                        {c.totalSynergy.toFixed(1)}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
                        {t("family.totalSynergy")}
                      </div>
                    </div>
                  </div>
                  {/* Mini synergy breakdown bar */}
                  <div className="mt-2 flex h-1.5 rounded-full overflow-hidden" style={{ background: "#1C1C26" }}>
                    {[
                      { v: c.resonanceScore, color: "#E8B86D" },
                      { v: c.crossAspectScore, color: "#5BB89C" },
                      { v: c.complementarityScore, color: "#5E8FA8" },
                      { v: Math.max(0, c.harmonyScore), color: "#D98E7A" },
                    ].map((seg, si) => {
                      const total = Math.max(
                        c.resonanceScore + Math.max(0, c.crossAspectScore) +
                          c.complementarityScore + Math.max(0, c.harmonyScore),
                        0.1,
                      );
                      const pct = Math.max(0, (seg.v / total) * 100);
                      return <div key={si} style={{ width: `${pct}%`, background: seg.color }} />;
                    })}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </FadeIn>
      )}

      {/* Best by synergy type */}
      {Object.keys(bestByType).length > 0 && (
        <FadeIn delay={0.25}>
          <SectionHeading
            title={
              <>
                <Award className="w-4 h-4 inline mr-1" style={{ color: "#E8B86D" }} />
                {t("family.bestSynergyType")}
              </>
            }
          />
          <div className="grid grid-cols-2 gap-2 mb-4">
            <BestByTypeCard icon={<Zap className="w-3 h-3" />} label={t("family.resonance")} desc={t("family.resonanceDesc")} city={bestByType.resonance} onClick={setSelected} />
            <BestByTypeCard icon={<GitBranch className="w-3 h-3" />} label={t("family.crossAspect")} desc={t("family.crossAspectDesc")} city={bestByType.crossAspect} onClick={setSelected} />
            <BestByTypeCard icon={<Scale className="w-3 h-3" />} label={t("family.complementarity")} desc={t("family.complementarityDesc")} city={bestByType.complementarity} onClick={setSelected} />
            <BestByTypeCard icon={<Star className="w-3 h-3" />} label={t("family.harmony")} desc={t("family.harmonyDesc")} city={bestByType.harmony} onClick={setSelected} />
          </div>
        </FadeIn>
      )}

      {/* Selected city detail drawer */}
      <AnimatePresence>
        {selected && (
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
                    {selected.city.name} {selected.allMembersAllPositive && "🏆"}
                  </h3>
                  <p className="text-xs" style={{ color: "#F5F0E860" }}>
                    {selected.city.country} · {selected.city.region}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="text-sm" style={{ color: "#F5F0E860" }}>
                  ✕
                </button>
              </div>

              {/* Headline metrics */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <Metric label={t("family.totalSynergy")} value={selected.totalSynergy.toFixed(1)} color="#E8B86D" />
                <Metric label={t("family.abundance")} value={selected.abundanceIndex.toFixed(2)} color="#5BB89C" />
                <Metric label={t("family.resonance")} value={selected.resonanceScore.toFixed(1)} color="#E8B86D" />
                <Metric label={t("family.harmony")} value={selected.harmonyScore.toFixed(2)} color="#5E8FA8" />
              </div>

              {/* Sphere leaders */}
              {selected.sphereLeaders.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#F5F0E860" }}>
                    {t("family.sphereLeaders")}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selected.sphereLeaders.map((l) => (
                      <span
                        key={l.sphere}
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: "#5BB89C15", color: "#5BB89C" }}
                      >
                        {t(`sphere.${l.sphere}`)}: {l.leader}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resonances */}
              {selected.resonances.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#F5F0E860" }}>
                    {t("family.resonance")}
                  </p>
                  <div className="space-y-1">
                    {selected.resonances.slice(0, 5).map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span style={{ color: "#F5F0E8" }}>
                          {r.planet} ×{r.count}{" "}
                          <span style={{ color: "#F5F0E860" }}>({r.members.join(", ")})</span>
                        </span>
                        <span className="font-mono" style={{ color: "#E8B86D" }}>
                          +{r.score.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Family average sphere bars */}
              <div>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#F5F0E860" }}>
                  {t("family.familyAvg")}
                </p>
                <div className="space-y-1">
                  {SPHERES.map((s) => {
                    const v = selected.familyAvg[s];
                    const pct = Math.min(100, Math.max(0, (v / 3) * 100));
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <span className="text-[10px] w-14 shrink-0" style={{ color: "#F5F0E860" }}>
                          {t(`sphere.${s}`)}
                        </span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#1C1C26" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: v >= 0 ? "#5BB89C" : "#D98E7A",
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-mono w-10 text-right" style={{ color: v >= 0 ? "#5BB89C" : "#D98E7A" }}>
                          {v.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
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
      <div className="text-lg font-mono" style={{ color }}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
        {label}
      </div>
    </div>
  );
}

function BestByTypeCard({
  icon,
  label,
  desc,
  city,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  city?: FamilyCityReportDTO;
  onClick: (c: FamilyCityReportDTO) => void;
}) {
  if (!city) return null;
  return (
    <GlassCard
      variant="neutral"
      className="p-3 cursor-pointer hover:scale-[1.02] transition-transform"
      onClick={() => onClick(city)}
    >
      <div className="flex items-center gap-1 mb-1" style={{ color: "#E8B86D" }}>
        {icon}
        <span className="text-[11px] font-medium" style={{ color: "#F5F0E8" }}>
          {label}
        </span>
      </div>
      <p className="font-serif text-base leading-tight" style={{ color: "#F5F0E8" }}>
        {city.city.name}
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: "#F5F0E860" }}>
        {desc}
      </p>
    </GlassCard>
  );
}

export default FamilyAstroScreen;
