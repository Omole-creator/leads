// Image upload for the bulk email composer, over Supabase Storage's plain REST
// API. Deliberately no @supabase/supabase-js: it is a heavy dependency to add to
// a serverless bundle for a single upload call.
//
// SERVER ONLY — reads SUPABASE_SERVICE_ROLE_KEY at module scope. Never import
// this from a "use client" module (email-template.ts stays pure for that reason).

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "email-assets";

/** Mirrors `emailEnabled`: false means the route answers with a config error. */
export const storageEnabled = !!(SUPABASE_URL && SERVICE_KEY);

// Vercel rejects a serverless request body over ~4.5MB before our handler even
// runs, so cap below that. Images are downscaled client-side first, so a real
// upload is normally well under 200KB.
export const MAX_UPLOAD_BYTES = 4_000_000;

/**
 * Identify an image by its magic bytes. Both `file.type` and the filename
 * extension are supplied by the client, so neither is trusted — the stored
 * content type and the object's extension both come from here.
 * SVG is deliberately absent: it can carry script and would be served from a
 * public URL.
 */
export function sniffImage(b: Uint8Array): { type: string; ext: string } | null {
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47
  ) {
    return { type: "image/png", ext: "png" };
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { type: "image/jpeg", ext: "jpg" };
  }
  if (
    b.length >= 6 &&
    b[0] === 0x47 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x38
  ) {
    return { type: "image/gif", ext: "gif" };
  }
  if (
    b.length >= 12 &&
    b[0] === 0x52 && // R
    b[1] === 0x49 && // I
    b[2] === 0x46 && // F
    b[3] === 0x46 && // F
    b[8] === 0x57 && // W
    b[9] === 0x45 && // E
    b[10] === 0x42 && // B
    b[11] === 0x50 // P
  ) {
    return { type: "image/webp", ext: "webp" };
  }
  return null;
}

/**
 * Collision-proof object key, e.g. "email/2026/07/<uuid>.png". The admin's
 * filename is never reused, so there is nothing to sanitize: no path traversal,
 * no unicode surprises, and no chance of overwriting an earlier image.
 */
export function objectKey(ext: string, now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `email/${year}/${month}/${crypto.randomUUID()}.${ext}`;
}

export function publicUrl(key: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`;
}

/**
 * Upload to the public bucket. Never throws — returns a flat error sentence in
 * the same shape the API routes hand back to the client.
 */
export async function uploadPublicImage(
  body: ArrayBuffer,
  contentType: string,
  key: string,
): Promise<{ url: string } | { error: string }> {
  if (!storageEnabled) {
    return {
      error:
        "Image upload is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing).",
    };
  }
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": contentType,
        // Keys are immutable UUIDs and every recipient opening an old email is
        // billable egress, so cache for a year.
        "cache-control": "max-age=31536000",
        "x-upsert": "false",
      },
      body,
      cache: "no-store",
    });
  } catch (err) {
    console.error("[storage] upload threw:", err);
    return { error: "Could not reach image storage. Try again." };
  }
  if (!res.ok) {
    // Log the response body server-side only, and never the service key.
    console.error(
      "[storage] upload failed:",
      res.status,
      await res.text().catch(() => ""),
    );
    return {
      error:
        res.status === 404
          ? `Storage bucket "${BUCKET}" not found — create it as a public bucket in the Supabase dashboard.`
          : "Image upload failed. Check the Supabase storage settings.",
    };
  }
  return { url: publicUrl(key) };
}
