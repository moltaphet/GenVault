"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import { VaultDataProvider } from "@/context/VaultDataContext";
import { WalletProvider } from "@/context/WalletContext";

/** App-wide client providers. Add more (query cache, etc.) here. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <WalletProvider>
        <VaultDataProvider>{children}</VaultDataProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
