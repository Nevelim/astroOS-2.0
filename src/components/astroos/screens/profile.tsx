"use client";

import { useState, useEffect } from "react";
import {
  GlassCard, Pill, CosmicButton, SectionHeading, FadeIn, CosmicDivider, RitualStarRow,
} from "../ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { LOCALES } from "@/lib/astroos/i18n";
import { USER, MEMBERS, BAZI } from "@/lib/astroos/data";
import type { Locale } from "@/lib/astroos/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { RealProfilePanel } from "../real/RealProfilePanel";
import { useProfileData } from "@/lib/astroos/real/useProfileData";

type ProfileProps = { onNavigate?: (k: import("@/lib/astroos/data").ScreenKey) => void };

export function ProfileScreen({ onNavigate }: ProfileProps = {}) {
  const { t, locale, setLocale } = useI18n();
  const [voice, setVoice] = useState("empowerment");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pushTime, setPushTime] = useState("08:00");
  const [houseSystem, setHouseSystem] = useState("placidus");
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [twoAmCompanion, setTwoAmCompanion] = useState(true);
  const [activeTab, setActiveTab] = useState<"account" | "voice" | "privacy" | "family" | "subscription">("account");
  // Edit modal — for Name / Email fields (Password would need real auth flow)
  const [editingField, setEditingField] = useState<"name" | "email" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  // Real member data from /api/auth/me + natal chart
  const { member, natal, isMock } = useProfileData();
  // Local editable copies (synced from real member data)
  const [localName, setLocalName] = useState(member?.displayName ?? USER.name);
  const [localEmail, setLocalEmail] = useState(member?.email ?? "aeliana@cosmos.io");

  // Sync local state when member data loads
  useEffect(() => {
    if (member?.displayName) setLocalName(member.displayName);
    if (member?.email) setLocalEmail(member.email);
  }, [member]);

  // Derived display values - use real natal data if available, fallback to USER mock
  const displayName = localName || USER.name;
  const displayTier = member?.tier ?? USER.tier;
  const displayStreak = member?.streak ?? USER.streak;
  const displaySun = natal?.sunSign ?? USER.sun;
  const displayMoon = natal?.moonSign ?? USER.moon;
  const displayRising = natal?.risingSign ?? USER.rising;
  const displayDayMaster = natal?.dayMaster ?? USER.dayMaster;
  const displayBirthPlace = member?.birth?.placeName ?? USER.birthPlace;
  const openEditor = (field: "name" | "email") => {
    setEditingField(field);
    setEditValue(field === "name" ? localName : localEmail);
  };
  const saveEdit = () => {
    if (editingField === "name") setLocalName(editValue.trim() || localName);
    if (editingField === "email") setLocalEmail(editValue.trim() || localEmail);
    setEditingField(null);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2200);
  };

  const tabs = [
    { key: "account" as const, label: { en: "Account", ru: "Аккаунт", hi: "खाता" }, icon: "⎆", tone: "gold" as const },
    { key: "voice" as const, label: { en: "Voice & Mentor", ru: "Голос и наставник", hi: "आवाज़ और गुरु" }, icon: "✦", tone: "jade" as const },
    { key: "privacy" as const, label: { en: "Privacy & Memory", ru: "Приватность и память", hi: "गोपनीयता" }, icon: "◉", tone: "rose" as const },
    { key: "family" as const, label: { en: "Family", ru: "Семья", hi: "परिवार" }, icon: "⌂", tone: "gold" as const },
    { key: "subscription" as const, label: { en: "Subscription", ru: "Подписка", hi: "सदस्यता" }, icon: "◈", tone: "gold" as const },
  ];

  const voices = [
    { key: "empowerment", label: { en: "Empowerment", ru: "Сила", hi: "सशक्तिकरण" }, tone: "gold" as const },
    { key: "reflective", label: { en: "Reflective", ru: "Рефлексия", hi: "चिंतनशील" }, tone: "jade" as const },
    { key: "playful", label: { en: "Playful", ru: "Игривый", hi: "चंचल" }, tone: "rose" as const },
    { key: "pragmatic", label: { en: "Pragmatic", ru: "Прагматик", hi: "व्यावहारिक" }, tone: "muted" as const },
  ];

  return (
    <div className="space-y-10">
      <FadeIn>
        <SectionHeading
          eyebrow={locale === "ru" ? "Аккаунт · настройки" : locale === "hi" ? "खाता · सेटिंग्स" : "Account · settings"}
          title={locale === "ru" ? "Профиль" : locale === "hi" ? "प्रोफ़ाइल" : "Profile"}
          subtitle={locale === "ru" ? "Голос, приватность, family hub, язык, подписка. Полный контроль над твоим космическим опытом." : locale === "hi" ? "आवाज़, गोपनीयता, family hub, भाषा, सदस्यता।" : "Voice, privacy, family hub, language, subscription. Full control over your cosmic experience."}
        />
      </FadeIn>

      {/* Real profile — aggregated stats + partner-link + power-cards */}
      <FadeIn delay={0.03}>
        <RealProfilePanel locale={locale} onNavigate={onNavigate} />
      </FadeIn>

      {/* User hero card — uses real member data + natal chart */}
      <FadeIn delay={0.05}>
        <GlassCard variant="gold" glow className="astro-card-sheen relative">
          {isMock && (
            <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-[#6B6B78]/20 text-[#6B6B78]">
              {locale === "ru" ? "демо-режим" : locale === "hi" ? "डेमो मोड" : "demo mode"}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#E8B86D]/40 bg-[#E8B86D]/10 font-display text-2xl font-semibold text-[#E8B86D]">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-semibold">{displayName}</h2>
                <Pill tone="gold">{displayTier}</Pill>
              </div>
              <div className="mt-1 text-[12px] text-[#9A9AA8]">
                {displaySun} Sun · {displayMoon} Moon · {displayRising} Rising · {displayDayMaster}
              </div>
              <div className="text-[11px] text-[#6B6B78]">
                {locale === "ru" ? "Родилась" : locale === "hi" ? "जन्म" : "Born"}: {displayBirthPlace} · {member?.birth?.isoDateTime ?? USER.birthTime} · UTC+{member?.birth?.tzOffset ?? USER.birthTz}
              </div>
            </div>
            <div className="text-center">
              <RitualStarRow filled={displayStreak} />
              <div className="mt-1 text-[10px] text-[#6B6B78]">{displayStreak}/7 {locale === "ru" ? "дней" : locale === "hi" ? "दिन" : "days"}</div>
            </div>
          </div>
        </GlassCard>
      </FadeIn>

      {/* Tab bar */}
      <FadeIn delay={0.08}>
        <div
          role="tablist"
          aria-label="Profile sections"
          className="flex flex-wrap gap-1.5 rounded-xl border border-[#2A2A35] bg-[#0B0B0F]/60 p-1.5"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            const color = tab.tone === "gold" ? "#E8B86D" : tab.tone === "jade" ? "#5BB89C" : "#D98E7A";
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={active}
                aria-controls={`profile-panel-${tab.key}`}
                id={`profile-tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-all ${
                  active
                    ? "bg-[#12121A] text-[#F5F0E8] shadow-[0_0_16px_rgba(0,0,0,0.4)]"
                    : "text-[#9A9AA8] hover:bg-[#1C1C26] hover:text-[#F5F0E8]"
                }`}
                style={active ? { borderBottom: `2px solid ${color}` } : undefined}
              >
                <span aria-hidden style={{ color: active ? color : undefined }}>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"]}</span>
                <span className="sm:hidden">{tab.label[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"].split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </FadeIn>

      {/* Tab panels */}
      <div
        id={`profile-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`profile-tab-${activeTab}`}
        className="space-y-6"
      >
        {activeTab === "account" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Account credentials */}
            <FadeIn delay={0.1}>
              <GlassCard variant="gold" className="h-full">
                <div className="flex items-center justify-between">
                  <Pill tone="gold">{locale === "ru" ? "Учётные данные" : locale === "hi" ? "खाता विवरण" : "Account credentials"}</Pill>
                  {savedFlash && (
                    <span className="text-[11px] font-medium text-[#5BB89C]">✓ {locale === "ru" ? "Сохранено" : locale === "hi" ? "सहेजा गया" : "Saved"}</span>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">{locale === "ru" ? "Имя" : locale === "hi" ? "नाम" : "Name"}</label>
                    <div className="mt-1 flex items-center justify-between rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 px-3 py-2.5">
                      <span className="text-[13px] text-[#F5F0E8]">{localName}</span>
                      <button onClick={() => openEditor("name")} className="text-[11px] text-[#E8B86D] hover:underline">{locale === "ru" ? "Изменить" : locale === "hi" ? "बदलें" : "Edit"}</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">Email</label>
                    <div className="mt-1 flex items-center justify-between rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 px-3 py-2.5">
                      <span className="text-[13px] text-[#F5F0E8]">{localEmail}</span>
                      <button onClick={() => openEditor("email")} className="text-[11px] text-[#E8B86D] hover:underline">{locale === "ru" ? "Изменить" : locale === "hi" ? "बदलें" : "Edit"}</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">{locale === "ru" ? "Пароль" : locale === "hi" ? "पासवर्ड" : "Password"}</label>
                    <div className="mt-1 flex items-center justify-between rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 px-3 py-2.5">
                      <span className="font-mono text-[13px] text-[#9A9AA8]">••••••••</span>
                      <button className="text-[11px] text-[#E8B86D] hover:underline">{locale === "ru" ? "Сменить" : locale === "hi" ? "बदलें" : "Change"}</button>
                    </div>
                  </div>
                  <CosmicDivider />
                  <div className="space-y-2">
                    <button className="flex w-full items-center justify-between rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 p-3 text-left text-[12px] text-[#9A9AA8] hover:border-[#9A9AA8]/40 transition">
                      <span className="flex items-center gap-2">
                        <span className="text-base">🔗</span>
                        {locale === "ru" ? "Подключённые сервисы (Google)" : locale === "hi" ? "कनेक्टेड (Google)" : "Connected (Google)"}
                      </span>
                      <Pill tone="jade">✓</Pill>
                    </button>
                    <button className="flex w-full items-center justify-between rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 p-3 text-left text-[12px] text-[#9A9AA8] hover:border-[#9A9AA8]/40 transition">
                      <span className="flex items-center gap-2">
                        <span className="text-base"></span>
                        {locale === "ru" ? "Подключить Apple" : locale === "hi" ? "Apple जोड़ें" : "Connect Apple"}
                      </span>
                      <span className="text-[#6B6B78]">→</span>
                    </button>
                  </div>
                </div>
              </GlassCard>
            </FadeIn>

            {/* Birth data summary + edit */}
            <FadeIn delay={0.15}>
              <GlassCard variant="jade" className="h-full">
                <Pill tone="jade">{locale === "ru" ? "Данные рождения" : locale === "hi" ? "जन्म डेटा" : "Birth data"}</Pill>
                <div className="mt-4 space-y-2.5 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-[#9A9AA8]">{locale === "ru" ? "Дата" : locale === "hi" ? "तिथि" : "Date"}</span>
                    <span className="font-mono text-[#F5F0E8]">{member?.birth?.isoDateTime?.split("T")[0] ?? "1989-11-07"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9A9AA8]">{locale === "ru" ? "Время" : locale === "hi" ? "समय" : "Time"}</span>
                    <span className="font-mono text-[#F5F0E8]">{member?.birth?.isoDateTime?.split("T")[1] ?? "04:17"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9A9AA8]">{locale === "ru" ? "Место" : locale === "hi" ? "स्थान" : "Place"}</span>
                    <span className="text-[#F5F0E8]">{displayBirthPlace}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9A9AA8]">{locale === "ru" ? "Часовой пояс" : locale === "hi" ? "समय क्षेत्र" : "Timezone"}</span>
                    <span className="font-mono text-[#F5F0E8]">UTC+{member?.birth?.tzOffset ?? 3}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9A9AA8]">{locale === "ru" ? "Солнце" : locale === "hi" ? "सूर्य" : "Sun"}</span>
                    <span className="text-[#E8B86D]">{displaySun}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9A9AA8]">{locale === "ru" ? "Луна" : locale === "hi" ? "चंद्रमा" : "Moon"}</span>
                    <span className="text-[#5BB89C]">{displayMoon}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9A9AA8]">{locale === "ru" ? "Асцендент" : locale === "hi" ? "लग्न" : "Rising"}</span>
                    <span className="text-[#D98E7A]">{displayRising}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9A9AA8]">Day Master</span>
                    <span className="text-[#5E8FA8]">{displayDayMaster}</span>
                  </div>
                </div>
                <CosmicDivider className="my-3" />
                <CosmicButton variant="outline" className="!py-2 !px-4 !text-[12px] w-full" onClick={() => onNavigate?.("birth")}>
                  {locale === "ru" ? "Изменить данные рождения →" : locale === "hi" ? "जन्म डेटा बदलें →" : "Edit birth data →"}
                </CosmicButton>
                <p className="mt-2 text-[10px] text-[#6B6B78]">
                  {locale === "ru"
                    ? "Внимание: изменение данных рождения пересчитает всю карту. История сохранится."
                    : locale === "hi"
                    ? "ध्यान: जन्म डेटा बदलने से पूरी चार्ट पुनर्गणना होगी।"
                    : "Heads up: changing birth data recalculates your whole chart. History is preserved."}
                </p>
              </GlassCard>
            </FadeIn>
          </div>
        )}

        {activeTab === "voice" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Voice settings */}
            <FadeIn delay={0.1}>
              <GlassCard variant="jade" className="h-full">
                <Pill tone="jade">{locale === "ru" ? "Голос наставника" : locale === "hi" ? "गुरु की आवाज़" : "Mentor voice"}</Pill>
                <p className="mt-2 text-[11px] text-[#9A9AA8]">
                  {locale === "ru" ? "Стабильная персона — anti-Replika. AI запоминает тебя и не меняет характер." : locale === "hi" ? "स्थिर व्यक्तित्व — anti-Replika।" : "Stable persona — anti-Replika. The AI remembers you and never shifts character."}
                </p>
                <div className="mt-4 space-y-2">
                  {voices.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => setVoice(v.key)}
                      className={`flex w-full items-center justify-between rounded-lg border p-3 transition-all ${
                        voice === v.key
                          ? v.tone === "gold" ? "border-[#E8B86D]/50 bg-[#E8B86D]/8" : v.tone === "jade" ? "border-[#5BB89C]/50 bg-[#5BB89C]/8" : v.tone === "rose" ? "border-[#D98E7A]/50 bg-[#D98E7A]/8" : "border-[#9A9AA8]/50 bg-[#9A9AA8]/8"
                          : "border-[#2A2A35] bg-[#0B0B0F]/40 hover:border-[#9A9AA8]/40"
                      }`}
                    >
                      <span className="text-[13px] text-[#F5F0E8]">{v.label[locale]}</span>
                      {voice === v.key && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={v.tone === "gold" ? "#E8B86D" : v.tone === "jade" ? "#5BB89C" : v.tone === "rose" ? "#D98E7A" : "#9A9AA8"} strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                <CosmicDivider className="my-3" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] text-[#F5F0E8]">2 a.m. Companion</div>
                    <div className="text-[10px] text-[#6B6B78]">{locale === "ru" ? "Авто 23:00–05:00" : locale === "hi" ? "स्वतः 23:00–05:00" : "Auto 23:00–05:00"}</div>
                  </div>
                  <Toggle on={twoAmCompanion} onClick={() => setTwoAmCompanion(!twoAmCompanion)} tone="rose" />
                </div>
              </GlassCard>
            </FadeIn>

            {/* House system */}
            <FadeIn delay={0.15}>
              <GlassCard>
                <Pill tone="jade">{t("self.house.system")}</Pill>
                <p className="mt-2 text-[11px] text-[#9A9AA8]">
                  {locale === "ru" ? "Прозрачность системы домов — anti-CHANI complaint. Пользователь может переключать с объяснением." : "House system transparency — anti-CHANI complaint. User can switch with explanation."}
                </p>
                <div className="mt-4 space-y-2">
                  {[
                    { key: "placidus", label: "Placidus", desc: { en: "Standard Western, time-based", ru: "Стандарт Запад, по времени", hi: "मानक पाश्चात्य" } },
                    { key: "whole-sign", label: "Whole Sign", desc: { en: "Ancient, one sign per house", ru: "Древняя, один знак на дом", hi: "प्राचीन" } },
                    { key: "equal", label: "Equal House", desc: { en: "30° each, simple", ru: "30° каждый, просто", hi: "30° प्रत्येक" } },
                  ].map((h) => (
                    <button
                      key={h.key}
                      onClick={() => setHouseSystem(h.key)}
                      className={`flex w-full items-center justify-between rounded-lg border p-3 transition-all ${
                        houseSystem === h.key ? "border-[#5BB89C]/50 bg-[#5BB89C]/8" : "border-[#2A2A35] bg-[#0B0B0F]/40 hover:border-[#9A9AA8]/40"
                      }`}
                    >
                      <div>
                        <div className="text-[13px] text-[#F5F0E8]">{h.label}</div>
                        <div className="text-[10px] text-[#6B6B78]">{h.desc[locale]}</div>
                      </div>
                      {houseSystem === h.key && <Pill tone="jade">✓</Pill>}
                    </button>
                  ))}
                </div>
              </GlassCard>
            </FadeIn>
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Privacy & memory */}
            <FadeIn delay={0.1}>
              <GlassCard variant="rose" className="h-full">
                <Pill tone="rose">{locale === "ru" ? "Приватность и память" : locale === "hi" ? "गोपनीयता और स्मृति" : "Privacy & memory"}</Pill>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[12px] text-[#F5F0E8]">{locale === "ru" ? "Память AI-наставника" : locale === "hi" ? "AI स्मृति" : "AI mentor memory"}</div>
                      <div className="text-[10px] text-[#6B6B78]">{locale === "ru" ? "Запоминает прошлые разговоры" : locale === "hi" ? "पिछली बातचीत याद रखता है" : "Remembers past conversations"}</div>
                    </div>
                    <Toggle on={memoryEnabled} onClick={() => setMemoryEnabled(!memoryEnabled)} tone="jade" />
                  </div>
                  <CosmicDivider />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[12px] text-[#F5F0E8]">{locale === "ru" ? "Push-уведомления" : locale === "hi" ? "Push सूचनाएं" : "Push notifications"}</div>
                      <div className="text-[10px] text-[#6B6B78]">{locale === "ru" ? "Calm by default" : "Calm by default"}</div>
                    </div>
                    <Toggle on={pushEnabled} onClick={() => setPushEnabled(!pushEnabled)} tone="gold" />
                  </div>
                  {pushEnabled && (
                    <div className="flex items-center justify-between">
                      <div className="text-[12px] text-[#F5F0E8]">{locale === "ru" ? "Утреннее время" : locale === "hi" ? "सुबह का समय" : "Morning time"}</div>
                      <input
                        type="time"
                        value={pushTime}
                        onChange={(e) => setPushTime(e.target.value)}
                        className="rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-2 py-1 text-[12px] text-[#F5F0E8] outline-none focus:border-[#E8B86D]/50 font-mono"
                      />
                    </div>
                  )}
                  <CosmicDivider />
                  <div className="space-y-2">
                    <button className="flex w-full items-center justify-between rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 p-3 text-left text-[12px] text-[#9A9AA8] hover:border-[#9A9AA8]/40 transition">
                      <span>{locale === "ru" ? "Просмотреть память AI" : locale === "hi" ? "AI स्मृति देखें" : "View AI memory"}</span>
                      <span className="text-[#6B6B78]">→</span>
                    </button>
                    <button className="flex w-full items-center justify-between rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 p-3 text-left text-[12px] text-[#9A9AA8] hover:border-[#9A9AA8]/40 transition">
                      <span>{locale === "ru" ? "Экспорт моих данных" : locale === "hi" ? "मेरा डेटा निर्यात" : "Export my data"}</span>
                      <span className="text-[#6B6B78]">→</span>
                    </button>
                    <button className="flex w-full items-center justify-between rounded-lg border border-[#D98E7A]/30 bg-[#D98E7A]/5 p-3 text-left text-[12px] text-[#D98E7A] hover:border-[#D98E7A]/50 transition">
                      <span>{locale === "ru" ? "Удалить аккаунт" : locale === "hi" ? "खाता हटाएं" : "Delete account"}</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </GlassCard>
            </FadeIn>

            {/* Language */}
            <FadeIn delay={0.15}>
              <GlassCard>
                <Pill tone="gold">{t("common.language")} · cultural adaptation</Pill>
                <div className="mt-4 space-y-2">
                  {LOCALES.map((l) => (
                    <button
                      key={l.key}
                      onClick={() => setLocale(l.key as Locale)}
                      className={`flex w-full items-center justify-between rounded-lg border p-3 transition-all ${
                        locale === l.key ? "border-[#E8B86D]/50 bg-[#E8B86D]/8" : "border-[#2A2A35] bg-[#0B0B0F]/40 hover:border-[#9A9AA8]/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{l.flag}</span>
                        <div>
                          <div className="text-[13px] text-[#F5F0E8]">{l.native}</div>
                          <div className="text-[10px] text-[#6B6B78]">
                            {l.key === "en" && "Western primary · all voices"}
                            {l.key === "ru" && "Western · calm voice"}
                            {l.key === "hi" && "Vedic phrasing · panchang"}
                          </div>
                        </div>
                      </div>
                      {locale === l.key && <Pill tone="gold">✓</Pill>}
                    </button>
                  ))}
                </div>
                <div className="mt-3 text-[10px] text-[#6B6B78]">
                  {locale === "ru" ? "Скоро: ES, PT, AR (RTL), ZH, JA, KO, DE, FR" : locale === "hi" ? "जल्द: ES, PT, AR, ZH, JA, KO, DE, FR" : "Coming: ES, PT, AR (RTL), ZH, JA, KO, DE, FR"}
                </div>
              </GlassCard>
            </FadeIn>
          </div>
        )}

        {activeTab === "family" && (
          <FadeIn delay={0.1}>
            <GlassCard variant="gold">
              <div className="flex items-center justify-between">
                <Pill tone="gold">Family hub · {MEMBERS.length}/5</Pill>
                <CosmicButton variant="ghost" className="!py-1.5 !px-3 !text-[12px]">{t("nav.members")} →</CosmicButton>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {MEMBERS.map((m) => (
                  <div key={m.id} className="rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 p-3 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#E8B86D]/30 bg-[#E8B86D]/5 font-display text-sm text-[#E8B86D]">
                      {m.name.charAt(0)}
                    </div>
                    <div className="mt-1.5 text-[11px] font-medium text-[#F5F0E8]">{m.name}</div>
                    <div className="text-[9px] text-[#6B6B78]">{m.relation}</div>
                  </div>
                ))}
              </div>
              <CosmicDivider className="my-4" />
              <p className="text-[12px] text-[#9A9AA8]">
                {locale === "ru"
                  ? "До 5 семейных профилей в Pro. У каждого свои данные рождения, своя карта, свои города. CalculationCache переиспользует вычисления между членами семьи."
                  : locale === "hi"
                  ? "Pro में 5 परिवार प्रोफ़ाइल। हर एक का अपना चार्ट।"
                  : "Up to 5 family profiles in Pro. Each has their own birth data, chart, and cities. CalculationCache reuses computations across family members."}
              </p>
            </GlassCard>
          </FadeIn>
        )}

        {activeTab === "subscription" && (
          <FadeIn delay={0.1}>
            <GlassCard variant="rose">
              <Pill tone="rose">{locale === "ru" ? "Управление подпиской" : locale === "hi" ? "सदस्यता प्रबंधन" : "Subscription management"}</Pill>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-display text-xl text-[#D98E7A]">Pro · Monthly</div>
                  <div className="text-[11px] text-[#9A9AA8]">$12.99/mo · {locale === "ru" ? "следующее списание 15 июля" : locale === "hi" ? "अगला भुगतान 15 जुलाई" : "next billing July 15"}</div>
                </div>
                <div className="flex gap-2">
                  <CosmicButton variant="ghost" className="!py-2 !px-4 !text-[12px]">{locale === "ru" ? "Перейти на Annual" : "Switch to Annual"}</CosmicButton>
                  <CosmicButton variant="outline" className="!py-2 !px-4 !text-[12px]">{locale === "ru" ? "Отмена (1 тап)" : "Cancel (1 tap)"}</CosmicButton>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill tone="jade">✓ {locale === "ru" ? "Без dark patterns" : "No dark patterns"}</Pill>
                <Pill tone="muted">{locale === "ru" ? "Отмена в один тап" : "One-tap cancel"}</Pill>
              </div>
              <CosmicDivider className="my-4" />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 p-3 text-center">
                  <div className="font-display text-2xl text-[#E8B86D]">5</div>
                  <div className="text-[10px] text-[#9A9AA8]">{locale === "ru" ? "дней reverse-trial" : "days reverse-trial"}</div>
                </div>
                <div className="rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 p-3 text-center">
                  <div className="font-display text-2xl text-[#5BB89C]">∞</div>
                  <div className="text-[10px] text-[#9A9AA8]">{locale === "ru" ? "сообщений наставнику" : "mentor messages"}</div>
                </div>
                <div className="rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 p-3 text-center">
                  <div className="font-display text-2xl text-[#D98E7A]">331</div>
                  <div className="text-[10px] text-[#9A9AA8]">{locale === "ru" ? "городов" : "cities"}</div>
                </div>
              </div>
            </GlassCard>
          </FadeIn>
        )}
      </div>

      {/* Edit modal — Name / Email */}
      <AnimatePresence>
        {editingField && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={locale === "ru" ? "Редактировать поле" : locale === "hi" ? "फ़ील्ड संपादित करें" : "Edit field"}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingField(null)} />
            <motion.div
              initial={{ y: 12, scale: 0.97, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 12, scale: 0.97, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="relative w-full max-w-sm rounded-2xl border border-[#E8B86D]/30 bg-[#12121A] p-5 shadow-[0_0_40px_rgba(232,184,109,0.18)]"
            >
              <div className="flex items-center justify-between">
                <Pill tone="gold">
                  {editingField === "name"
                    ? (locale === "ru" ? "Изменить имя" : locale === "hi" ? "नाम बदलें" : "Edit name")
                    : (locale === "ru" ? "Изменить email" : locale === "hi" ? "email बदलें" : "Edit email")}
                </Pill>
                <button onClick={() => setEditingField(null)} className="text-[#6B6B78] transition hover:text-[#F5F0E8]" aria-label="Close">✕</button>
              </div>
              <label className="mt-4 block text-[10px] uppercase tracking-wider text-[#9A9AA8]">
                {editingField === "name" ? (locale === "ru" ? "Имя" : locale === "hi" ? "नाम" : "Name") : "Email"}
              </label>
              <input
                autoFocus
                type={editingField === "email" ? "email" : "text"}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingField(null); }}
                className="mt-1 w-full rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-3 py-2.5 text-[14px] text-[#F5F0E8] outline-none focus:border-[#E8B86D]/50 transition-colors"
                placeholder={editingField === "name" ? "Aeliana" : "you@cosmos.io"}
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setEditingField(null)}
                  className="rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 px-4 py-2 text-[12px] text-[#9A9AA8] transition hover:text-[#F5F0E8]"
                >
                  {locale === "ru" ? "Отмена" : locale === "hi" ? "रद्द" : "Cancel"}
                </button>
                <button
                  onClick={saveEdit}
                  className="rounded-lg bg-gradient-to-br from-[#E8B86D] to-[#D98E7A] px-4 py-2 text-[12px] font-semibold text-[#0B0B0F] transition hover:shadow-[0_0_16px_rgba(232,184,109,0.4)]"
                >
                  {locale === "ru" ? "Сохранить" : locale === "hi" ? "सहेजें" : "Save"}
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-[#6B6B78]">
                {locale === "ru" ? "Enter — сохранить · Esc — отмена" : locale === "hi" ? "Enter — सहेजें · Esc — रद्द" : "Enter to save · Esc to cancel"}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({ on, onClick, tone }: { on: boolean; onClick: () => void; tone: "gold" | "jade" | "rose" }) {
  const color = tone === "gold" ? "#E8B86D" : tone === "jade" ? "#5BB89C" : "#D98E7A";
  return (
    <button
      onClick={onClick}
      className={`relative h-7 w-12 rounded-full border transition-colors ${on ? "" : "border-[#2A2A35] bg-[#1C1C26]"}`}
      style={on ? { borderColor: color + "60", background: color + "30" } : undefined}
      aria-pressed={on}
    >
      <div
        className={`absolute top-1 h-5 w-5 rounded-full transition-all ${on ? "left-6" : "left-1"}`}
        style={{ background: on ? color : "#9A9AA8" }}
      />
    </button>
  );
}
