import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AstroOS · Your Cosmic Operating System",
  description:
    "AstroOS v2.0 — Product Designer prototype. Western astrology × BaZi × AI mentor × Cosmic Match × Remedies × B2B HR. Cosmic dark premium design.",
  keywords: [
    "AstroOS",
    "astrocartography",
    "BaZi",
    "AI mentor",
    "daily horoscope",
    "cosmic match",
    "I-Ching",
    "Tarot",
  ],
  authors: [{ name: "AstroOS Product Design" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "AstroOS · Your Cosmic Operating System",
    description: "Western astrology × BaZi × AI mentor — v2.0 design prototype",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${cormorant.variable} ${inter.variable} ${jetbrains.variable} antialiased font-sans bg-astro-bg text-astro-text`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
