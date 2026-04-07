/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#0a0e17", surface: "#0f1623", card: "#111827", hover: "#1a2332" },
        accent: { DEFAULT: "#00d4ff", green: "#00ff88", red: "#ff3366", yellow: "#ffcc00", blue: "#00d4ff", purple: "#8b5cf6" },
        text: { primary: "#e5e7eb", secondary: "#9ca3af", muted: "#6b7280" },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        display: ["Syne", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
