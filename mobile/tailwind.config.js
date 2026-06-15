/**
 * Tailwind config (Edition 04 mobile).
 *
 * Comparte tokens conceptuales con el web pero los expone como utilities
 * que NativeWind acepta. Light + dark via prefijo dark: (NW v4 sigue
 * el mismo patrón que web Tailwind).
 *
 * Familias de fuente:
 *   - sans = Satoshi Variable (cargada via expo-font con familyName "Satoshi")
 *   - mono = JetBrains Mono (cargada via @expo-google-fonts/jetbrains-mono)
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // === LIGHT (default) ===
        // Mapeo directo a Edition 04 web (ver web/src/app/globals.css).
        bg: "rgb(245 242 235)",          // #f5f2eb
        "bg-2": "rgb(235 231 220)",      // #ebe7dc
        surface: "rgb(255 255 255)",
        "surface-2": "rgb(241 237 227)", // #f1ede3
        "surface-el": "rgb(255 255 255)",

        ink: "rgb(22 20 18)",            // #161412
        "ink-soft": "rgb(82 77 68)",     // #524d44
        "ink-faint": "rgb(138 131 120)", // #8a8378

        rule: "rgba(22, 20, 18, 0.09)",
        "rule-strong": "rgba(22, 20, 18, 0.22)",

        // Accents — committed pero refinados
        urgent: "rgb(232 40 28)",        // #e8281c
        "urgent-soft": "rgba(232, 40, 28, 0.1)",
        done: "rgb(31 122 77)",          // #1f7a4d
        "done-soft": "rgba(31, 122, 77, 0.1)",
        info: "rgb(46 82 217)",          // #2e52d9
        "info-soft": "rgba(46, 82, 217, 0.1)",
        warn: "rgb(232 154 13)",         // #e89a0d
        "warn-soft": "rgba(232, 154, 13, 0.1)",

        // Palette canónica Edition 04 — usado para project colors
        "p-vermillion": "#d63a1f",
        "p-emerald": "#1f7a4d",
        "p-saffron": "#e89a0d",
        "p-cobalt": "#2e52d9",
        "p-grape": "#7a3aa0",
        "p-teal": "#3a8a8a",
        "p-berry": "#b94a8a",
        "p-moss": "#5a6020",
      },
      fontFamily: {
        // sans, satoshi: alias del mismo family loaded via expo-font.
        // 'Satoshi' es el internal name del .ttf.
        sans: ["Satoshi", "System"],
        satoshi: ["Satoshi", "System"],
        mono: ["JetBrainsMono_500Medium", "monospace"],
      },
      letterSpacing: {
        title: "-0.04em",
        "title-tight": "-0.035em",
        label: "0.16em",
      },
    },
  },
  plugins: [],
};
