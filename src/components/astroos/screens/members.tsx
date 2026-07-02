"use client";

import {
  GlassCard, Pill, CosmicButton, SectionHeading, FadeIn, CosmicDivider,
} from "../ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { MEMBERS } from "@/lib/astroos/data";
import { RealMembersPanel } from "../real/RealMembersPanel";
import type { ScreenKey } from "@/lib/astroos/data";

export function MembersScreen({ onNavigate }: { onNavigate?: (k: ScreenKey) => void } = {}) {
  const { t, locale } = useI18n();

  return (
    <div className="space-y-10">
      <FadeIn>
        <SectionHeading
          eyebrow={t("members.eyebrow")}
          title={t("members.title")}
          subtitle={t("members.subtitle")}
        />
      </FadeIn>

      {/* Real family hub — members with compatibility scores */}
      <FadeIn delay={0.03}>
        <RealMembersPanel locale={locale} onNavigate={onNavigate} />
      </FadeIn>

      {/* Member cards grid */}
      <FadeIn delay={0.05}>
        <div className="grid gap-4 md:grid-cols-2">
          {MEMBERS.map((m, i) => (
            <FadeIn key={m.id} delay={0.04 * i}>
              <GlassCard variant={i === 0 ? "gold" : i === 1 ? "jade" : i === 2 ? "rose" : "neutral"} className="h-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#E8B86D]/40 bg-[#E8B86D]/10 font-display text-lg font-semibold text-[#E8B86D]">
                    {m.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-semibold">{m.name}</span>
                      <Pill tone="muted">{m.relation}</Pill>
                    </div>
                    <div className="mt-1 text-[11px] text-[#9A9AA8]">{m.dob}</div>
                    <div className="text-[11px] text-[#9A9AA8]">{m.place} · UTC{m.tz >= 0 ? "+" : ""}{m.tz}</div>
                  </div>
                </div>
                <CosmicDivider className="my-3" />
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[#6B6B78]">Day Master</div>
                    <div className="mt-0.5 font-display text-[#5E8FA8]">{m.dayMaster}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[#6B6B78]">Top city</div>
                    <div className="mt-0.5 font-display text-[#E8B86D]">{m.topCity}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[#6B6B78]">Gender (BaZi)</div>
                    <div className="mt-0.5 text-[#9A9AA8]">{m.gender === 0 ? "Female" : "Male"}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-[#6B6B78]">Relocation score</div>
                    <div className="mt-0.5 font-mono text-[#5BB89C]">{m.score}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <CosmicButton variant="ghost" className="!py-1.5 !px-3 !text-[11px]">View chart →</CosmicButton>
                  <CosmicButton variant="ghost" className="!py-1.5 !px-3 !text-[11px]">Cities →</CosmicButton>
                </div>
              </GlassCard>
            </FadeIn>
          ))}
          {/* Add member card */}
          <FadeIn delay={0.2}>
            <button className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#2A2A35] bg-[#0B0B0F]/40 p-5 text-[#9A9AA8] transition hover:border-[#E8B86D]/40 hover:text-[#E8B86D]">
              <span className="text-3xl">＋</span>
              <span className="font-display text-base">{t("members.add")}</span>
              <span className="text-[10px] text-[#6B6B78]">Pro · up to 5 profiles</span>
            </button>
          </FadeIn>
        </div>
      </FadeIn>

      <CosmicDivider />

      {/* Add-member form preview (data-density) */}
      <FadeIn delay={0.1}>
        <GlassCard>
          <Pill tone="gold">{t("members.add")} · schema</Pill>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">{t("members.name")}</label>
              <input className="mt-1 w-full rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-3 py-2 text-[13px] text-[#F5F0E8] outline-none focus:border-[#E8B86D]/50" placeholder="e.g. Anna" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">{t("members.birth")}</label>
              <input className="mt-1 w-full rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-3 py-2 text-[13px] text-[#F5F0E8] outline-none focus:border-[#E8B86D]/50 font-mono" placeholder="1989-11-07T04:17" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">{t("members.place")}</label>
              <input className="mt-1 w-full rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-3 py-2 text-[13px] text-[#F5F0E8] outline-none focus:border-[#E8B86D]/50" placeholder="Saint Petersburg, RU" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">{t("members.tz")}</label>
                <input className="mt-1 w-full rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-3 py-2 text-[13px] text-[#F5F0E8] outline-none focus:border-[#E8B86D]/50 font-mono" placeholder="+3" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">{t("members.gender")}</label>
                <select className="mt-1 w-full rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-3 py-2 text-[13px] text-[#F5F0E8] outline-none focus:border-[#E8B86D]/50">
                  <option>Female</option><option>Male</option>
                </select>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Pill tone="jade">✓ Auto timezone</Pill>
            <Pill tone="jade">✓ Duplicate check</Pill>
            <Pill tone="muted">True Solar Time via Python</Pill>
          </div>
          <div className="mt-3">
            <CosmicButton variant="primary" className="!py-2 !px-4 !text-[12px]">✦ {t("members.add")}</CosmicButton>
          </div>
        </GlassCard>
      </FadeIn>

      {/* Calculation cache note */}
      <FadeIn delay={0.15}>
        <GlassCard variant="jade">
          <Pill tone="jade">scalability · 500K users</Pill>
          <p className="mt-2 text-[12px] text-[#9A9AA8] leading-relaxed">
            CalculationCache keyed by <span className="font-mono text-[#E8B86D]">sha1(lat,lng,dob,tz)</span> — shared across all users with identical birth data.
            <span className="font-mono text-[#5BB89C]"> getManyMemberLines()</span> bulk query replaces N+1 sequential calls (V88 fix).
            500K users with overlapping birth data reuse the same calculation — major scalability win.
          </p>
        </GlassCard>
      </FadeIn>
    </div>
  );
}
