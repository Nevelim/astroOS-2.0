"use client";
/**
 * useRankedCities — fetches real ranked cities from /api/calculate with rankCities=true.
 * Returns top ranked cities with their astro influences.
 */
import { useState, useEffect } from "react";
import { useMember, mockMember } from "./useMember";

export interface RankedCity {
  rank: number;
  city: {
    id: string; name: string; country: string;
    lat: number; lng: number;
    qolIndex?: number; costIndex?: number; population?: number; climate?: string;
  };
  index: {
    index: number; tone: string; matchType: string; demoted: boolean;
    magnetism: number; visibility: number; irrationality: number;
  };
  influences: Array<{ planet: string; type: string; distKm: number; zone: string; weight: number }>;
  sandwichPosition: "anchor" | "editor" | "chosen" | null;
}

export function useRankedCities(limit = 5) {
  const [cities, setCities] = useState<RankedCity[]>([]);
  const [loading, setLoading] = useState(true);
  const { member } = useMember();

  useEffect(() => {
    const m = member ?? mockMember();
    const birth = {
      birthDateTime: m.birth.isoDateTime,
      birthLat: m.birth.lat,
      birthLng: m.birth.lng,
      birthTzOffset: m.birth.tzOffset,
      birthPlaceName: m.birth.placeName,
      gender: m.birth.gender,
      rankCities: true,
      cityLimit: limit,
    };

    fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(birth),
    })
      .then(r => r.json())
      .then(d => {
        if (d.rankedCities) {
          setCities(d.rankedCities.slice(0, limit));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [member, limit]);

  return { cities, loading };
}
