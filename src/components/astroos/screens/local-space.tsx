"use client";

import { GlassCard, SectionHeading, FadeIn } from "../ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { RealLocalSpacePanel } from "../real/RealLocalSpacePanel";

export function LocalSpaceScreen() {
  const { t, locale } = useI18n();
  return (
    <FadeIn>
      <SectionHeading title={t("local.title")} />
      <RealLocalSpacePanel locale={locale} />
      <GlassCard variant="jade" className="mt-4 p-4">
        <p className="text-sm text-[#8A8A96]">
          {locale === "ru"
            ? "Астро Пространство показывает азимут (компасное направление) каждой планеты от точки вашего рождения. Линии расходятся от центра — вашего дома."
            : locale === "hi"
            ? "अस्ट्रो स्पेस आपके जन्म स्थान से प्रत्येक ग्रह की दिशा (azimuth) दिखाता है। रेखाएं केंद्र से बाहर की ओर फैलती हैं।"
            : "Astro Space shows the azimuth (compass direction) of each planet from your birthplace. Lines radiate outward from the center — your home."}
        </p>
      </GlassCard>
    </FadeIn>
  );
}
