"use client";
/**
 * useProfileData — fetches real member data + natal chart for Profile screen.
 * Combines /api/auth/me (member info) + /api/calculate (Sun/Moon/Rising signs)
 * + /api/bazi/calculate (Day Master).
 * Falls back to mockMember when not authenticated.
 */
import { useState, useEffect } from "react";
import { useMember, mockMember, type MemberDTO } from "./useMember";

export interface ProfileNatalData {
  sunSign: string;
  moonSign: string;
  risingSign: string;
  dayMaster: string;
  dayMasterElement: string;
  ascendantLonDeg: number;
  midheavenLonDeg: number;
}

const ZODIAC_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

function lonToSign(lon: number): string {
  const idx = Math.floor((((lon % 360) + 360) % 360) / 30);
  return ZODIAC_NAMES[idx] ?? "Aries";
}

interface UseProfileDataResult {
  member: MemberDTO | null;
  natal: ProfileNatalData | null;
  loading: boolean;
  isMock: boolean;
}

export function useProfileData(): UseProfileDataResult {
  const { member, loading: memberLoading, isMock } = useMember();
  const [natal, setNatal] = useState<ProfileNatalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (memberLoading) return;
    const m = member ?? mockMember();
    const birth = {
      birthDateTime: m.birth.isoDateTime,
      birthLat: m.birth.lat,
      birthLng: m.birth.lng,
      birthTzOffset: m.birth.tzOffset,
      birthPlaceName: m.birth.placeName,
      gender: m.birth.gender,
    };

    Promise.all([
      fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(birth),
      }).then(r => r.json()),
      fetch("/api/bazi/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(birth),
      }).then(r => r.json()),
    ])
      .then(([calc, bazi]) => {
        const sunPos = calc.planetPositions?.find((p: { planet: string }) => p.planet === "Sun");
        const moonPos = calc.planetPositions?.find((p: { planet: string }) => p.planet === "Moon");
        setNatal({
          sunSign: sunPos ? lonToSign(sunPos.eclipticLonDeg) : "Scorpio",
          moonSign: moonPos ? lonToSign(moonPos.eclipticLonDeg) : "Pisces",
          risingSign: calc.ascendantLonDeg != null ? lonToSign(calc.ascendantLonDeg) : "Leo",
          dayMaster: bazi.bazi?.dayMaster ?? "辛",
          dayMasterElement: bazi.bazi?.dayMasterElement ?? "Metal",
          ascendantLonDeg: calc.ascendantLonDeg ?? 0,
          midheavenLonDeg: calc.midheavenLonDeg ?? 0,
        });
        setLoading(false);
      })
      .catch(() => {
        // Fallback to mock signs
        setNatal({
          sunSign: "Scorpio",
          moonSign: "Pisces",
          risingSign: "Leo",
          dayMaster: "辛",
          dayMasterElement: "Metal",
          ascendantLonDeg: 0,
          midheavenLonDeg: 0,
        });
        setLoading(false);
      });
  }, [member, memberLoading]);

  return { member, natal, loading: loading || memberLoading, isMock };
}
