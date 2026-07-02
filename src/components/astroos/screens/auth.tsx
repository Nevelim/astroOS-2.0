"use client";

import { useState } from "react";
import {
  GlassCard, Pill, CosmicButton, SectionHeading, FadeIn, CosmicDivider,
} from "../ui";
import { OnboardingStepper } from "../growth-ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { TIERS } from "@/lib/astroos/data";
import type { ScreenKey } from "@/lib/astroos/data";
import { motion, AnimatePresence } from "framer-motion";

type AuthProps = { onNavigate?: (k: ScreenKey) => void };

export function AuthScreen({ onNavigate }: AuthProps = {}) {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"auth" | "welcome">("auth");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/signin/google";
  };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "register") {
        const r = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email, password, displayName: name || email.split("@")[0],
            birthDateTime: "2000-01-01T12:00",
            birthLat: 0, birthLng: 0, birthTzOffset: 0,
            birthPlaceName: "Unknown — complete profile", gender: 0,
            locale,
          }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Registration failed");
        setStep("welcome");
      } else {
        const r = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Login failed");
        setStep("welcome");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (step === "welcome") {
    return <WelcomeScene locale={locale} onNavigate={onNavigate} />;
  }

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="mx-auto max-w-md">
          <OnboardingStepper current={1} />
        </div>
      </FadeIn>
      <FadeIn delay={0.05}>
        <SectionHeading
          eyebrow={locale === "ru" ? "Онбординг · аутентификация" : locale === "hi" ? "ऑनबोर्डिंग · प्रमाणीकरण" : "Onboarding · authentication"}
          title={locale === "ru" ? "Вход · Регистрация" : locale === "hi" ? "लॉगिन · पंजीकरण" : "Sign in · Sign up"}
          subtitle={locale === "ru" ? "One-tap вход. Email · Google · Apple. Без пароля friction. Trust-first — никакого paywall в первой сессии." : "One-tap login. Email · Google · Apple. No password friction. Trust-first — no paywall in first session."}
        />
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Auth form */}
        <FadeIn delay={0.05}>
          <GlassCard variant="gold" glow className="h-full">
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 p-0.5">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 rounded py-2 text-[12px] transition ${mode === "login" ? "bg-[#E8B86D]/15 text-[#E8B86D]" : "text-[#9A9AA8]"}`}
              >
                {locale === "ru" ? "Вход" : locale === "hi" ? "लॉगिन" : "Sign in"}
              </button>
              <button
                onClick={() => setMode("register")}
                className={`flex-1 rounded py-2 text-[12px] transition ${mode === "register" ? "bg-[#E8B86D]/15 text-[#E8B86D]" : "text-[#9A9AA8]"}`}
              >
                {locale === "ru" ? "Регистрация" : locale === "hi" ? "पंजीकरण" : "Sign up"}
              </button>
            </div>

            {/* Social one-tap */}
            <div className="mt-4 space-y-2">
              <button onClick={handleGoogleLogin} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 py-2.5 text-[13px] text-[#F5F0E8] hover:border-[#E8B86D]/50 hover:bg-[#E8B86D]/5 transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {locale === "ru" ? "Войти через Google" : "Continue with Google"}
              </button>
              <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 py-2.5 text-[13px] text-[#F5F0E8] hover:border-[#9A9AA8]/40 transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#F5F0E8"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                Apple
              </button>
            </div>

            <div className="my-4 flex items-center gap-3">
              <CosmicDivider className="flex-1" />
              <span className="text-[10px] uppercase tracking-wider text-[#6B6B78]">{locale === "ru" ? "или" : "or"}</span>
              <CosmicDivider className="flex-1" />
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-3 p-2 rounded-lg text-[11px]" style={{ background: "#D98E7A15", color: "#D98E7A", border: "1px solid #D98E7A30" }}>
                {error}
              </div>
            )}

            {/* Email form */}
            <form onSubmit={handle} className="space-y-3">
              {mode === "register" && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">{locale === "ru" ? "Имя" : "Name"}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-3 py-2.5 text-[13px] text-[#F5F0E8] outline-none focus:border-[#E8B86D]/50 transition-colors"
                    placeholder="Aeliana"
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-3 py-2.5 text-[13px] text-[#F5F0E8] outline-none focus:border-[#E8B86D]/50 transition-colors"
                  placeholder="you@cosmos.io"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">{locale === "ru" ? "Пароль" : "Password"}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-3 py-2.5 text-[13px] text-[#F5F0E8] outline-none focus:border-[#E8B86D]/50 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
              <CosmicButton type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? (locale === "ru" ? "Загрузка..." : "Loading...") : mode === "login" ? (locale === "ru" ? "Войти →" : "Sign in →") : (locale === "ru" ? "Создать аккаунт →" : "Create account →")}
              </CosmicButton>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="jade">✓ bcrypt + CSPRNG</Pill>
              <Pill tone="muted">30-day session</Pill>
              <Pill tone="muted">httpOnly cookie</Pill>
            </div>
          </GlassCard>
        </FadeIn>

        {/* Pricing preview */}
        <FadeIn delay={0.1}>
          <GlassCard className="h-full">
            <Pill tone="gold">{locale === "ru" ? "Предварительный просмотр цен" : "Pricing preview"}</Pill>
            <p className="mt-2 text-[11px] text-[#9A9AA8]">
              {locale === "ru" ? "Никакого пейволла в первой сессии. 7 дней Pro reverse trial, потом авто-даунгрейд на Free." : "No paywall in first session. 7-day Pro reverse trial, then auto-downgrade to Free."}
            </p>
            <div className="mt-4 space-y-2">
              {TIERS.map((tier) => (
                <div
                  key={tier.key}
                  className={`rounded-lg border p-3 ${tier.highlight ? "border-[#E8B86D]/50 bg-[#E8B86D]/8" : "border-[#2A2A35] bg-[#0B0B0F]/40"}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-semibold text-[#F5F0E8]">{tier.name}</span>
                        {tier.highlight && <Pill tone="gold">popular</Pill>}
                      </div>
                      <div className="text-[10px] text-[#6B6B78]">{tier.tagline}</div>
                    </div>
                    <div className="text-right">
                      <span
                        className="font-display text-lg font-semibold"
                        style={{ color: tier.tone === "gold" ? "#E8B86D" : tier.tone === "jade" ? "#5BB89C" : tier.tone === "rose" ? "#D98E7A" : "#F5F0E8" }}
                      >
                        {tier.price}
                      </span>
                      <span className="text-[10px] text-[#9A9AA8]"> {tier.cadence}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <CosmicDivider className="my-3" />
            <div className="flex flex-wrap gap-2">
              <Pill tone="rose">✓ No dark patterns</Pill>
              <Pill tone="jade">✓ One-tap cancel</Pill>
              <Pill tone="muted">✓ No pre-checked boxes</Pill>
            </div>
          </GlassCard>
        </FadeIn>
      </div>

      <CosmicDivider />

      {/* Trust indicators */}
      <FadeIn delay={0.15}>
        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard>
            <div className="text-2xl">🔐</div>
            <h4 className="mt-2 font-display text-base font-semibold">{locale === "ru" ? "Безопасность" : "Security"}</h4>
            <p className="mt-1 text-[11px] text-[#9A9AA8]">bcrypt password hashing, CSPRNG session tokens, httpOnly cookies, 30-day expiry.</p>
          </GlassCard>
          <GlassCard variant="jade">
            <div className="text-2xl">🛡️</div>
            <h4 className="mt-2 font-display text-base font-semibold">{locale === "ru" ? "Приватность" : "Privacy"}</h4>
            <p className="mt-1 text-[11px] text-[#9A9AA8]">{locale === "ru" ? "Данные рождения шифруются. CalculationCache shared по content hash — анонимно." : "Birth data encrypted. CalculationCache shared by content hash — anonymous."}</p>
          </GlassCard>
          <GlassCard variant="rose">
            <div className="text-2xl">✨</div>
            <h4 className="mt-2 font-display text-base font-semibold">{locale === "ru" ? "Trust-first" : "Trust-first"}</h4>
            <p className="mt-1 text-[11px] text-[#9A9AA8]">{locale === "ru" ? "Никакого bait-and-switch. Reverse trial auto-downgrade, не auto-charge." : "No bait-and-switch. Reverse trial auto-downgrade, never auto-charge."}</p>
          </GlassCard>
        </div>
      </FadeIn>
    </div>
  );
}

function WelcomeScene({ locale, onNavigate }: { locale: string; onNavigate?: (k: ScreenKey) => void }) {
  return (
    <div className="relative min-h-[500px] overflow-hidden rounded-2xl">
      <div className="absolute inset-0 starfield opacity-90" />
      <div className="absolute inset-0 cosmic-glow" />
      <div className="relative flex min-h-[500px] flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="space-y-4"
        >
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#E8B86D]/70">
            {locale === "ru" ? "Добро пожаловать в" : locale === "hi" ? "स्वागत है" : "Welcome to"}
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-semibold text-gradient-cosmic">AstroOS</h1>
          <p className="font-display text-xl italic text-[#5BB89C] max-w-md">
            {locale === "ru" ? "Аккаунт готов. Теперь — данные рождения, чтобы построить вашу карту." : locale === "hi" ? "खाता तैयार। अब अपनी चार्ट बनाने के लिए जन्म डेटा दें।" : "Account ready. Now your birth data — to build your chart."}
          </p>
          <div className="pt-4">
            <CosmicButton variant="primary" className="astro-pulse-glow" onClick={() => onNavigate?.("birth")}>✧ {locale === "ru" ? "Ввести данные рождения" : locale === "hi" ? "जन्म डेटा दर्ज करें" : "Enter your birth data"}</CosmicButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
