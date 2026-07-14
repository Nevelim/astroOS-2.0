"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Starfield, CosmicGlow, Pill } from "@/components/astroos/ui";
import { CosmicBackground } from "@/components/astroos/CosmicBackground";
import { NotificationsBell, type AstroNotification } from "@/components/astroos/growth-ui";
import { NAV_ITEMS } from "@/lib/astroos/data";
import type { ScreenKey } from "@/lib/astroos/data";
import { I18nProvider, useI18n } from "@/lib/astroos/i18n-context";
import { LOCALES } from "@/lib/astroos/i18n";
import { OverviewScreen } from "@/components/astroos/screens/overview";
import { RevealScreen } from "@/components/astroos/screens/reveal";
import { TodayScreen } from "@/components/astroos/screens/today";
import { SelfScreen } from "@/components/astroos/screens/self";
import { WorldScreen } from "@/components/astroos/screens/world";
import { WorldMapScreen } from "@/components/astroos/screens/world-map";
import { LocalSpaceScreen } from "@/components/astroos/screens/local-space";
import { MentorScreen } from "@/components/astroos/screens/mentor";
import { DivineScreen } from "@/components/astroos/screens/divine";
import { ConnectScreen } from "@/components/astroos/screens/connect";
import { MembersScreen } from "@/components/astroos/screens/members";
import { UpgradeScreen } from "@/components/astroos/screens/upgrade";
import { BusinessScreen } from "@/components/astroos/screens/business";
import { ProfileScreen } from "@/components/astroos/screens/profile";
import { AuthScreen } from "@/components/astroos/screens/auth";
import { WelcomeScreen } from "@/components/astroos/screens/welcome";
import { BirthDataScreen } from "@/components/astroos/screens/birth";
import { ThemesScreen } from "@/components/astroos/screens/themes";
import { FamilyAstroScreen } from "@/components/astroos/screens/family-astro";
import { AstroTravelScreen } from "@/components/astroos/screens/astro-travel";
import { BaZiReportScreen } from "@/components/astroos/screens/bazi-report";
import { BaZiAdminScreen } from "@/components/astroos/screens/bazi-admin";

type ScreenProps = { onNavigate?: (k: ScreenKey) => void };

const SCREENS: Record<ScreenKey, React.ComponentType<ScreenProps>> = {
  overview: OverviewScreen,
  reveal: RevealScreen,
  today: TodayScreen,
  self: SelfScreen,
  world: WorldMapScreen,
  local: LocalSpaceScreen,
  mentor: MentorScreen,
  divine: DivineScreen,
  connect: ConnectScreen,
  members: MembersScreen,
  upgrade: UpgradeScreen,
  business: BusinessScreen,
  profile: ProfileScreen,
  auth: AuthScreen,
  welcome: WelcomeScreen,
  birth: BirthDataScreen,
  themes: ThemesScreen,
  family: FamilyAstroScreen,
  "astro-travel": AstroTravelScreen,
  "bazi-report": BaZiReportScreen,
  "bazi-admin": BaZiAdminScreen,
};

// Sample cosmic inbox — demonstrates the growth surface (transit / streak / city / trial / divine)
const NOTIFICATIONS: AstroNotification[] = [
  { id: "n1", kind: "trial", title: "3 days left of Pro", body: "Your reverse trial auto-downgrades Sunday. No charge — keep it or cancel.", time: "now", action: { label: "Manage", screen: "upgrade" } },
  { id: "n2", kind: "transit", title: "Moon enters Scorpio", body: "Your Sun sign is lit. A 4-hour window for honest conversations opens at 14:20.", time: "2h", action: { label: "Today's reading", screen: "today" } },
  { id: "n3", kind: "city", title: "New match: Porto", body: "Venus IC line · 41 km from Lisbon. A softer, cheaper twin for partnership.", time: "5h", action: { label: "See on map", screen: "astro-travel" } },
  { id: "n4", kind: "streak", title: "5-day ritual streak", body: "Two more days and your WARD hits gold. Tomorrow's preview unlocks at 18:33.", time: "1d", action: { label: "Keep going", screen: "today" }, read: true },
  { id: "n5", kind: "divine", title: "I-Ching ready", body: "You haven't cast this week. A question about the conversation you're circling?", time: "1d", action: { label: "Cast", screen: "divine" }, read: true },
];

// Mobile bottom-nav primary set + secondary sheet ordering (reveal + connect promoted)
const MOBILE_PRIMARY: ScreenKey[] = ["today", "astro-travel", "mentor"];
const MOBILE_SECONDARY: ScreenKey[] = ["welcome", "birth", "reveal", "connect", "themes", "self", "divine", "members", "upgrade", "business", "profile", "overview", "auth"];

function Shell() {
  const { locale, setLocale, t } = useI18n();
  const [screen, setScreen] = useState<ScreenKey>("today");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // First-visit onboarding: land NEW users on Welcome (true entry point) —
  // Welcome → Auth → Birth data → Reveal → Today.
  // Returning users land on Today (their daily ritual).
  // Effect-based to avoid SSR hydration mismatch (server renders "today", client adjusts after mount).
  useEffect(() => {
    try {
      const seen = localStorage.getItem("astroos:seen");
      if (!seen) {
        localStorage.setItem("astroos:seen", "1");
        setScreen("welcome");
      }
    } catch {
      /* localStorage unavailable — keep default "today" */
    }
  }, []);

  const navigate = (k: ScreenKey) => {
    setScreen(k);
    setMobileNavOpen(false);
    setMobileSheetOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const journeyItems = NAV_ITEMS.filter((n) => n.group === "journey");
  const accountItems = NAV_ITEMS.filter((n) => n.group === "account");
  const growthItems = NAV_ITEMS.filter((n) => n.group === "growth");

  const Current = SCREENS[screen];

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0B0B0F] text-[#F5F0E8]">
      <Starfield />
      <CosmicBackground density={1} />
      <CosmicGlow />

      <div className="relative z-10 flex flex-1">
        {/* Desktop sidebar */}
        {/* Desktop sidebar — z-50 ensures clicks pass above the TourSpotlight dim layer (z-45). */}
        <aside className="hidden lg:flex w-[260px] flex-col relative z-50 border-r border-[#2A2A35] bg-[#0B0B0F]/80 backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-[#2A2A35] px-5 py-4">
            <div className="font-display text-2xl font-semibold astro-text-rainbow">AstroOS</div>
            <Pill tone="muted">v3.2</Pill>
          </div>

          <nav className="flex-1 overflow-y-auto scrollbar-astro px-3 py-4 space-y-1">
            <div className="px-2 pb-1 text-[10px] uppercase tracking-[0.2em] text-[#8A8A96]">
              {t("nav.group.journey")}
            </div>
            {journeyItems.map((n) => (
              <NavButton key={n.key} item={n} active={screen === n.key} onClick={() => navigate(n.key)} t={t} />
            ))}
            <div className="px-2 pt-4 pb-1 text-[10px] uppercase tracking-[0.2em] text-[#8A8A96]">
              {t("nav.group.account")}
            </div>
            {accountItems.map((n) => (
              <NavButton key={n.key} item={n} active={screen === n.key} onClick={() => navigate(n.key)} t={t} />
            ))}
            <div className="px-2 pt-4 pb-1 text-[10px] uppercase tracking-[0.2em] text-[#8A8A96]">
              {t("nav.group.growth")}
            </div>
            {growthItems.map((n) => (
              <NavButton key={n.key} item={n} active={screen === n.key} onClick={() => navigate(n.key)} t={t} />
            ))}
          </nav>

          <div className="border-t border-[#2A2A35] p-3">
            <div className="rounded-lg glass-gold p-3">
              <div className="flex items-center gap-2">
                <Pill tone="gold">Pro · Monthly</Pill>
              </div>
              <div className="mt-2 font-display text-sm text-[#F5F0E8]">Aeliana</div>
              <div className="text-[10px] text-[#9A9AA8]">Scorpio · Pisces · Aquarius</div>
              <div className="mt-1 text-[10px] text-[#E8B86D]">Yang Water 壬</div>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#2A2A35] bg-[#0B0B0F]/85 px-4 py-3 backdrop-blur-md md:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden rounded-lg border border-[#2A2A35] p-2 text-[#9A9AA8]"
                aria-label="Open menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className="lg:hidden font-display text-xl font-semibold astro-text-rainbow">AstroOS</div>
              <button
                onClick={() => navigate("overview")}
                className="hidden lg:block text-left"
                aria-label="Go to overview"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#E8B86D]/70">
                  {t(`${screen}.eyebrow`) || t("overview.eyebrow")}
                </div>
                <div className="font-display text-xl font-semibold text-[#F5F0E8]">
                  {t(`${screen}.title`) || t("overview.title")}
                </div>
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* Language switcher RU/EN/HI */}
              <div className="hidden sm:flex items-center gap-1 rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 p-0.5">
                {LOCALES.map((l) => (
                  <button
                    key={l.key}
                    onClick={() => setLocale(l.key)}
                    className={`rounded px-2 py-1 text-[11px] transition ${
                      locale === l.key ? "bg-[#E8B86D]/15 text-[#E8B86D]" : "text-[#9A9AA8] hover:text-[#F5F0E8]"
                    }`}
                    aria-label={l.label}
                    title={l.label}
                  >
                    {l.key === "en" ? "EN" : l.key === "ru" ? "RU" : "हि"}
                  </button>
                ))}
              </div>
              <NotificationsBell notifications={NOTIFICATIONS} onNavigate={navigate} />
              <button
                onClick={() => navigate("upgrade")}
                className="rounded-lg bg-gradient-to-br from-[#E8B86D] to-[#D98E7A] px-3 py-1.5 text-[12px] font-semibold text-[#0B0B0F] transition hover:shadow-[0_0_20px_rgba(232,184,109,0.4)]"
              >
                ✦ {t("common.upgrade")}
              </button>
            </div>
          </header>

          {/* Screen content */}
          <main className="flex-1 overflow-y-auto scrollbar-astro px-4 py-6 md:px-8 md:py-10">
            <div className="mx-auto flex min-h-full max-w-6xl flex-col">
              <div className="flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={screen}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Current onNavigate={navigate} />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer — mt-auto sticks it to viewport bottom on short content; pushed down naturally on long content */}
              <footer className="mt-auto border-t border-[#2A2A35] pt-6 pb-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-display text-lg astro-text-rainbow">AstroOS</div>
                  <div className="text-[11px] text-[#8A8A96]">
                    {t("brand.tagline")} · v3.2 Product Designer prototype
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-[#9A9AA8]">
                  <span>{t("brand.equipping")}</span>
                  <span className="text-[#2A2A35]">·</span>
                  <span>Swiss Ephemeris + True Solar Time</span>
                  <span className="text-[#2A2A35]">·</span>
                  <button className="hover:text-[#E8B86D]">{t("common.methodology")}</button>
                  <span className="text-[#2A2A35]">·</span>
                  <button className="hover:text-[#E8B86D]">{t("common.privacy")}</button>
                </div>
              </div>
              <div className="mt-4 text-[10px] text-[#8A8A96]">
                Full proposal: <span className="font-mono">/home/z/my-project/docs/product-designer-proposal.md</span> ·
                Handover: <span className="font-mono">/home/z/my-project/worklog.md</span>
              </div>
            </footer>
            </div>
          </main>

          {/* Mobile bottom nav — 3 primary + central ✦ that opens a sheet with all secondary screens.
              Promotes reveal (activation) + connect (viral loop) to the top of the sheet. */}
          <nav
            className="lg:hidden sticky bottom-0 z-50 flex items-center justify-around border-t border-[#2A2A35] bg-[#0B0B0F]/95 px-1 py-2 backdrop-blur-md"
            role="navigation"
            aria-label="Primary mobile navigation"
          >
            {MOBILE_PRIMARY.map((k) => {
              const item = NAV_ITEMS.find((n) => n.key === k)!;
              const active = screen === k;
              return (
                <button
                  key={k}
                  onClick={() => navigate(k)}
                  aria-current={active ? "page" : undefined}
                  aria-label={t(item.label)}
                  className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition ${
                    active ? "text-[#E8B86D] cosmic-nav-underline" : "text-[#8A8A96]"
                  }`}
                >
                  <span className="text-lg" aria-hidden>{item.icon}</span>
                  <span className="text-[10px]">{t(item.label)}</span>
                </button>
              );
            })}
            <button
              onClick={() => setMobileSheetOpen(true)}
              className="cosmic-pulse-ring relative -mt-6 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#E8B86D]/40 bg-gradient-to-br from-[#E8B86D] to-[#D98E7A] text-xl text-[#0B0B0F] shadow-[0_0_24px_rgba(232,184,109,0.5)] transition hover:scale-105"
              aria-label="All screens"
              aria-expanded={mobileSheetOpen}
              aria-haspopup="dialog"
            >
              <span aria-hidden>✦</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Mobile slide-out nav (full) — kept for power users via hamburger */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute left-0 top-0 h-full w-[260px] border-r border-[#2A2A35] bg-[#0B0B0F] p-4 overflow-y-auto scrollbar-astro"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="font-display text-2xl font-semibold astro-text-rainbow">AstroOS</div>
                <button onClick={() => setMobileNavOpen(false)} className="text-[#9A9AA8]" aria-label="Close menu">✕</button>
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A8A96] mb-2">{t("nav.group.journey")}</div>
              {journeyItems.map((n) => (
                <NavButton key={n.key} item={n} active={screen === n.key} onClick={() => navigate(n.key)} t={t} />
              ))}
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A8A96] mt-4 mb-2">{t("nav.group.account")}</div>
              {accountItems.map((n) => (
                <NavButton key={n.key} item={n} active={screen === n.key} onClick={() => navigate(n.key)} t={t} />
              ))}
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#8A8A96] mt-4 mb-2">{t("nav.group.growth")}</div>
              {growthItems.map((n) => (
                <NavButton key={n.key} item={n} active={screen === n.key} onClick={() => navigate(n.key)} t={t} />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile ✦ bottom sheet — all secondary screens, reveal + connect promoted */}
      <AnimatePresence>
        {mobileSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden flex items-end"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileSheetOpen(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="relative w-full rounded-t-3xl border-t border-[#2A2A35] bg-[#0B0B0F] p-5 pb-8"
              role="dialog"
              aria-modal="true"
              aria-label="All screens"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#2A2A35]" />
              <div className="mb-3 flex items-center justify-between">
                <div className="font-display text-lg font-semibold text-[#F5F0E8]">All dimensions</div>
                <button onClick={() => setMobileSheetOpen(false)} className="text-[#9A9AA8]" aria-label="Close">✕</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MOBILE_SECONDARY.map((k) => {
                  const item = NAV_ITEMS.find((n) => n.key === k);
                  if (!item) return null;
                  const active = screen === k;
                  const promoted = k === "reveal" || k === "connect";
                  return (
                    <button
                      key={k}
                      onClick={() => navigate(k)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition ${
                        active
                          ? "border-[#E8B86D]/40 bg-[#E8B86D]/10 text-[#E8B86D]"
                          : promoted
                          ? "border-[#5BB89C]/30 bg-[#5BB89C]/8 text-[#F5F0E8]"
                          : "border-[#2A2A35] text-[#9A9AA8] hover:bg-[#1C1C26] hover:text-[#F5F0E8]"
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-[10px] text-center leading-tight">{t(item.label)}</span>
                      {promoted && <span className="text-[8px] uppercase tracking-wider text-[#5BB89C]">top</span>}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({
  item, active, onClick, t,
}: {
  item: { key: ScreenKey; label: string; icon: string };
  active: boolean;
  onClick: () => void;
  t: (k: string) => string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all cosmic-focus-ring ${
        active
          ? "bg-[#E8B86D]/10 text-[#E8B86D] border border-[#E8B86D]/30 cosmic-gradient-border"
          : "text-[#9A9AA8] hover:bg-[#1C1C26] hover:text-[#F5F0E8] border border-transparent"
      }`}
    >
      <span className="text-base w-5 text-center">{item.icon}</span>
      <span className="text-[13px] font-medium">{t(item.label)}</span>
    </button>
  );
}

export default function Home() {
  return (
    <I18nProvider>
      <Shell />
    </I18nProvider>
  );
}
