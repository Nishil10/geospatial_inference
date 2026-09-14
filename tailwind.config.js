/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0f172a', /* slate-900 */
          800: '#1e293b', /* slate-800 */
          700: '#334155', /* slate-700 */
          600: '#475569', /* slate-600 */
        },
        brand: {
          accent: '#10b981', /* green */
          alert: '#ef4444', /* red */
          warning: '#fbbf24', /* amber */
          info: '#3b82f6' /* blue */
        },
        /* Aliases used by StreetViewModal — without these the classes emit no CSS */
        accent: { green: '#10b981' },
        alert: { red: '#ef4444' },
        warning: { amber: '#fbbf24' },
        info: { blue: '#3b82f6' }
      }
    },
  },
  plugins: [],
}
