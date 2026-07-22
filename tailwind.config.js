/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Kept in sync with constants/theme.ts — see that file's header
        // comment for why both must match, and its inline comments (2026-07-22)
        // for why these three specific values were darkened for WCAG AA.
        primary: "#0B7C72",
        background: "#F8FAFC",
        surface: "#F1F5F9",
        card: "#FDFDFD",
        divider: "#E2E8F0",
        "text-dark": "#1E293B",
        "text-muted": "#5C6B7F",
        "risk-high": "#DC2626",
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
        secondary: "#2563EB",
        "secondary-bg": "#EFF6FF",
        "secondary-text": "#1D4ED8",
        "mood-okay": "#EAB308",
        "mood-okay-bg": "#FEFCE8",
        "mood-okay-text": "#A16207",
        "zone-drug-market": "#991B1B",
        "zone-drug-market-bg": "#FEF2F2",
        "zone-drug-market-text": "#7F1D1D",
        "zone-friends-house": "#F97316",
        "zone-friends-house-bg": "#FFF7ED",
        "zone-friends-house-text": "#C2410C",
      },
    },
  },
  plugins: [],
};