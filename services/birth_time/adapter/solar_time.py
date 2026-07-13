"""Adapter: NOAA Solar Position Algorithm — Equation of Time.

Implements the SolarTimeProvider port. Pure astronomy: given a UTC instant,
return the Equation of Time in minutes.

EoT = apparent solar time − mean solar time.
Range across a year: about −14 min (mid-February) to +16 min (early November).
Crosses zero near Apr 15, Jun 13, Sep 1, Dec 25.

Reference: NOAA / GML solar calculation
https://gml.noaa.gov/grad/solcalc/calcdetails.html

Accuracy: sub-minute, more than sufficient for the ~2-hour shichen granularity.
For arcsecond rigor one would upgrade to full VSOP87; not needed here.
"""
from __future__ import annotations

import math
from datetime import datetime


def _day_of_year(utc: datetime) -> int:
    return utc.timetuple().tm_yday


def equation_of_time_minutes(utc: datetime) -> float:
    """NOAA approximation of the Equation of Time in minutes.

    Uses the fractional day-of-year angle gamma = 2π/365 * (N−1).
    """
    n = _day_of_year(utc)
    gamma = (2.0 * math.pi / 365.0) * (n - 1)
    # NOAA formula returns the "equation of time" in minutes.
    return 229.18 * (
        0.000075
        + 0.001868 * math.cos(gamma)
        - 0.032077 * math.sin(gamma)
        - 0.014615 * math.cos(2.0 * gamma)
        - 0.040849 * math.sin(2.0 * gamma)
    )


class NoaaSolarProvider:
    """SolarTimeProvider port implementation using the NOAA formula."""

    def equation_of_time_minutes(self, utc: datetime) -> float:
        return equation_of_time_minutes(utc)
