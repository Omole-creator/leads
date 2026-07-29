import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api";
import { certificateRenderSchema } from "@/lib/schemas";
import { certificateFileName } from "@/lib/certificate";
import { renderCertificatePng } from "@/lib/certificate-render";
import { pngToLandscapePdf } from "@/lib/pdf";

// Node runtime: the renderer reads fonts off disk and pdf-lib is a Node module.
export const dynamic = "force-dynamic";

/**
 * Admin: render a certificate as PNG or PDF from the (editable) field values.
 * Takes no lead id — this route only draws what it is given, so it doubles as
 * the live preview in the certificate dialog.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const parsed = certificateRenderSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const { format, download, ...fields } = parsed.data;

  const png = await renderCertificatePng(fields);
  const body = format === "pdf" ? await pngToLandscapePdf(png) : png;
  const stem = certificateFileName(fields.name);

  return new NextResponse(Buffer.from(body), {
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "image/png",
      "Content-Disposition": `${download === "1" ? "attachment" : "inline"}; filename="${stem}.${format}"`,
      // The image is derived entirely from the query string, so it is safe to
      // cache in the browser while the dialog is open.
      "Cache-Control": "private, max-age=60",
    },
  });
}
