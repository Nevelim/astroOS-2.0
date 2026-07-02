"use client";
/**
 * AstroMap — реальная интерактивная карта астролиний на react-leaflet.
 * 44 great-circle линии, antimeridian wrapping, orbis zones, city markers.
 * Hades 2 визуал: glow, ornamental borders, cosmic loading.
 *
 * Clean Architecture: это Interface Adapter (presenter), не содержит бизнес-логики.
 * Данные берёт из /api/calculate.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MapPin, Navigation, Loader2 } from "lucide-react";

interface AstroLinePoint { lat: number; lng: number }
interface AstroLine {
  planet: string; type: string; points: AstroLinePoint[];
  weight: number; tone: "gold" | "jade" | "rose" | "neutral"; id: string;
}
interface RankedCity {
  rank: number; city: { id: string; name: string; country: string; lat: number; lng: number; qolIndex?: number; costIndex?: number; population?: number; climate?: string };
  index: { index: number; tone: string; matchType: string; demoted: boolean; magnetism: number; visibility: number };
  influences: Array<{ planet: string; type: string; distKm: number; zone: string; weight: number }>;
  sandwichPosition: string | null;
}

const PLANET_COLORS: Record<string, string> = {
  Sun: "#FBBF24", Moon: "#94A3B8", Mercury: "#60A5FA", Venus: "#F472B6",
  Mars: "#EF4444", Jupiter: "#A78BFA", Saturn: "#94A3B8",
  Uranus: "#22D3EE", Neptune: "#2DD4BF", Pluto: "#9333EA",
};

const TONE_COLORS: Record<string, string> = {
  gold: "#E8B86D", jade: "#5BB89C", rose: "#D98E7A", neutral: "#5E8FA8",
};

const LINE_TYPE_LABEL: Record<string, string> = {
  MC: "Career · status", IC: "Home · roots",
  Asc: "Self · vitality", Desc: "Partnerships",
};

interface AstroMapProps {
  birthData: {
    birthDateTime: string; birthLat: number; birthLng: number;
    birthTzOffset: number; birthPlaceName: string; gender: 0 | 1;
  };
  onCitySelect?: (city: RankedCity) => void;
  selectedCityId?: string | null;
  className?: string;
}

function FlyToController({ target, zoom }: { target: { lat: number; lng: number } | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], zoom ?? 6, { duration: 1.5 });
    }
  }, [target, zoom, map]);
  return null;
}

export function AstroMap({ birthData, onCitySelect, selectedCityId, className }: AstroMapProps) {
  const [lines, setLines] = useState<AstroLine[]>([]);
  const [rankedCities, setRankedCities] = useState<RankedCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<"dark" | "satellite" | "light">("dark");
  const [visiblePlanets, setVisiblePlanets] = useState<Set<string>>(new Set(["Sun", "Moon", "Venus", "Jupiter"]));
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Загрузка линий + ранжирование городов
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...birthData, rankCities: true, cityLimit: 50 }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setLines(data.lines ?? []);
        setRankedCities(data.rankedCities ?? []);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [birthData.birthDateTime, birthData.birthLat, birthData.birthLng]);

  const filteredLines = useMemo(
    () => lines.filter((l) => visiblePlanets.has(l.planet)),
    [lines, visiblePlanets]
  );

  const selectedCity = useMemo(
    () => rankedCities.find((c) => c.city.id === selectedCityId) ?? null,
    [rankedCities, selectedCityId]
  );

  const tileLayer = mapStyle === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : mapStyle === "satellite"
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden rounded-2xl ${className ?? ""}`}
      style={{ background: "#0B0B0F" }}>
      {/* Ornamental border — Hades 2 keepsake frame */}
      <div className="pointer-events-none absolute inset-0 z-[1000] rounded-2xl" style={{
        boxShadow: "inset 0 0 0 1px rgba(232,184,109,0.2), inset 0 0 30px rgba(11,11,15,0.6)",
      }} />
      <div className="pointer-events-none absolute top-2 left-2 z-[1000] w-4 h-4 border-t border-l" style={{ borderColor: "#E8B86D80" }} />
      <div className="pointer-events-none absolute top-2 right-2 z-[1000] w-4 h-4 border-t border-r" style={{ borderColor: "#E8B86D80" }} />
      <div className="pointer-events-none absolute bottom-2 left-2 z-[1000] w-4 h-4 border-b border-l" style={{ borderColor: "#E8B86D80" }} />
      <div className="pointer-events-none absolute bottom-2 right-2 z-[1000] w-4 h-4 border-b border-r" style={{ borderColor: "#E8B86D80" }} />

      {/* Map controls — Hades 2 glassmorphism */}
      <div className="absolute top-3 left-3 z-[1000] flex gap-1.5">
        {(["dark", "satellite", "light"] as const).map((s) => (
          <button key={s} onClick={() => setMapStyle(s)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium tracking-wide backdrop-blur-md transition-all ${
              mapStyle === s ? "text-[#0B0B0F]" : "text-[#F5F0E8]/70 hover:text-[#F5F0E8]"
            }`}
            style={mapStyle === s
              ? { background: "#E8B86D", boxShadow: "0 0 12px rgba(232,184,109,0.5)" }
              : { background: "rgba(11,11,15,0.6)", border: "1px solid rgba(232,184,109,0.2)" }}
          >
            {s === "dark" ? "Cosmic" : s === "satellite" ? "Earth" : "Parchment"}
          </button>
        ))}
      </div>

      {/* Planet filter pills */}
      <div className="absolute top-3 right-3 z-[1000] max-w-[180px] flex flex-wrap gap-1 justify-end">
        {Object.entries(PLANET_COLORS).map(([planet, color]) => {
          const active = visiblePlanets.has(planet);
          return (
            <button key={planet} onClick={() => {
              const next = new Set(visiblePlanets);
              if (active) next.delete(planet); else next.add(planet);
              setVisiblePlanets(next.size === 0 ? new Set([planet]) : next);
            }}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                active ? "scale-100" : "scale-90 opacity-40"
              }`}
              style={{
                background: active ? `${color}30` : "rgba(11,11,15,0.6)",
                border: `1px solid ${color}`,
                color,
                boxShadow: active ? `0 0 8px ${color}80` : "none",
              }}
              title={planet}
            >
              {planet[0]}
            </button>
          );
        })}
      </div>

      {/* Loading — cosmic spinner Hades 2 style */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[1500] flex flex-col items-center justify-center"
            style={{ background: "rgba(11,11,15,0.85)", backdropFilter: "blur(8px)" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-full border-2 border-transparent relative"
              style={{ borderTopColor: "#E8B86D", borderRightColor: "#5BB89C" }}>
              <Sparkles className="absolute inset-0 m-auto w-5 h-5" style={{ color: "#E8B86D" }} />
            </motion.div>
            <p className="mt-4 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
              Calculating your cosmic lines...
            </p>
            <p className="mt-1 text-[11px] font-mono" style={{ color: "#E8B86D" }}>
              44 great-circle paths · Rodrigues rotation
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="absolute inset-0 z-[1500] flex items-center justify-center" style={{ background: "rgba(11,11,15,0.9)" }}>
          <div className="text-center max-w-xs">
            <p className="text-sm" style={{ color: "#D98E7A" }}>Map calculation failed</p>
            <p className="text-xs mt-1 font-mono" style={{ color: "#F5F0E860" }}>{error}</p>
          </div>
        </div>
      )}

      <MapContainer
        center={[birthData.birthLat, birthData.birthLng]}
        zoom={3}
        minZoom={2}
        maxZoom={12}
        worldCopyJump
        scrollWheelZoom
        style={{ width: "100%", height: "100%", background: "#0B0B0F" }}
        attributionControl={false}
      >
        <TileLayer url={tileLayer} noWrap={false} />

        {/* 44 great-circle линии с antimeridian wrapping */}
        {filteredLines.map((line) => {
          const color = TONE_COLORS[line.tone] ?? PLANET_COLORS[line.planet] ?? "#E8B86D";
          return (
            <Polyline
              key={line.id}
              positions={line.points.map((p) => [p.lat, p.lng]) as [number, number][]}
              pathOptions={{
                color,
                weight: 2,
                opacity: 0.75,
                dashArray: line.weight < 0 ? "6 4" : undefined,
              }}
              eventHandlers={{
                mouseover: (e) => {
                  e.target.setStyle({ weight: 4, opacity: 1 });
                },
                mouseout: (e) => {
                  e.target.setStyle({ weight: 2, opacity: 0.75 });
                },
              }}
            >
              <Tooltip sticky>
                <div className="text-xs">
                  <span style={{ color }}>{line.planet}</span> · {LINE_TYPE_LABEL[line.type] ?? line.type}
                  <br />
                  <span className="opacity-60">weight {line.weight > 0 ? "+" : ""}{line.weight}</span>
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* Birthplace marker */}
        <CircleMarker
          center={[birthData.birthLat, birthData.birthLng]}
          radius={8}
          pathOptions={{ color: "#E8B86D", fillColor: "#E8B86D", fillOpacity: 0.8, weight: 2 }}
        >
          <Popup>
            <div className="text-xs">
              <strong style={{ color: "#E8B86D" }}>Birthplace</strong>
              <br />
              {birthData.birthPlaceName}
            </div>
          </Popup>
        </CircleMarker>

        {/* Ranked city markers — multi-color conic-gradient */}
        {rankedCities.slice(0, 50).map((rc) => {
          const tone = rc.index.tone as string;
          const color = TONE_COLORS[tone] ?? "#5E8FA8";
          const isTop3 = rc.sandwichPosition !== null;
          return (
            <CircleMarker
              key={rc.city.id}
              center={[rc.city.lat, rc.city.lng]}
              radius={isTop3 ? 7 : 4}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: rc.index.demoted ? 0.3 : 0.7,
                weight: isTop3 ? 2 : 1,
              }}
              eventHandlers={{
                click: () => {
                  setFlyTarget({ lat: rc.city.lat, lng: rc.city.lng });
                  onCitySelect?.(rc);
                },
              }}
            >
              <Tooltip>
                <div className="text-xs">
                  <strong>#{rc.rank} {rc.city.name}</strong>
                  <br />
                  <span style={{ color }}>CityIndex {rc.index.index}</span>
                  {isTop3 && (
                    <>
                      <br />
                      <span style={{ color: "#E8B86D" }}>
                        {rc.sandwichPosition === "anchor" ? "⚓ Anchor" : rc.sandwichPosition === "editor" ? "✦ Editor's pick" : "★ Most chosen"}
                      </span>
                    </>
                  )}
                  {rc.index.demoted && <><br /><span style={{ color: "#D98E7A" }}>Worth considering</span></>}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        <FlyToController target={flyTarget} zoom={6} />
      </MapContainer>

      {/* Selected city detail drawer — Hades 2 ornamental */}
      <AnimatePresence>
        {selectedCity && (
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="absolute bottom-4 left-4 z-[1100] w-[300px] max-w-[calc(100%-2rem)] rounded-xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(11,11,15,0.95), rgba(20,20,30,0.95))",
              border: "1px solid rgba(232,184,109,0.3)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,184,109,0.1)",
            }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono" style={{ color: "#E8B86D" }}>#{selectedCity.rank}</span>
                    {selectedCity.sandwichPosition && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#E8B86D20", color: "#E8B86D" }}>
                        {selectedCity.sandwichPosition === "anchor" ? "Anchor" : selectedCity.sandwichPosition === "editor" ? "Editor" : "Chosen"}
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-lg leading-tight" style={{ color: "#F5F0E8" }}>
                    {selectedCity.city.name}
                  </h3>
                  <p className="text-xs" style={{ color: "#F5F0E860" }}>{selectedCity.city.country}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono tabular-nums" style={{ color: TONE_COLORS[selectedCity.index.tone] ?? "#E8B86D" }}>
                    {selectedCity.index.index}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>CityIndex</div>
                </div>
              </div>

              {/* Score breakdown */}
              <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="flex justify-between"><span style={{ color: "#F5F0E860" }}>Magnetism</span><span className="font-mono" style={{ color: "#E8B86D" }}>{(selectedCity.index.magnetism * 100).toFixed(0)}</span></div>
                <div className="flex justify-between"><span style={{ color: "#F5F0E860" }}>Visibility</span><span className="font-mono" style={{ color: "#5BB89C" }}>{(selectedCity.index.visibility * 100).toFixed(0)}</span></div>
                <div className="flex justify-between"><span style={{ color: "#F5F0E860" }}>QoL</span><span className="font-mono">{selectedCity.city.qolIndex ?? "—"}</span></div>
                <div className="flex justify-between"><span style={{ color: "#F5F0E860" }}>Climate</span><span className="font-mono">{selectedCity.city.climate ?? "—"}</span></div>
              </div>

              {/* Top influences */}
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#F5F0E860" }}>Planetary influences</p>
                <div className="space-y-1">
                  {selectedCity.influences.slice(0, 4).map((inf, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <span style={{ color: PLANET_COLORS[inf.planet] }}>{inf.planet[0]}</span>
                      <span style={{ color: "#F5F0E8" }}>{inf.planet} {inf.type}</span>
                      <span className="ml-auto font-mono" style={{ color: inf.weight > 0 ? "#5BB89C" : "#D98E7A" }}>
                        {inf.distKm}km
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedCity.index.demoted && (
                <div className="mt-3 p-2 rounded text-[10px] italic" style={{ background: "#D98E7A15", color: "#D98E7A" }}>
                  Worth considering — higher irrationality factor. Explore with discernment.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats footer */}
      <div className="absolute bottom-3 right-3 z-[1000] px-2.5 py-1.5 rounded-lg text-[10px] font-mono backdrop-blur-md" style={{ background: "rgba(11,11,15,0.7)", border: "1px solid rgba(232,184,109,0.2)" }}>
        <span style={{ color: "#E8B86D" }}>{filteredLines.length}</span>
        <span style={{ color: "#F5F0E860" }}> lines · </span>
        <span style={{ color: "#5BB89C" }}>{rankedCities.length}</span>
        <span style={{ color: "#F5F0E860" }}> cities</span>
      </div>
    </div>
  );
}

export default AstroMap;
