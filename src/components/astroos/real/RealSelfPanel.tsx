"use client";
/**
 * RealSelfPanel — enhanced natal chart with NatalChartWheel.
 * Uses /api/calculate for real planet positions.
 * Clean Architecture: Interface Adapter.
 * Hades 2 visual: animated wheel, planet detail cards, aspect lines.
 */
import { useState, useEffect } from "react";
import { GlassCard, Pill, FadeIn } from "../ui";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useMember, mockMember } from "@/lib/astroos/real/useMember";
import { NatalChartWheel } from "./NatalChartWheel";

const ZODIAC_GLYPHS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const ZODIAC_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

const PLANET_GLYPHS: Record<string,string> = {
  Sun:"☉", Moon:"☾", Mercury:"☿", Venus:"♀", Mars:"♂",
  Jupiter:"♃", Saturn:"♄", Uranus:"♅", Neptune:"♆", Pluto:"♇",
};

const PLANET_COLORS: Record<string,string> = {
  Sun:"#FBBF24", Moon:"#C4D3E0", Mercury:"#60A5FA", Venus:"#F472B6",
  Mars:"#EF4444", Jupiter:"#A78BFA", Saturn:"#94A3B8",
  Uranus:"#22D3EE", Neptune:"#2DD4BF", Pluto:"#9333EA",
};

const PLANET_KEYWORDS: Record<string,{en:string;ru:string;hi:string}> = {
  Sun:  { en:"core · will · identity", ru:"ядро · воля · идентичность", hi:"मूल · इच्छा · पहचान" },
  Moon: { en:"emotions · intuition · memory", ru:"эмоции · интуиция · память", hi:"भावनाएँ · अंतर्ज्ञान · स्मृति" },
  Mercury:{ en:"mind · speech · analysis", ru:"ум · речь · анализ", hi:"मन · वाक् · विश्लेषण" },
  Venus: { en:"love · beauty · values", ru:"любовь · красота · ценности", hi:"प्रेम · सौंदर्य · मूल्य" },
  Mars:  { en:"action · force · desire", ru:"действие · сила · желание", hi:"कर्म · शक्ति · इच्छा" },
  Jupiter:{ en:"expansion · wisdom · faith", ru:"расширение · мудрость · вера", hi:"विस्तार · ज्ञान · विश्वास" },
  Saturn: { en:"structure · discipline · time", ru:"структура · дисциплина · время", hi:"संरचना · अनुशासन · समय" },
  Uranus: { en:"rebellion · innovation · freedom", ru:"бунт · инновации · свобода", hi:"विद्रोह · नवाचार · स्वतंत्रता" },
  Neptune:{ en:"dreams · illusion · compassion", ru:"мечты · иллюзия · сострадание", hi:"सपने · भ्रम · करुणा" },
  Pluto:  { en:"transformation · power · rebirth", ru:"трансформация · власть · возрождение", hi:"परिवर्तन · शक्ति · पुनर्जन्म" },
};

interface PlanetPos { planet:string; eclipticLonDeg:number; eclipticLatDeg:number; }

export function RealSelfPanel({ locale }: { locale:"ru"|"en"|"hi" }) {
  const [planets, setPlanets] = useState<PlanetPos[]>([]);
  const [ascendant, setAscendant] = useState(0);
  const [midheaven, setMidheaven] = useState(0);
  const [loading, setLoading] = useState(true);
  const { member } = useMember();

  const t = (ru:string, en:string, hi:string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  useEffect(() => {
    const birth = member ? {
      birthDateTime: member.birth.isoDateTime,
      birthLat: member.birth.lat, birthLng: member.birth.lng,
      birthTzOffset: member.birth.tzOffset,
      birthPlaceName: member.birth.placeName,
      gender: member.birth.gender,
    } : {
      birthDateTime: "1989-11-07T04:17",
      birthLat: 59.93, birthLng: 30.34, birthTzOffset: 3,
      birthPlaceName: "Saint Petersburg, RU", gender: 0 as const,
    };
    fetch("/api/calculate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(birth),
    })
      .then(r => r.json())
      .then(d => {
        setPlanets(d.planetPositions ?? []);
        setAscendant(d.ascendantLonDeg ?? 0);
        setMidheaven(d.midheavenLonDeg ?? (d.ascendantLonDeg ?? 0) + 90);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [member]);

  if (loading) {
    return (
      <GlassCard variant="gold" className="p-5" ornamental glow>
        <div className="flex flex-col items-center py-12">
          <motion.div animate={{ rotate:360 }} transition={{ duration:10, repeat:Infinity, ease:"linear" }}
            className="w-16 h-16 rounded-full border-2 border-transparent"
            style={{ borderTopColor:"#E8B86D", borderRightColor:"#5BB89C" }}>
            <Sparkles className="w-5 h-5 m-auto mt-4" style={{ color:"#E8B86D" }} />
          </motion.div>
          <p className="mt-4 text-sm font-serif italic text-[#F5F0E8]">
            {t("Строю вашу натальную карту...", "Building your natal chart...", "आपकी कुंडली बना रहा हूँ...")}
          </p>
          <p className="text-[11px] mt-1 font-mono text-[#E8B86D]">
            astronomy-engine · Placidus houses
          </p>
        </div>
      </GlassCard>
    );
  }

  const ascSignIdx = Math.floor((((ascendant % 360) + 360) % 360) / 30);
  const mcSignIdx = Math.floor((((midheaven % 360) + 360) % 360) / 30);

  return (
    <FadeIn>
      <GlassCard variant="gold" className="p-5 relative astro-card-sheen" ornamental glow>
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(232,184,109,0.08) 0%, transparent 70%)",
        }} />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color:"#E8B86D" }} />
            <h3 className="font-serif text-lg text-[#F5F0E8]">
              {t("Натальная карта", "Natal Chart", "जन्म कुंडली")}
            </h3>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background:"#E8B86D20", color:"#E8B86D" }}>
                Placidus
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background:"#5BB89C20", color:"#5BB89C" }}>
                {t("Нажмите на планету", "Click planet for details", "विवरण के लिए ग्रह क्लिक करें")}
              </span>
            </div>
          </div>

          {/* Chart wheel */}
          <div className="flex justify-center mb-5">
            <NatalChartWheel
              planetPositions={planets}
              ascendantLonDeg={ascendant}
              midheavenLonDeg={midheaven}
              locale={locale}
              size={460}
              showAspects={true}
            />
          </div>

          {/* Ascendant & MC summary */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg border border-[#D98E7A]/25 bg-[#D98E7A]/5 p-3 flex items-center gap-3">
              <span className="text-2xl text-[#D98E7A]" style={{ fontFamily:"serif" }}>↗</span>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">Ascendant</div>
                <div className="text-sm font-serif text-[#D98E7A]">
                  {Math.floor(ascendant % 30)}° {ZODIAC_NAMES[ascSignIdx]} {ZODIAC_GLYPHS[ascSignIdx]}
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-[#5BB89C]/25 bg-[#5BB89C]/5 p-3 flex items-center gap-3">
              <span className="text-2xl text-[#5BB89C]" style={{ fontFamily:"serif" }}>↑</span>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">Midheaven</div>
                <div className="text-sm font-serif text-[#5BB89C]">
                  {Math.floor(midheaven % 30)}° {ZODIAC_NAMES[mcSignIdx]} {ZODIAC_GLYPHS[mcSignIdx]}
                </div>
              </div>
            </div>
          </div>

          {/* Planet positions grid — enhanced with keywords */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {planets.slice(0, 10).map((p, i) => {
              const signIdx = Math.floor((((p.eclipticLonDeg % 360) + 360) % 360) / 30);
              const deg = Math.floor(p.eclipticLonDeg % 30);
              const min = Math.floor((p.eclipticLonDeg % 1) * 60);
              const color = PLANET_COLORS[p.planet] ?? "#E8B86D";
              const kw = PLANET_KEYWORDS[p.planet];
              return (
                <motion.div
                  key={p.planet}
                  initial={{ opacity:0, y:8 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay:1.2 + i * 0.05 }}
                  className="rounded-lg border p-2.5 transition-all hover:scale-[1.02]"
                  style={{ background:`${color}08`, borderColor:`${color}20` }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span style={{ color, fontFamily:"serif" }} className="text-base">{PLANET_GLYPHS[p.planet]}</span>
                    <span className="text-[12px] font-medium text-[#F5F0E8]">{p.planet}</span>
                    <span className="ml-auto text-[13px] font-mono" style={{ color }}>{deg}°{min > 0 ? ` ${min}'` : ""}</span>
                    <span style={{ color:"#5BB89C" }} className="text-sm">{ZODIAC_GLYPHS[signIdx]}</span>
                  </div>
                  {kw && (
                    <div className="text-[9px] text-[#8A8A96] leading-tight">
                      {locale === "ru" ? kw.ru : locale === "hi" ? kw.hi : kw.en}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default RealSelfPanel;
