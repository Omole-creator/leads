// Binary assets for the certificate renderer, read off disk once per lambda.
//
// Satori (inside `next/og`) cannot fetch a relative URL and the whole app sits
// behind auth, so the logo/signature are inlined as base64 data URIs rather than
// requested over HTTP. Fonts MUST be TTF/OTF — satori cannot decode woff2.
//
// `next.config.mjs` traces `src/assets/**` into the serverless bundle; without
// that these reads throw ENOENT in production while working fine locally.
import fs from "node:fs";
import path from "node:path";

const assetPath = (...p: string[]) =>
  path.join(process.cwd(), "src", "assets", ...p);

const read = (...p: string[]) => fs.readFileSync(assetPath(...p));

let cached: CertificateAssets | null = null;

export interface CertificateAssets {
  logo: string;
  signature: string;
  fonts: { name: string; data: Buffer; weight: 400 | 600 | 700; style: "normal" }[];
}

/** Fonts + inlined images for the certificate. Cached for the process lifetime. */
export function certificateAssets(): CertificateAssets {
  if (cached) return cached;

  const dataUri = (buf: Buffer) =>
    `data:image/png;base64,${buf.toString("base64")}`;

  cached = {
    logo: dataUri(read("certificate", "logo.png")),
    signature: dataUri(read("certificate", "signature.png")),
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
      {
        name: "Unifraktur",
        data: read("fonts", "UnifrakturCook-Bold.ttf"),
        weight: 700,
        style: "normal",
      },
    ],
  };
  return cached;
}
