"use client";
/**
 * useMember — hook для получения текущего Member.
 * Clean Architecture: Interface Adapter, bridge между backend API и UI.
 * Fallback на mock USER если не залогинен (прототип-режим).
 */
import { useState, useEffect, useCallback } from "react";
import { api, type MemberDTO } from "./api-client";
import { USER } from "../data";

interface UseMemberResult {
  member: MemberDTO | null;
  loading: boolean;
  error: string | null;
  isMock: boolean;
  refresh: () => Promise<void>;
}

export function useMember(): UseMemberResult {
  const [member, setMember] = useState<MemberDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMe();
      if (data.member) {
        setMember(data.member);
      } else {
        setMember(null); // не залогинен
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isMock = !member && !loading;
  return { member, loading, error, isMock, refresh };
}

/** Конвертация mock USER → MemberDTO (для прототип-режима без auth). */
export function mockMember(): MemberDTO {
  return {
    id: "mock-aeliana",
    email: "aeliana@astroos.cosmos",
    displayName: USER.name,
    tier: "trial",
    trialEndsAt: new Date(Date.now() + 5 * 86400_000).toISOString(),
    locale: "ru",
    voice: "calm",
    streak: USER.streak,
    wardThisWeek: 4,
    isPremium: false,
    bazi: {
      dayMaster: USER.dayMasterStem,
      dayMasterElement: USER.dayMasterEl,
    },
    birth: {
      isoDateTime: USER.dob,
      placeName: USER.birthPlace,
      lat: USER.birthLat,
      lng: USER.birthLng,
      tzOffset: USER.birthTz,
      gender: USER.gender as 0 | 1,
    },
  };
}
