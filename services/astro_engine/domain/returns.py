"""Planetary returns — when a transiting planet returns to its natal position.

A planetary return marks the completion of one cycle and the beginning of the
next. The most famous is the **Saturn return** (~age 29.5), a major life
milestone. Others:
  - Jupiter return: ~every 12 years (growth cycles)
  - Nodal return: ~every 18.6 years (karmic/direction shifts)
  - Saturn return: ~every 29.5 years (maturation, structure)
  - Uranus opposition: ~age 42 (midlife awakening)
  - Chiron return: ~age 50 (healing integration)

This module computes the APPROXIMATE ages at which each return occurs, based
on the mean orbital period. For exact return dates, an iterative ephemeris
search is needed (future enhancement); the mean-period approximation is
accurate within days for the outer planets and is the standard quick estimate
astrologers cite.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


# Mean synodic periods (Earth-relative, in years) for return calculation.
_ORBITAL_PERIODS_YEARS: dict[str, float] = {
    "jupiter": 11.86,
    "saturn": 29.46,
    "uranus": 84.01,
    "neptune": 164.79,
    "pluto": 247.94,
    "nodal": 18.60,         # lunar node cycle (not a planet, but a key return)
}

# Special non-return milestones (age-fixed events, not periodic).
_FIXED_MILESTONES: list[dict] = [
    {"name": "Uranus half-return (midlife)", "age": 42.0,
     "theme": "The midlife awakening — a urge for freedom and authenticity.",
     "type": "half_return"},
    {"name": "Chiron return", "age": 50.0,
     "theme": "Healing integration — confronting and releasing old wounds.",
     "type": "return"},
    {"name": "Nodal half-return", "age": 9.3,
     "theme": "First nodal axis challenge — early identity vs. growth tension.",
     "type": "half_return"},
]


@dataclass(frozen=True)
class PlanetaryReturn:
    """One return/milestone event in a person's life."""
    name: str               # e.g. "First Saturn Return"
    planet: str             # "saturn", "jupiter", "nodal", etc.
    age: float              # approximate age when it occurs
    theme: str              # what it signifies
    cycle_number: int       # 1st return, 2nd return, etc.
    is_half_return: bool    # half-cycle (opposition), not full return


def returns_for(birth_year: int, max_age: int = 100) -> list[PlanetaryReturn]:
    """Compute all planetary returns/milestones up to max_age.

    Returns events sorted by age. Each periodic return appears multiple times
    (1st Saturn return at ~29.5, 2nd at ~59, etc.).
    """
    events: list[PlanetaryReturn] = []

    # Periodic returns (Jupiter, Saturn, Uranus, Neptune, Pluto, Nodal).
    _themes = {
        "jupiter": "A new cycle of growth, expansion, and opportunity begins.",
        "saturn": "Maturation and restructuring — the consequences of the past "
                  "decade come due, and a new foundation is laid.",
        "uranus": "A full cycle of liberation and change completes; reinvention.",
        "neptune": "A spiritual/dream cycle completes — clarity on life's meaning.",
        "pluto": "A deep transformation cycle completes — death and rebirth "
                 "of identity.",
        "nodal": "A karmic cycle completes — the soul's direction resets; "
                 "a crossroads of fate and free will.",
    }
    for planet, period in _ORBITAL_PERIODS_YEARS.items():
        cycle = 1
        age = period
        while age <= max_age:
            events.append(PlanetaryReturn(
                name=_ordinal(cycle) + " " + planet.capitalize() + " Return",
                planet=planet, age=round(age, 1),
                theme=_themes[planet], cycle_number=cycle,
                is_half_return=False))
            cycle += 1
            age = period * cycle

    # Half-returns (the midpoint of a cycle — an opposition, a reckoning).
    for planet, period in _ORBITAL_PERIODS_YEARS.items():
        half = period / 2.0
        cycle = 0
        age = half
        while age <= max_age:
            if cycle == 0:
                label = planet.capitalize() + " Half-Return (Opposition)"
                theme = f"The midpoint challenge of the {planet} cycle — " \
                        f"tension between what was built and what's calling."
                events.append(PlanetaryReturn(
                    name=label, planet=planet, age=round(age, 1),
                    theme=theme, cycle_number=0, is_half_return=True))
            cycle += 1
            age = half * (cycle + 1) * 2 / 2  # next opposition = full period later
            # Simplify: oppositions happen every full period after the first half.
            age = half + period * cycle

    # Fixed milestones (Uranus half-return, Chiron return).
    for ms in _FIXED_MILESTONES:
        if ms["age"] <= max_age:
            events.append(PlanetaryReturn(
                name=ms["name"],
                planet=ms["name"].split()[0].lower(),
                age=ms["age"], theme=ms["theme"],
                cycle_number=1 if ms["type"] == "return" else 0,
                is_half_return=ms["type"] == "half_return"))

    events.sort(key=lambda e: e.age)
    return events


def next_return(birth_year: int, current_age: float,
                planet: str = "saturn") -> Optional[PlanetaryReturn]:
    """The next upcoming return for a specific planet."""
    all_returns = returns_for(birth_year, max_age=120)
    for r in all_returns:
        if r.planet == planet and r.age > current_age:
            return r
    return None


_ORDINALS = ("", "First", "Second", "Third", "Fourth", "Fifth", "Sixth",
             "Seventh", "Eighth")


def _ordinal(n: int) -> str:
    if n < len(_ORDINALS):
        return _ORDINALS[n]
    return f"{n}th"
