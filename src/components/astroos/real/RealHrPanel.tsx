"use client";
/**
 * RealHrPanel — interactive BaZi HR tools (GDPR Art.9 compliant).
 *
 * Two advisory tools for employers/HR:
 *  - Candidate analysis: enter Day Master element + target role → fit verdict.
 *  - Burnout check: element + current clash period → risk level + advice.
 *
 * IMPORTANT privacy: this panel NEVER collects or sends birth date/time/coords.
 * The user types only the Day Master element + polarity (or picks from a
 * drop-down) — the same BaZiSummary shape the b2b_hr service accepts after
 * consent. This is the GDPR Art.9 boundary.
 */
import { useState } from "react";
import { GlassCard, CosmicButton } from "../ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { motion, AnimatePresence } from "framer-motion";
import { UserCheck, AlertTriangle, Shield } from "lucide-react";

const ELEMENTS = [
  { value: "wood", ru: "Дерево", en: "Wood", color: "#5BB89C" },
  { value: "fire", ru: "Огонь", en: "Fire", color: "#E8B86D" },
  { value: "earth", ru: "Земля", en: "Earth", color: "#D98E7A" },
  { value: "metal", ru: "Металл", en: "Metal", color: "#5E8FA8" },
  { value: "water", ru: "Вода", en: "Water", color: "#6B8FB5" },
];

// Element → role-dimension fit (mirrors b2b_hr _ELEMENT_FIT table).
const ELEMENT_FIT: Record<string, Record<string, number>> = {
  wood:   { leadership: 72, execution: 60, collaboration: 68, creativity: 88, stability: 55 },
  fire:   { leadership: 85, execution: 65, collaboration: 62, creativity: 82, stability: 48 },
  earth:  { leadership: 60, execution: 78, collaboration: 85, creativity: 52, stability: 90 },
  metal:  { leadership: 65, execution: 90, collaboration: 58, creativity: 60, stability: 82 },
  water:  { leadership: 58, execution: 55, collaboration: 80, creativity: 75, stability: 60 },
};

// Role → which dimensions matter most.
const ROLE_DIMENSIONS: Record<string, string[]> = {
  "ceo": ["leadership", "stability"],
  "manager": ["leadership", "collaboration"],
  "sales": ["creativity", "collaboration"],
  "operations": ["execution", "stability"],
  "finance": ["execution", "stability"],
  "it": ["execution", "creativity"],
  "hr": ["collaboration", "stability"],
};

export function RealHrPanel({ locale }: { locale: "ru" | "en" | "hi" }) {
  const L = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;
  const [element, setElement] = useState("earth");
  const [polarity, setPolarity] = useState<"yang" | "yin">("yin");
  const [role, setRole] = useState("operations");
  const [inClash, setInClash] = useState(false);
  const [performance, setPerformance] = useState(75);
  const [result, setResult] = useState<any>(null);

  const compute = () => {
    const fit = ELEMENT_FIT[element];
    const dims = ROLE_DIMENSIONS[role] ?? ["execution"];
    const scores = dims.map((d) => fit[d] ?? 60);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    // polarity tweak
    const adj = polarity === "yang" ? avg + 3 : avg;
    const verdict = adj >= 75 ? "recommended" : adj >= 50 ? "reservations" : "not_recommended";

    // burnout
    let burn = inClash ? 40 : 0;
    if (element === "fire" || element === "water") burn += 15;
    if (element === "earth") burn -= 10;
    const burnLevel = burn >= 60 ? "high" : burn >= 30 ? "moderate" : "low";

    // firing advisory (NEVER BaZi-only)
    let fire;
    if (performance < 40 && inClash) fire = "review_for_replacement";
    else if (performance < 60) fire = "reassign";
    else fire = "retain";

    setResult({
      elementFit: Math.round(adj),
      verdict,
      burnoutLevel: burnLevel,
      burnoutScore: burn,
      firingVerdict: fire,
    });
  };

  const el = ELEMENTS.find((e) => e.value === element)!;

  return (
    <GlassCard variant="jade" ornamental className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <UserCheck className="w-5 h-5" style={{ color: "#5BB89C" }} />
        <h3 className="font-serif text-xl" style={{ color: "#F5F0E8" }}>
          {L("BaZi HR-инструменты", "BaZi HR tools", "बा ज़ी HR उपकरण")}
        </h3>
      </div>

      {/* GDPR notice */}
      <div className="mb-4 p-2 rounded flex items-start gap-2" style={{ background: "#5BB89C10", border: "1px solid #5BB89C30" }}>
        <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#5BB89C" }} />
        <p className="text-[10px]" style={{ color: "#5BB89C" }}>
          {L(
            "GDPR Art.9: вводится только стихия Day Master (не дата рождения). Решение всегда за HR — BaZi advisory only.",
            "GDPR Art.9: only the Day Master element is entered (never birth date). The decision always rests with HR — BaZi is advisory only.",
            "GDPR Art.9: केवल दिन स्वामी तत्व दर्ज किया जाता है। निर्णय HR का है।"
          )}
        </p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="text-xs">
          <span className="block mb-1" style={{ color: "#9A9AA8" }}>{L("Стихия Day Master", "Day Master element", "तत्व")}</span>
          <select value={element} onChange={(e) => setElement(e.target.value)}
            className="w-full rounded px-2 py-1.5 text-sm" style={{ background: "#0B0B0F", border: "1px solid #2A2A35", color: "#F5F0E8" }}>
            {ELEMENTS.map((e) => <option key={e.value} value={e.value}>{L(e.ru, e.en, e.en)}</option>)}
          </select>
        </label>
        <label className="text-xs">
          <span className="block mb-1" style={{ color: "#9A9AA8" }}>{L("Полярность", "Polarity", "ध्रुवता")}</span>
          <select value={polarity} onChange={(e) => setPolarity(e.target.value as any)}
            className="w-full rounded px-2 py-1.5 text-sm" style={{ background: "#0B0B0F", border: "1px solid #2A2A35", color: "#F5F0E8" }}>
            <option value="yang">{L("Ян", "Yang", "यांग")}</option>
            <option value="yin">{L("Инь", "Yin", "यिन")}</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="block mb-1" style={{ color: "#9A9AA8" }}>{L("Целевая роль", "Target role", "लक्ष्य भूमिका")}</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full rounded px-2 py-1.5 text-sm" style={{ background: "#0B0B0F", border: "1px solid #2A2A35", color: "#F5F0E8" }}>
            {Object.keys(ROLE_DIMENSIONS).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="text-xs flex items-end gap-2">
          <input type="checkbox" checked={inClash} onChange={(e) => setInClash(e.target.checked)} />
          <span style={{ color: "#9A9AA8" }}>{L("В периоде конфликта (clash)", "In clash period", "संघर्ष अवधि")}</span>
        </label>
      </div>

      <label className="text-xs block mb-3">
        <span className="block mb-1" style={{ color: "#9A9AA8" }}>
          {L("Эффективность сотрудника", "Employee performance", "प्रदर्शन")}: {performance}
        </span>
        <input type="range" min="0" max="100" value={performance}
          onChange={(e) => setPerformance(Number(e.target.value))} className="w-full" />
      </label>

      <CosmicButton onClick={compute} variant="jade">
        {L("Анализировать", "Analyze", "विश्लेषण")}
      </CosmicButton>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-4">
            {/* Fit score */}
            <div className="mb-3 p-3 rounded" style={{ background: `${el.color}10` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: "#9A9AA8" }}>{L("Соответствие роли", "Role fit", "भूमिका फिट")}</span>
                <span className="text-2xl font-mono" style={{ color: el.color }}>{result.elementFit}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1C1C26" }}>
                <div className="h-full rounded-full" style={{ width: `${result.elementFit}%`, background: el.color }} />
              </div>
              <p className="text-xs mt-1.5" style={{
                color: result.verdict === "recommended" ? "#5BB89C" : result.verdict === "reservations" ? "#E8B86D" : "#D98E7A",
              }}>
                {result.verdict === "recommended" ? L("✓ Рекомендован", "✓ Recommended", "✓ अनुशंसित")
                  : result.verdict === "reservations" ? L("⚠ Рекомендован с ограничениями", "⚠ With reservations", "⚠ सीमाओं के साथ")
                  : L("✗ Не рекомендован", "✗ Not recommended", "✗ अनुशंसित नहीं")}
              </p>
            </div>

            {/* Burnout */}
            <div className="mb-3 p-2 rounded flex items-center gap-2"
              style={{ background: result.burnoutLevel === "high" ? "#D98E7A10" : result.burnoutLevel === "moderate" ? "#E8B86D10" : "#5BB89C10" }}>
              <AlertTriangle className="w-4 h-4" style={{
                color: result.burnoutLevel === "high" ? "#D98E7A" : result.burnoutLevel === "moderate" ? "#E8B86D" : "#5BB89C",
              }} />
              <div>
                <p className="text-xs" style={{ color: "#F5F0E8" }}>
                  {L("Риск выгорания", "Burnout risk", "बर्नआउट जोखिम")}: <strong style={{
                    color: result.burnoutLevel === "high" ? "#D98E7A" : result.burnoutLevel === "moderate" ? "#E8B86D" : "#5BB89C",
                  }}>
                    {result.burnoutLevel === "high" ? L("высокий", "high", "उच्च")
                      : result.burnoutLevel === "moderate" ? L("умеренный", "moderate", "मध्यम")
                      : L("низкий", "low", "निम्न")}
                  </strong>
                </p>
                {result.burnoutLevel !== "low" && (
                  <p className="text-[10px]" style={{ color: "#9A9AA8" }}>
                    {L("Снизьте нагрузку, рассмотрите отпуск", "Reduce workload, consider leave", "कार्यभार कम करें")}
                  </p>
                )}
              </div>
            </div>

            {/* Firing advisory */}
            <div className="p-2 rounded flex items-center gap-2" style={{ background: "#1C1C26" }}>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "#9A9AA8" }}>
                {L("Кадровая рекомендация", "Staffing advisory", "कर्मचारी सलाह")}
              </span>
              <strong className="text-xs ml-auto" style={{
                color: result.firingVerdict === "retain" ? "#5BB89C"
                  : result.firingVerdict === "reassign" ? "#E8B86D" : "#D98E7A",
              }}>
                {result.firingVerdict === "retain" ? L("Удержать", "Retain", "बनाए रखें")
                  : result.firingVerdict === "reassign" ? L("Перевести", "Reassign", "पुनर्नियुक्ति")
                  : L("Рассмотреть замену", "Review replacement", "प्रतिस्थापन समीक्षा")}
              </strong>
            </div>
            <p className="text-[9px] mt-2" style={{ color: "#9A9AA8" }}>
              {L(
                "BaZi — рекомендательный инструмент. Решение принимает HR/юрист по GDPR Art.22 и трудовому праву.",
                "BaZi is advisory only. The decision rests with HR/legal per GDPR Art.22 and local labor law.",
                "बा ज़ी केवल सलाहकार है। निर्णय HR का है।"
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

export default RealHrPanel;
