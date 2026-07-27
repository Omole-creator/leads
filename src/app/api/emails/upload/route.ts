import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api";
import {
  MAX_UPLOAD_BYTES,
  objectKey,
  sniffImage,
  storageEnabled,
  uploadPublicImage,
} from "@/lib/storage";

/**
 * Upload one image for the bulk email composer and return its public URL. The
 * composer inserts that URL into the message as `![alt](url)`, which rides along
 * in EmailCampaign.body — so nothing is persisted here and no table is touched.
 *
 * Multipart rather than base64-in-JSON: base64 inflates the payload ~33% against
 * Vercel's ~4.5MB request-body limit and doubles peak memory for no gain.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  if (!storageEnabled) {
    return NextResponse.json(
      {
        error:
          "Image upload is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing).",
      },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Upload must be multipart form data." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No image file received." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `Image is too large (max ${Math.round(
          MAX_UPLOAD_BYTES / 1_000_000,
        )}MB).`,
      },
      { status: 400 },
    );
  }

  // Trust the bytes, not the declared type or the extension.
  const buf = await file.arrayBuffer();
  const kind = sniffImage(new Uint8Array(buf, 0, Math.min(16, buf.byteLength)));
  if (!kind) {
    return NextResponse.json(
      { error: "Only PNG, JPEG, GIF or WebP images are allowed." },
      { status: 400 },
    );
  }

  const result = await uploadPublicImage(buf, kind.type, objectKey(kind.ext));
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ url: result.url }, { status: 201 });
}
