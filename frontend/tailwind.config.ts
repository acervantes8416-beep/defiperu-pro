import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#0a0e17", card: "#111827", hover: "#1a2332" },
        accent: { green: "#00d4aa", red: "#ff4757", blue: "#3b82f6", yellow: "#f59e0b", purple: "#8b5cf6" },
        text: { primary: "#e5e7eb", secondary: "#9ca3af", muted: "#6b7280" },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
