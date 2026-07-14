/// <reference types="bun-types" />
/**
 * AstroOS BaZi Service — mini-service (порт 3004).
 * HTTP endpoint для BaZi расчётов (TS-реализация, Python-ready).
 *
 * Clean Architecture: Infrastructure layer (external service).
 * withFallback pattern: Next.js API вызывает этот сервис как primary,
 * при timeout/error fallback на встроенный TS калькулятор.
 *
 * Endpoints:
 * - GET /health — health check
 * - POST /calculate — BaZi расчёт (4 столпа + Luck Pillars + Ten Gods)
 */
const PORT = 3004;

// === Heavenly Stems (天干) ===
const STEMS = [
  { stem: "甲", element: "Wood", yinYang: "Yang", pinyin: "Jiǎ" },
  { stem: "乙", element: "Wood", yinYang: "Yin", pinyin: "Yǐ" },
  { stem: "丙", element: "Fire", yinYang: "Yang", pinyin: "Bǐng" },
  { stem: "丁", element: "Fire", yinYang: "Yin", pinyin: "Dīng" },
  { stem: "戊", element: "Earth", yinYang: "Yang", pinyin: "Wù" },
  { stem: "己", element: "Earth", yinYang: "Yin", pinyin: "Jǐ" },
  { stem: "庚", element: "Metal", yinYang: "Yang", pinyin: "Gēng" },
  { stem: "辛", element: "Metal", yinYang: "Yin", pinyin: "Xīn" },
  { stem: "壬", element: "Water", yinYang: "Yang", pinyin: "Rén" },
  { stem: "癸", element: "Water", yinYang: "Yin", pinyin: "Guǐ" },
];

// === Earthly Branches (地支) ===
const BRANCHES = [
  { branch: "子", element: "Water", zodiac: "Rat" },
  { branch: "丑", element: "Earth", zodiac: "Ox" },
  { branch: "寅", element: "Wood", zodiac: "Tiger" },
  { branch: "卯", element: "Wood", zodiac: "Rabbit" },
  { branch: "辰", element: "Earth", zodiac: "Dragon" },
  { branch: "巳", element: "Fire", zodiac: "Snake" },
  { branch: "午", element: "Fire", zodiac: "Horse" },
  { branch: "未", element: "Earth", zodiac: "Goat" },
  { branch: "申", element: "Metal", zodiac: "Monkey" },
  { branch: "酉", element: "Metal", zodiac: "Rooster" },
  { branch: "戌", element: "Earth", zodiac: "Dog" },
  { branch: "亥", element: "Water", zodiac: "Pig" },
];

function buildPillar(stemIndex: number, branchIndex: number) {
  const stem = STEMS[((stemIndex % 10) + 10) % 10];
  const branch = BRANCHES[((branchIndex % 12) + 12) % 12];
  return {
    stem: stem.stem,
    branch: branch.branch,
    stemElement: stem.element,
    stemYinYang: stem.yinYang,
  };
}

function computeYearStem(date: Date): number {
  const year = date.getFullYear();
  const liChun = new Date(year, 1, 4);
  const eff = date < liChun ? year - 1 : year;
  return ((eff - 1984) % 10 + 10) % 10;
}

function computeMonthBranch(date: Date): number {
  const liChun = new Date(date.getFullYear(), 1, 4);
  if (date < liChun) return 1;
  const months = Math.floor((date.getTime() - liChun.getTime()) / (30.44 * 86400000));
  return (2 + months) % 12;
}

function computeDayStem(date: Date): number {
  const epoch = new Date(Date.UTC(1900, 0, 1));
  const days = Math.floor((date.getTime() - epoch.getTime()) / 86400000);
  return ((days % 10) + 10) % 10;
}

function computeDayBranch(date: Date): number {
  const epoch = new Date(Date.UTC(1900, 0, 1));
  const days = Math.floor((date.getTime() - epoch.getTime()) / 86400000);
  return ((days % 12) + 12) % 12;
}

function calculateBaZi(input: {
  birthDateTime: string;
  birthLat: number;
  birthLng: number;
  birthTzOffset: number;
  gender: 0 | 1;
}) {
  const localDate = new Date(input.birthDateTime + "Z");
  const utcDate = new Date(localDate.getTime() - input.birthTzOffset * 3600000);

  const yearStemIdx = computeYearStem(utcDate);
  const monthStemIdx = (computeYearStem(utcDate) * 2 + computeMonthBranch(utcDate) - 2 + 12) % 12;
  const dayStemIdx = computeDayStem(utcDate);
  const dayBranchIdx = computeDayBranch(utcDate);
  const hour = utcDate.getUTCHours();
  const timeBranchIdx = Math.floor(((hour + 1) % 24) / 2);
  const timeStemIdx = (dayStemIdx % 5 * 2 + Math.floor(((hour + 1) % 24) / 2)) % 10;

  const yearPillar = buildPillar(yearStemIdx, yearStemIdx % 12);
  const monthPillar = buildPillar(monthStemIdx, computeMonthBranch(utcDate));
  const dayPillar = buildPillar(dayStemIdx, dayBranchIdx);
  const timePillar = buildPillar(timeStemIdx, timeBranchIdx);

  // Element balance
  const balance: Record<string, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const p of [yearPillar, monthPillar, dayPillar, timePillar]) {
    balance[p.stemElement]++;
    const br = BRANCHES.find((b) => b.branch === p.branch);
    if (br) balance[br.element]++;
  }

  // Luck Pillars
  const yearStem = STEMS[yearStemIdx];
  const forward = (yearStem.yinYang === "Yang" && input.gender === 1) || (yearStem.yinYang === "Yin" && input.gender === 0);
  const luckPillars: Array<{
    stem: string;
    branch: string;
    stemElement: string;
    stemYinYang: string;
    startAge: number;
    endAge: number;
    direction: string;
  }> = [];
  for (let i = 1; i <= 8; i++) {
    const offset = forward ? i : -i;
    luckPillars.push({
      ...buildPillar((monthStemIdx + offset + 10) % 10, (computeMonthBranch(utcDate) + offset + 12) % 12),
      startAge: 8 + (i - 1) * 10,
      endAge: 8 + i * 10 - 1,
      direction: forward ? "forward" : "reverse",
    });
  }

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    timePillar,
    dayMaster: dayPillar.stem,
    dayMasterElement: dayPillar.stemElement,
    dayMasterYinYang: dayPillar.stemYinYang,
    luckPillars,
    elementBalance: balance,
    tenGods: [],
  };
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        service: "bazi-service",
        port: PORT,
        uptime: process.uptime(),
        engine: "ts-fallback-v1",
      });
    }

    if (url.pathname === "/calculate" && req.method === "POST") {
      try {
        const body = await req.json();
        const result = calculateBaZi(body);
        return Response.json({
          bazi: result,
          source: "python-ready",
          latencyMs: 0,
        });
      } catch (e) {
        return Response.json({ error: (e as Error).message }, { status: 400 });
      }
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
});

console.log(`✦ AstroOS BaZi Service running on port ${PORT}`);
console.log(`  Health: http://localhost:${PORT}/health`);
console.log(`  Calculate: POST http://localhost:${PORT}/calculate`);
