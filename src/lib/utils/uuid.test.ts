import { describe, it, expect } from "vitest";
import { isUuid } from "./uuid";

/**
 * Guard de los params de ruta. Sin él, un segmento que no sea UUID llega a una
 * comparación contra una columna `uuid` y Postgres tira "invalid input syntax
 * for type uuid" → la página muestra "Application error" con HTTP 200 en vez
 * de un 404.
 */
describe("isUuid", () => {
  it("acepta UUIDs válidos, en mayúsculas o minúsculas", () => {
    expect(isUuid("09d46bd2-d6d6-48e1-808e-0292b9ee2570")).toBe(true);
    expect(isUuid("00000000-0000-0000-0000-000000000000")).toBe(true);
    expect(isUuid("09D46BD2-D6D6-48E1-808E-0292B9EE2570")).toBe(true);
  });

  it("rechaza los segmentos que hacían explotar la query", () => {
    for (const v of [
      "no-es-un-uuid",
      "999",
      "",
      "undefined",
      "null",
      "09d46bd2-d6d6-48e1-808e",            // incompleto
      "09d46bd2d6d648e1808e0292b9ee2570",   // sin guiones
      "09d46bd2-d6d6-48e1-808e-0292b9ee2570x", // sobra un char
      "'; DROP TABLE projects; --",
      "../../etc/passwd",
    ]) {
      expect(isUuid(v), JSON.stringify(v)).toBe(false);
    }
  });

  it("rechaza null y undefined", () => {
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
