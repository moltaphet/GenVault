import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "SkyShield AI - Autonomous Flight Insurance",
  description:
    "Parametric flight-delay insurance on GenLayer. AI-priced premiums, autonomous oracle-less payouts, and a community underwriting pool.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
