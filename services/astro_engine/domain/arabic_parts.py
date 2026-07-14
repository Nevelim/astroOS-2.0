"""Arabic Parts / Lots — the Part of Fortune (Pars Fortunae) and related.

The Arabic Parts are sensitive points calculated from the angles and luminaries.
The Part of Fortune (☉Fortuna, ⊕) is the most famous — a point of natural
talent, ease, and where 'luck' seems to operate. It's computed as an arc from
the Sun to the Moon projected from the Ascendant:

  Day birth (Sun above horizon):  PF = ASC + Moon − Sun
  Night birth (Sun below horizon): PF = ASC + Sun − Moon

(The day/night distinction follows the Hellenistic tradition; some modern
astrologers use the day formula universally. We follow the classical
day/night sect logic since it's the historically-grounded default.)

The Part of Spirit (Pars Spiritus) is the complement: PF with Sun/Moon swapped.
These points are valuable in natal interpretation and in synastry (PF contacts
indicate where one person brings 'fortune' to the other).

Pure math — no ephemeris needed beyond the longitudes/angles already computed.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ArabicPart:
    """A computed Arabic Part / Lot."""
    name: str
    longitude_deg: float    # ecliptic longitude [0, 360)


def _normalize(deg: float) -> float:
    """Wrap an ecliptic longitude into [0, 360)."""
    return deg % 360.0


def is_day_birth(sun_longitude_deg: float, ascendant_deg: float) -> bool:
    """Determine sect (day/night): day if the Sun is above the horizon.

    The Sun is above the horizon when it's in the upper semicircle — i.e. its
    arc from the Ascendant (going clockwise through the MC) is less than 180°.
    """
    arc = (sun_longitude_deg - ascendant_deg) % 360.0
    return arc < 180.0


def part_of_fortune(
    ascendant_deg: float,
    sun_longitude_deg: float,
    moon_longitude_deg: float,
) -> ArabicPart:
    """Compute the Part of Fortune (⊕) using the sect-aware formula.

    Day:   PF = ASC + Moon − Sun
    Night: PF = ASC + Sun − Moon
    """
    if is_day_birth(sun_longitude_deg, ascendant_deg):
        pf = ascendant_deg + moon_longitude_deg - sun_longitude_deg
    else:
        pf = ascendant_deg + sun_longitude_deg - moon_longitude_deg
    return ArabicPart(name="Part of Fortune", longitude_deg=_normalize(pf))


def part_of_spirit(
    ascendant_deg: float,
    sun_longitude_deg: float,
    moon_longitude_deg: float,
) -> ArabicPart:
    """Compute the Part of Spirit (the complement of the Part of Fortune).

    Day:   PoS = ASC + Sun − Moon
    Night: PoS = ASC + Moon − Sun
    (Swaps the luminaries vs. Part of Fortune.)
    """
    if is_day_birth(sun_longitude_deg, ascendant_deg):
        pos = ascendant_deg + sun_longitude_deg - moon_longitude_deg
    else:
        pos = ascendant_deg + moon_longitude_deg - sun_longitude_deg
    return ArabicPart(name="Part of Spirit", longitude_deg=_normalize(pos))
