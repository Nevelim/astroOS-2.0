"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Locale } from "@/lib/astroos/i18n";
import { translate } from "@/lib/astroos/i18n";

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru");

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const t = useCallback((key: string) => translate(locale, key), [locale]);

  return (
    <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
