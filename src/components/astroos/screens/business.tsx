"use client";

import { Fragment } from "react";
import {
  GlassCard,
  Pill,
  CosmicButton,
  SectionHeading,
  StatTile,
  FadeIn,
  CosmicDivider,
} from "../ui";
import { B2B_EMPLOYEES, B2B_ROLES } from "@/lib/astroos/data";
import { useI18n } from "@/lib/astroos/i18n-context";

const elementColor = (el: string) =>
  el === "Earth" ? "#E8B86D" :
  el === "Fire" ? "#D98E7A" :
  el === "Metal" ? "#9A9AA8" :
  el === "Water" ? "#5E8FA8" :
  el === "Wood" ? "#5BB89C" : "#F5F0E8";

export function BusinessScreen() {
  const { t, locale } = useI18n();
  return (
    <div className="space-y-10">
      <FadeIn>
        <SectionHeading
          eyebrow={t("business.eyebrow")}
          title={t("business.title")}
          subtitle={locale === "ru" ? "Статьи описывают спрос — но НИ ОДИН продукт не существует. Pure white space. Consent-first, advisory-not-deterministic." : locale === "hi" ? "लेख मांग का वर्णन करते हैं — लेकिन शून्य उत्पाद। Pure white space।" : t("business.subtitle")}
        />
      </FadeIn>

      {/* White space stats */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile value="0" label="B2B HR astrology competitors today" tone="rose" />
          <StatTile value="$15–50" label="per seat / month across 3 tiers" tone="gold" />
          <StatTile value="17×" label="consumer ARPU at Enterprise tier" tone="jade" />
          <StatTile value="GDPR Art. 9" label="special-category consent required" tone="water" />
        </div>
      </FadeIn>

      <CosmicDivider />

      {/* Org chart with BaZi overlay */}
      <FadeIn delay={0.1}>
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Pill tone="gold">Org chart · BaZi overlay</Pill>
            <Pill tone="muted">Day Master per employee · Five Elements balance</Pill>
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {B2B_EMPLOYEES.map((e, i) => (
              <FadeIn key={e.name} delay={0.04 * i}>
                <GlassCard variant={e.tone} className="text-center">
                  <div
                    className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border font-display text-lg font-semibold"
                    style={{ borderColor: elementColor(e.element) + "60", color: elementColor(e.element) }}
                  >
                    {e.name.charAt(0)}
                  </div>
                  <div className="mt-2 font-display text-sm font-semibold text-[#F5F0E8]">{e.name}</div>
                  <div className="text-[11px] text-[#9A9AA8]">{e.role}</div>
                  <div className="mt-2">
                    <Pill tone={e.tone}>{e.dayMaster}</Pill>
                  </div>
                  <div className="mt-2 text-[10px] text-[#6B6B78]">role fit</div>
                  <div className="font-display text-xl font-semibold text-[#E8B86D]">{e.fit}%</div>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* Team compatibility heatmap */}
      <FadeIn delay={0.15}>
        <GlassCard>
          <div className="flex items-center justify-between">
            <Pill tone="jade">Team compatibility heatmap · pairwise BaZi</Pill>
            <span className="text-[11px] text-[#6B6B78]">10 × 10 matrix</span>
          </div>
          <div className="mt-4 overflow-x-auto scrollbar-astro">
            <div className="inline-block">
              <div className="grid grid-cols-7 gap-1" style={{ gridTemplateColumns: `120px repeat(6, 1fr)` }}>
                <div />
                {B2B_EMPLOYEES.map((e) => (
                  <div key={e.name} className="px-1 pb-1 text-center text-[10px] text-[#9A9AA8]">
                    {e.name.split(" ").pop()}
                  </div>
                ))}
                {B2B_EMPLOYEES.map((row, ri) => (
                  <Fragment key={`row-${row.name}`}>
                    <div className="pr-2 text-right text-[10px] text-[#9A9AA8] flex items-center justify-end">
                      {row.name.split(" ").pop()}
                    </div>
                    {B2B_EMPLOYEES.map((col, ci) => {
                      if (ri === ci) {
                        return <div key={`${ri}-${ci}`} className="aspect-square rounded bg-[#1C1C26]" />;
                      }
                      // deterministic pseudo-score from indices
                      const seed = (ri * 7 + ci * 13) % 100;
                      const score = 55 + (seed % 45);
                      const color =
                        score >= 85 ? "#5BB89C" : score >= 70 ? "#E8B86D" : score >= 60 ? "#D98E7A" : "#9A9AA8";
                      return (
                        <div
                          key={`${ri}-${ci}`}
                          className="aspect-square rounded flex items-center justify-center font-mono text-[10px]"
                          style={{ backgroundColor: color + "22", color, border: `1px solid ${color}40` }}
                          title={`${row.name} × ${col.name}: ${score}%`}
                        >
                          {score}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-[#5BB89C]" /> 85+ harmony</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-[#E8B86D]" /> 70–84 workable</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-[#D98E7A]" /> 60–69 friction</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-[#9A9AA8]" /> &lt;60 conflict flag</span>
          </div>
        </GlassCard>
      </FadeIn>

      <CosmicDivider />

      {/* Role compatibility table */}
      <FadeIn delay={0.2}>
        <section>
          <h3 className="font-display text-2xl font-semibold mb-4">Role × favorable elements</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {B2B_ROLES.map((r, i) => (
              <FadeIn key={r.role} delay={0.03 * i}>
                <GlassCard>
                  <div className="font-display text-base font-semibold text-[#F5F0E8]">{r.role}</div>
                  <div className="mt-2">
                    <Pill tone="gold">{r.ideal}</Pill>
                  </div>
                  <p className="mt-2 text-[12px] text-[#9A9AA8]">{r.why}</p>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* Ethics panel */}
      <FadeIn delay={0.25}>
        <GlassCard variant="rose">
          <Pill tone="rose">ethics & compliance · non-negotiable</Pill>
          <h3 className="mt-3 font-display text-xl font-semibold">Advisory, not deterministic</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ul className="space-y-1.5 text-[12px] text-[#9A9AA8]">
              <li>✓ Explicit employee written consent (GDPR Art. 9 special category)</li>
              <li>✓ Human HR always takes the final decision</li>
              <li>✓ Anti-discrimination safeguards · audit trail · disparate-impact monitoring</li>
              <li>✓ Data residency (EU for EU companies, encrypted birth data)</li>
            </ul>
            <ul className="space-y-1.5 text-[12px] text-[#9A9AA8]">
              <li>✓ Right to explanation · right to opt-out · anonymous mode</li>
              <li>✓ Works council notification (Germany BetrVG §87 + local analogues)</li>
              <li>✓ Bias testing regular audit · legal review per market</li>
              <li>✓ BaZi engine with True Solar Time + golden test suite</li>
            </ul>
          </div>
        </GlassCard>
      </FadeIn>

      {/* Pricing */}
      <FadeIn delay={0.3}>
        <section>
          <h3 className="font-display text-2xl font-semibold mb-4">B2B pricing · separate sales motion</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <GlassCard>
              <Pill tone="muted">Starter</Pill>
              <div className="mt-2 font-display text-3xl font-semibold text-[#F5F0E8]">
                $15<span className="text-sm text-[#9A9AA8]"> /seat/mo</span>
              </div>
              <p className="mt-1 text-[11px] text-[#9A9AA8]">≤ 50 employees</p>
              <ul className="mt-3 space-y-1.5 text-[12px] text-[#9A9AA8]">
                <li>✓ Org chart + Day Master overlay</li>
                <li>✓ Role compatibility</li>
                <li>✓ Basic reporting</li>
              </ul>
            </GlassCard>
            <GlassCard variant="gold" glow>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Pill tone="gold">recommended</Pill></div>
              <Pill tone="gold">Professional</Pill>
              <div className="mt-2 font-display text-3xl font-semibold text-[#E8B86D]">
                $25<span className="text-sm text-[#9A9AA8]"> /seat/mo</span>
              </div>
              <p className="mt-1 text-[11px] text-[#9A9AA8]">≤ 500 employees</p>
              <ul className="mt-3 space-y-1.5 text-[12px] text-[#9A9AA8]">
                <li>✓ Everything in Starter</li>
                <li>✓ Team compatibility heatmap</li>
                <li>✓ Hiring funnel + candidate scoring</li>
                <li>✓ Risk flags + Luck Pillar forecast</li>
              </ul>
            </GlassCard>
            <GlassCard variant="jade">
              <Pill tone="jade">Enterprise</Pill>
              <div className="mt-2 font-display text-3xl font-semibold text-[#5BB89C]">
                $50<span className="text-sm text-[#9A9AA8]"> /seat/mo</span>
              </div>
              <p className="mt-1 text-[11px] text-[#9A9AA8]">unlimited</p>
              <ul className="mt-3 space-y-1.5 text-[12px] text-[#9A9AA8]">
                <li>✓ Everything in Professional</li>
                <li>✓ Annual career trajectory forecast</li>
                <li>✓ API access</li>
                <li>✓ Dedicated legal review per market</li>
              </ul>
            </GlassCard>
          </div>
          <div className="mt-4">
            <CosmicButton variant="outline">Book a discovery call →</CosmicButton>
          </div>
        </section>
      </FadeIn>
    </div>
  );
}
