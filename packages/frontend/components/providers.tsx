"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { ReactNode, useState } from "react";
import { Toaster } from "sonner";
import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "@/lib/wagmi";

const Navbar = dynamic(() => import("@/components/layout/navbar").then((m) => m.Navbar), {
  ssr: false,
});

const ParticleBackground = dynamic(
  () => import("@/components/particles/background").then((m) => m.ParticleBackground),
  { ssr: false },
);

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnReconnect: true,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ParticleBackground />
        <Navbar />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgba(8, 27, 37, 0.95)",
              border: "1px solid rgba(166, 231, 255, 0.25)",
              color: "#e7f7ff",
              fontFamily: "var(--font-body)",
              backdropFilter: "blur(8px)",
            },
          }}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
