/**
 * TypeScriptBaZiCalculator — TS-реализация расчёта BaZi (fallback когда Python down).
 * Полный расчёт: 4 столпа, Day Master, 8 Luck Pillars, Ten Gods, 5 elements balance.
 * Clean Architecture: реализует порт BaZiCalculator.
 */
import type { BaZiCalculator } from "../../../application/ports/BaZiCalculator";
import type { BirthData } from "../../../domain/value-objects/BirthData";
import { BaZi, HEAVENLY_STEMS, EARTHLY_BRANCHES } from "../../../domain/entities/BaZi";
import type {
  Pillar, LuckPillar, HeavenlyStem, EarthlyBranch,
  FiveElement, YinYang, TenGod,
} from "../../../domain/entities/BaZi";

export class TypeScriptBaZiCalculator implements BaZiCalculator {
  async isAvailable(): Promise<boolean> {
    return true; // TS fallback всегда доступен
  }

  async calculate(birth: BirthData): Promise<BaZi> {
    const utcDate = birth.toUtcDate();
    // Li Chun — солнечный новый год (~4 февраля)
    const yearStemIndex = this.computeYearStemIndex(utcDate);
    const monthStemIndex = this.computeMonthStemIndex(yearStemIndex, utcDate);
    const dayStemIndex = this.computeDayStemIndex(utcDate);
    const timeStemIndex = this.computeTimeStemIndex(dayStemIndex, utcDate);

    const yearBranchIndex = ((yearStemIndex % 12) + 12) % 12;
    const monthBranchIndex = this.computeMonthBranchIndex(utcDate);
    const dayBranchIndex = this.computeDayBranchIndex(utcDate);
    const timeBranchIndex = this.computeTimeBranchIndex(utcDate);

    const yearPillar = this.buildPillar(yearStemIndex, yearBranchIndex);
    const monthPillar = this.buildPillar(monthStemIndex, monthBranchIndex);
    const dayPillar = this.buildPillar(dayStemIndex, dayBranchIndex);
    const timePillar = this.buildPillar(timeStemIndex, timeBranchIndex);

    const luckPillars = this.computeLuckPillars(yearStemIndex, birth.gender, monthPillar);
    const elementBalance = this.computeElementBalance([yearPillar, monthPillar, dayPillar, timePillar]);
    const tenGods = this.computeTenGods(dayPillar, [yearPillar, monthPillar, timePillar]);

    return BaZi.create({
      yearPillar,
      monthPillar,
      dayPillar,
      timePillar,
      luckPillars,
      elementBalance,
      tenGods,
    });
  }

  private buildPillar(stemIndex: number, branchIndex: number): Pillar {
    const stem = HEAVENLY_STEMS[((stemIndex % 10) + 10) % 10];
    const branch = EARTHLY_BRANCHES[((branchIndex % 12) + 12) % 12];
    return {
      stem: stem.stem,
      branch: branch.branch,
      stemElement: stem.element,
      stemYinYang: stem.yinYang,
    };
  }

  /** Годовой стебель — по году от 4 февраля (Li Chun). */
  private computeYearStemIndex(date: Date): number {
    const year = date.getFullYear();
    const liChun = new Date(year, 1, 4); // 4 февраля
    const effectiveYear = date < liChun ? year - 1 : year;
    // 1984 = 甲 (Wood Yang) = индекс 0
    return ((effectiveYear - 1984) % 10 + 10) % 10;
  }

  /** Месячный стебель — правило "5 Tiger-Catching". */
  private computeMonthStemIndex(yearStemIndex: number, date: Date): number {
    const monthBranchIndex = this.computeMonthBranchIndex(date);
    // Год янского дерева → месяц янского огня в Tiger month
    const yearStarts = [2, 4, 6, 8, 0]; // для каждого года свой старт
    const yearStart = yearStarts[yearStemIndex % 5];
    const monthOffset = (monthBranchIndex - 2 + 12) % 12;
    return (yearStart + monthOffset) % 10;
  }

  /** Месячная ветвь — по солнечному месяцу. */
  private computeMonthBranchIndex(date: Date): number {
    // Tiger month начинается ~4 февраля
    const liChun = new Date(date.getFullYear(), 1, 4);
    if (date < liChun) return 1; // Ox (丑)
    const monthsAfterLiChun = Math.floor((date.getTime() - liChun.getTime()) / (30.44 * 86400_000));
    return (2 + monthsAfterLiChun) % 12; // Tiger = 2
  }

  /** Дневной стебель — цикл 60 дней от точки отсчёта (1 января 1900 = 甲子). */
  private computeDayStemIndex(date: Date): number {
    const epoch = new Date(Date.UTC(1900, 0, 1)); // 1 января 1900 = 甲子 день
    const daysSinceEpoch = Math.floor((date.getTime() - epoch.getTime()) / 86400_000);
    return ((daysSinceEpoch % 10) + 10) % 10;
  }

  private computeDayBranchIndex(date: Date): number {
    const epoch = new Date(Date.UTC(1900, 0, 1));
    const daysSinceEpoch = Math.floor((date.getTime() - epoch.getTime()) / 86400_000);
    return ((daysSinceEpoch % 12) + 12) % 12;
  }

  /** Часовой стебель — правило "5 Rat-Catching". */
  private computeTimeStemIndex(dayStemIndex: number, date: Date): number {
    const timeBranchIndex = this.computeTimeBranchIndex(date);
    const dayStarts = [0, 2, 4, 6, 8]; // для каждого дневного стебля
    const dayStart = dayStarts[dayStemIndex % 5];
    const hourOffset = (timeBranchIndex - 0 + 12) % 12;
    return (dayStart + Math.floor(hourOffset / 2)) % 10;
  }

  /** Часовая ветвь — 2-часовые интервалы. */
  private computeTimeBranchIndex(date: Date): number {
    const hour = date.getUTCHours();
    // Zi час: 23:00-00:59 → индекс 0
    return Math.floor(((hour + 1) % 24) / 2);
  }

  /** Luck Pillars — 10-летние периоды. Направление: yang male / yin female → forward. */
  private computeLuckPillars(yearStemIndex: number, gender: 0 | 1, monthPillar: Pillar): LuckPillar[] {
    const yearStem = HEAVENLY_STEMS[yearStemIndex];
    const forward = (yearStem.yinYang === "Yang" && gender === 1) || (yearStem.yinYang === "Yin" && gender === 0);

    const monthStemIndex = HEAVENLY_STEMS.findIndex((s) => s.stem === monthPillar.stem);
    const monthBranchIndex = EARTHLY_BRANCHES.findIndex((b) => b.branch === monthPillar.branch);

    const luckPillars: LuckPillar[] = [];
    const startAge = 8; // упрощённо — реальный расчёт требует Solar Terms

    for (let i = 1; i <= 8; i++) {
      const offset = forward ? i : -i;
      const stemIndex = ((monthStemIndex + offset) % 10 + 10) % 10;
      const branchIndex = ((monthBranchIndex + offset) % 12 + 12) % 12;
      const pillar = this.buildPillar(stemIndex, branchIndex);
      luckPillars.push({
        ...pillar,
        startAge: startAge + (i - 1) * 10,
        endAge: startAge + i * 10 - 1,
        direction: forward ? "forward" : "reverse",
      });
    }
    return luckPillars;
  }

  private computeElementBalance(pillars: Pillar[]): Record<FiveElement, number> {
    const balance: Record<FiveElement, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
    for (const p of pillars) {
      balance[p.stemElement] += 1;
      const branch = EARTHLY_BRANCHES.find((b) => b.branch === p.branch);
      if (branch) balance[branch.element] += 1;
    }
    return balance;
  }

  private computeTenGods(dayPillar: Pillar, otherPillars: Pillar[]): TenGod[] {
    const dayElement = dayPillar.stemElement;
    const dayYinYang = dayPillar.stemYinYang;
    const tenGods: TenGod[] = [];
    for (const p of otherPillars) {
      const god = this.determineTenGod(dayElement, dayYinYang, p.stemElement, p.stemYinYang);
      tenGods.push(god);
    }
    return tenGods;
  }

  private determineTenGod(
    dayEl: FiveElement, dayYin: YinYang,
    otherEl: FiveElement, otherYin: YinYang,
  ): TenGod {
    if (dayEl === otherEl) {
      return dayYin === otherYin ? "Companion" : "Rob Wealth";
    }
    // Упрощённое определение Ten God по пяти стихиям
    if (generatesMe(dayEl, otherEl)) {
      return dayYin === otherYin ? "Resource" : "Indirect Resource";
    }
    if (generatesMe(otherEl, dayEl)) {
      return dayYin === otherYin ? "Eating God" : "Hurting Officer";
    }
    if (controlsMe(otherEl, dayEl)) {
      return dayYin === otherYin ? "Direct Officer" : "Seven Killings";
    }
    // dayEl контролирует otherEl
    return dayYin === otherYin ? "Direct Wealth" : "Partial Wealth";
  }
}

function generatesMe(me: FiveElement, other: FiveElement): boolean {
  const cycle: Record<FiveElement, FiveElement> = { Wood: "Water", Fire: "Wood", Earth: "Fire", Metal: "Earth", Water: "Metal" };
  return cycle[me] === other;
}

function controlsMe(other: FiveElement, me: FiveElement): boolean {
  const cycle: Record<FiveElement, FiveElement> = { Wood: "Earth", Earth: "Water", Water: "Fire", Fire: "Metal", Metal: "Wood" };
  return cycle[other] === me;
}
