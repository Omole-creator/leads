// Client-side only (uses <canvas> and Image). Imported by EmailComposer.tsx.

/** The email shell is a 560px-wide div — see bodyToHtml in email-template.ts. */
export const MAX_EMAIL_IMAGE_WIDTH = 560;

/**
 * Downscale a picked image to at most MAX_EMAIL_IMAGE_WIDTH and re-encode it.
 * Three reasons this is not optional:
 *  - Outlook desktop's Word rendering engine ignores `max-width` *and* the
 *    shell's 560px cap, so a 3000px phone screenshot would render at 3000px and
 *    wreck the layout in one of the most common clients.
 *  - A 4MB screenshot would hit Vercel's ~4.5MB request-body limit.
 *  - Every recipient opening the email is Supabase egress; 4MB x 1000 opens is 4GB
 *    against a ~5GB/month free tier.
 * GIFs pass through untouched, since canvas would keep only the first frame.
 * Falls back to the original file on any failure — the server re-validates the
 * bytes either way.
 */
export async function downscaleImage(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode failed"));
      i.src = url;
    });
    if (img.naturalWidth <= MAX_EMAIL_IMAGE_WIDTH) return file;
    const canvas = document.createElement("canvas");
    canvas.width = MAX_EMAIL_IMAGE_WIDTH;
    canvas.height = Math.max(
      1,
      Math.round(
        img.naturalHeight * (MAX_EMAIL_IMAGE_WIDTH / img.naturalWidth),
      ),
    );
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Keep PNG as PNG so transparency survives; everything else becomes JPEG.
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, 0.85),
    );
    return blob ?? file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
