import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Reveal } from "./reveal";

export function CtaSection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1100px] px-5 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-[#070b16] px-6 py-16 text-center shadow-lift sm:px-12 sm:py-20">
            {/* glow field */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-[-40%] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,91,255,0.4),transparent_62%)] blur-3xl" />
              <div className="absolute bottom-[-50%] left-[20%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(10,132,255,0.32),transparent_70%)] blur-3xl" />
              <div className="absolute inset-0 grid-fade opacity-[0.18]" />
            </div>

            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live on testnet
              </span>
              <h2 className="mx-auto mt-5 max-w-[680px] text-balance font-display text-[clamp(1.9rem,4.4vw,3.1rem)] font-extrabold leading-[1.08] tracking-[-0.025em] text-white">
                Start settling onchain in an afternoon
              </h2>
              <p className="mx-auto mt-4 max-w-[520px] text-balance text-[15.5px] leading-relaxed text-white/60">
                Spin up products, payroll, and programmable billing with one SDK.
                No monthly fees — you only pay when you get paid.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="btn-sheen group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand-gradient px-7 text-[15px] font-semibold text-white shadow-brand transition-all duration-200 ease-soft hover:-translate-y-0.5 hover:shadow-brand-lg sm:w-auto"
                >
                  <span className="relative z-[2]">Start Building</span>
                  <ArrowRight className="relative z-[2] h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-7 text-[15px] font-semibold text-white backdrop-blur transition-all duration-200 ease-soft hover:-translate-y-0.5 hover:bg-white/[0.08] sm:w-auto"
                >
                  <BookOpen className="h-4 w-4 text-white/60" />
                  Read the docs
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
