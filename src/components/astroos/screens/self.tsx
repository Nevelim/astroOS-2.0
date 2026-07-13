"use client";

import * as React from "react";
import {
  GlassCard, Pill, CosmicButton, SectionHeading, FadeIn, CosmicDivider,
} from "../ui";
import { CosmicOrb } from "../CosmicOrb";
import { InfoTip } from "../growth-ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { BAZI } from "@/lib/astroos/data";
import { localized } from "@/lib/astroos/data";
import { RealSelfPanel } from "../real/RealSelfPanel";
import { RealBaZiPanel } from "../real/RealBaZiPanel";
import { RealAspectsPanel } from "../real/RealAspectsPanel";
import { PlanetaryStrengthsPanel } from "../real/PlanetaryStrengthsPanel";
import { AspectGrid } from "../real/AspectGrid";
import { RealCosmicInsightsPanel } from "../real/RealCosmicInsightsPanel";
import { useMember, mockMember } from "@/lib/astroos/real/useMember";

export function SelfScreen() {
  const { t, locale } = useI18n();
  const { member } = useMember();
  const L = (en: string, ru: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  // Get planet positions for AspectGrid
  const [planets, setPlanets] = React.useState<Array<{planet:string;eclipticLonDeg:number;eclipticLatDeg:number}>>([]);
  React.useEffect(() => {
    const birth = member ? {
      birthDateTime: member.birth.isoDateTime,
      birthLat: member.birth.lat, birthLng: member.birth.lng,
      birthTzOffset: member.birth.tzOffset, birthPlaceName: member.birth.placeName,
      gender: member.birth.gender,
    } : {
      birthDateTime: "1989-11-07T04:17",
      birthLat: 59.93, birthLng: 30.34, birthTzOffset: 3,
      birthPlaceName: "Saint Petersburg, RU", gender: 0 as const,
    };
    fetch("/api/calculate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(birth),
    }).then(r => r.json()).then(d => setPlanets(d.planetPositions ?? [])).catch(() => {});
  }, [member]);

  return (
    <div className="space-y-10">
      <FadeIn>
        <SectionHeading
          eyebrow={t("self.eyebrow")}
          title={t("self.title")}
          subtitle={t("self.subtitle")}
        />
      </FadeIn>

      {/* Real natal chart wheel — SVG with real planet positions */}
      <FadeIn delay={0.03}>
        <RealSelfPanel locale={locale} />
      </FadeIn>

      {/* Two-column: Natal Aspects + BaZi four pillars */}
      <div className="relative grid gap-6 lg:grid-cols-2">
        {/* Decorative orb near the natal chart */}
        <CosmicOrb size="md" color="gold" className="absolute -top-6 -left-2 opacity-20 z-0 hidden lg:block" />
        {/* Natal aspects — real computation */}
        <FadeIn delay={0.05}>
          <RealAspectsPanel locale={locale} />
        </FadeIn>

        {/* BaZi four pillars — real calculation */}
        <FadeIn delay={0.1}>
          <RealBaZiPanel locale={locale} />
        </FadeIn>
      </div>

      {/* Planetary Strengths — full-width */}
      <FadeIn delay={0.15}>
        <PlanetaryStrengthsPanel locale={locale} />
      </FadeIn>

      {/* Aspect Grid Matrix — interactive triangular grid */}
      <FadeIn delay={0.18}>
        <AspectGrid planetPositions={planets} locale={locale} />
      </FadeIn>

      {/* Cosmic Insights — real cross-system synthesis from chart data */}
      <FadeIn delay={0.15}>
        <RealCosmicInsightsPanel locale={locale} />
      </FadeIn>

      {/* Luck Pillars timeline — shown in RealBaZiPanel now, so this section shows cross-system insight */}
      <FadeIn delay={0.16}>
        <GlassCard variant="gold">
          <Pill tone="gold">{L("Cross-System Synthesis", "Кросс-системный синтез", "क्रॉस-सिस्टम संश्लेषण")}</Pill>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#E8B86D]/20 bg-[#E8B86D]/5 p-4">
              <div className="text-[10px] uppercase tracking-wider text-[#E8B86D] mb-2">
                {L("Western → Eastern", "Запад → Восток", "पश्चिम → पूर्व")}
              </div>
              <p className="text-[12px] leading-relaxed text-[#9A9AA8]">
                {L(
                  "Your natal chart (Tropical Zodiac) maps to your BaZi chart (Chinese stems & branches) via the same ecliptic longitude. The Sun's position at birth determines both your Western Sun sign and your BaZi month branch.",
                  "Ваша натальная карта (тропический зодиак) соответствует карте BaZi (китайские стебли и ветви) через одну и ту же эклиптическую долготу. Положение Солнца при рождении определяет как ваш западный знак Солнца, так и ветвь месяца BaZi.",
                  "आपकी नेटल चार्ट (ट्रॉपिकल जोडिएक) और BaZi चार्ट एक ही ग्रहण रेखा देशांतर से जुड़े हैं। जन्म के समय सूर्य की स्थिति आपके पश्चिमी सूर्य चिह्न और BaZi माह शाखा दोनों को निर्धारित करती है।"
                )}
              </p>
            </div>
            <div className="rounded-lg border border-[#5BB89C]/20 bg-[#5BB89C]/5 p-4">
              <div className="text-[10px] uppercase tracking-wider text-[#5BB89C] mb-2">
                {L("Unique to AstroOS", "Уникально для AstroOS", "AstroOS के लिए अद्वितीय")}
              </div>
              <p className="text-[12px] leading-relaxed text-[#9A9AA8]">
                {L(
                  "AstroOS is the only platform that computes both Western astrology (using astronomy-engine for NASA-grade precision) and Chinese BaZi (using the true solar time at your birth location) in a single integrated chart.",
                  "AstroOS — единственная платформа, которая вычисляет и западную астрологию (через astronomy-engine с точностью NASA), и китайский BaZi (с использованием истинного солнечного времени в месте рождения) в единой интегрированной карте.",
                  "AstroOS एकमात्र प्लेटफ़ॉर्म है जो पश्चिमी ज्योतिष (NASA-ग्रेड सटीकता के लिए astronomy-engine का उपयोग) और चीनी BaZi (आपके जन्म स्थान पर सटीक सौर समय का उपयोग) दोनों को एक एकीकृत चार्ट में गणना करता है।"
                )}
              </p>
            </div>
          </div>
        </GlassCard>
      </FadeIn>

      <CosmicDivider />

      {/* Recommendations: stones, colors, professions, directions */}
      <div className="grid gap-6 md:grid-cols-2">
        <FadeIn delay={0.2}>
          <GlassCard variant="rose">
            <Pill tone="rose">{t("self.elements")}</Pill>
            <div className="mt-3 text-[12px] leading-relaxed text-[#9A9AA8]">
              {L(
                "Your element balance is shown in the BaZi panel above. The dominant and deficient elements inform your personalized recommendations below.",
                "Ваш баланс стихий показан на панели BaZi выше. Доминирующие и дефицитные стихии определяют персональные рекомендации ниже.",
                "आपका तत्व संतुलन ऊपर BaZi पैनल में दिखाया गया है। प्रधान और कमी वाले तत्व नीचे आपकी व्यक्तिगत सिफारिशों को निर्धारित करते हैं।"
              )}
            </div>
          </GlassCard>
        </FadeIn>

        <FadeIn delay={0.25}>
          <GlassCard>
            <div className="flex items-center gap-1.5">
              <Pill tone="jade">{t("self.tengods")}</Pill>
              <InfoTip
                label={locale === "ru" ? "Ten Gods (十神)" : locale === "hi" ? "Ten Gods (十神)" : "Ten Gods (十神)"}
                tone="jade"
                side="bottom"
              >
                {locale === "ru"
                  ? "Ten Gods — 10 архетипов в BaZi, описывающих отношения между вашим Day Master и другими стеблями карты. Например: Resource (印) — поддержка, Self-expression (食) — творчество, Wealth (财) — финансы, Power (官) — авторитет. Показывают ваши жизненные темы."
                  : locale === "hi"
                  ? "Ten Gods — BaZi में 10 आदर्श जो आपके Day Master और अन्य स्तंभों के बीच संबंध दिखाते हैं।"
                  : "Ten Gods — 10 archetypes in BaZi describing the relationship between your Day Master and other stems. E.g. Resource (印) = support, Self-expression (食) = creativity, Wealth (财) = finances, Power (官) = authority. They map to your life themes."}
              </InfoTip>
            </div>
            <div className="mt-3 text-[12px] leading-relaxed text-[#9A9AA8]">
              {L(
                "Your Ten Gods archetypes are displayed in the BaZi panel above. They reveal your life themes: resources, creativity, wealth, and authority patterns.",
                "Ваши архетипы Десяти Богов отображены на панели BaZi выше. Они раскрывают ваши жизненные темы: ресурсы, творчество, богатство и паттерны власти.",
                "आपके Ten Gods आदर्श ऊपर BaZi पैनल में प्रदर्शित हैं। वे आपके जीवन विषयों को प्रकट करते हैं: संसाधन, रचनात्मकता, धन और अधिकार पैटर्न।"
              )}
            </div>
          </GlassCard>
        </FadeIn>
      </div>

      {/* Recommendations: stones, colors, professions, directions */}
      <FadeIn delay={0.3}>
        <GlassCard variant="gold">
          <Pill tone="gold">{t("self.recommendations")}</Pill>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Stones */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-2">{t("self.stones")}</div>
              <div className="space-y-1.5">
                {BAZI.recommendations.stones.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-[11px]">
                    <span className="text-[#F5F0E8]">{s.name}</span>
                    <span className="font-mono text-[10px] text-[#6B6B78]">{s.finger}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Colors */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-2">{t("self.colors")}</div>
              <div className="flex gap-1.5">
                {BAZI.recommendations.colors.primary.map((c) => (
                  <div key={c} className="h-7 w-7 rounded-full border border-[#2A2A35]" style={{ background: c }} title={c} />
                ))}
                {BAZI.recommendations.colors.accent.map((c) => (
                  <div key={c} className="h-7 w-7 rounded-full border border-[#E8B86D]/40" style={{ background: c }} title={c} />
                ))}
              </div>
              <div className="mt-2 text-[10px] text-[#D98E7A]">Avoid: {BAZI.recommendations.colors.avoid.join(", ")}</div>
            </div>
            {/* Professions */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-2">{t("self.professions")}</div>
              <div className="flex flex-wrap gap-1">
                {BAZI.recommendations.professions.top.map((p) => (
                  <Pill key={p} tone="jade">{p}</Pill>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-[#D98E7A]">Avoid: {BAZI.recommendations.professions.avoid.join(", ")}</div>
            </div>
            {/* Directions */}
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-2">{t("self.directions")}</div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-[#9A9AA8]">Sleep</span><span className="text-[#E8B86D]">{BAZI.recommendations.directions.sleep}</span></div>
                <div className="flex justify-between"><span className="text-[#9A9AA8]">Work</span><span className="text-[#E8B86D]">{BAZI.recommendations.directions.work}</span></div>
                <div className="flex justify-between"><span className="text-[#9A9AA8]">Travel</span><span className="text-[#E8B86D]">{BAZI.recommendations.directions.travel}</span></div>
                <div className="flex justify-between"><span className="text-[#9A9AA8]">Lucky №</span><span className="font-mono text-[#5BB89C]">{BAZI.recommendations.luckyNumber}</span></div>
              </div>
            </div>
          </div>
        </GlassCard>
      </FadeIn>

      {/* Cross-system insight */}
      <FadeIn delay={0.35}>
        <GlassCard variant="jade">
          <Pill tone="jade">{t("self.cross")} · unique to AstroOS</Pill>
          <p className="mt-3 font-display text-lg italic leading-relaxed text-[#5BB89C]">
            {locale === "ru"
              ? "Ваш Скорпион (глубина, трансформация) резонирует с Day Master 壬 (Янская Вода — мудрость, поток). Обе системы указывают: ваша сила — в способности держать глубину без утраты потока. Earth-доминанта в BaZi даёт структуру вашей водной природе."
              : locale === "hi"
              ? "आपका वृश्चिक (गहराई, परिवर्तन) Day Master 壬 (यांग जल — ज्ञान, प्रवाह) के साथ गूंजता है। दोनों प्रणालियाँ इंगित करती हैं: आपकी शक्ति गहराई थामने में है।"
              : "Your Scorpio (depth, transformation) resonates with Day Master 壬 (Yang Water — wisdom, flow). Both systems point: your strength is holding depth without losing flow. Earth dominance in BaZi gives structure to your watery nature."}
          </p>
        </GlassCard>
      </FadeIn>

      {/* Risk years */}
      <FadeIn delay={0.4}>
        {BAZI.riskYears.map((r) => (
          <GlassCard key={r.year} variant="rose">
            <div className="flex items-center gap-2">
              <Pill tone="rose">⚠ Risk year · {r.year}</Pill>
            </div>
            <p className="mt-2 text-[12px] text-[#9A9AA8]">{localized(locale, r.note)}</p>
          </GlassCard>
        ))}
      </FadeIn>
    </div>
  );
}
