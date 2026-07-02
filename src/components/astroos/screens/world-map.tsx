"use client";
/**
 * WorldMapScreen — реальная карта астролиний + CityIndex ranking.
 * Заменяет mock SVG на react-leaflet карту с 44 great-circle линиями.
 * Clean Architecture: Interface Adapter, использует AstroMap component + api-client.
 */
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { GlassCard, Pill, CosmicButton, SectionHeading, FadeIn } from "../ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { SPHERES } from "@/lib/astroos/data";
import { api, type RankedCityDTO } from "@/lib/astroos/real/api-client";
import { useMember, mockMember } from "@/lib/astroos/real/useMember";
import { motion, AnimatePresence } from "framer-motion";
import { Map as MapIcon, Sparkles, TrendingUp, AlertCircle, Star } from "lucide-react";

// Leaflet рендерится только на клиенте (dynamic import, ssr: false)
const AstroMap = dynamic(() => import("../map/AstroMap").then((m) => m.AstroMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "#0B0B0F" }}>
      <div className="text-center">
        <Sparkles className="w-6 h-6 mx-auto animate-pulse" style={{ color: "#E8B86D" }} />
        <p className="mt-2 text-xs font-serif italic" style={{ color: "#F5F0E8" }}>Loading cosmic map...</p>
      </div>
    </div>
  ),
});

interface WorldMapScreenProps {
  onNavigate?: (k: import("@/lib/astroos/data").ScreenKey) => void;
}

export function WorldMapScreen({ onNavigate }: WorldMapScreenProps) {
  const { t, locale } = useI18n();
  const [selectedCity, setSelectedCity] = useState<RankedCityDTO | null>(null);
  const [ranking, setRanking] = useState<RankedCityDTO[] | null>(null);

  const { member } = useMember();

  const birthData = useMemo(() => {
    const m = member ?? mockMember();
    return {
      birthDateTime: m.birth.isoDateTime,
      birthLat: m.birth.lat,
      birthLng: m.birth.lng,
      birthTzOffset: m.birth.tzOffset,
      birthPlaceName: m.birth.placeName,
      gender: m.birth.gender,
    };
  }, [member]);

  const top3 = useMemo(() => (ranking ?? []).filter((c) => c.sandwichPosition).slice(0, 3), [ranking]);
  const demoted = useMemo(() => (ranking ?? []).filter((c) => c.index.demoted).slice(0, 5), [ranking]);

  return (
    <div className="min-h-screen pb-20" style={{ background: "#0B0B0F" }}>
      {/* Header */}
      <FadeIn className="mb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl" style={{ color: "#F5F0E8" }}>
              {locale === "ru" ? "Астрокартография" : locale === "hi" ? "खगोलीय मानचित्र" : "Astrocartography"}
            </h1>
            <p className="text-xs mt-1" style={{ color: "#F5F0E860" }}>
              {locale === "ru" ? "44 планетарные линии · CityIndex ранжирование · real astronomy-engine"
                : locale === "hi" ? "44 ग्रह रेखाएं · CityIndex रैंकिंग · वास्तविक astronomy-engine"
                : "44 planetary lines · CityIndex ranking · real astronomy-engine"}
            </p>
          </div>
          <Pill tone="gold">
            <MapIcon className="w-3 h-3 inline mr-1" /> {locale === "ru" ? "react-leaflet" : "react-leaflet"}
          </Pill>
        </div>
      </FadeIn>

      {/* Map — main canvas */}
      <FadeIn delay={0.1}>
        <GlassCard variant="gold" className="p-0 overflow-hidden mb-4" ornamental style={{ height: "55vh", minHeight: 400 }}>
          <AstroMap
            birthData={birthData}
            onCitySelect={(city) => setSelectedCity(city as unknown as RankedCityDTO)}
            selectedCityId={selectedCity?.city.id ?? null}
          />
        </GlassCard>
      </FadeIn>

      {/* Top-3 Sandwich Position */}
      {top3.length > 0 && (
        <FadeIn delay={0.2}>
          <SectionHeading>
            <Star className="w-4 h-4 inline mr-1" style={{ color: "#E8B86D" }} />
            {locale === "ru" ? "Топ-3 города" : locale === "hi" ? "टॉप-3 शहर" : "Top-3 cities"}
          </SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {top3.map((rc) => (
              <motion.div
                key={rc.city.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * top3.indexOf(rc) }}
              >
                <GlassCard
                  variant={rc.sandwichPosition === "anchor" ? "gold" : rc.sandwichPosition === "editor" ? "jade" : "rose"}
                  className="p-4 cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => setSelectedCity(rc)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "#E8B86D20", color: "#E8B86D" }}>
                          #{rc.rank}
                        </span>
                        {rc.sandwichPosition === "anchor" && <span title="Anchor">⚓</span>}
                        {rc.sandwichPosition === "editor" && <span title="Editor's pick">✦</span>}
                        {rc.sandwichPosition === "chosen" && <span title="Most chosen">★</span>}
                      </div>
                      <h3 className="font-serif text-lg leading-tight" style={{ color: "#F5F0E8" }}>{rc.city.name}</h3>
                      <p className="text-xs" style={{ color: "#F5F0E860" }}>{rc.city.country}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono tabular-nums" style={{ color: "#E8B86D" }}>{rc.index.index}</div>
                      <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>Index</div>
                    </div>
                  </div>
                  {rc.influences.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {rc.influences.slice(0, 3).map((inf, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{
                          background: inf.weight > 0 ? "#5BB89C20" : "#D98E7A20",
                          color: inf.weight > 0 ? "#5BB89C" : "#D98E7A",
                        }}>
                          {inf.planet} {inf.type} · {inf.distKm}km
                        </span>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </FadeIn>
      )}

      {/* Demoted — Worth considering */}
      {demoted.length > 0 && (
        <FadeIn delay={0.3}>
          <SectionHeading>
            <AlertCircle className="w-4 h-4 inline mr-1" style={{ color: "#D98E7A" }} />
            {locale === "ru" ? "Стоит рассмотреть" : locale === "hi" ? "विचार करने योग्य" : "Worth considering"}
          </SectionHeading>
          <p className="text-xs mb-2" style={{ color: "#F5F0E860" }}>
            {locale === "ru" ? "Города с повышенным K_irr — исследуйте с осторожностью"
              : "Cities with higher irrationality factor — explore with discernment"}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            {demoted.map((rc) => (
              <GlassCard key={rc.city.id} variant="rose" className="p-2 cursor-pointer" onClick={() => setSelectedCity(rc)}>
                <p className="text-sm font-serif" style={{ color: "#F5F0E8" }}>{rc.city.name}</p>
                <p className="text-[10px]" style={{ color: "#F5F0E860" }}>{rc.city.country}</p>
                <p className="text-[10px] font-mono mt-1" style={{ color: "#D98E7A" }}>K_irr {rc.index.irrationality.toFixed(2)}</p>
              </GlassCard>
            ))}
          </div>
        </FadeIn>
      )}

      {/* Selected city detail */}
      <AnimatePresence>
        {selectedCity && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-0 bottom-0 z-50 p-4"
          >
            <GlassCard variant="gold" className="p-4 max-w-2xl mx-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-xl" style={{ color: "#F5F0E8" }}>{selectedCity.city.name}</h3>
                  <p className="text-xs" style={{ color: "#F5F0E860" }}>{selectedCity.city.country} · {selectedCity.city.climate}</p>
                </div>
                <button onClick={() => setSelectedCity(null)} className="text-sm" style={{ color: "#F5F0E860" }}>✕</button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WorldMapScreen;
