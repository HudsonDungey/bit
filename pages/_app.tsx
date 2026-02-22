import React, { useEffect, useState } from "react";
import type { AppProps } from "next/app";
import Sidebar from "../components/ui/Sidebar";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  const [botStatus, setBotStatus] = useState<string>("stopped");

  useEffect(() => {
    // Poll bot status every 5 seconds for sidebar indicator
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/bot/status");
        const json = await res.json();
        if (json.success) {
          setBotStatus(json.data.state.status);
        }
      } catch {
        // ignore
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar botStatus={botStatus} />
      <main className="flex-1 ml-16 lg:ml-56 min-h-screen bg-[var(--bg-primary)]">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
