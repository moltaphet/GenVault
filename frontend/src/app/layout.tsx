import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "GenVault — Intelligent Staking & Yield Optimizer",
  description:
    "Stake, auto-compound, and withdraw with the SmartStakingOptimizer Intelligent Contract on GenLayer.",
};

/**
 * Applies the saved (or system) theme class before the page paints, preventing
 * a flash of the wrong theme on first load. Defaults to dark.
 */
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("genvault-theme");
    var prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    var theme = stored || (prefersLight ? "light" : "dark");
    document.documentElement.classList.add(theme === "light" ? "light" : "dark");
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
