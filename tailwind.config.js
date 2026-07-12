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
        surface: "#F1F5F9",
        card: "#FDFDFD",
        divider: "#E2E8F0",
        "text-dark": "#1E293B",
        "text-muted": "#64748B",
        "risk-high": "#EF4444",
        "risk-high-bg": "#FEF2F2",
        "risk-high-text": "#B91C1C",
        "risk-medium": "#F59E0B",
        "risk-medium-bg": "#FFFBEB",
        "risk-medium-text": "#B45309",
        "risk-low": "#22C55E",
        "risk-low-bg": "#F0FDF4",
        "risk-low-text": "#15803D",
        "safe-zone-bg": "#F0FDF4",
        "near-risk-bg": "#FFF1F2",
      },
    },
  },
  plugins: [],
};