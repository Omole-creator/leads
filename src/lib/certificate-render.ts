// Server-side certificate renderer. Both the download route and the email send
// route go through here, so the preview the admin sees and the file the student
// receives are produced by exactly the same code path.
import { ImageResponse } from "next/og";
import type { CertificateFields } from "./certificate";
import { certificateAssets } from "./certificate-assets";
import {
  certificateElement,
  CERT_WIDTH,
  CERT_HEIGHT,
} from "./certificate-art";

export async function renderCertificatePng(
  fields: CertificateFields,
): Promise<Uint8Array> {
  const assets = certificateAssets(fields.font);
  const res = new ImageResponse(certificateElement(fields, assets), {
    width: CERT_WIDTH,
    height: CERT_HEIGHT,
    fonts: assets.fonts.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight,
      style: f.style,
    })),
  });
  return new Uint8Array(await res.arrayBuffer());
}
