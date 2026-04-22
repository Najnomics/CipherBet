import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import { ReactNode } from "react";

import { Providers } from "@/components/providers";

import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CipherBet Protocol",
  description: "Privacy-preserving onchain challenge rooms powered by FHE.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable}`}>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
