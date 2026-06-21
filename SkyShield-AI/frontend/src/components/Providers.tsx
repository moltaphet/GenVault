"use client";

import type { ReactNode } from "react";
import { SkyShieldDataProvider } from "@/context/SkyShieldDataContext";
import { WalletProvider } from "@/context/WalletContext";

/** App-wide client providers. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <SkyShieldDataProvider>{children}</SkyShieldDataProvider>
    </WalletProvider>
  );
}
