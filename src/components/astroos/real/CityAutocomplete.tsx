"use client";

/**
 * CityAutocomplete — reusable city search with debounced /api/cities
 * and automatic UTC resolution on pick.
 *
 * Features:
 * - Debounced search (300ms) against /api/cities
 * - Shows city name + country + IANA timezone
 * - On pick, calls /api/geo/resolve-birth to get true UTC offset (DST-aware)
 * - Shows offset badge and DST indicator
 * - Works with or without birthDateTime (for later resolution)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type CityDTO, type ResolvedBirthDTO } from "@/lib/astroos/real/api-client";
import { useI18n } from "@/lib/astroos/i18n-context";

const L = (en: string, ru: string, hi: string, locale: string) =>
  locale === "ru" ? ru : locale === "hi" ? hi : en;

export interface CityAutocompleteProps {
  /** Pre-fill value (e.g. from existing profile) */
  initialValue?: string;
  /** When user picks a city and UTC is resolved */
  onCityResolved: (result: ResolvedBirthDTO) => void;
  /** Birth date/time in ISO format "YYYY-MM-DDTHH:mm" — needed for UTC resolution */
  birthDateTime?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Custom class for the input */
  className?: string;
}

export function CityAutocomplete({
  initialValue,
  onCityResolved,
  birthDateTime,
  disabled = false,
  className = "",
}: CityAutocompleteProps) {
  const { locale } = useI18n();
  const [query, setQuery] = useState(initialValue ?? "");
  const [results, setResults] = useState<CityDTO[]>([]);
  const [selected, setSelected] = useState<CityDTO | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedBirthDTO | null>(null);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced city search
  const searchCities = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.getCities(q, 8);
        setResults(res.cities);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    setResolved(null);
    setError(null);
    searchCities(val);
  };

  // Handle city pick
  const handleCityPick = async (city: CityDTO) => {
    setSelected(city);
    setQuery(city.displayName);
    setShowDropdown(false);
    setResults([]);
    setError(null);

    // If birthDateTime is available, resolve UTC immediately
    if (birthDateTime) {
      setResolving(true);
      try {
        const result = await api.resolveBirth({
          cityId: city.id,
          birthDateTime,
        });
        setResolved(result);
        onCityResolved(result);
      } catch (err) {
        setError((err as Error).message || "Failed to resolve timezone");
      } finally {
        setResolving(false);
      }
    } else {
      // No birthDateTime yet — resolve later
      onCityResolved({
        city,
        birth: {
          utcISO: "",
          offsetHours: city.tzOffsetHours,
          dstActive: false,
          ianaTimezone: city.timezone,
          standardOffsetHours: city.tzOffsetHours,
          offsetLabel: `UTC${city.tzOffsetHours >= 0 ? "+" : ""}${city.tzOffsetHours}`,
          tzAbbr: city.timezone.split("/").pop() ?? "",
        },
        calculatePayload: {
          birthDateTime: "",
          birthLat: city.lat,
          birthLng: city.lng,
          birthTzOffset: city.tzOffsetHours,
          birthPlaceName: city.displayName,
        },
      });
    }
  };

  // Re-resolve when birthDateTime changes (and city is selected)
  useEffect(() => {
    if (!selected || !birthDateTime || resolving) return;
    let cancelled = false;
    (async () => {
      setResolving(true);
      try {
        const result = await api.resolveBirth({
          cityId: selected.id,
          birthDateTime,
        });
        if (!cancelled) {
          setResolved(result);
          onCityResolved(result);
        }
      } catch {
        // Silently fail — keep previous resolution
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => { cancelled = true; };
  }, [birthDateTime, selected?.id, onCityResolved]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = selected ? selected.displayName : query;

  return (
    <div ref={containerRef} className="relative">
      <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">
        {L("Birth place", "Место рождения", "जन्म स्थान", locale)}
      </label>
      <div className="relative mt-1">
        <input
          ref={inputRef}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          disabled={disabled}
          className={`w-full rounded-lg border bg-[#0B0B0F]/60 px-3 py-2.5 pr-8 text-[14px] text-[#F5F0E8] outline-none transition-colors focus:border-[#E8B86D]/50 ${
            error ? "border-[#D98E7A]/60" : "border-[#2A2A35]"
          } ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
          placeholder={L("Start typing a city…", "Начните вводить город…", "शहर टाइप करना शुरू करें…", locale)}
        />
        {searching && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#E8B86D]/30 border-t-[#E8B86D]" />
          </div>
        )}
        {!searching && selected && !disabled && (
          <button
            onClick={() => {
              setSelected(null);
              setResolved(null);
              setQuery("");
              setError(null);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B6B78] transition hover:text-[#D98E7A]"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown results */}
      <AnimatePresence>
        {showDropdown && results.length > 0 && !selected && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-[#2A2A35] bg-[#12121A] shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          >
            {results.map((city) => (
              <button
                key={city.id}
                onClick={() => handleCityPick(city)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-[#1C1C26]"
              >
                <div className="flex-1 min-w-0">
                  <span className="block text-[13px] text-[#F5F0E8] truncate">
                    {city.name}, <span className="text-[#9A9AA8]">{city.iso2 ?? city.country}</span>
                  </span>
                  <span className="block text-[10px] text-[#5BB89C]/70 mt-0.5">
                    {city.timezone}
                  </span>
                </div>
                <div className="ml-2 flex-shrink-0 flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#5BB89C]/10 text-[#5BB89C]">
                    UTC{city.tzOffsetHours >= 0 ? "+" : ""}{city.tzOffsetHours}
                  </span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No results message */}
      <AnimatePresence>
        {showDropdown && query.length >= 2 && !searching && results.length === 0 && !selected && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-30 mt-1 w-full rounded-lg border border-[#2A2A35] bg-[#12121A] px-3 py-3 text-[12px] text-[#6B6B78]"
          >
            {L("No cities found. Try a different search.", "Города не найдены. Попробуйте другой запрос.", "कोई शहर नहीं मिला। अलग खोज आज़माएं।", locale)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resolved timezone badge */}
      {selected && (
        <div className="mt-1.5 flex items-center gap-2">
          {resolving ? (
            <div className="flex items-center gap-1.5 text-[11px] text-[#E8B86D]">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#E8B86D]/30 border-t-[#E8B86D]" />
              {L("Resolving timezone…", "Определяю часовой пояс…", "समय क्षेत्र हल कर रहे हैं…", locale)}
            </div>
          ) : resolved ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[#5BB89C] flex items-center gap-1">
                <span>✓</span>
                {resolved.birth.offsetLabel}
              </span>
              <span className="text-[10px] text-[#9A9AA8]">
                {resolved.birth.tzAbbr}
              </span>
              {resolved.birth.dstActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8B86D]/10 text-[#E8B86D]">
                  DST
                </span>
              )}
              {resolved.birth.dstActive && (
                <span className="text-[10px] text-[#9A9AA8]">
                  {L("(daylight saving active)", "(летнее время активно)", "(डेलाइट सेविंग सक्रिय)", locale)}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-[#5BB89C]">
              <span>✓</span>
              <span>{L("Timezone auto-detected", "Часовой пояс авто-определён", "समय क्षेत्र स्वतः-पहचाना", locale)}</span>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-1 text-[11px] text-[#D98E7A]">
          {error}
        </div>
      )}
    </div>
  );
}
