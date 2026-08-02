import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

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
        // Edition 04 tokens (mapeo directo a CSS vars de globals.css)
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-faint": "var(--ink-faint)",
        rule: "var(--rule)",
        "rule-strong": "var(--rule-strong)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "project-color": "var(--project-color)",
        urgent: "var(--urgent)",
        "on-solid": "var(--on-solid)",
        "done-text": "var(--done-text)",
        "warn-text": "var(--warn-text)",
        "urgent-text": "var(--urgent-text)",
        "info-text": "var(--info-text)",
        info: "var(--info)",
        "info-soft": "var(--info-soft)",
        "urgent-soft": "var(--urgent-soft)",
        done: "var(--done)",
        "done-soft": "var(--done-soft)",
        warn: "var(--warn)",
        "warn-soft": "var(--warn-soft)",

        // Superficies. No son alias: no tienen equivalente Edition 04, son sus
        // propios tokens con valor literal.
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-el": "var(--surface-el)",

        // Capa semántica de componente. Nombra un ROL, no un color, así que
        // convive con el vocabulario Edition 04 en vez de duplicarlo.
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          muted: "var(--primary-muted)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          muted: "var(--sidebar-muted)",
          border: "var(--sidebar-border)",
          active: "var(--sidebar-active)",
        },
        muted: {
          DEFAULT: "var(--surface-2)",
          foreground: "var(--ink-soft)",
        },
        ring: "var(--project-color)",
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      boxShadow: {
        "elev-1": "var(--elev-1)",
        "elev-2": "var(--elev-2)",
        "elev-3": "var(--elev-3)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
      fontFamily: {
        // Una sola fuente. Display = mismo Satoshi en mayor peso/tamaño.
        sans: ["Satoshi", "system-ui", "-apple-system", "sans-serif"],
        display: ["Satoshi", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        "title": "-0.04em",
        "title-tight": "-0.035em",
        "label": "0.18em",
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.2s var(--ease-out)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
