/**
 * UTC Resolver — resolves local birth time to true UTC using IANA timezone database.
 *
 * Uses Node.js built-in Intl.DateTimeFormat with timeZoneName: "longOffset"
 * which provides DST-aware and historically accurate UTC offsets from the IANA
 * timezone database shipped with V8 (ICU data).
 *
 * This means:
 * - Moscow 1989 → UTC+3 (no DST that year, USSR had permanent +3)
 * - London July 1990 → UTC+1 (BST active)
 * - Moscow July 1991 → UTC+4 (brief USSR DST experiment)
 * - Yekaterinburg always → UTC+5 (no DST since 2011)
 *
 * Zero external dependencies. The IANA data is baked into Node.js's V8 ICU.
 */
export interface ResolvedBirthTime {
  /** ISO 8601 UTC string, e.g. "1989-07-15T09:00:00.000Z" */
  utcISO: string;
  /** JavaScript Date object in UTC */
  utcDate: Date;
  /** Total UTC offset in hours (including DST), e.g. 3 for Moscow, 1 for London in summer */
  offsetHours: number;
  /** Whether DST was active at the given date/time in the timezone */
  dstActive: boolean;
  /** The IANA timezone name used for resolution, e.g. "Europe/Moscow" */
  ianaTimezone: string;
  /** The standard (non-DST) offset for this timezone, e.g. 3 for Europe/Moscow */
  standardOffsetHours: number;
  /** Human-readable offset string, e.g. "UTC+3" or "UTC+5:30" */
  offsetLabel: string;
  /** Abbreviated timezone name at the given date, e.g. "MSK" or "BST" */
  tzAbbr: string;
}

/**
 * Resolve a local birth date/time to UTC using IANA timezone database.
 *
 * @param localDateTime - Local date/time as ISO string (e.g. "1989-07-15T12:00")
 * @param ianaTimezone - IANA timezone name (e.g. "Europe/Moscow", "Asia/Yekaterinburg")
 * @returns ResolvedBirthTime with UTC conversion, DST status, and metadata
 */
export function resolveBirthTime(
  localDateTime: string,
  ianaTimezone: string,
): ResolvedBirthTime {
  // Validate IANA timezone by attempting to use it
  try {
    Intl.DateTimeFormat(undefined, { timeZone: ianaTimezone });
  } catch {
    throw new Error(`Invalid IANA timezone: "${ianaTimezone}"`);
  }

  // Parse local date/time components
  const match = localDateTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) {
    throw new Error(`Invalid localDateTime format: "${localDateTime}". Expected "YYYY-MM-DDTHH:mm"`);
  }
  const [, yearStr, monthStr, dayStr, hourStr, minuteStr] = match;
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10) - 1; // JS months are 0-indexed
  const day = parseInt(dayStr!, 10);
  const hour = parseInt(hourStr!, 10);
  const minute = parseInt(minuteStr!, 10);

  // Construct a Date assuming UTC, then figure out the actual offset
  // We need to find the UTC offset at the exact local time in the given timezone
  // Strategy: create the date, use Intl to extract the offset

  // Step 1: Create a rough Date (we'll correct it)
  // We'll use the "parts" approach to get the offset
  const tentativeDate = new Date(Date.UTC(year, month, day, hour, minute, 0));

  // Step 2: Get the UTC offset at this approximate instant using Intl
  // The offset may be wrong by an hour if we're near a DST boundary,
  // so we'll iterate once to correct.

  const offsetMs = getTimezoneOffsetMs(tentativeDate, ianaTimezone);

  // Step 3: The actual UTC time is: local_time - offset
  const utcMs = tentativeDate.getTime() - offsetMs;
  const utcDate = new Date(utcMs);

  // Step 4: Verify by re-extracting the offset at the exact UTC instant
  // This handles DST boundary edge cases
  const verifiedOffsetMs = getTimezoneOffsetMs(utcDate, ianaTimezone);
  const verifiedUtcMs = tentativeDate.getTime() - verifiedOffsetMs;
  const verifiedUtcDate = new Date(verifiedUtcMs);

  // Step 5: Extract offset in hours
  const offsetHours = verifiedOffsetMs / 3_600_000;
  const standardOffsetHours = getStandardOffsetHours(year, ianaTimezone);
  const dstActive = Math.abs(offsetHours - standardOffsetHours) > 0.01;

  // Step 6: Get timezone abbreviation
  const tzAbbr = getTimezoneAbbreviation(verifiedUtcDate, ianaTimezone);

  // Step 7: Format offset label
  const offsetLabel = formatOffsetLabel(offsetHours);

  return {
    utcISO: verifiedUtcDate.toISOString(),
    utcDate: verifiedUtcDate,
    offsetHours,
    dstActive,
    ianaTimezone,
    standardOffsetHours,
    offsetLabel,
    tzAbbr,
  };
}

/**
 * Get the UTC offset in milliseconds for a given Date in a timezone.
 * Uses Intl.DateTimeFormat with timeZoneName: "longOffset" (Node.js 14.29+).
 */
function getTimezoneOffsetMs(date: Date, ianaTimezone: string): number {
  // Use Intl.DateTimeFormat to get the offset string
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ianaTimezone,
    timeZoneName: "longOffset",
  });

  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");

  if (!offsetPart) {
    // Fallback: compute offset manually using Date methods
    return getOffsetMsFallback(date, ianaTimezone);
  }

  return parseOffsetString(offsetPart.value);
}

/**
 * Parse an offset string like "GMT+3", "GMT-5:30", "GMT+05:30" into milliseconds.
 */
function parseOffsetString(offsetStr: string): number {
  // Match patterns: "GMT+3", "GMT-5:30", "GMT+05:30", "GMT", "GMT+0"
  const match = offsetStr.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) {
    // "GMT" alone means UTC+0
    if (offsetStr === "GMT" || offsetStr === "GMT+0" || offsetStr === "GMT-0") {
      return 0;
    }
    throw new Error(`Cannot parse timezone offset string: "${offsetStr}"`);
  }

  const sign = match[1] === "+" ? 1 : -1;
  const hours = parseInt(match[2]!, 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;

  return sign * (hours * 3600 + minutes * 60) * 1000;
}

/**
 * Fallback: compute offset using the difference between UTC and timezone-local time.
 * Works even if timeZoneName: "longOffset" is not supported.
 */
function getOffsetMsFallback(date: Date, ianaTimezone: string): number {
  // Get the local time in the target timezone
  const localFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ianaTimezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });

  // Parse the local time back
  const localParts = localFormatter.formatToParts(date);
  const get = (type: string) => localParts.find((p) => p.type === type)?.value ?? "0";

  const localYear = parseInt(get("year"), 10);
  const localMonth = parseInt(get("month"), 10) - 1;
  const localDay = parseInt(get("day"), 10);
  const localHour = parseInt(get("hour"), 10);
  const localMinute = parseInt(get("minute"), 10);
  const localSecond = parseInt(get("second"), 10);

  const localMs = Date.UTC(localYear, localMonth, localDay, localHour, localMinute, localSecond);
  const utcMs = date.getTime();

  return localMs - utcMs;
}

/**
 * Get the standard (non-DST) offset for a timezone in a given year.
 * Uses a winter date (January) to determine the standard offset.
 */
function getStandardOffsetHours(year: number, ianaTimezone: string): number {
  // Use January 15 (winter in Northern Hemisphere) to get standard offset
  // For Southern Hemisphere timezones, this will still give us a consistent reference
  const winterDate = new Date(Date.UTC(year, 0, 15, 12, 0, 0));
  const winterOffsetMs = getTimezoneOffsetMs(winterDate, ianaTimezone);

  // Also check summer (July 15) to handle Southern Hemisphere
  const summerDate = new Date(Date.UTC(year, 6, 15, 12, 0, 0));
  const summerOffsetMs = getTimezoneOffsetMs(summerDate, ianaTimezone);

  // Standard offset is the lesser one (DST adds to it)
  // For Southern Hemisphere, DST is in their summer (our winter), so the
  // standard offset is the summer one (July in Northern = winter in Southern)
  return Math.min(winterOffsetMs, summerOffsetMs) / 3_600_000;
}

/**
 * Get timezone abbreviation (e.g., "MSK", "BST", "IST") at a given date.
 */
function getTimezoneAbbreviation(date: Date, ianaTimezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ianaTimezone,
    timeZoneName: "short",
  });

  const parts = formatter.formatToParts(date);
  const tzPart = parts.find((p) => p.type === "timeZoneName");
  return tzPart?.value ?? ianaTimezone.split("/").pop() ?? "";
}

/**
 * Format offset hours as "UTC+3", "UTC-5:30", "UTC+0" etc.
 */
function formatOffsetLabel(offsetHours: number): string {
  const sign = offsetHours >= 0 ? "+" : "-";
  const abs = Math.abs(offsetHours);
  const hours = Math.floor(abs);
  const minutes = Math.round((abs - hours) * 60);

  if (minutes === 0) {
    return `UTC${sign}${hours}`;
  }
  return `UTC${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Batch resolve: resolve multiple date/times in one call (useful for testing).
 */
export function resolveBirthTimes(
  entries: Array<{ localDateTime: string; ianaTimezone: string }>,
): ResolvedBirthTime[] {
  return entries.map((e) => resolveBirthTime(e.localDateTime, e.ianaTimezone));
}
