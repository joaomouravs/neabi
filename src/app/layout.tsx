import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { ToastProvider } from "@/components/ui/toast";
import { siteConfig } from "@/config/site";

import "./globals.css";

/**
 * Tipografia da Biblioteca NEABI-NI.
 *
 * Barlow Condensed nos títulos dá voz editorial e permite manchetes grandes sem
 * consumir a largura da linha. DM Sans cuida de leitura e interface. Ambas são
 * carregadas com `display: swap` e uma pilha de fallback, para que o texto
 * apareça imediatamente mesmo antes das fontes chegarem.
 */
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
  fallback: ["Arial Narrow", "system-ui", "sans-serif"],
});

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `${siteConfig.name} — %s`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "NEABI",
    "CEFET/RJ",
    "Nova Iguaçu",
    "acervo",
    "biblioteca",
    "estudos afro-brasileiros",
    "povos indígenas",
    "relações étnico-raciais",
    "educação",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#0D0D0D",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${barlowCondensed.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
