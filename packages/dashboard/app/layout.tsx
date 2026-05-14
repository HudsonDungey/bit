import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { BgMesh } from "@/components/bg-mesh";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm";
import { Providers } from "./providers";
import { getLocalConfig, publicView } from "@/lib/local-config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pulse — Stablecoin Subscriptions",
  description: "Premium subscription dashboard for stablecoin billing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publicCfg = publicView(getLocalConfig());
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen font-sans">
        <BgMesh />
        <Providers config={publicCfg}>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
