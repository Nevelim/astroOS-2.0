"""Secondary progressions — the "a day for a year" forecasting technique.

Secondary progressions are one of the two main forecasting methods in Western
astrology (the other being transits). The technique, codified by the
English astrologer Alan Leo around 1900, advances the natal chart by a ratio
of **one day after birth = one year of life**:

    progressed_age(years) = days_after_birth(days)

So to see where your planets are at age 30, we look at the sky 30 days after
you were born. The progressed Sun moves ~1° per year (a sign change every
~30 years is a major life-theme shift); the progressed Moon moves ~13°/year
(a full lap every ~27 years, marking inner emotional epochs). The outer
planets barely move over a human lifetime and are usually read only as they
cross natal points.

This module is pure math: the caller supplies natal ecliptic longitudes and
birth time, and we return progressed longitudes + the dates of upcoming
progressed-Sun sign changes (a key life-theme indicator). No ephemeris I/O
here — the daily motions are mean values, accurate to within a fraction of a
degree for the inner planets and well within an orb for interpretive work.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional


# --------------------------------------------------------------------------- #
# Mean daily motions (degrees of ecliptic longitude per day after birth).
#
# These are the average rates used by hand-calculating astrologers. In the
# "day for a year" system they equal the *per-year* progressed motion:
#   - Sun:     ~0.9856°/day  →  ~1°/year    (a sign every ~30 years)
#   - Moon:    ~13.176°/day  →  ~13°/year   (a full cycle every ~27.3 years)
#   - Mercury: ~1.383°/day
#   - Venus:   ~1.199°/day
#   - Mars:    ~0.524°/day
#   - Jupiter: ~0.083°/day   →  barely moves over a lifetime
#   - Saturn:  ~0.034°/day
# --------------------------------------------------------------------------- #
SUN_DAILY_MOTION_DEG: float = 0.9856
MOON_DAILY_MOTION_DEG: float = 13.176

# Mean daily motion for every body `progressed_chart` knows how to advance.
# Outer planets (Uranus/Neptune/Pluto) are intentionally omitted — their
# progressed motion is negligible and is not standardly read.
PLANET_DAILY_MOTIONS_DEG: dict[str, float] = {
    "sun": 0.9856,
    "moon": 13.176,
    "mercury": 1.383,
    "venus": 1.199,
    "mars": 0.524,
    "jupiter": 0.083,
    "saturn": 0.034,
}


# --------------------------------------------------------------------------- #
# Pure functions
# --------------------------------------------------------------------------- #
def progressed_longitude(
    natal_longitude_deg: float,
    days_after_birth: float,
    daily_motion_deg: Optional[float] = None,
    planet: Optional[str] = None,
) -> float:
    """Advance a planet's ecliptic longitude by its daily motion × elapsed days.

    In the secondary-progression system one day after birth corresponds to one
    year of life, so for a 30-year-old `days_after_birth` is ~30 and a Sun at
    natal 25° progresses to ~55°.

    The daily motion is resolved in this priority:
      1. an explicit `daily_motion_deg` argument (used for arbitrary bodies), or
      2. a known `planet` name looked up in `PLANET_DAILY_MOTIONS_DEG`
         (covers Sun/Moon/Mercury/Venus/Mars/Jupiter/Saturn).

    For the Sun and Moon the well-known mean rates (0.9856° and 13.176°/day)
    are baked into the table, so passing `planet="sun"` is the usual call.

    The result is normalized to [0, 360).
    """
    if daily_motion_deg is None:
        if planet is None:
            raise ValueError(
                "progressed_longitude needs either daily_motion_deg or planet "
                "to look up the daily motion.")
        daily_motion_deg = PLANET_DAILY_MOTIONS_DEG.get(planet)
        if daily_motion_deg is None:
            raise ValueError(
                f"No mean daily motion known for planet '{planet}'. "
                f"Pass daily_motion_deg explicitly. Known planets: "
                f"{sorted(PLANET_DAILY_MOTIONS_DEG)}")
    advanced = natal_longitude_deg + daily_motion_deg * days_after_birth
    return advanced % 360.0


def progressed_date(birth_utc: datetime, target_age_years: float) -> datetime:
    """The calendar date that is `target_age_years` days after birth.

    In the "day for a year" system the progressed age in years equals the
    number of days elapsed since birth, so the progressed chart for age 30 is
    simply the sky 30 days after the birth moment. This function returns that
    moment (timezone-aware input yields a timezone-aware result).

    Fractional ages are honored: age 30.5 → 30.5 days after birth.
    """
    return birth_utc + timedelta(days=target_age_years)


def progressed_chart(
    natal_positions: dict[str, float],
    birth_utc: datetime,
    current_age: float,
) -> dict[str, float]:
    """Compute progressed ecliptic longitudes for every supplied natal planet.

    `natal_positions` maps lowercase planet names ("sun", "moon", ...) to their
    ecliptic longitudes in degrees. Each planet is advanced by its mean daily
    motion (one day per year of age) from its natal longitude.

    Planets not listed in `PLANET_DAILY_MOTIONS_DEG` (e.g. uranus, neptune,
    pluto, or custom points) are returned unchanged — their progressed motion
    over a human lifetime is negligible and is not standardly interpreted.

    Longitudes are normalized to [0, 360).
    """
    progressed: dict[str, float] = {}
    for name, lng in natal_positions.items():
        motion = PLANET_DAILY_MOTIONS_DEG.get(name)
        if motion is None:
            progressed[name] = lng % 360.0
            continue
        progressed[name] = (lng + motion * current_age) % 360.0
    return progressed


def progressed_sun_sign_change(
    natal_sun_deg: float,
    birth_utc: datetime,
    current_age: float,
    years_ahead: int = 5,
) -> list[dict]:
    """Detect upcoming progressed-Sun sign changes within `years_ahead` years.

    The progressed Sun creeps forward at ~1°/year, so it crosses a sign
    boundary (a multiple of 30°) roughly every 30 years. Each crossing marks a
    major shift in the underlying life theme (the progressed Sun sign is read
    as your evolving core identity/focus).

    Returns a list of events sorted by age, each:
        {
          "age_at_change": float,        # the age (in years) when it occurs
          "date": str,                   # ISO-8601 UTC date of the change
          "from_sign": str,              # the sign the progressed Sun leaves
          "to_sign": str,                # the sign it enters
        }

    Only changes strictly after `current_age` and within `years_ahead` are
    returned. An empty list means no sign change is due in the window.
    """
    from services.astro_engine.domain.constants import SIGNS, sign_of

    sun_motion = PLANET_DAILY_MOTIONS_DEG["sun"]
    progressed_now = (natal_sun_deg + sun_motion * current_age) % 360.0

    # Sign boundaries the progressed Sun has yet to cross, in [0, 360).
    # The next boundary strictly after the current progressed longitude.
    next_boundary = (int(progressed_now // 30) + 1) * 30 % 360
    # If progressed_now sits exactly on a boundary, the next crossing is
    # the following sign boundary, not the one we are on.

    events: list[dict] = []
    boundary = next_boundary
    # Walk forward boundary by boundary until we pass current_age + years_ahead.
    # Guard against runaway loops with a hard cap.
    for _ in range(years_ahead + 2):
        # Degrees still to travel to reach this boundary from natal position,
        # accounting for full laps. The progressed Sun is monotonic forward.
        target = boundary
        # Degrees advanced from natal needed to land (mod 360) on target.
        delta = (target - natal_sun_deg) % 360.0
        # If delta is 0 we are exactly at the boundary at birth — skip; the
        # *next* boundary is the meaningful crossing.
        if delta == 0.0:
            boundary = (boundary + 30) % 360
            continue
        age_at_change = delta / sun_motion
        if age_at_change <= current_age:
            # Already happened; advance to the next boundary.
            boundary = (boundary + 30) % 360
            continue
        if age_at_change > current_age + years_ahead:
            break

        # The progressed Sun longitude at the change is exactly `target` (the
        # new sign's 0° point). The sign it enters is sign_of(target); the sign
        # it leaves is the preceding sign.
        to_sign = sign_of(target).value
        from_sign = SIGNS[(SIGNS.index(sign_of(target)) - 1) % len(SIGNS)].value
        change_date = progressed_date(birth_utc, age_at_change)
        if change_date.tzinfo is not None:
            date_str = change_date.astimezone(timezone.utc).strftime(
                "%Y-%m-%dT%H:%M:%SZ")
        else:
            date_str = change_date.strftime("%Y-%m-%dT%H:%M:%SZ")

        events.append({
            "age_at_change": round(age_at_change, 3),
            "date": date_str,
            "from_sign": from_sign,
            "to_sign": to_sign,
        })
        boundary = (boundary + 30) % 360

    return events
