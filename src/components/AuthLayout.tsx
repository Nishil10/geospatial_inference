import Mark from './Mark';
import CityPlan from './auth/CityPlan';

// Matches Dashboard.tsx's YEARS. Six rows x 18px = a 108px reel in an 18px
// window; the 18px row height is baked into the gd-year keyframes.
const YEAR_ROWS = [2019, 2020, 2021, 2022, 2023, 2024] as const;

// Truncations of the four real entries in src/utils/regions.ts, ordered
// west->east so they decode in the order the seam crosses them. Every value on
// this panel traces back to a file in the repo — do not invent a fifth row or
// an uptime figure, fabricated telemetry is what turns an instrument into
// cosplay.
const LEDGER = [
  { id: '01', region: 'Downtown Fin.', delta: '+3 Structures' },
  { id: '02', region: 'N. Residential', delta: 'Canopy -68%' },
  { id: '03', region: 'Industrial B', delta: 'Carriageway +8 m' },
  { id: '04', region: 'Eastern Port', delta: 'Rail Spur 1.4 km' },
] as const;

export default function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    // h-screen then h-[100dvh]: the second wins where supported, the first is
    // the fallback. Never min-h-screen — under the global body{overflow-hidden}
    // a min-h-screen root grows past the viewport into content no scrollbar can
    // reach. flex-col-reverse puts the panel on top on mobile with no order-*
    // classes; at lg the grid takes over and flex-direction goes inert.
    <div className="gd-auth flex h-screen h-[100dvh] w-full flex-col-reverse overflow-hidden bg-[#080e1a] text-slate-200 lg:grid lg:grid-cols-[400px_1fr] lg:grid-rows-1 xl:grid-cols-[460px_1fr] 2xl:grid-cols-[540px_1fr]">
      {/* Column A — the form, and the only scroll container on the page.
          min-h-0 is required in both flex and grid modes: without it the column
          refuses to shrink below its content, overflow-y-auto never engages,
          and the bottom of a tall form is silently unreachable. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] lg:h-full lg:flex-none">
        {/* Centering is m-auto, NOT items-center. When a flex container centers
            content taller than itself the overflow spills both ways and the top
            goes above the scroll origin, permanently unreachable. Auto margins
            resolve to 0 when free space is negative, so this centers when the
            form fits and top-anchors when it does not. */}
        <div className="flex min-h-full">
          <div className="m-auto w-full px-6 py-8 sm:px-8 sm:py-10 lg:px-12">
            <div className="mx-auto w-full max-w-[360px]">
              {/* Brand lockup quotes Header.tsx so login -> dashboard reads continuous. */}
              <div className="flex items-center gap-2.5">
                <Mark size={26} aria-hidden="true" className="shrink-0 text-slate-500" />
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-brand text-white">Geo Detect</p>
                  <p className="gd-eyebrow mt-1.5">Urban Change Detection</p>
                </div>
              </div>

              {/* The smallest instance of the seam. */}
              <div aria-hidden="true" className="mt-8 mb-6 h-px w-10 bg-brand-accent lg:mt-12" />

              <h1 className="text-balance text-[clamp(1.75rem,3.2vw,2.5rem)] font-medium leading-[1.05] tracking-[-0.02em] text-white">
                {title}
              </h1>
              <p className="mt-3 max-w-[34ch] text-[14px] leading-relaxed text-slate-400">{subtitle}</p>

              <div className="mt-8 lg:mt-10">{children}</div>

              <div className="mt-10 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-6 lg:mt-12">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Urban Change Detection Platform</p>
                <span
                  aria-hidden="true"
                  className="shrink-0 rounded-[2px] border border-white/[0.07] px-2 py-0.5 font-mono text-[10px] text-slate-300"
                >
                  v1.2
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Column B — decorative, never scrolls, no focusable children (which is
          what makes flex-col-reverse safe for focus order). Band heights are
          derived from the slice crop, not chosen: at 1023px wide a 280px band
          yields y in [217.9, 382.1]. Shortening any of them re-breaks the
          drawing at that width. */}
      <aside
        aria-hidden="true"
        className="gd-panel relative isolate h-[180px] shrink-0 overflow-hidden border-b border-white/[0.06] sm:h-[220px] md:h-[280px] lg:h-full lg:border-b-0 lg:border-l"
      >
        <CityPlan year={2019} />

        <div className="gd-reveal absolute inset-0">
          <CityPlan year={2024} />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-[length:64px_64px] bg-[linear-gradient(to_right,rgba(51,65,85,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(51,65,85,0.18)_1px,transparent_1px)]" />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_110%_at_50%_50%,transparent_38%,rgba(8,14,26,0.82)_100%)] lg:bg-[radial-gradient(130%_110%_at_72%_50%,transparent_38%,rgba(8,14,26,0.82)_100%)]" />

        {/* Edge fade into the form column — bottom on mobile, left seam at lg. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#080e1a] to-transparent lg:hidden" />
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-16 bg-gradient-to-r from-[#080e1a] to-transparent lg:block" />

        {/* The sweep assembly. The trailing glow sits at left-0 with
            -translate-x-full so it occupies the 160px behind the line and stays
            pixel-locked to it for free — no second animation to keep in sync.
            Travel is 14%->86% so the year chip never clips at either extreme. */}
        <div className="gd-sweep pointer-events-none absolute inset-y-0 left-0 w-full">
          <div className="absolute inset-y-0 left-0 w-px bg-brand-accent/80 shadow-[0_0_18px_2px_rgba(16,185,129,0.35)]" />
          <div className="absolute inset-y-0 left-0 w-[160px] -translate-x-full bg-gradient-to-l from-brand-accent/[0.09] to-transparent" />
          {/* Rides below the coordinate readout: at the sweep's left extreme
              the chip passes straight over that text, so it cannot share the
              same band. */}
          <div className="absolute left-0 top-16 -translate-x-1/2 lg:top-20">
            <div className="flex items-center gap-2 rounded-full border border-brand-accent/30 bg-[#080e1a]/90 px-2.5 py-1 lg:px-3 lg:py-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" />
              <div className="gd-year-window h-[18px] overflow-hidden">
                <div className="gd-year">
                  {YEAR_ROWS.map((y) => (
                    <div
                      key={y}
                      className="h-[18px] text-[11px] font-semibold leading-[18px] tabular-nums tracking-[0.14em] text-brand-accent lg:text-[12px]"
                    >
                      {y}
                    </div>
                  ))}
                </div>
              </div>
              <span className="gd-year-static text-[11px] font-semibold tabular-nums tracking-[0.14em] text-brand-accent lg:text-[12px]">
                2019 &rarr; 2024
              </span>
            </div>
          </div>
        </div>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-4 h-3 w-3 border-l border-t border-white/15 lg:left-6 lg:top-6"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-4 h-3 w-3 border-r border-t border-white/15 lg:right-6 lg:top-6"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-4 left-4 h-3 w-3 border-b border-l border-white/15 lg:bottom-6 lg:left-6"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-4 right-4 h-3 w-3 border-b border-r border-white/15 lg:bottom-6 lg:right-6"
        />

        <div className="absolute left-8 top-4 font-mono text-[9px] uppercase leading-[1.5] tracking-[0.16em] text-slate-500 lg:left-11 lg:top-6 lg:text-[10px]">
          <p>San Francisco &middot; 37.7749&deg; N 122.4194&deg; W</p>
          <p className="text-slate-600">EPSG:4326 &middot; WGS 84</p>
        </div>

        {/* Each row wipes open as the seam crosses its site. Crisp HTML rather
            than SVG annotations, so the payoff survives down to 360px. */}
        <ul className="absolute bottom-3 left-3 space-y-1 lg:bottom-7 lg:left-7 lg:space-y-1.5">
          {LEDGER.map((row, i) => (
            <li
              key={row.id}
              className={`gd-led gd-led-${i + 1} flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] lg:text-[10px]`}
            >
              <span className="h-1 w-1 shrink-0 rounded-full bg-brand-accent" />
              <span className="w-[96px] shrink-0 text-slate-500 lg:w-[108px]">{row.region}</span>
              <span className="text-slate-300">{row.delta}</span>
            </li>
          ))}
        </ul>

        <div className="absolute bottom-3 right-3 hidden items-center gap-3 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500 sm:flex lg:bottom-7 lg:right-7 lg:text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[1px] bg-brand-accent/40 ring-1 ring-brand-accent" />
            New
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full ring-1 ring-brand-accent/60" />
            Removed
          </span>
        </div>
      </aside>
    </div>
  );
}
