"use client";

import { GlassCard, SectionHeading, FadeIn } from "../ui";
import { useI18n } from "@/lib/astroos/i18n-context";

export function LocalSpaceScreen() {
  const { t, locale } = useI18n();
  return (
    <FadeIn>
      <SectionHeading>
        {locale === "ru" ? "Локальное пространство" : "Local Space"}
      </SectionHeading>
      <GlassCard>
        <p className="text-sm opacity-70">
          {locale === "ru"
            ? "Планетные линии в масштабе вашего дома. Раздел в разработке — скоро будет доступен."
            : "Planetary lines in the scale of your home. This section is under construction — coming soon."}
        </p>
      </GlassCard>
    </FadeIn>
  );
}
