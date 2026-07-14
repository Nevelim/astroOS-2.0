"""Use case: resolve a BaZi chart from birth facts.

Orchestrates the solar-terms adapter (to know the Lichun boundary and solar
month) with pure pillar math. Returns an immutable BaZiChart.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from services.bazi_engine.adapter.solar_terms import (
    BirthFacts,
    SolarTermsProvider,
)
from services.bazi_engine.domain.constants import Element
from services.bazi_engine.domain.interpretation import (
    DayMasterProfile,
    day_master_profile,
    favorable_elements,
    ten_god,
    TenGod,
)
from services.bazi_engine.domain.pillars import (
    FourPillars,
    LuckPillar,
    luck_pillars,
    day_pillar,
    hour_pillar,
    month_pillar,
    year_pillar,
    Pillar,
)
from services.birth_time.domain.entities import TimeQuality


# --------------------------------------------------------------------------- #
# Output value object
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class BaZiChart:
    birth_data_hash: str
    pillars: FourPillars
    day_master: DayMasterProfile
    luck_pillars: list[LuckPillar]
    ten_gods: dict[str, TenGod]          # pillar name → TenGod of its STEM vs DM
    favorable_elements: tuple[Element, ...]
    time_standard_used: str
    tst_used: str
    note: str
    # Strength-aware 用神 context (advisory). Empty strings when unavailable.
    dm_strength: str = ""               # "strong" | "weak" | "balanced"
    yong_shen_method: str = ""           # "support" | "drain" | "balance"
    yong_shen_reasoning: str = ""


# --------------------------------------------------------------------------- #
# Use case
# --------------------------------------------------------------------------- #
@dataclass
class ResolveBaZi:
    solar_terms: SolarTermsProvider

    def execute(self, facts: BirthFacts, birth_data_hash: str) -> BaZiChart:
        st = self.solar_terms

        # Lichun boundary: is this birth before or after the year-start term?
        lichun = st.lichun_date(facts.birth_date.year)
        after_lichun = facts.birth_date >= lichun

        # Solar-month index (0..11 from Lichun, or 11 if before Lichun).
        solar_month_idx = st.solar_month_index(facts.birth_date)

        # Year pillar (BaZi year may be Gregorian-year minus 1 if pre-Lichun).
        bazi_year = facts.birth_date.year if after_lichun else facts.birth_date.year - 1
        yp = year_pillar(bazi_year, after_lichun=True)

        # Month pillar (keyed by solar month index, NOT calendar month).
        mp = month_pillar(bazi_year, solar_month_idx)

        # Day pillar (pure Gregorian-date computation).
        dp = day_pillar(facts.birth_date)

        # Hour pillar — only when the birth time is reliable.
        hp: Optional[Pillar] = None
        if facts.time_quality == TimeQuality.EXACT:
            hp = hour_pillar(dp, facts.tst.hour)

        pillars = FourPillars(year=yp, month=mp, day=dp, hour=hp)

        # Day Master profile.
        dm = day_master_profile(dp)

        # Luck pillars: direction = yang-year/male OR yin-year/female → forward.
        year_stem_polarity_yang = (yp.polarity.value == "yang")
        forward = (year_stem_polarity_yang == (facts.gender == "male"))
        lp = luck_pillars(
            month=mp,
            year_gender_forward=forward,
            birth_solar_year=bazi_year,
            current_age=facts.current_age,
        )

        # Ten Gods: classify each pillar's STEM relative to Day Master.
        gods = {
            "year": ten_god(dm.stem, yp.stem),
            "month": ten_god(dm.stem, mp.stem),
            "day": ten_god(dm.stem, dp.stem),  # always FRIEND or ROB_WEALTH
        }
        if hp is not None:
            gods["hour"] = ten_god(dm.stem, hp.stem)

        # Strength-aware 用神 selection (traditional 扶抑 method).
        from services.bazi_engine.domain.yong_shen import select_yong_shen
        yong_shen = select_yong_shen(
            dm_stem=dm.stem,
            month_branch=mp.branch,
            year_branch=yp.branch,
            day_branch=dp.branch,
            hour_branch=hp.branch if hp else None,
            year_stem=yp.stem,
            hour_stem=hp.stem if hp else None,
        )
        fav = yong_shen.favorable

        note = (
            "Hour pillar computed from True Solar Time "
            f"({facts.tst.strftime('%H:%M:%S')})."
            if hp is not None
            else "Hour pillar omitted: birth time not exact (3-pillar mode)."
        )

        return BaZiChart(
            birth_data_hash=birth_data_hash,
            pillars=pillars,
            day_master=dm,
            luck_pillars=lp,
            ten_gods=gods,
            favorable_elements=fav,
            time_standard_used="true_solar_time",
            tst_used=facts.tst.strftime("%H:%M:%S"),
            note=note,
            dm_strength=yong_shen.reasoning.split(" is ")[1].split(".")[0]
                if " is " in yong_shen.reasoning else "",
            yong_shen_method=yong_shen.method,
            yong_shen_reasoning=yong_shen.reasoning,
        )
