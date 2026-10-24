import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--bg-canvas)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        borderSubtle: "var(--border-subtle)",
        textPrimary: "var(--text-primary)",
        textSecondary: "var(--text-secondary)",
        accentPrimary: "var(--accent-primary)",
        accentLime: "var(--accent-lime)",
        semanticIncome: "var(--semantic-income)",
        semanticExpense: "var(--semantic-expense)",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

