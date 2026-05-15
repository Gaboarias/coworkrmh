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
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        "surface-el": "hsl(var(--surface-el))",
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          muted: "hsl(var(--primary-muted))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        text: {
          DEFAULT: "hsl(var(--text))",
          muted: "hsl(var(--text-muted))",
          tertiary: "hsl(var(--text-tertiary))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
        info: "hsl(var(--info))",
        // shadcn compatibility
        foreground: "hsl(var(--text))",
        card: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--text))",
        },
        popover: {
          DEFAULT: "hsl(var(--surface-el))",
          foreground: "hsl(var(--text))",
        },
        muted: {
          DEFAULT: "hsl(var(--surface-el))",
          foreground: "hsl(var(--text-muted))",
        },
        accent: {
          DEFAULT: "hsl(var(--primary-muted))",
          foreground: "hsl(var(--text))",
        },
        destructive: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--text))",
        },
        input: "hsl(var(--border))",
        ring: "hsl(var(--primary))",
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.2s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
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
