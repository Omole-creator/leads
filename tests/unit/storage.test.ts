import { describe, it, expect, beforeEach, vi } from "vitest";
import { objectKey, sniffImage } from "@/lib/storage";

const bytes = (...b: number[]) => new Uint8Array(b);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
const GIF = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
const WEBP = bytes(
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
);

describe("sniffImage", () => {
  it("identifies the four allowed formats by magic bytes", () => {
    expect(sniffImage(PNG)).toEqual({ type: "image/png", ext: "png" });
    expect(sniffImage(JPEG)).toEqual({ type: "image/jpeg", ext: "jpg" });
    expect(sniffImage(GIF)).toEqual({ type: "image/gif", ext: "gif" });
    expect(sniffImage(WEBP)).toEqual({ type: "image/webp", ext: "webp" });
  });

  it("rejects SVG — it can carry script and would be served from a public URL", () => {
    expect(sniffImage(new TextEncoder().encode("<svg xmlns="))).toBeNull();
  });

  it("rejects a text file, a truncated buffer and RIFF that is not WebP", () => {
    expect(sniffImage(new TextEncoder().encode("full name,email\n"))).toBeNull();
    expect(sniffImage(bytes(0x89, 0x50))).toBeNull();
    // RIFF container but AVI, not WEBP, at offset 8.
    expect(
      sniffImage(
        bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20),
      ),
    ).toBeNull();
  });
});

describe("objectKey", () => {
  it("partitions by UTC year/month and ends with the sniffed extension", () => {
    expect(objectKey("png", new Date("2026-07-27T00:00:00Z"))).toMatch(
      /^email\/2026\/07\/[0-9a-f-]{36}\.png$/,
    );
  });

  it("is unique per call, so an upload can never overwrite an earlier image", () => {
    expect(objectKey("jpg")).not.toBe(objectKey("jpg"));
  });
});

describe("publicUrl", () => {
  // SUPABASE_URL / the bucket are read at module scope, so re-import per case.
  beforeEach(() => vi.resetModules());

  it("composes the public object path", async () => {
    process.env.SUPABASE_URL = "https://ref.supabase.co";
    process.env.SUPABASE_STORAGE_BUCKET = "email-assets";
    const { publicUrl } = await import("@/lib/storage");
    expect(publicUrl("email/2026/07/x.png")).toBe(
      "https://ref.supabase.co/storage/v1/object/public/email-assets/email/2026/07/x.png",
    );
  });

  it("does not double the slash when SUPABASE_URL has a trailing one", async () => {
    process.env.SUPABASE_URL = "https://ref.supabase.co/";
    process.env.SUPABASE_STORAGE_BUCKET = "email-assets";
    const { publicUrl } = await import("@/lib/storage");
    expect(publicUrl("email/x.png")).toBe(
      "https://ref.supabase.co/storage/v1/object/public/email-assets/email/x.png",
    );
  });
});

describe("storageEnabled", () => {
  beforeEach(() => vi.resetModules());

  it("is false without the service key, so the route answers with a config error", async () => {
    process.env.SUPABASE_URL = "https://ref.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { storageEnabled } = await import("@/lib/storage");
    expect(storageEnabled).toBe(false);
  });

  it("is true once both vars are set", async () => {
    process.env.SUPABASE_URL = "https://ref.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    const { storageEnabled } = await import("@/lib/storage");
    expect(storageEnabled).toBe(true);
  });
});
