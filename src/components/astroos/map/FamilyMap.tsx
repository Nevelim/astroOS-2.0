"use client";
/**
 * FamilyMap — leaflet map showing top family-synergy cities as scaled markers.
 *
 * Marker radius and color encode totalSynergy (bigger + warmer = stronger
 * family resonance). Strict cities (all members positive) get a gold ring.
 * Clicking a city selects it (props.onSelect) for the detail drawer.
 */
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import type { FamilyCityReportDTO } from "@/lib/astroos/real/api-client";

const TILE_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

interface FamilyMapProps {
  cities: FamilyCityReportDTO[];
  selectedName?: string | null;
  onSelect?: (c: FamilyCityReportDTO) => void;
}

/** Recenter the map when the top city changes. */
function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  // Avoid jumping on every render — only when center materially changes.
  const cur = map.getCenter();
  if (Math.abs(cur.lat - center[0]) > 0.5 || Math.abs(cur.lng - center[1]) > 0.5) {
    map.setView(center, map.getZoom(), { animate: true });
  }
  return null;
}

/** Map a synergy score to a warm color (jade → gold → rose for top). */
function synergyColor(rank: number, total: number): string {
  // rank 0 = best. Hue from gold (#E8B86D) to rose (#D98E7A) for the top.
  if (rank === 0) return "#E8B86D";
  if (rank < total * 0.2) return "#D9A75D";
  if (rank < total * 0.5) return "#5BB89C";
  return "#5E8FA8";
}

export function FamilyMap({ cities, selectedName, onSelect }: FamilyMapProps) {
  if (cities.length === 0) return null;

  const top = cities[0];
  const center: [number, number] = [top.city.lat, top.city.lng];
  const maxSynergy = Math.max(...cities.map((c) => c.totalSynergy), 1);

  return (
    <MapContainer
      center={center}
      zoom={3}
      minZoom={2}
      maxZoom={10}
      worldCopyJump
      scrollWheelZoom
      style={{ width: "100%", height: "100%", background: "#0B0B0F" }}
      attributionControl={false}
    >
      <TileLayer url={TILE_DARK} noWrap={false} />
      <Recenter center={center} />

      {cities.map((c, i) => {
        // Radius 8..28 scaled by synergy share; strict cities get a gold halo.
        const share = c.totalSynergy / maxSynergy;
        const radius = 8 + share * 20;
        const isSelected = selectedName === c.city.name;
        const isStrict = c.allMembersAllPositive;
        return (
          <CircleMarker
            key={`${c.city.name}-${i}`}
            center={[c.city.lat, c.city.lng]}
            radius={radius}
            pathOptions={{
              color: isStrict ? "#E8B86D" : synergyColor(i, cities.length),
              fillColor: synergyColor(i, cities.length),
              fillOpacity: isSelected ? 0.85 : 0.55,
              weight: isStrict ? 3 : isSelected ? 2 : 1,
            }}
            eventHandlers={{ click: () => onSelect?.(c) }}
          >
            <Tooltip direction="top" offset={[0, -radius]} opacity={1}>
              <div style={{ fontFamily: "serif", color: "#F5F0E8" }}>
                <strong>{c.city.name}</strong>
                <div style={{ fontSize: 10, opacity: 0.8 }}>{c.city.country}</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  ✦ {c.totalSynergy.toFixed(1)} · ☯ {c.abundanceIndex.toFixed(2)}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

export default FamilyMap;
