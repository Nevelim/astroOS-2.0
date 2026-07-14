"use client";
/**
 * MemberRoster + MemberBirthRow — repeatable family-member birth-data input.
 *
 * Used by the unified Astro Travel screen in "Family" mode. Collects 1–5
 * members, each with name + date + time + place (via CityAutocomplete), and
 * emits a normalized member list for the family-abundance API.
 *
 * Reuses CityAutocomplete (place + tz resolution) and the visual primitives
 * from birth.tsx. The first member is the "anchor" whose planetary lines are
 * drawn on the map.
 */
import { useState, useCallback } from "react";
import { GlassCard, CosmicButton } from "../ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { CityAutocomplete } from "@/components/astroos/real/CityAutocomplete";
import type { ResolvedBirthDTO } from "@/lib/astroos/real/api-client";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, User } from "lucide-react";

/** A normalized member ready for the family-abundance API. */
export interface MemberEntry {
  key: string;
  name: string;
  birthUtc: string;  // ISO-8601 UTC
  lat: number;
  lng: number;
  /** Whether all required fields are present. */
  complete: boolean;
}

export interface MemberRosterProps {
  members: MemberEntry[];
  onChange: (members: MemberEntry[]) => void;
  max?: number;
}

export function MemberRoster({ members, onChange, max = 5 }: MemberRosterProps) {
  const { t, locale } = useI18n();

  const add = useCallback(() => {
    if (members.length >= max) return;
    const key = `m${Date.now()}`;
    onChange([...members, { key, name: "", birthUtc: "", lat: 0, lng: 0, complete: false }]);
  }, [members, onChange, max]);

  const remove = useCallback((key: string) => {
    if (members.length <= 1) return;
    onChange(members.filter((m) => m.key !== key));
  }, [members, onChange]);

  const update = useCallback((key: string, patch: Partial<MemberEntry>) => {
    onChange(members.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  }, [members, onChange]);

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {members.map((m, i) => (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <MemberBirthRow
              index={i}
              member={m}
              canRemove={members.length > 1}
              onUpdate={(patch) => update(m.key, patch)}
              onRemove={() => remove(m.key)}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {members.length < max && (
        <CosmicButton variant="jade" onClick={add} className="w-full">
          <UserPlus className="w-4 h-4 inline mr-1" />
          {locale === "ru" ? "Добавить участника" : locale === "hi" ? "सदस्य जोड़ें" : "Add member"}
          <span className="text-[10px] opacity-60 ml-1">({members.length}/{max})</span>
        </CosmicButton>
      )}
    </div>
  );
}

interface MemberBirthRowProps {
  index: number;
  member: MemberEntry;
  canRemove: boolean;
  onUpdate: (patch: Partial<MemberEntry>) => void;
  onRemove: () => void;
}

function MemberBirthRow({ index, member, canRemove, onUpdate, onRemove }: MemberBirthRowProps) {
  const { locale } = useI18n();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [unknownTime, setUnknownTime] = useState(false);

  // Sync internal date/time fields when member changes externally (e.g. add).
  // We intentionally don't re-derive on every keystroke to keep cursor stable.

  const handleCityResolved = (result: ResolvedBirthDTO) => {
    onUpdate({
      lat: result.calculatePayload.birthLat,
      lng: result.calculatePayload.birthLng,
      // birthUtc is the true UTC, resolved by the geo service (DST-aware).
      // We do NOT assemble local-time-as-UTC — that would shift every planet.
      birthUtc: result.birth.utcISO || "",
    });
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    // Date alone cannot produce a UTC instant without the city's timezone.
    // Clear any stale birthUtc; CityAutocomplete will re-resolve on its next
    // pick (it receives the updated birthDateTime prop).
    onUpdate({ birthUtc: "" });
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    // Time change invalidates the resolved UTC until the city is re-confirmed.
    onUpdate({ birthUtc: "" });
  };

  const isAnchor = index === 0;

  return (
    <GlassCard variant={isAnchor ? "gold" : "neutral"} className="p-3">
      <div className="flex items-start gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0"
          style={{ background: isAnchor ? "#E8B86D20" : "#1C1C26", color: isAnchor ? "#E8B86D" : "#9A9AA8" }}>
          <User className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 grid grid-cols-2 gap-2">
          <input
            type="text"
            value={member.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder={locale === "ru" ? "Имя" : locale === "hi" ? "नाम" : "Name"}
            className="col-span-2 sm:col-span-1 astro-input-cosmic rounded px-2 py-1.5 text-sm"
            style={{ background: "#0B0B0F", border: "1px solid #2A2A35", color: "#F5F0E8" }}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="astro-input-cosmic rounded px-2 py-1.5 text-sm"
            style={{ background: "#0B0B0F", border: "1px solid #2A2A35", color: "#F5F0E8" }}
          />
          <div className="flex gap-1 items-center">
            <input
              type="time"
              value={time}
              disabled={unknownTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="astro-input-cosmic rounded px-2 py-1.5 text-sm flex-1 disabled:opacity-40"
              style={{ background: "#0B0B0F", border: "1px solid #2A2A35", color: "#F5F0E8" }}
            />
          </div>
          <label className="col-span-2 flex items-center gap-1.5 text-[11px]" style={{ color: "#9A9AA8" }}>
            <input
              type="checkbox"
              checked={unknownTime}
              onChange={(e) => {
                setUnknownTime(e.target.checked);
                // Toggling unknown-time changes the effective local time; the
                // resolved UTC is no longer valid until re-resolve.
                onUpdate({ birthUtc: "" });
              }}
            />
            {locale === "ru" ? "Время неизвестно" : locale === "hi" ? "समय अज्ञात" : "Time unknown"}
          </label>
          <div className="col-span-2">
            <CityAutocomplete
              birthDateTime={date ? `${date}T${time || "12:00"}` : undefined}
              onCityResolved={handleCityResolved}
              className="text-sm"
            />
          </div>
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="shrink-0 p-1 rounded hover:bg-[#D98E7A20] transition-colors"
            style={{ color: "#9A9AA8" }}
            title="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {isAnchor && (
        <p className="mt-1.5 text-[10px]" style={{ color: "#E8B86D" }}>
          {locale === "ru" ? "★ Якорный участник — его планетарные линии на карте"
            : locale === "hi" ? "★ आधार सदस्य — इसकी ग्रह रेखाएं मानचित्र पर"
            : "★ Anchor member — their planetary lines on the map"}
        </p>
      )}
    </GlassCard>
  );
}

