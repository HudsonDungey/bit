const LOGOS = [
  "Northwind",
  "Helix Labs",
  "Cadence",
  "Monolith",
  "Loop",
  "Arcwave",
  "Pendulum",
  "Stratus",
  "Quanta",
  "Vellum",
];

export function LogoStrip() {
  return (
    <section className="border-y border-border bg-secondary/30 py-12">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <p className="text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Powering billing for modern internet businesses
        </p>
        <div className="relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
          <div className="marquee-track gap-14">
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="whitespace-nowrap font-display text-xl font-bold tracking-tight text-muted-foreground/60 transition-colors hover:text-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
