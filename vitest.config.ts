import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest — tests de lógica de servidor (autorización, helpers puros, routing).
 *
 * No hay tests de componentes todavía: el valor está en lo que rompió en
 * producción y el compilador no vio (guards de autorización, WHERE mal armado,
 * supuestos de routing). Si más adelante se testean componentes, agregar
 * jsdom + @testing-library/react.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
