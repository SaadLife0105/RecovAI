/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "#0D9488",
        background: "#F8FAFC",
        card: "#FFFFFF",
        "risk-high": "#EF4444",
        "risk-medium": "#F59E0B",
        "risk-low": "#22C55E",
        "text-dark": "#1E293B",
        "text-muted": "#64748B",
      },
    },
  },
  plugins: [],
};