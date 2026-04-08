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
        }
      }
    },
  },
  plugins: [],
}
