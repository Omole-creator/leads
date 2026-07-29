import { describe, it, expect } from "vitest";
import { certificateAssets } from "@/lib/certificate-assets";
import {
  DISPLAY_FONTS,
  DEFAULT_DISPLAY_FONT,
  displayFont,
} from "@/lib/certificate-fonts";

// Read the 4-byte table tags out of a TrueType/OpenType file's table directory.
function tableTags(data: Buffer): string[] {
  const numTables = data.readUInt16BE(4);
  const tags: string[] = [];
  for (let i = 0; i < numTables; i++) {
    tags.push(data.toString("ascii", 12 + i * 16, 16 + i * 16));
  }
  return tags;
}

describe("DISPLAY_FONTS", () => {
  it("has unique ids and a resolvable default", () => {
    const ids = DISPLAY_FONTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(DEFAULT_DISPLAY_FONT);
    expect(displayFont(DEFAULT_DISPLAY_FONT).id).toBe(DEFAULT_DISPLAY_FONT);
  });

  it("falls back to the default for an unknown or missing id", () => {
    expect(displayFont("comic-sans").id).toBe(DEFAULT_DISPLAY_FONT);
    expect(displayFont(undefined).id).toBe(DEFAULT_DISPLAY_FONT);
  });

  it("loads every offered face, and each one is a static TTF", () => {
    for (const face of DISPLAY_FONTS) {
      const display = certificateAssets(face.id).fonts.find(
        (f) => f.name === "Display",
      );
      expect(display, `${face.id} must register a Display face`).toBeDefined();
      expect(tableTags(display!.data), `${face.label} must not be variable`)
        .not.toContain("fvar");
      expect(display!.data.toString("ascii", 0, 4)).not.toBe("wOF2");
    }
  });

  it("carries a sane size multiplier for each face", () => {
    for (const face of DISPLAY_FONTS) {
      expect(certificateAssets(face.id).displayScale).toBe(face.sizeScale);
      expect(face.sizeScale).toBeGreaterThanOrEqual(1);
      expect(face.sizeScale).toBeLessThanOrEqual(1.25);
    }
  });
});

describe("certificateAssets", () => {
  const assets = certificateAssets();

  it("inlines the logo and signature as PNG data URIs", () => {
    for (const uri of [assets.logo, assets.signature]) {
      expect(uri.startsWith("data:image/png;base64,")).toBe(true);
      expect(uri.length).toBeGreaterThan(1000);
    }
  });

  it("registers the body, heading and display faces", () => {
    expect(new Set(assets.fonts.map((f) => f.name))).toEqual(
      new Set(["Poppins", "Unifraktur", "Display"]),
    );
  });

  it("ships only STATIC fonts — satori crashes parsing a variable font's fvar table", () => {
    for (const font of assets.fonts) {
      expect(tableTags(font.data), `${font.name} must not be variable`).not.toContain(
        "fvar",
      );
    }
  });

  it("ships real TrueType data, not woff2, which satori cannot decode", () => {
    for (const font of assets.fonts) {
      // woff2 files start with the ASCII signature "wOF2".
      expect(font.data.toString("ascii", 0, 4)).not.toBe("wOF2");
      expect(font.data.length).toBeGreaterThan(10_000);
    }
  });

  it("caches, so the files are only read once per process", () => {
    expect(certificateAssets()).toBe(assets);
  });
});
