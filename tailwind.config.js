/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        /* Plex Sans for prose and controls, Plex Mono for every measurement.
           The stacks fall back to the platform UI faces, so a failed webfont
           load degrades to something sane rather than to Times. */
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        /* THE GROUND. Unified on the auth page's ink (#080e1a) rather than
           slate-900 — every contrast ratio documented in index.css is measured
           against this value, so the whole app now inherits those guarantees.
           The ramp is cool and near-neutral; saturation is reserved for signal. */
        dark: {
          900: '#080e1a', /* page ground */
          800: '#0e1626', /* panel fill  */
          700: '#1b2436', /* raised / hairline */
          600: '#2b364a', /* border, hover  */
          500: '#3d4a60', /* disabled edge  */
        },
        brand: {
          accent: '#10b981', /* CHANGE and ACTION only — see the accent budget */
          alert: '#ef4444',
          warning: '#fbbf24',
          info: '#3b82f6'
        },
        /* Aliases used by StreetViewModal — without these the classes emit no CSS */
        accent: { green: '#10b981' },
        alert: { red: '#ef4444' },
        warning: { amber: '#fbbf24' },
        info: { blue: '#3b82f6' }
      },
      letterSpacing: {
        /* The instrument voice: micro-labels are always uppercase and tracked. */
        label: '0.16em',
        wide: '0.22em',
        brand: '0.28em',
      },
    },
  },
  plugins: [],
}
