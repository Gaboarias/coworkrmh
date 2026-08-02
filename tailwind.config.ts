import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // `readableTextOn()` devuelve nombres de clase. Sin este glob Tailwind no
    // los ve en ningún JSX y los purga: la clase existe, el color no.
    "./src/lib/**/*.{js,ts}",
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

        // Tinta sobre color elegido por el usuario. La decide `readableTextOn()`
        // midiendo el fondo, no el tema.
        "ink-on-light": "var(--ink-on-light)",
        "ink-on-dark": "var(--ink-on-dark)",

        // Velos sobre contenido arbitrario.
        scrim: "var(--scrim)",
        "scrim-soft": "var(--scrim-soft)",
        "scrim-strong": "var(--scrim-strong)",

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
      /**
       * Escala tipográfica de Consola.
       *
       * La mono avanza ~20% más ancha que Satoshi, así que al mismo cuerpo
       * entra menos texto sin que se lea mejor. Cada escalón baja uno o dos
       * píxeles.
       *
       * Se recalibra ACÁ y no en los 209 sitios que usan `text-sm`/`text-xs`:
       * un solo lugar, determinista y reversible. Tocar doscientos archivos
       * para el mismo efecto sería trabajo y riesgo sin nada a cambio.
       *
       * En px y no en rem a propósito: `html` está en 17px, así que `0.875rem`
       * hoy da 14.9px y no 14. Los tamaños de texto se eligen a ojo en píxeles;
       * dejarlos atados al tamaño de raíz los movía sin que nadie lo pidiera.
       */
      fontSize: {
        xs: ["11px", "16px"],
        sm: ["13px", "18px"],
        base: ["14px", "20px"],
        lg: ["16px", "24px"],
        xl: ["19px", "26px"],
        "2xl": ["23px", "30px"],
        "3xl": ["28px", "34px"],
      },
      // Consola es casi recta. Se mantienen los escalones para no reescribir
      // cada `rounded-md` del repo, pero el rango se comprime a un par de
      // píxeles. `full` NO se toca: un avatar y un punto de estado son
      // círculos, y un círculo no es una esquina redondeada.
      borderRadius: {
        "3xl": "0.375rem",
        "2xl": "0.3125rem",
        xl: "0.25rem",
        lg: "0.25rem",
        md: "0.125rem",
        sm: "0.0625rem",
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
        // "ColonCRC" primero: declara ÚNICAMENTE U+20A1 (el signo de colón),
        // que el subset `latin` de JetBrains Mono no trae. Sin él, ese carácter
        // cae a una fuente del sistema y se dibuja 1.6× más ancho que un dígito
        // — medido en la corrida de QA.
        //
        // Va acá y no sólo en la regla de `body`: la utilidad `font-mono` se
        // emite DESPUÉS del @layer base y pisa esa regla. Es el mismo fallo que
        // ya se corrigió una vez con `font-sans`, y la primera versión de este
        // arreglo volvió a caer en él.
        mono: [
          "ColonCRC",
          "var(--font-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "monospace",
        ],
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
