import type { Metadata } from "next";
import { ReactNode } from "react";

import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "CipherBet Protocol",
  description: "Privacy-preserving onchain challenge rooms powered by FHE.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
