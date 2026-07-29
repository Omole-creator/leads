// Binary assets for the certificate renderer, read off disk once per lambda.
//
// Satori (inside `next/og`) cannot fetch a relative URL and the whole app sits
// behind auth, so the logo/signature are inlined as base64 data URIs rather than
// requested over HTTP.
//
// Fonts MUST be **static** TTF/OTF. Satori cannot decode woff2, and a VARIABLE
// font throws while its `fvar` table is parsed ("Cannot read properties of
// undefined"), which is why plain Cinzel (variable-only on Google Fonts) is not
// in `DISPLAY_FONTS`.
//
// `next.config.mjs` traces `src/assets/**` into the serverless bundle; without
// that these reads throw ENOENT in production while working fine locally.
import fs from "node:fs";
import path from "node:path";
import { displayFont, DEFAULT_DISPLAY_FONT } from "./certificate-fonts";

const assetPath = (...p: string[]) =>
  path.join(process.cwd(), "src", "assets", ...p);

const read = (...p: string[]) => fs.readFileSync(assetPath(...p));

// Keyed by display-font id: the images and body fonts are identical across
// them, but there is no point re-reading any of it per request.
const cache = new Map<string, CertificateAssets>();

export interface CertificateAssets {
  logo: string;
  signature: string;
  fonts: { name: string; data: Buffer; weight: 400 | 600 | 700; style: "normal" }[];
  /** Multiplier for the display sizes in `certificate-art.tsx`. */
  displayScale: number;
}

/**
 * Fonts + inlined images for the certificate, for the chosen display face.
 * Cached per face for the process lifetime.
 */
export function certificateAssets(
  fontId: string = DEFAULT_DISPLAY_FONT,
): CertificateAssets {
  const face = displayFont(fontId);
  const hit = cache.get(face.id);
  if (hit) return hit;

  const dataUri = (buf: Buffer) =>
    `data:image/png;base64,${buf.toString("base64")}`;

  const assets: CertificateAssets = {
    logo: dataUri(read("certificate", "logo.png")),
    signature: dataUri(read("certificate", "signature.png")),
    displayScale: face.sizeScale,
    fonts: [
      {
        name: "Poppins",
        data: read("fonts", "Poppins-Regular.ttf"),
        weight: 400,
        style: "normal",
      },
      {
        name: "Poppins",
        data: read("fonts", "Poppins-SemiBold.ttf"),
        weight: 600,
        style: "normal",
      },
      // Blackletter, used only for the "Certificate of Completion" heading.
      {
        name: "Unifraktur",
        data: read("fonts", "UnifrakturCook-Bold.ttf"),
        weight: 700,
        style: "normal",
      },
      // The name, course and date, in whichever face the admin picked.
      {
        name: "Display",
        data: read("fonts", face.file),
        weight: face.weight,
        style: "normal",
      },
    ],
  };
  cache.set(face.id, assets);
  return assets;
}
