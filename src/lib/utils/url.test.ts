import { describe, it, expect } from "vitest";
import { safeInternalPath } from "./url";

const BASE = new URL("https://cowork-rmh.vercel.app/api/ws/switch");

describe("safeInternalPath", () => {
  it("deja pasar rutas internas, con query y hash", () => {
    expect(safeInternalPath("/dashboard", BASE)).toBe("/dashboard");
    expect(safeInternalPath("/", BASE)).toBe("/");
    expect(safeInternalPath("/projects/abc?tab=notes", BASE)).toBe(
      "/projects/abc?tab=notes"
    );
    expect(safeInternalPath("/projects/abc#seccion", BASE)).toBe(
      "/projects/abc#seccion"
    );
  });

  // El bug original: `next.startsWith("/")` dejaba pasar "//evil.com", que
  // new URL() resuelve como protocol-relative a https://evil.com.
  it.each([
    "//evil.com",
    "//evil.com/phish",
    "////evil.com",
    "/\\evil.com",
    "/\\\\evil.com",
  ])("bloquea el open redirect %j", (payload) => {
    expect(safeInternalPath(payload, BASE)).toBe("/dashboard");
  });

  it("bloquea URLs absolutas y esquemas raros", () => {
    expect(safeInternalPath("https://evil.com", BASE)).toBe("/dashboard");
    expect(safeInternalPath("http://evil.com", BASE)).toBe("/dashboard");
    expect(safeInternalPath("javascript:alert(1)", BASE)).toBe("/dashboard");
    expect(safeInternalPath("data:text/html,<script>", BASE)).toBe("/dashboard");
  });

  it("usa el fallback con valores vacíos", () => {
    expect(safeInternalPath(null, BASE)).toBe("/dashboard");
    expect(safeInternalPath(undefined, BASE)).toBe("/dashboard");
    expect(safeInternalPath("", BASE)).toBe("/dashboard");
  });

  // Invariante general: pase lo que pase, resolver el resultado contra el
  // origin nunca puede terminar en otro host.
  it("nunca devuelve algo que resuelva fuera del origin", () => {
    const payloads = [
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "////a//evil.com",
      "/ok",
      "/a/b?x=1#y",
    ];
    for (const p of payloads) {
      const out = safeInternalPath(p, BASE);
      expect(new URL(out, BASE).origin).toBe(BASE.origin);
    }
  });
});
