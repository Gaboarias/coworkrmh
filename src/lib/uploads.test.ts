import { describe, it, expect } from "vitest";
import { isMimeAllowed, UPLOAD_MAX_BYTES } from "./uploads";

describe("isMimeAllowed", () => {
  it("acepta imágenes, video, audio y los tipos exactos del allowlist", () => {
    for (const m of [
      "image/png",
      "image/jpeg",
      "image/webp",
      "video/mp4",
      "audio/mpeg",
      "application/pdf",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]) {
      expect(isMimeAllowed(m), m).toBe(true);
    }
  });

  // El MIME lo manda el cliente y se reusa como contentType del blob público:
  // un SVG declarado image/svg+xml se sirve como SVG y puede traer <script>.
  it("rechaza SVG aunque caiga bajo el prefijo image/", () => {
    expect(isMimeAllowed("image/svg+xml")).toBe(false);
    expect(isMimeAllowed("image/svg")).toBe(false);
  });

  it("normaliza mayúsculas y parámetros antes de decidir", () => {
    expect(isMimeAllowed("IMAGE/SVG+XML")).toBe(false);
    expect(isMimeAllowed("image/svg+xml; charset=utf-8")).toBe(false);
    expect(isMimeAllowed("  image/svg+xml  ")).toBe(false);
    expect(isMimeAllowed("image/PNG")).toBe(true);
    expect(isMimeAllowed("text/csv; charset=utf-8")).toBe(true);
  });

  it("rechaza HTML, ejecutables y vacío", () => {
    for (const m of [
      "text/html",
      "application/x-msdownload",
      "application/x-httpd-php",
      "",
    ]) {
      expect(isMimeAllowed(m), m).toBe(false);
    }
  });

  it("mantiene el cap por debajo del límite de body de Vercel (~4.5 MB)", () => {
    expect(UPLOAD_MAX_BYTES).toBeLessThan(4.5 * 1024 * 1024);
  });
});
