"use client";

import {
  GlassCard, Pill, CosmicButton, SectionHeading, StatTile, FadeIn, CosmicDivider,
} from "../ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { PROPOSAL_SHIFTS, TRAJECTORY, USER } from "@/lib/astroos/data";
import type { ScreenKey } from "@/lib/astroos/data";

export function OverviewScreen({ onNavigate }: { onNavigate?: (s: ScreenKey) => void }) {
  const { t, locale } = useI18n();
  return (
    <div className="space-y-16">
      {/* Hero */}
      <FadeIn>
        <section className="relative overflow-hidden rounded-2xl glass-gold p-8 md:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#E8B86D]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-[#5BB89C]/8 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <Pill tone="gold">v3.3 · Onboarding + Growth + Themes</Pill>
              <Pill tone="jade">RU · EN · HI</Pill>
              <Pill tone="muted">GitHub-analyzed</Pill>
            </div>
            <h1 className="mt-6 font-display text-5xl md:text-7xl font-semibold leading-[0.95] tracking-tight">
              <span className="text-gradient-cosmic">AstroOS</span>
            </h1>
            <p className="mt-3 font-display text-2xl md:text-3xl italic text-[#E8B86D]">
              {t("brand.tagline")}
            </p>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[#9A9AA8]">
              {t("overview.lead")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <CosmicButton variant="primary" onClick={() => onNavigate?.("reveal")}>✧ {t("overview.cta.reveal")}</CosmicButton>
              <CosmicButton variant="outline" onClick={() => onNavigate?.("today")}>{t("overview.cta.today")}</CosmicButton>
              <CosmicButton variant="ghost" onClick={() => onNavigate?.("upgrade")}>{t("overview.cta.pricing")}</CosmicButton>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* $160M ARR trajectory */}
      <FadeIn delay={0.1}>
        <section>
          <SectionHeading
            eyebrow="$160M ARR · 12M MAU · 5 years"
            title="The trajectory to unicorn"
            subtitle="Fused warm cosmic design with GitHub project's data-density. 3 languages (RU/EN/HI) with cultural adaptation. India online CAGR 49% — fastest market."
          />
          <div className="mt-6 overflow-x-auto scrollbar-astro">
            <div className="grid min-w-[640px] grid-cols-6 gap-2">
              <div className="text-[10px] uppercase tracking-wider text-[#6B6B78] px-2 py-1">Phase</div>
              <div className="text-[10px] uppercase tracking-wider text-[#6B6B78] px-2 py-1">MAU</div>
              <div className="text-[10px] uppercase tracking-wider text-[#6B6B78] px-2 py-1">ARR</div>
              <div className="text-[10px] uppercase tracking-wider text-[#6B6B78] px-2 py-1">WARD</div>
              <div className="text-[10px] uppercase tracking-wider text-[#6B6B78] px-2 py-1">Viral k</div>
              <div className="text-[10px] uppercase tracking-wider text-[#6B6B78] px-2 py-1">LTV</div>
              {TRAJECTORY.flatMap((row) => [
                <div key={`${row.phase}-p`} className="px-2 py-2 text-[12px] text-[#E8B86D] font-medium">{row.phase}</div>,
                <div key={`${row.phase}-m`} className="px-2 py-2 text-[13px] font-mono text-[#F5F0E8]">{row.mau}</div>,
                <div key={`${row.phase}-a`} className="px-2 py-2 text-[13px] font-mono text-[#5BB89C]">{row.arr}</div>,
                <div key={`${row.phase}-w`} className="px-2 py-2 text-[13px] font-mono text-[#D98E7A]">{row.ward}</div>,
                <div key={`${row.phase}-k`} className="px-2 py-2 text-[13px] font-mono text-[#E8B86D]">{row.k}</div>,
                <div key={`${row.phase}-l`} className="px-2 py-2 text-[13px] font-mono text-[#F5F0E8]">{row.ltv}</div>,
              ])}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Stats */}
      <FadeIn delay={0.15}>
        <section>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile value="$9B" label="2030 astrology apps market (CAGR ~20%)" tone="gold" />
            <StatTile value="49%" label="India online CAGR — fastest geography" tone="jade" />
            <StatTile value="12M" label="Year-5 MAU target" tone="rose" />
            <StatTile value="$160M" label="5-year ARR · unicorn trajectory" tone="gold" />
            <StatTile value="$0.16" label="Cost per MAU · 98% gross margin" tone="jade" />
            <StatTile value="k→1.4" label="Viral coefficient by Year 5" tone="rose" />
            <StatTile value="3" label="Languages: RU · EN · HI (cultural)" tone="water" />
            <StatTile value="0" label="B2B HR astrology competitors (white space)" tone="gold" />
          </div>
        </section>
      </FadeIn>

      {/* 9 shifts */}
      <FadeIn delay={0.2}>
        <section>
          <SectionHeading
            eyebrow={t("overview.proposal.eyebrow")}
            title={t("overview.proposal.title")}
            subtitle="What changes from the initial prototype + GitHub fusion. Each shift maps to a concrete retention, conversion, or growth lever."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PROPOSAL_SHIFTS.map((s, i) => {
              const tones = ["gold", "jade", "rose"] as const;
              const tone = tones[i % 3];
              return (
                <FadeIn key={s.n} delay={0.04 * i}>
                  <GlassCard variant={tone} className="h-full">
                    <div className="flex items-start gap-3">
                      <div className="font-display text-3xl font-semibold text-[#E8B86D]/40 leading-none">{s.n}</div>
                      <div className="flex-1">
                        <h3 className="font-display text-lg font-semibold text-[#F5F0E8]">{s.title}</h3>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-[#9A9AA8]">{s.change}</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <Pill tone="gold">why</Pill>
                          <span className="text-[11px] text-[#5BB89C]">{s.why}</span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </FadeIn>
              );
            })}
          </div>
        </section>
      </FadeIn>

      {/* Locked vs Rejected vs Fused */}
      <FadeIn delay={0.25}>
        <section className="grid gap-6 md:grid-cols-3">
          <GlassCard variant="gold">
            <Pill tone="gold">locked · customer-approved</Pill>
            <h3 className="mt-3 font-display text-xl font-semibold">{t("overview.locked")}</h3>
            <ul className="mt-3 space-y-2 text-[12px] text-[#9A9AA8]">
              <li>◆ Cosmic dark palette — #0B0B0F + gold/jade/rose</li>
              <li>◆ Cormorant Garamond + Inter + JetBrains Mono</li>
              <li>◆ Glassmorphism + starfield</li>
              <li>◆ 3D astrocartography — Rodrigues, Slerp, antipode</li>
              <li>◆ Narrative AI — top-3 positive + top-2 negative</li>
              <li>◆ I-Ching + Tarot (customer-validated)</li>
              <li>◆ Swiss Ephemeris + True Solar Time</li>
            </ul>
          </GlassCard>
          <GlassCard variant="rose">
            <Pill tone="rose">rejected · fixed</Pill>
            <h3 className="mt-3 font-display text-xl font-semibold">{t("overview.rejected")}</h3>
            <ul className="mt-3 space-y-2 text-[12px] text-[#9A9AA8]">
              <li>✕ 18 FR / 8 disconnected screens → narrative IA</li>
              <li>✕ Weekly $9 (Nebula-pattern) → removed</li>
              <li>✕ 2 a.m. Companion only mentioned → first-class</li>
              <li>✕ Viral card in growth-doc → first-class</li>
              <li>✕ No Reveal → 90-sec cinematic</li>
              <li>✕ PRD diverges from impl → v3 proposal</li>
            </ul>
          </GlassCard>
          <GlassCard variant="jade">
            <Pill tone="jade">fused from GitHub · v3 NEW</Pill>
            <h3 className="mt-3 font-display text-xl font-semibold">Data-density + i18n</h3>
            <ul className="mt-3 space-y-2 text-[12px] text-[#9A9AA8]">
              <li>✓ 44 planetary lines (10 planets × MC/IC/Asc/Desc + 4 axes)</li>
              <li>✓ 84 weights (14 planets × 6 spheres)</li>
              <li>✓ Orbis zones 111/222/333/444km + color coding</li>
              <li>✓ 8-sphere multi-filter + radar chart</li>
              <li>✓ Per-member breakdown + paran detection</li>
              <li>✓ BaZi 4 pillars + Luck Pillars + Ten Gods</li>
              <li>✓ RU · EN · HI cultural adaptation</li>
            </ul>
          </GlassCard>
        </section>
      </FadeIn>

      <CosmicDivider />

      <FadeIn>
        <div className="text-center">
          <p className="font-display text-2xl italic text-[#E8B86D]">{t("brand.equipping")}</p>
          <p className="mt-2 text-[12px] text-[#6B6B78]">
            Full proposal: <span className="font-mono text-[#9A9AA8]">/home/z/my-project/docs/product-designer-proposal.md</span>
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
