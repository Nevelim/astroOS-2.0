"use client";
/**
 * BaZiReportScreen — единый B2C-отчёт (10 блоков по ТЗ заказчика).
 *
 * После ввода данных (birth.tsx / текущий member) пользователь видит дашборд:
 *  1. Day Master — главная фишка (иероглиф, стихия, описание)
 *  2. Баланс стихий (диаграмма)
 *  3. Рекомендации: камни, цвета, артефакты, профессии, направления, годы
 *  4. Знаменитые двойники
 *  5. Совместимость с партнёром (опц.)
 *
 * Data flow: api.calculateBaZi (база) + api.baziForecast (годы рисков).
 * Камни/цвета/артефакты — через /api/remedies (favorable elements).
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { GlassCard, Pill, CosmicButton, SectionHeading, FadeIn } from "../ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { useMember, mockMember } from "@/lib/astroos/real/useMember";
import {
  api,
  type BaZiDTO,
  type BaziForecastDTO,
  type BaziCompatibilityDTO,
  type BaziDailyForecastDTO,
} from "@/lib/astroos/real/api-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Star, TrendingUp, Award, Heart, ShoppingBag,
  Palette, Home, Briefcase, Compass, Calendar, Users, AlertCircle,
  Share2, History, Download,
} from "lucide-react";

// Element → display (color + label).
const ELEMENT_DISPLAY: Record<string, { color: string; ru: string; en: string; hi: string }> = {
  wood: { color: "#5BB89C", ru: "Дерево", en: "Wood", hi: "काष्ठ" },
  fire: { color: "#E8B86D", ru: "Огонь", en: "Fire", hi: "अग्नि" },
  earth: { color: "#D98E7A", ru: "Земля", en: "Earth", hi: "पृथ्वी" },
  metal: { color: "#5E8FA8", ru: "Металл", en: "Metal", hi: "धातु" },
  water: { color: "#6B8FB5", ru: "Вода", en: "Water", hi: "जल" },
};

const ELEMENTS = ["wood", "fire", "earth", "metal", "water"] as const;

interface BaZiReportScreenProps {
  onNavigate?: (k: import("@/lib/astroos/data").ScreenKey) => void;
}

export function BaZiReportScreen({ onNavigate }: BaZiReportScreenProps) {
  const { t, locale } = useI18n();
  const { member } = useMember();
  const [bazi, setBazi] = useState<(BaZiDTO & { favorableElements?: string[] }) | null>(null);
  const [forecast, setForecast] = useState<BaziForecastDTO | null>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const meMember = useMemo(() => member ?? mockMember(), [member]);

  const compute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.calculateBaZi({
        birthDateTime: meMember.birth.isoDateTime,
        birthLat: meMember.birth.lat,
        birthLng: meMember.birth.lng,
        birthTzOffset: meMember.birth.tzOffset,
        birthPlaceName: meMember.birth.placeName,
        gender: meMember.birth.gender,
      });
      // Normalize the BaZi DTO: the TS use-case returns elementBalance with
      // Titlecase keys (Wood/Fire/...) and no favorableElements field. We
      // normalize to lowercase keys and derive favorableElements from the
      // recommendations object so the report blocks render correctly.
      const rawBal = r.bazi.elementBalance ?? {};
      const normBal: Record<string, number> = {};
      Object.entries(rawBal).forEach(([k, v]) => {
        normBal[k.toLowerCase()] = v as number;
      });
      const recs = (r.recommendations ?? {}) as Record<string, unknown>;
      const favRaw = (recs.favorable as string[]) ?? [];
      const favorable = favRaw.map((e) => e.toLowerCase());
      const enriched = {
        ...r.bazi,
        elementBalance: normBal,
        dayMasterElement: r.bazi.dayMasterElement.toLowerCase(),
        favorableElements: favorable.length > 0 ? favorable
          : [r.bazi.dayMasterElement.toLowerCase()],
      };
      setBazi(enriched);
      setRecommendations(recs);
      setForecast(null);
    } catch (e) {
      setError(locale === "ru" ? "Не удалось рассчитать карту" : "Could not compute chart");
    } finally {
      setLoading(false);
    }
  }, [meMember, locale]);

  useEffect(() => { compute(); }, [compute]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B0B0F" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-14 h-14 rounded-full border-2 border-transparent flex items-center justify-center"
          style={{ borderTopColor: "#5BB89C", borderRightColor: "#E8B86D" }}>
          <span className="text-xl" style={{ fontFamily: "serif", color: "#5BB89C" }}>己</span>
        </motion.div>
      </div>
    );
  }
  if (error || !bazi) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B0B0F" }}>
        <GlassCard variant="rose" className="p-4 max-w-md">
          <p className="text-sm flex items-center gap-2" style={{ color: "#D98E7A" }}>
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
          <CosmicButton onClick={compute} variant="rose" className="mt-3">
            {locale === "ru" ? "Повторить" : "Retry"}
          </CosmicButton>
        </GlassCard>
      </div>
    );
  }

  const el = (e: string) => ELEMENT_DISPLAY[e] ?? ELEMENT_DISPLAY.earth;
  const L = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  return (
    <div className="min-h-screen pb-20" style={{ background: "#0B0B0F" }}>
      {/* Header */}
      <FadeIn className="mb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "#5BB89C" }}>
              {L("Персональный дашборд", "Personal dashboard", "व्यक्तिगत डैशबोर्ड")}
            </p>
            <h1 className="font-serif text-2xl md:text-3xl mt-1" style={{ color: "#F5F0E8" }}>
              {t("nav.baziReport")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <CosmicButton onClick={() => window.print()} variant="outline" className="text-xs no-print">
              <Download className="w-3 h-3 inline mr-1" />
              {L("PDF", "PDF", "PDF")}
            </CosmicButton>
            <Pill tone="jade"><Sparkles className="w-3 h-3 inline mr-1" /> {meMember.displayName}</Pill>
          </div>
        </div>
      </FadeIn>

      {/* Блок 1: Day Master hero */}
      <FadeIn delay={0.05}>
        <DayMasterHero bazi={bazi} el={el} L={L} locale={locale} />
      </FadeIn>

      {/* Блок 2: Баланс стихий */}
      <FadeIn delay={0.1}>
        <ElementBalanceCard bazi={bazi} el={el} L={L} locale={locale} />
      </FadeIn>

      {/* Блок 3: Рекомендации */}
      <FadeIn delay={0.15}>
        <SectionHeading title={<><Star className="w-4 h-4 inline mr-1" style={{ color: "#E8B86D" }} />{L("Персональные рекомендации", "Personal recommendations", "व्यक्तिगत सिफारिशें")}</>} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {/* Камни */}
          <RemedyCard icon={<ShoppingBag className="w-4 h-4" />} title={L("Камни и кристаллы", "Stones & crystals", "रत्न")}
            elements={(bazi.favorableElements ?? [])} filterType="stone" locale={locale} L={L} />
          {/* Цвета */}
          <RemedyCard icon={<Palette className="w-4 h-4" />} title={L("Цвета", "Colors", "रंग")}
            elements={(bazi.favorableElements ?? [])} filterType="color" locale={locale} L={L} />
          {/* Артефакты */}
          <RemedyCard icon={<Home className="w-4 h-4" />} title={L("Артефакты для дома", "Home artifacts", "घर के लिए कलाकृतियाँ")}
            elements={(bazi.favorableElements ?? [])} filterType="amulet" locale={locale} L={L} />
          {/* Профессии */}
          <ProfessionsCard bazi={bazi} el={el} L={L} locale={locale} />
        </div>
      </FadeIn>

      {/* Блок: Направления и страны */}
      <FadeIn delay={0.2}>
        <DirectionsCard bazi={bazi} el={el} L={L} locale={locale} />
      </FadeIn>

      {/* Блок: Годы переезда и рисков */}
      {forecast && (
        <FadeIn delay={0.25}>
          <ForecastCard forecast={forecast} L={L} locale={locale} />
        </FadeIn>
      )}

      {/* Блок: Выбор даты (календарь удачных дней) */}
      <FadeIn delay={0.27}>
        <DateSelectionCard bazi={bazi} L={L} locale={locale} />
      </FadeIn>

      {/* Блок: Совместимость с партнёром */}
      <FadeIn delay={0.28}>
        <CompatibilityCard bazi={bazi} el={el} L={L} locale={locale} />
      </FadeIn>

      {/* Блок 10: Знаменитые двойники */}
      <FadeIn delay={0.3}>
        <FamousPeopleCard bazi={bazi} el={el} L={L} locale={locale} />
      </FadeIn>

      {/* Ежедневный прогноз (столп дня) */}
      <FadeIn delay={0.31}>
        <DailyForecastCard bazi={bazi} el={el} L={L} locale={locale} />
      </FadeIn>

      {/* Сообщество: Day Master share-визитка */}
      <FadeIn delay={0.32}>
        <ShareCard bazi={bazi} el={el} L={L} locale={locale} />
      </FadeIn>

      {/* Кабинет: история + сравнение */}
      <FadeIn delay={0.34}>
        <CabinetCard bazi={bazi} el={el} L={L} locale={locale} meMember={meMember} />
      </FadeIn>
    </div>
  );
}

// ============ Block components ============

function DayMasterHero({ bazi, el, L, locale }: any) {
  const [expanded, setExpanded] = useState(false);
  const dmEl = bazi.dayMasterElement;
  const disp = el(dmEl);
  return (
    <GlassCard variant="gold" ornamental glow className="p-5 mb-4">
      <div className="flex items-center gap-5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `radial-gradient(circle, ${disp.color}30, transparent)`, border: `2px solid ${disp.color}` }}>
          <span className="text-4xl md:text-5xl" style={{ fontFamily: "serif", color: disp.color }}>
            {bazi.dayMaster}
          </span>
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "#5BB89C" }}>
            {L("Ваш Day Master", "Your Day Master", "आपका दिन स्वामी")}
          </p>
          <h2 className="font-serif text-xl md:text-2xl mt-1" style={{ color: "#F5F0E8" }}>
            {disp[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"]}{" "}
            <span style={{ color: disp.color }}>
              {bazi.dayMasterYinYang === "yang" ? (L("Ян", "Yang", "यांग")) : (L("Инь", "Yin", "यिन"))}
            </span>
          </h2>
          <p className="text-xs mt-1" style={{ color: "#F5F0E8A0" }}>
            {L("Главная стихия вашей природы", "The core element of your nature", "आपकी प्रकृति का मुख्य तत्व")}
          </p>
          <CosmicButton onClick={() => setExpanded((e) => !e)} variant="gold" className="mt-2 text-xs">
            {expanded ? (L("Свернуть", "Less", "कम")) : (L("Подробнее", "Details", "विवरण"))}
          </CosmicButton>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="text-sm mt-3 pt-3 border-t" style={{ color: "#F5F0E8C0", borderColor: "#2A2A35" }}>
              {dmProfileText(bazi.dayMasterElement, bazi.dayMasterYinYang, locale)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

function ElementBalanceCard({ bazi, el, L, locale }: any) {
  const balance = bazi.elementBalance ?? {};
  const max = Math.max(...ELEMENTS.map((e) => balance[e] ?? 0), 1);
  return (
    <GlassCard variant="jade" className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4" style={{ color: "#5BB89C" }} />
        <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
          {L("Баланс стихий", "Element balance", "तत्व संतुलन")}
        </h3>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {ELEMENTS.map((e) => {
          const count = balance[e] ?? 0;
          const pct = (count / max) * 100;
          const disp = el(e);
          const isDominant = count === max && count > 0;
          return (
            <div key={e} className="text-center">
              <div className="h-24 md:h-32 flex items-end justify-center mb-1">
                <motion.div
                  initial={{ height: 0 }} animate={{ height: `${Math.max(pct, 5)}%` }}
                  transition={{ delay: 0.1 * ELEMENTS.indexOf(e) }}
                  className="w-full rounded-t"
                  style={{ background: `linear-gradient(to top, ${disp.color}, ${disp.color}80)` }}
                />
              </div>
              <div className="text-[10px] font-mono" style={{ color: isDominant ? disp.color : "#9A9AA8" }}>{count}</div>
              <div className="text-[9px]" style={{ color: disp.color }}>
                {disp[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"]}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] mt-3" style={{ color: "#5BB89C" }}>
        {balanceMeaning(bazi, el, L, locale)}
      </p>
    </GlassCard>
  );
}

function RemedyCard({ icon, title, elements, filterType, locale, L }: any) {
  // Look up remedies from the static catalogs (mirrors the Python remedies
  // catalog) for each favorable element + the requested type.
  const catalog = filterType === "stone" ? STONE_CATALOG
    : filterType === "color" ? COLOR_CATALOG
    : AMULET_CATALOG;
  const items: any[] = [];
  for (const el of elements) {
    const entries = catalog[el] ?? [];
    for (const e of entries) items.push({ ...e, element: el });
  }
  if (items.length === 0) return null;
  return (
    <GlassCard variant="neutral" className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: "#E8B86D" }}>{icon}</span>
        <h4 className="font-serif text-base" style={{ color: "#F5F0E8" }}>{title}</h4>
      </div>
      <div className="space-y-2">
        {items.slice(0, 4).map((r: any, i: number) => {
          const eDisp = ELEMENT_DISPLAY[r.element] ?? ELEMENT_DISPLAY.earth;
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: eDisp.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "#F5F0E8" }}>{r.name}</p>
                {r.reasoning && <p className="text-[10px]" style={{ color: "#9A9AA8" }}>{r.reasoning}</p>}
                <span className="text-[9px] px-1.5 py-0.5 rounded inline-block mt-0.5"
                  style={{ background: `${eDisp.color}15`, color: eDisp.color }}>
                  {eDisp[locale === "ru" ? "ru" : "en"]}
                </span>
              </div>
              {filterType !== "amulet" && (
                <BuyButton name={r.name} L={L} />
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function ProfessionsCard({ bazi, el, L, locale }: any) {
  // Derived locally from element (frontend reference; backend has full table).
  const profs = PROFESSIONS_BY_ELEMENT[bazi.dayMasterElement] ?? [];
  return (
    <GlassCard variant="neutral" className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Briefcase className="w-4 h-4" style={{ color: "#E8B86D" }} />
        <h4 className="font-serif text-base" style={{ color: "#F5F0E8" }}>
          {L("Профессии", "Professions", "पेशे")}
        </h4>
      </div>
      <div className="space-y-1.5">
        {profs.map((p, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-[10px] font-mono px-1 rounded" style={{ background: "#5BB89C20", color: "#5BB89C" }}>
              {i + 1}
            </span>
            <div>
              <p className="text-sm" style={{ color: "#F5F0E8" }}>{locale === "ru" ? p.ru : p.en}</p>
              <p className="text-[10px]" style={{ color: "#9A9AA8" }}>{p.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function DirectionsCard({ bazi, el, L, locale }: any) {
  const fav = bazi.favorableElements ?? ["earth"];
  return (
    <GlassCard variant="neutral" className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Compass className="w-4 h-4" style={{ color: "#5BB89C" }} />
        <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
          {L("Стороны света и страны", "Directions & countries", "दिशा और देश")}
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fav.map((e: string, i: number) => {
          const disp = el(e);
          const dir = DIRECTION_BY_ELEMENT[e] ?? "—";
          const countries = COUNTRIES_BY_ELEMENT[e] ?? [];
          return (
            <div key={i} className="flex items-center gap-3 p-2 rounded" style={{ background: `${disp.color}10` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${disp.color}20`, border: `1px solid ${disp.color}` }}>
                <span className="text-xs font-mono" style={{ color: disp.color }}>{dir}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium" style={{ color: disp.color }}>
                  {disp[locale === "ru" ? "ru" : "en"]} → {dir}
                </p>
                <p className="text-[10px]" style={{ color: "#9A9AA8" }}>
                  {countries.join(", ")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function ForecastCard({ forecast, L, locale }: any) {
  return (
    <GlassCard variant="rose" className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4" style={{ color: "#D98E7A" }} />
        <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
          {L("Годы переезда и рисков", "Relocation & risk years", "पुनर्वास और जोखिम वर्ष")}
        </h3>
      </div>
      <div className="space-y-2">
        {forecast.years.map((y: any) => (
          <div key={y.year} className="flex items-center gap-3 p-2 rounded"
            style={{ background: y.high_risk ? "#D98E7A10" : "#5BB89C10" }}>
            <span className="text-lg font-mono w-12" style={{ color: y.high_risk ? "#D98E7A" : "#5BB89C" }}>
              {y.year}
            </span>
            <div className="flex-1">
              <p className="text-xs" style={{ color: "#F5F0E8" }}>
                {y.annual_pillar.stem_hanzi}{y.annual_pillar.branch_hanzi} · {y.annual_pillar.element}
              </p>
              {y.clashes.length > 0 ? (
                <p className="text-[10px]" style={{ color: "#D98E7A" }}>
                  {y.clashes[0].description}
                </p>
              ) : (
                <p className="text-[10px]" style={{ color: "#5BB89C" }}>
                  {L("Благоприятный год", "Favorable year", "अनुकूल वर्ष")}
                </p>
              )}
            </div>
            {y.high_risk && <AlertCircle className="w-4 h-4" style={{ color: "#D98E7A" }} />}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function DateSelectionCard({ bazi, L, locale }: any) {
  const [goal, setGoal] = useState("business");
  const [dates, setDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Hanzi → stem value (for the API).
  const HANZI_TO_STEM: Record<string, string> = {
    "甲": "jia", "乙": "yi", "丙": "bing", "丁": "ding", "戊": "wu",
    "己": "ji", "庚": "geng", "辛": "xin", "壬": "ren", "癸": "gui",
  };
  const dmStem = HANZI_TO_STEM[bazi.dayMaster] ?? "jia";

  const pick = async () => {
    setLoading(true);
    try {
      const r = await api.baziDateSelection({ day_master_stem: dmStem, goal, days_ahead: 90, top_n: 5 });
      setDates(r.dates);
    } catch {
      setDates([]);
    } finally {
      setLoading(false);
    }
  };

  const goals = [
    { value: "business", ru: "Бизнес", en: "Business", hi: "व्यवसाय" },
    { value: "wedding", ru: "Свадьба", en: "Wedding", hi: "विवाह" },
    { value: "relocation", ru: "Переезд", en: "Relocation", hi: "पुनर्वास" },
    { value: "travel", ru: "Путешествие", en: "Travel", hi: "यात्रा" },
    { value: "contract", ru: "Контракт", en: "Contract", hi: "अनुबंध" },
  ];

  return (
    <GlassCard variant="jade" className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4" style={{ color: "#5BB89C" }} />
        <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
          {L("Выбор благоприятной даты", "Auspicious date picker", "शुभ तिथि चयनकर्ता")}
        </h3>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {goals.map((g) => (
          <button key={g.value} onClick={() => setGoal(g.value)}
            className="text-[11px] px-2 py-1 rounded-full border transition-colors"
            style={{
              borderColor: goal === g.value ? "#5BB89C" : "#2A2A35",
              background: goal === g.value ? "#5BB89C20" : "transparent",
              color: goal === g.value ? "#5BB89C" : "#9A9AA8",
            }}>
            {L(g.ru, g.en, g.hi)}
          </button>
        ))}
      </div>
      <CosmicButton onClick={pick} disabled={loading} variant="jade">
        {loading ? (L("Поиск...", "Searching...", "खोज...")) : (L("Найти даты", "Find dates", "तिथियाँ खोजें"))}
      </CosmicButton>
      {dates.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {dates.map((d, i) => {
            const labelColor = d.label === "excellent" ? "#5BB89C"
              : d.label === "good" ? "#5BB89C" : d.label === "avoid" ? "#D98E7A" : "#E8B86D";
            return (
              <div key={i} className="flex items-center gap-3 p-2 rounded" style={{ background: `${labelColor}10` }}>
                <span className="text-sm font-mono w-24" style={{ color: "#F5F0E8" }}>{d.date}</span>
                <span className="text-lg" style={{ fontFamily: "serif", color: labelColor }}>
                  {d.pillar.stem_hanzi}{d.pillar.branch_hanzi}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${labelColor}20`, color: labelColor }}>
                  {d.label}
                </span>
                <span className="text-[10px] flex-1" style={{ color: "#9A9AA8" }}>{d.reason}</span>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

function CompatibilityCard({ bazi, el, L, locale }: any) {
  const [partnerDm, setPartnerDm] = useState("己");
  const [report, setReport] = useState<BaziCompatibilityDTO | null>(null);
  const [loading, setLoading] = useState(false);

  const HANZI_TO_STEM: Record<string, string> = {
    "甲": "jia", "乙": "yi", "丙": "bing", "丁": "ding", "戊": "wu",
    "己": "ji", "庚": "geng", "辛": "xin", "壬": "ren", "癸": "gui",
  };
  const STEM_HANZI = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const myStem = HANZI_TO_STEM[bazi.dayMaster] ?? "jia";

  const compute = async () => {
    const partnerStem = HANZI_TO_STEM[partnerDm] ?? "ji";
    setLoading(true);
    try {
      const r = await api.baziCompatibility(myStem, partnerStem);
      setReport(r);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = report
    ? (report.score >= 75 ? "#5BB89C" : report.score >= 55 ? "#E8B86D" : "#D98E7A")
    : "#9A9AA8";

  return (
    <GlassCard variant="rose" className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="w-4 h-4" style={{ color: "#D98E7A" }} />
        <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
          {L("Совместимость с партнёром", "Partner compatibility", "साथी संगतता")}
        </h3>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[11px]" style={{ color: "#9A9AA8" }}>
          {L("Ваш DM", "Your DM", "आपका DM")}
        </span>
        <span className="text-xl font-serif px-2 py-1 rounded" style={{
          background: `${el(bazi.dayMasterElement).color}20`, color: el(bazi.dayMasterElement).color,
        }}>
          {bazi.dayMaster}
        </span>
        <span style={{ color: "#9A9AA8" }}>×</span>
        <label className="flex items-center gap-1">
          <span className="text-[11px]" style={{ color: "#9A9AA8" }}>
            {L("Партнёр", "Partner", "साथी")}
          </span>
          <select value={partnerDm} onChange={(e) => setPartnerDm(e.target.value)}
            className="rounded px-2 py-1 text-sm" style={{ background: "#0B0B0F", border: "1px solid #2A2A35", color: "#F5F0E8" }}>
            {STEM_HANZI.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
        <CosmicButton onClick={compute} disabled={loading} variant="rose" className="ml-auto text-xs">
          {loading ? "…" : L("Расчёт", "Compute", "गणना")}
        </CosmicButton>
      </div>
      <AnimatePresence>
        {report && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            {/* Score ring */}
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
                style={{ border: `3px solid ${scoreColor}`, background: `${scoreColor}15` }}>
                <span className="text-xl font-mono" style={{ color: scoreColor }}>{report.score}</span>
              </div>
              <div>
                <p className="text-sm font-medium capitalize" style={{ color: scoreColor }}>
                  {report.label === "harmonious" ? L("Гармоничный союз", "Harmonious", "सामंजस्यपूर्ण")
                    : report.label === "balanced" ? L("Сбалансированный", "Balanced", "संतुलित")
                    : L("Сложный", "Challenging", "चुनौतीपूर्ण")}
                </p>
                <p className="text-[11px]" style={{ color: "#F5F0E8A0" }}>
                  {locale === "ru" ? report.dynamic_ru : report.dynamic}
                </p>
                {report.is_noble_combination && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded inline-block mt-1" style={{ background: "#E8B86D20", color: "#E8B86D" }}>
                    {L("★ Благородное сочетание (天干五合)", "★ Noble combination (天干五合)", "★ नोबल संयोजन")}
                  </span>
                )}
              </div>
            </div>
            {/* Zones + remedies */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <p style={{ color: "#5BB89C" }}>{L("Сильные стороны", "Harmony zones", "सामंजस्य")}</p>
                {report.harmony_zones.map((z, i) => (
                  <p key={i} style={{ color: "#F5F0E8A0" }}>+ {z}</p>
                ))}
              </div>
              <div>
                <p style={{ color: "#D98E7A" }}>{L("Зоны конфликта", "Conflict zones", "संघर्ष क्षेत्र")}</p>
                {report.conflict_zones.length > 0 ? report.conflict_zones.map((z, i) => (
                  <p key={i} style={{ color: "#F5F0E8A0" }}>− {z}</p>
                )) : <p style={{ color: "#9A9AA8" }}>—</p>}
              </div>
            </div>
            {report.remedies.length > 0 && (
              <div className="mt-2 pt-2 border-t" style={{ borderColor: "#2A2A35" }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#9A9AA8" }}>
                  {L("Рекомендации по гармонизации", "Harmonization", "सामंजस्यीकरण")}
                </p>
                {report.remedies.map((r, i) => (
                  <p key={i} className="text-[11px]" style={{ color: "#F5F0E8C0" }}>• {r}</p>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

function FamousPeopleCard({ bazi, el, L, locale }: any) {
  // Frontend mirror of the backend famous-people dataset (subset).
  const people = FAMOUS_BY_DM[bazi.dayMaster] ?? [];
  if (people.length === 0) return null;
  return (
    <GlassCard variant="gold" className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-4 h-4" style={{ color: "#E8B86D" }} />
        <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
          {L("Знаменитые двойники", "Famous doubles", "प्रसिद्ध दोहरे")}
        </h3>
      </div>
      <div className="space-y-2">
        {people.map((p, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-2xl" style={{ fontFamily: "serif", color: "#E8B86D" }}>★</span>
            <div>
              <p className="text-sm font-medium" style={{ color: "#F5F0E8" }}>
                {locale === "ru" ? p.name_ru : p.name} <span className="text-[10px]" style={{ color: "#9A9AA8" }}>({p.era})</span>
              </p>
              <p className="text-[11px]" style={{ color: "#F5F0E8A0" }}>
                {locale === "ru" ? p.achievement_ru : p.achievement}
              </p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function BuyButton({ name, L }: { name: string; L: any }) {
  return (
    <a
      href={`https://www.etsy.com/search?q=${encodeURIComponent(name)}`}
      target="_blank" rel="noopener noreferrer sponsored"
      className="text-[10px] px-2 py-1 rounded shrink-0 transition-colors"
      style={{ background: "#E8B86D20", color: "#E8B86D", border: "1px solid #E8B86D40" }}
      title={L("Купить", "Buy", "खरीदें")}
    >
      <ShoppingBag className="w-3 h-3 inline" /> {L("Купить", "Buy", "खरीद")}
    </a>
  );
}

// ============ Reference data (frontend mirror) ============
// Remedy catalogs (mirror of the Python remedies catalog) — keyed by element.
const STONE_CATALOG: Record<string, Array<{ name: string; reasoning: string }>> = {
  wood: [{ name: "Green Aventurine", reasoning: "Growth, vitality, new beginnings" }, { name: "Jade", reasoning: "Renewal and harmony" }],
  fire: [{ name: "Carnelian", reasoning: "Courage, motivation, creative spark" }, { name: "Red Jasper", reasoning: "Passion and stamina" }],
  earth: [{ name: "Tiger's Eye", reasoning: "Grounding, protection, stability" }, { name: "Yellow Jade", reasoning: "Nourishment and patience" }],
  metal: [{ name: "Clear Quartz", reasoning: "Focus, precision, clarity" }, { name: "Hematite", reasoning: "Structure and grounding" }],
  water: [{ name: "Aquamarine", reasoning: "Flow, intuition, emotional calm" }, { name: "Moonstone", reasoning: "Reflection and wisdom" }],
};
const COLOR_CATALOG: Record<string, Array<{ name: string; reasoning: string }>> = {
  wood: [{ name: "Green", reasoning: "Encourages renewal and growth" }],
  fire: [{ name: "Red", reasoning: "Activates passion and visibility" }],
  earth: [{ name: "Earthy Yellow / Brown", reasoning: "Stability and nourishment" }],
  metal: [{ name: "White / Silver", reasoning: "Precision and clarity" }],
  water: [{ name: "Deep Blue / Black", reasoning: "Reflective wisdom and depth" }],
};
const AMULET_CATALOG: Record<string, Array<{ name: string; reasoning: string }>> = {
  wood: [{ name: "Green Dragon (东方青龙)", reasoning: "East — protects family and growth" }],
  fire: [{ name: "Red Phoenix (南方朱雀)", reasoning: "South — activates recognition and fame" }],
  earth: [{ name: "Pi Xiu (貔貅)", reasoning: "Entrance — draws wealth, wards off misfortune" }],
  metal: [{ name: "White Tiger (西方白虎)", reasoning: "West — sharpens focus and discipline" }],
  water: [{ name: "Black Tortoise (北方玄武)", reasoning: "North — anchors career and wisdom" }],
};

const DIRECTION_BY_ELEMENT: Record<string, string> = {
  wood: "E", fire: "S", earth: "C", metal: "W", water: "N",
};
const COUNTRIES_BY_ELEMENT: Record<string, string[]> = {
  wood: ["Новая Зеландия", "Япония", "Ирландия"],
  fire: ["Италия", "Испания", "Греция"],
  earth: ["Швейцария", "Австрия", "Грузия"],
  metal: ["Германия", "Япония", "Юж. Корея"],
  water: ["Нидерланды", "Великобритания", "Канада"],
};
const PROFESSIONS_BY_ELEMENT: Record<string, Array<{ ru: string; en: string; reason: string }>> = {
  wood: [{ ru: "Образование", en: "Education", reason: "growth, teaching" }, { ru: "Медицина", en: "Healthcare", reason: "vitality, healing" }, { ru: "Дизайн", en: "Design", reason: "creativity" }],
  fire: [{ ru: "Маркетинг", en: "Marketing", reason: "visibility, charisma" }, { ru: "Продажи", en: "Sales", reason: "passion" }, { ru: "Лидерство", en: "Leadership", reason: "inspiration" }],
  earth: [{ ru: "Недвижимость", en: "Real estate", reason: "stability" }, { ru: "Финансы", en: "Finance", reason: "structure" }, { ru: "Консалтинг", en: "Consulting", reason: "strategy" }],
  metal: [{ ru: "IT", en: "IT", reason: "precision, logic" }, { ru: "Юриспруденция", en: "Law", reason: "justice" }, { ru: "Инженерия", en: "Engineering", reason: "systems" }],
  water: [{ ru: "Торговля", en: "Trade", reason: "flow, networks" }, { ru: "Дипломатия", en: "Diplomacy", reason: "communication" }, { ru: "Исследования", en: "Research", reason: "depth" }],
};
const FAMOUS_BY_DM: Record<string, Array<{ name: string; name_ru: string; era: string; achievement: string; achievement_ru: string }>> = {
  "甲": [{ name: "Confucius", name_ru: "Конфуций", era: "551–479 BCE", achievement: "Founded Confucianism", achievement_ru: "Основал конфуцианство" }, { name: "Genghis Khan", name_ru: "Чингисхан", era: "1162–1227", achievement: "Mongol Empire founder", achievement_ru: "Основал Монгольскую империю" }],
  "乙": [{ name: "Steve Jobs", name_ru: "Стив Джобс", era: "1955–2011", achievement: "Apple co-founder", achievement_ru: "Сооснователь Apple" }, { name: "Mozart", name_ru: "Моцарт", era: "1756–1791", achievement: "Classical composer", achievement_ru: "Композитор" }],
  "丙": [{ name: "Napoleon", name_ru: "Наполеон", era: "1769–1821", achievement: "French emperor", achievement_ru: "Французский император" }, { name: "Churchill", name_ru: "Черчилль", era: "1874–1965", achievement: "UK wartime leader", achievement_ru: "Лидер Великобритании" }],
  "丁": [{ name: "Bill Gates", name_ru: "Билл Гейтс", era: "b. 1955", achievement: "Microsoft co-founder", achievement_ru: "Сооснователь Microsoft" }],
  "戊": [{ name: "Elon Musk", name_ru: "Илон Маск", era: "b. 1971", achievement: "SpaceX, Tesla founder", achievement_ru: "Основатель SpaceX, Tesla" }, { name: "Deng Xiaoping", name_ru: "Дэн Сяопин", era: "1904–1997", achievement: "China reforms architect", achievement_ru: "Архитектор реформ Китая" }],
  "己": [{ name: "Emperor Qianlong", name_ru: "Император Цяньлун", era: "1711–1799", achievement: "Ruled China 60 years", achievement_ru: "Правил Китаем 60 лет" }, { name: "Mother Teresa", name_ru: "Мать Тереза", era: "1910–1997", achievement: "Nobel Peace Prize", achievement_ru: "Нобелевская премия мира" }],
  "庚": [{ name: "Margaret Thatcher", name_ru: "Маргарет Тэтчер", era: "1925–2013", achievement: "UK PM, Iron Lady", achievement_ru: "Премьер-министр Великобритании" }, { name: "Queen Elizabeth II", name_ru: "Королева Елизавета II", era: "1926–2022", achievement: "Longest-reigning monarch", achievement_ru: "Самый долго правящий монарх" }],
  "辛": [{ name: "Warren Buffett", name_ru: "Уоррен Баффет", era: "b. 1930", achievement: "Legendary investor", achievement_ru: "Легендарный инвестор" }, { name: "Jeff Bezos", name_ru: "Джефф Безос", era: "b. 1964", achievement: "Amazon founder", achievement_ru: "Основатель Amazon" }],
  "壬": [{ name: "Albert Einstein", name_ru: "Альберт Эйнштейн", era: "1879–1955", achievement: "Relativity, Nobel Prize", achievement_ru: "Теория относительности" }, { name: "Charles Darwin", name_ru: "Чарльз Дарвин", era: "1809–1882", achievement: "Theory of evolution", achievement_ru: "Теория эволюции" }],
  "癸": [{ name: "Isaac Newton", name_ru: "Исаак Ньютон", era: "1643–1727", achievement: "Laws of motion", achievement_ru: "Законы движения" }],
};

function dmProfileText(element: string, yinYang: string, locale: string): string {
  const profiles: Record<string, { ru: [string, string]; en: [string, string]; hi: [string, string] }> = {
    wood: { ru: ["Ваша сила — в росте и творчестве.", "Слабость — упрямство и распыление."], en: ["Your strength is growth and creativity.", "Weakness — stubbornness and dispersion."], hi: ["ताकत — विकास और रचनात्मकता।", "कमजोरी — जिद और फैलाव।"] },
    fire: { ru: ["Ваша сила — страсть и харизма.", "Слабость — вспыльчивость и нетерпение."], en: ["Your strength is passion and charisma.", "Weakness — quick temper and impatience."], hi: ["ताकत — जुनून और करिश्मा।", "कमजोरी — तेज स्वभाव।"] },
    earth: { ru: ["Ваша сила — в терпении и стратегии.", "Слабость — инертность и тревога."], en: ["Your strength is patience and strategy.", "Weakness — inertia and anxiety."], hi: ["ताकत — धैर्य और रणनीति।", "कमजोरी — जड़ता और चिंता।"] },
    metal: { ru: ["Ваша сила — в дисциплине и точности.", "Слабость — жёсткость и критичность."], en: ["Your strength is discipline and precision.", "Weakness — rigidity and criticism."], hi: ["ताकत — अनुशासन और सटीकता।", "कमजोरी — कठोरता।"] },
    water: { ru: ["Ваша сила — в мудрости и адаптивности.", "Слабость — нерешительность и страх."], en: ["Your strength is wisdom and adaptability.", "Weakness — indecision and fear."], hi: ["ताकत — ज्ञान और अनुकूलन।", "कमजोरी — अनिर्णय।"] },
  };
  const p = profiles[element] ?? profiles.earth;
  const lang = locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en";
  return `${p[lang][0]} ${p[lang][1]}`;
}

function balanceMeaning(bazi: any, el: any, L: any, locale: string): string {
  const bal = bazi.elementBalance ?? {};
  const fav = bazi.favorableElements ?? [];
  if (fav.length === 0) return "";
  const favDisp = el(fav[0]);
  const favName = favDisp[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"];
  return locale === "ru"
    ? `Вам благоприятен элемент: ${favName}. Добавляйте его в жизнь.`
    : locale === "hi"
    ? `आपके लिए अनुकूल तत्व: ${favName}। इसे अपने जीवन में जोड़ें।`
    : `Your favorable element: ${favName}. Bring more of it into your life.`;
}

function DailyForecastCard({ bazi, el, L, locale }: any) {
  const [forecast, setForecast] = useState<BaziDailyForecastDTO | null>(null);
  const HANZI_TO_STEM: Record<string, string> = {
    "甲": "jia", "乙": "yi", "丙": "bing", "丁": "ding", "戊": "wu",
    "己": "ji", "庚": "geng", "辛": "xin", "壬": "ren", "癸": "gui",
  };

  useEffect(() => {
    const stem = HANZI_TO_STEM[bazi.dayMaster] ?? "jia";
    api.baziDailyForecast(stem).then(setForecast).catch(() => setForecast(null));
  }, [bazi.dayMaster]);

  if (!forecast) return null;
  const labelColor = forecast.label === "excellent" || forecast.label === "good"
    ? "#5BB89C" : forecast.label === "avoid" ? "#D98E7A" : "#E8B86D";
  const stemDisp = el(forecast.stem_element);
  const branchDisp = el(forecast.branch_element);

  return (
    <GlassCard variant="neutral" className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4" style={{ color: "#5BB89C" }} />
        <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
          {L("Прогноз на сегодня", "Today's forecast", "आज का पूर्वानुमान")}
        </h3>
        <span className="text-[10px] ml-auto" style={{ color: "#9A9AA8" }}>{forecast.date}</span>
      </div>
      <div className="flex items-center gap-4 p-3 rounded" style={{ background: `${labelColor}10` }}>
        <div className="text-center shrink-0">
          <span className="text-2xl block" style={{ fontFamily: "serif", color: "#F5F0E8" }}>
            {forecast.pillar.stem_hanzi}{forecast.pillar.branch_hanzi}
          </span>
          <p className="text-[9px]" style={{ color: "#9A9AA8" }}>
            {L("Столп дня", "Day pillar", "दिन स्तंभ")}
          </p>
        </div>
        <div className="flex-1">
          <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: `${labelColor}20`, color: labelColor }}>
            {forecast.label}
          </span>
          <p className="text-[11px] mt-1.5" style={{ color: "#F5F0E8C0" }}>{forecast.reason}</p>
        </div>
      </div>
    </GlassCard>
  );
}

function ShareCard({ bazi, el, L, locale }: any) {
  const disp = el(bazi.dayMasterElement);
  const [copied, setCopied] = useState(false);

  const shareText = locale === "ru"
    ? `Мой Day Master — ${bazi.dayMaster} (${disp.ru} ${bazi.dayMasterYinYang === "yang" ? "Ян" : "Инь"}). Узнай свой на AstroOS!`
    : locale === "hi"
    ? `मेरा दिन स्वामी — ${bazi.dayMaster} (${disp.hi}). AstroOS पर अपना जानें!`
    : `My Day Master is ${bazi.dayMaster} (${disp.en}). Discover yours on AstroOS!`;

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: "AstroOS BaZi", text: shareText, url: window.location.href })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareText + " " + window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <GlassCard variant="gold" ornamental className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="w-4 h-4" style={{ color: "#E8B86D" }} />
        <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
          {L("Поделиться Day Master", "Share Day Master", "साझा करें")}
        </h3>
      </div>
      <div className="flex items-center gap-4 p-3 rounded" style={{ background: `linear-gradient(135deg, ${disp.color}20, transparent)` }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
          style={{ border: `2px solid ${disp.color}`, background: `${disp.color}15` }}>
          <span className="text-3xl" style={{ fontFamily: "serif", color: disp.color }}>{bazi.dayMaster}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-serif text-base" style={{ color: disp.color }}>
            {disp[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"]} {bazi.dayMasterYinYang === "yang" ? "☀" : "☾"}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "#F5F0E8A0" }}>{shareText}</p>
        </div>
      </div>
      <CosmicButton onClick={share} variant="gold" className="mt-3 text-xs">
        <Share2 className="w-3 h-3 inline mr-1" />
        {copied ? (L("Скопировано!", "Copied!", "कॉपी हुआ!")) : (L("Поделиться", "Share", "साझा करें"))}
      </CosmicButton>
    </GlassCard>
  );
}

function CabinetCard({ bazi, el, L, locale, meMember }: any) {
  // Save current chart to localStorage history.
  const [history, setHistory] = useState<any[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bazi-history");
      setHistory(raw ? JSON.parse(raw) : []);
    } catch { setHistory([]); }
  }, []);

  const saveCurrent = () => {
    const entry = {
      date: new Date().toISOString(),
      name: meMember.displayName,
      dayMaster: bazi.dayMaster,
      element: bazi.dayMasterElement,
    };
    const next = [entry, ...history.filter((h: any) => h.dayMaster !== entry.dayMaster || h.name !== entry.name)].slice(0, 10);
    setHistory(next);
    localStorage.setItem("bazi-history", JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clearHistory = () => {
    localStorage.removeItem("bazi-history");
    setHistory([]);
  };

  return (
    <GlassCard variant="neutral" className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4" style={{ color: "#5E8FA8" }} />
        <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
          {L("Личный кабинет", "My cabinet", "मेरी कैबिनेट")}
        </h3>
      </div>
      <p className="text-[11px] mb-3" style={{ color: "#9A9AA8" }}>
        {L("Сохраняйте рассчитанные карты и сравнивайте их позже.", "Save computed charts and compare them later.", "गणना की गई कार्ट रखें।")}
      </p>
      <CosmicButton onClick={saveCurrent} variant="outline" className="text-xs">
        {saved ? (L("✓ Сохранено", "✓ Saved", "✓ सहेजा")) : (L("Сохранить текущую карту", "Save current chart", "वर्तमान सहेजें"))}
      </CosmicButton>
      {history.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "#9A9AA8" }}>
              {L("История", "History", "इतिहास")} ({history.length})
            </p>
            <button onClick={clearHistory} className="text-[10px] underline" style={{ color: "#9A9AA8" }}>
              {L("Очистить", "Clear", "साफ़")}
            </button>
          </div>
          <div className="space-y-1.5">
            {history.map((h: any, i: number) => {
              const disp = el(h.element);
              return (
                <div key={i} className="flex items-center gap-2 p-2 rounded" style={{ background: "#1C1C26" }}>
                  <span className="text-lg" style={{ fontFamily: "serif", color: disp.color }}>{h.dayMaster}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color: "#F5F0E8" }}>{h.name}</p>
                    <p className="text-[10px]" style={{ color: "#9A9AA8" }}>
                      {disp[locale === "ru" ? "ru" : "en"]} · {new Date(h.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

export default BaZiReportScreen;
