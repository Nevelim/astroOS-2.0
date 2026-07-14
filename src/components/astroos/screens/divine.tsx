"use client";

import { useState } from "react";
import {
  GlassCard, Pill, CosmicButton, SectionHeading, FadeIn, CosmicDivider,
} from "../ui";
import { InfoTip } from "../growth-ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { DIVINE_MODULES, HOROSCOPE_SPHERES, ICHING_CAST } from "@/lib/astroos/data";
import { localized } from "@/lib/astroos/data";
import { RealDivinationPanel } from "../real/RealDivinationPanel";
import { RealTarotPanel } from "../real/RealTarotPanel";

const SPREADS = [
  {
    key: "3card",
    label: { en: "3-card · past/present/future", ru: "3 карты · прошлое/настоящее/будущее", hi: "3-कार्ड · भूत/वर्तमान/भविष्य" },
    desc: { en: "Quick question, 3 positions", ru: "Быстрый вопрос, 3 позиции", hi: "त्वरित प्रश्न, 3 स्थितियाँ" },
    icon: "◉",
    cardCount: 3,
    gridCols: "md:grid-cols-3",
  },
  {
    key: "celtic",
    label: { en: "Celtic Cross · 10 cards", ru: "Кельтский крест · 10 карт", hi: "केल्टिक क्रॉस · 10 कार्ड" },
    desc: { en: "Deep situation analysis", ru: "Глубокий анализ ситуации", hi: "गहन स्थिति विश्लेषण" },
    icon: "✚",
    cardCount: 10,
    gridCols: "sm:grid-cols-2 md:grid-cols-5",
  },
  {
    key: "relationship",
    label: { en: "Relationship · 6 cards", ru: "Отношения · 6 карт", hi: "रिश्ता · 6 कार्ड" },
    desc: { en: "You + partner dynamics", ru: "Вы + партнёр динамика", hi: "आप + साथी गतिशीलता" },
    icon: "♡",
    cardCount: 6,
    gridCols: "sm:grid-cols-2 md:grid-cols-3",
  },
];

// Position labels override per spread — each spread has its own position count + meanings
const SPREAD_POSITIONS: Record<string, { en: string; ru: string; hi: string }[]> = {
  "3card": [
    { en: "Past · what healed you", ru: "Прошлое · что исцелило", hi: "अतीत · क्या चंगा किया" },
    { en: "Present · who you are becoming", ru: "Настоящее · кем становишься", hi: "वर्तमान · आप कौन बन रहे हैं" },
    { en: "Forward · the clarity coming", ru: "Вперёд · грядущая ясность", hi: "आगे · आने वाली स्पष्टता" },
  ],
  celtic: [
    { en: "1 · The heart of the matter", ru: "1 · Суть вопроса", hi: "1 · मामले का मूल" },
    { en: "2 · What crosses you", ru: "2 · Что противостоит", hi: "2 · क्या बाधा है" },
    { en: "3 · Foundation", ru: "3 · Фундамент", hi: "3 · नींव" },
    { en: "4 · Recent past", ru: "4 · Недавнее прошлое", hi: "4 · हाल का अतीत" },
    { en: "5 · Crown · possible outcome", ru: "5 · Венец · возможный итог", hi: "5 · शीर्ष · संभावित परिणाम" },
    { en: "6 · Near future", ru: "6 · Ближайшее будущее", hi: "6 · निकट भविष्य" },
    { en: "7 · Your fears", ru: "7 · Ваши страхи", hi: "7 · आपके डर" },
    { en: "8 · Others' view", ru: "8 · Взгляд других", hi: "8 · दूसरों का दृष्टिकोण" },
    { en: "9 · Hopes", ru: "9 · Надежды", hi: "9 · आशाएँ" },
    { en: "10 · Final outcome", ru: "10 · Итог", hi: "10 · अंतिम परिणाम" },
  ],
  relationship: [
    { en: "You in the dynamic", ru: "Вы в динамике", hi: "गतिशीलता में आप" },
    { en: "Them in the dynamic", ru: "Они в динамике", hi: "गतिशीलता में वे" },
    { en: "The bridge between", ru: "Мост между вами", hi: "बीच का पुल" },
    { en: "Strengths together", ru: "Силы вместе", hi: "एक साथ शक्तियाँ" },
    { en: "Challenges ahead", ru: "Вызовы впереди", hi: "आगे की चुनौतियाँ" },
    { en: "Where it leads", ru: "Куда ведёт", hi: "कहाँ ले जाता है" },
  ],
};

export function DivineScreen() {
  const { t, locale } = useI18n();
  const [activeSpread, setActiveSpread] = useState("3card");
  const activeSpreadMeta = SPREADS.find((s) => s.key === activeSpread)!;
  const spreadPositions = SPREAD_POSITIONS[activeSpread];

  return (
    <div className="space-y-10">
      <FadeIn>
        <SectionHeading
          eyebrow={t("divine.eyebrow")}
          title={t("divine.title")}
          subtitle={locale === "ru" ? "И Цзин и Таро добавил основатель — нет в оригинальном PRD. Теперь первого класса. Плюс кросс-дивинация уникальная для AstroOS." : locale === "hi" ? "इ चिंग और टैरो संस्थापक द्वारा जोड़े गए। अब प्रथम-श्रेणी। प्लस क्रॉस-दिव्यज्ञान।" : t("divine.subtitle")}
        />
      </FadeIn>

      {/* Real divination — I-Ching + Tarot via API */}
      <FadeIn delay={0.03}>
        <RealDivinationPanel locale={locale} />
      </FadeIn>

      {/* Module cards */}
      <FadeIn delay={0.05}>
        <div className="grid gap-4 md:grid-cols-3">
          {DIVINE_MODULES.map((m) => (
            <GlassCard key={m.key} variant={m.tone}>
              <div className="flex items-center justify-between">
                <span className="font-display text-3xl" style={{ color: m.tone === "gold" ? "#E8B86D" : m.tone === "jade" ? "#5BB89C" : "#D98E7A" }}>{m.icon}</span>
                <Pill tone={m.tone}>{m.tier}</Pill>
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold">{m.name}</h3>
              <p className="mt-1 text-[12px] text-[#9A9AA8]">{m.desc}</p>
            </GlassCard>
          ))}
        </div>
      </FadeIn>

      <CosmicDivider />

      {/* Daily Horoscope 5 spheres */}
      <FadeIn delay={0.1}>
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Pill tone="gold">Free · daily</Pill>
            <span className="text-[12px] text-[#8A8A96]">pre-generated 02:00 UTC · 11 languages · cache 6h</span>
          </div>
          <h3 className="font-display text-2xl font-semibold mb-4">{t("divine.horoscope.spheres")}</h3>
          <div className="grid gap-3 md:grid-cols-5">
            {HOROSCOPE_SPHERES.map((s) => (
              <GlassCard key={s.key} className="text-center !p-3">
                <div className="text-[11px] uppercase tracking-wider text-[#9A9AA8]">{t(`sphere.${s.key}`)}</div>
                <div className="mt-2 font-display text-4xl font-semibold" style={{ color: s.tone === "gold" ? "#E8B86D" : s.tone === "jade" ? "#5BB89C" : "#D98E7A" }}>{s.val}</div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1C1C26]">
                  <div className="h-full rounded-full" style={{ width: `${s.val}%`, background: s.tone === "gold" ? "#E8B86D" : s.tone === "jade" ? "#5BB89C" : "#D98E7A" }} />
                </div>
                <p className="mt-2 text-[10px] leading-snug text-[#8A8A96]">{localized(locale, s.note)}</p>
              </GlassCard>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <GlassCard className="flex-1 min-w-[200px] !p-3">
              <Pill tone="jade">{t("divine.lucky")}</Pill>
              <div className="mt-1.5 font-mono text-[14px] text-[#5BB89C]">07:14 — 09:02 · 18:33 — 20:11</div>
            </GlassCard>
            <GlassCard className="flex-1 min-w-[200px] !p-3">
              <Pill tone="rose">{t("divine.avoid")}</Pill>
              <div className="mt-1.5 font-mono text-[14px] text-[#D98E7A]">13:00 — 14:30</div>
            </GlassCard>
          </div>
        </section>
      </FadeIn>

      <CosmicDivider />

      {/* I-Ching */}
      <FadeIn delay={0.15}>
        <section className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
          <GlassCard variant="jade" className="flex flex-col items-center justify-center text-center">
            <div className="font-display text-[120px] leading-none text-[#5BB89C] astro-twinkle">{ICHING_CAST.hexagram}</div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#9A9AA8]">
              <span>Hexagram {ICHING_CAST.number}</span>
              <InfoTip
                label={locale === "ru" ? "Гексаграмма (卦)" : locale === "hi" ? "Hexagram (卦)" : "Hexagram (卦)"}
                tone="jade"
                side="right"
              >
                {locale === "ru"
                  ? "Гексаграмма — 6-линейная фигура из Книги Перемен (易經), каждая линия ян (сплошная ━━━) или инь (разорванная ━ ━). 64 гексаграммы описывают 64 архетипичных ситуации. Ваша выпадает из броска 3 монет 6 раз."
                  : locale === "hi"
                  ? "Hexagram — 6-रेखीय आकृति I Ching से। 64 hexagrams, 64 आदर्श स्थितियाँ।"
                  : "A hexagram is a 6-line figure from the I Ching (易經), each line yang (solid ━━━) or yin (broken ━ ━). 64 hexagrams map 64 archetypal situations. Yours is cast from 3 coins thrown 6 times."}
              </InfoTip>
            </div>
            <div className="font-display text-xl font-semibold text-[#F5F0E8]">{localized(locale, ICHING_CAST.name)}</div>
            <Pill tone="muted">coin cast · just now</Pill>
            {/* Changing lines indicator */}
            <div className="mt-3 flex gap-1">
              {ICHING_CAST.lines.map((l, i) => (
                <div key={i} className={`w-8 ${l === 6 || l === 9 ? "opacity-100" : "opacity-50"}`} style={{ borderBottom: l === 7 || l === 9 ? "3px solid #5BB89C" : "none", borderTop: l === 6 || l === 8 ? "3px solid #5BB89C" : "none", height: l === 7 || l === 9 ? "0" : "6px", margin: l === 7 || l === 9 ? "3px 0" : "0" }} />
              ))}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[9px] text-[#8A8A96]">
              <span>lines 3, 5 changing →</span>
              <InfoTip
                label={locale === "ru" ? "Changing lines (变爻)" : locale === "hi" ? "Changing lines" : "Changing lines (变爻)"}
                tone="gold"
                side="right"
              >
                {locale === "ru"
                  ? "Changing lines — линии со значением 6 (старый инь → становится ян) или 9 (старый ян → становится инь). Они показывают, какая ситуация сейчас трансформируется. Если есть changing lines, вы получаете вторую гексаграмму — куда движется ситуация."
                  : locale === "hi"
                  ? "Changing lines — 6 या 9 मान वाली रेखाएँ। परिवर्तन दिखाती हैं।"
                  : "Changing lines — lines with value 6 (old yin → becomes yang) or 9 (old yang → becomes yin). They show what is transforming right now. If changing lines exist, you get a second hexagram — where the situation is heading."}
              </InfoTip>
            </div>
          </GlassCard>
          <GlassCard>
            <Pill tone="jade">{t("divine.judgment")}</Pill>
            <p className="mt-3 font-display text-lg italic leading-relaxed text-[#5BB89C]">{localized(locale, ICHING_CAST.judgment)}</p>
            <CosmicDivider className="my-4" />
            <Pill tone="gold">{t("divine.resonance")}</Pill>
            <p className="mt-3 text-[14px] leading-relaxed text-[#F5F0E8]/85">{localized(locale, ICHING_CAST.resonance)}</p>
          </GlassCard>
        </section>
      </FadeIn>

      <CosmicDivider />

      {/* Real Tarot — /api/tarot with crypto-random shuffle + SVG card imagery */}
      <FadeIn delay={0.2}>
        <RealTarotPanel locale={locale} />
      </FadeIn>

      <FadeIn delay={0.25}>
        <GlassCard>
          <Pill tone="gold">design principle</Pill>
          <p className="mt-3 font-display text-lg italic text-[#E8B86D]">
            {locale === "ru" ? "Каждый модуль дивинации — своё визуальное оформление (I-Ching = золотые линии гексаграммы; Tarot = космические карты), но общая GlassCard-система. Кросс-дивинация (гексаграмма ↔ транзит Сатурна) — уникальная подпись AstroOS." : locale === "hi" ? "प्रत्येक दिव्यज्ञान मॉड्यूल — अलग दृश्य, लेकिन साझा GlassCard। क्रॉस-दिव्यज्ञान AstroOS के लिए अद्वितीय।" : "Each divination module keeps a distinct visual treatment — but shares the GlassCard system. Cross-divination resonance (I-Ching cast ↔ Saturn return transit) is the unique AstroOS signature."}
          </p>
        </GlassCard>
      </FadeIn>
    </div>
  );
}
