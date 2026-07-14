"use client";
/**
 * BaZiAdminScreen — read-only reference-catalog viewer.
 *
 * Shows the BaZi reference data (directions, professions, famous-people
 * counts) that power the B2C report. Read-only — full DB-backed editing is
 * a future iteration. Useful for content review and QA.
 */
import { useState, useEffect } from "react";
import { GlassCard, Pill, SectionHeading, FadeIn } from "../ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { Database, AlertCircle } from "lucide-react";

const ELEMENT_DISPLAY: Record<string, { color: string; ru: string; en: string }> = {
  wood: { color: "#5BB89C", ru: "Дерево", en: "Wood" },
  fire: { color: "#E8B86D", ru: "Огонь", en: "Fire" },
  earth: { color: "#D98E7A", ru: "Земля", en: "Earth" },
  metal: { color: "#5E8FA8", ru: "Металл", en: "Metal" },
  water: { color: "#6B8FB5", ru: "Вода", en: "Water" },
};

interface Catalog {
  directions: Record<string, { direction: string; purpose: string; countries: string[] }>;
  professions: Record<string, Array<{ title: string; title_ru: string; reason: string }>>;
  famous_people_counts: Record<string, number>;
  famous_people_total: number;
}

export function BaZiAdminScreen() {
  const { locale } = useI18n();
  const L = (ru: string, en: string) => (locale === "ru" ? ru : en);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bazi/admin")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setCatalog)
      .catch(() => setError(L("Сервис недоступен", "Service unavailable")));
  }, []);

  if (error || !catalog) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B0B0F" }}>
        <GlassCard variant="rose" className="p-4 max-w-md">
          <p className="text-sm flex items-center gap-2" style={{ color: "#D98E7A" }}>
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        </GlassCard>
      </div>
    );
  }

  const el = (e: string) => ELEMENT_DISPLAY[e] ?? ELEMENT_DISPLAY.earth;

  return (
    <div className="min-h-screen pb-20" style={{ background: "#0B0B0F" }}>
      <FadeIn className="mb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "#5E8FA8" }}>
              {L("Справочники (read-only)", "Reference catalogs (read-only)")}
            </p>
            <h1 className="font-serif text-2xl md:text-3xl mt-1" style={{ color: "#F5F0E8" }}>
              {t_nav(locale)}
            </h1>
          </div>
          <Pill tone="water"><Database className="w-3 h-3 inline mr-1" /> {catalog.famous_people_total} {L("личностей", "people")}</Pill>
        </div>
      </FadeIn>

      {/* Famous people stats */}
      <FadeIn delay={0.05}>
        <GlassCard variant="neutral" className="p-4 mb-4">
          <h3 className="font-serif text-lg mb-3" style={{ color: "#F5F0E8" }}>
            {L("Известные личности по Day Master", "Famous people by Day Master")}
          </h3>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {Object.entries(catalog.famous_people_counts).map(([stem, count]) => (
              <div key={stem} className="text-center p-2 rounded" style={{ background: "#1C1C26" }}>
                <div className="text-2xl" style={{ fontFamily: "serif", color: "#E8B86D" }}>{stem}</div>
                <div className="text-sm font-mono" style={{ color: "#F5F0E8" }}>{count}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </FadeIn>

      {/* Directions + countries table */}
      <FadeIn delay={0.1}>
        <SectionHeading title={L("Стороны света и страны", "Directions & countries")} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {Object.entries(catalog.directions).map(([element, d]) => {
            const disp = el(element);
            return (
              <GlassCard key={element} variant="neutral" className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: disp.color }} />
                  <span className="font-medium text-sm" style={{ color: disp.color }}>
                    {locale === "ru" ? disp.ru : disp.en}
                  </span>
                  <span className="text-xs ml-auto font-mono" style={{ color: "#9A9AA8" }}>{d.direction}</span>
                </div>
                <p className="text-[11px] mb-1" style={{ color: "#F5F0E8A0" }}>{d.purpose}</p>
                <p className="text-[10px]" style={{ color: "#9A9AA8" }}>{d.countries.join(", ")}</p>
              </GlassCard>
            );
          })}
        </div>
      </FadeIn>

      {/* Professions */}
      <FadeIn delay={0.15}>
        <SectionHeading title={L("Профессии по стихиям", "Professions by element")} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {Object.entries(catalog.professions).map(([element, profs]) => {
            const disp = el(element);
            return (
              <GlassCard key={element} variant="neutral" className="p-3">
                <span className="font-medium text-sm block mb-2" style={{ color: disp.color }}>
                  {locale === "ru" ? disp.ru : disp.en}
                </span>
                {profs.map((p, i) => (
                  <div key={i} className="text-[11px] mb-1">
                    <span style={{ color: "#F5F0E8" }}>{locale === "ru" ? p.title_ru : p.title}</span>
                    <span style={{ color: "#9A9AA8" }}> — {p.reason}</span>
                  </div>
                ))}
              </GlassCard>
            );
          })}
        </div>
      </FadeIn>
    </div>
  );
}

function t_nav(locale: string) {
  return locale === "ru" ? "Ба Цзы · Справочники" : "BaZi · Admin";
}

export default BaZiAdminScreen;
