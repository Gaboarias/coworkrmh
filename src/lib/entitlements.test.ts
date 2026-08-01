import { describe, it, expect } from "vitest";
import { hasFeature, premiumFeatures, type Feature } from "./entitlements";

describe("hasFeature", () => {
  const BASIC: Feature[] = [
    "projects",
    "tasks",
    "calendar",
    "content",
    "clients",
    "notifications",
  ];
  const PREMIUM: Feature[] = [
    "operations",
    "clientPortal",
    "reportBuilder",
    "blaster",
    "analytics",
    "multiWorkspace",
    "mobile",
  ];

  it("premium habilita todo", () => {
    for (const f of [...BASIC, ...PREMIUM]) {
      expect(hasFeature("premium", f), f).toBe(true);
    }
  });

  it("basic habilita sólo las features basic", () => {
    for (const f of BASIC) expect(hasFeature("basic", f), f).toBe(true);
    for (const f of PREMIUM) expect(hasFeature("basic", f), f).toBe(false);
  });

  // Deny por defecto: sin entorno se asume el tier más restrictivo.
  it("sin tier se comporta como basic", () => {
    for (const f of PREMIUM) {
      expect(hasFeature(null, f), f).toBe(false);
      expect(hasFeature(undefined, f), f).toBe(false);
    }
    expect(hasFeature(null, "projects")).toBe(true);
  });

  it("premiumFeatures lista exactamente las de pago", () => {
    expect(premiumFeatures().sort()).toEqual([...PREMIUM].sort());
  });
});
