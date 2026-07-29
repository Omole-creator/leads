// The certificate artwork, as a satori-compatible element tree.
//
// Layout follows the reference certificate (centred stack, thin rules with dot
// terminals, "Issued on" block, the achievement statement, signature block).
// The blackletter face is kept for the heading only: it was tried on the name,
// course and date too and was too hard to read, so those use a decorative but
// legible face ("Display" = Cinzel Decorative Bold). The EDGES are JobMingle's
// own: the
// gold/black corner waves, the black ornamental corner brackets and the faint
// "M" watermark are re-authored here as vector SVG, because the original
// artwork only exists as a flat PNG with text baked into it.
//
// Satori quirks this file has to respect:
//  - every element with more than one child needs an explicit `display: flex`;
//  - `flex: 1` shorthand is unreliable, use `flexGrow`;
//  - images need explicit width AND height;
//  - there is no auto-shrink-to-fit, so long names/courses are stepped down in
//    `fitSize()` below.
import type { CertificateFields } from "./certificate";
import { certificateStatement } from "./certificate";
import type { CertificateAssets } from "./certificate-assets";

/** √2 landscape, so the PNG maps onto an A4 landscape PDF page with no crop. */
export const CERT_WIDTH = 2000;
export const CERT_HEIGHT = 1414;

const INK = "#1A1208";
const MUTED = "#4A4238";
const RULE = "#8A5A2B";

/**
 * The decorative frame: gold/black waves top-right + bottom-left, ornamental
 * black brackets top-left + bottom-right, faint centre watermark.
 * Coordinates hug the corners so the centred content column stays clear of them.
 */
function frameSvg(): string {
  // One corner bracket: a heavy outer rule, a fine inner rule, and a pair of
  // mirrored scrolls curling out of the corner. Inset from the trim edge.
  const ornament = `
    <g transform="translate(52 52)" stroke="#0A0A0A" fill="none">
      <path d="M 0 0 L 430 0" stroke-width="6" stroke-linecap="square" />
      <path d="M 0 0 L 0 430" stroke-width="6" stroke-linecap="square" />
      <path d="M 24 24 L 262 24" stroke-width="2" />
      <path d="M 24 24 L 24 262" stroke-width="2" />
      <path d="M 52 156 C 52 106 94 74 136 74 C 170 74 186 100 170 121
               C 156 139 131 135 131 115 C 131 102 142 96 151 101"
            stroke-width="4" stroke-linecap="round" />
      <path d="M 156 52 C 106 52 74 94 74 136 C 74 170 100 186 121 170
               C 139 156 135 131 115 131 C 102 131 96 142 101 151"
            stroke-width="4" stroke-linecap="round" />
    </g>`;

  // One corner wave, drawn for the TOP-RIGHT and mirrored for the bottom-left.
  const wave = `
    <g>
      <path d="M 1500 0 C 1660 40 1780 130 1900 200 C 1950 230 1975 255 2000 300
               L 2000 0 Z" fill="#0A0A0A" />
      <path d="M 1400 0 C 1590 50 1730 160 1870 240 C 1930 275 1965 305 2000 365
               L 2000 300 C 1975 255 1950 230 1900 200 C 1780 130 1660 40 1500 0 Z"
            fill="url(#gold)" />
      <path d="M 1480 0 C 1660 80 1790 210 1900 320 C 1945 364 1975 400 2000 452"
            fill="none" stroke="url(#gold)" stroke-width="7" stroke-linecap="round" />
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CERT_WIDTH}" height="${CERT_HEIGHT}" viewBox="0 0 ${CERT_WIDTH} ${CERT_HEIGHT}">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7A5A18" />
      <stop offset="35%" stop-color="#F3D98B" />
      <stop offset="65%" stop-color="#C9992E" />
      <stop offset="100%" stop-color="#8C6A1F" />
    </linearGradient>
  </defs>
  <rect width="${CERT_WIDTH}" height="${CERT_HEIGHT}" fill="#FFFFFF" />
  <polygon points="0,1414 640,1414 1560,0 920,0" fill="#0A0A0A" opacity="0.018" />
  <polygon points="700,1414 980,1414 1900,0 1620,0" fill="#0A0A0A" opacity="0.013" />
  <g transform="translate(1000 707) scale(3.1) translate(-100 -100)" opacity="0.05">
    <path d="M 20 175 L 68 25 L 100 108 L 132 25 L 180 175 L 148 175 L 126 105
             L 100 158 L 74 105 L 52 175 Z" fill="#FFD400" />
  </g>
  ${wave}
  <g transform="rotate(180 1000 707)">${wave}</g>
  ${ornament}
  <g transform="rotate(180 1000 707)">${ornament}</g>
</svg>`;
}

/** The frame as a data URI. Built once — the SVG has no per-certificate state. */
const FRAME_URI = `data:image/svg+xml;base64,${Buffer.from(frameSvg()).toString("base64")}`;

/**
 * Satori cannot shrink text to fit, so step the size down for long strings.
 * Sizes are ordered longest-fitting-last and keyed off length alone, which is a
 * rough proxy for width but enough to keep even a very long Nigerian full name
 * inside the 1300px rule.
 */
function fitSize(
  text: string,
  sizes: [number, number, number, number],
): number {
  if (text.length > 36) return sizes[3];
  if (text.length > 30) return sizes[2];
  if (text.length > 20) return sizes[1];
  return sizes[0];
}

function Rule({ width }: { width: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width,
        marginTop: 26,
      }}
    >
      <div
        style={{ width: 13, height: 13, borderRadius: 7, background: RULE }}
      />
      <div style={{ flexGrow: 1, height: 2, background: RULE }} />
      <div
        style={{ width: 13, height: 13, borderRadius: 7, background: RULE }}
      />
    </div>
  );
}

/** The full certificate element tree, ready to hand to `ImageResponse`. */
export function certificateElement(
  fields: CertificateFields,
  assets: CertificateAssets,
) {
  const name = fields.name.trim().toUpperCase();
  const course = fields.course.trim();
  // Sizes below are calibrated against the widest display face; a narrower one
  // is scaled up so it still fills the rule.
  const scale = (n: number) => Math.round(n * assets.displayScale);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: CERT_WIDTH,
        height: CERT_HEIGHT,
        backgroundColor: "#FFFFFF",
        fontFamily: "Poppins",
        color: INK,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={FRAME_URI}
        alt=""
        width={CERT_WIDTH}
        height={CERT_HEIGHT}
        style={{ position: "absolute", top: 0, left: 0 }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: CERT_WIDTH,
          height: CERT_HEIGHT,
          paddingTop: 78,
          paddingBottom: 64,
          paddingLeft: 250,
          paddingRight: 250,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assets.logo} alt="JobMingle" width={158} height={157} />

        <div
          style={{
            fontFamily: "Unifraktur",
            fontSize: 78,
            letterSpacing: 1,
            marginTop: 2,
          }}
        >
          Certificate of Completion
        </div>

        <div
          style={{
            fontSize: 25,
            fontWeight: 600,
            letterSpacing: 9,
            color: MUTED,
            marginTop: 10,
          }}
        >
          JOBMINGLE ACADEMY
        </div>

        <div style={{ fontSize: 26, color: MUTED, marginTop: 40 }}>
          Has Awarded
        </div>

        <div
          style={{
            fontFamily: "Display",
            fontSize: scale(fitSize(name, [70, 56, 44, 37])),
            letterSpacing: 5,
            marginTop: 12,
          }}
        >
          {name}
        </div>

        <Rule width={1300} />

        <div style={{ fontSize: 26, color: MUTED, marginTop: 26 }}>
          For the successful completion of the
        </div>

        <div
          style={{
            fontFamily: "Display",
            fontSize: scale(fitSize(course, [50, 44, 37, 32])),
            letterSpacing: 4,
            marginTop: 10,
          }}
        >
          {course}
        </div>

        <Rule width={1300} />

        <div style={{ fontSize: 26, color: MUTED, marginTop: 26 }}>Issued on</div>

        <div
          style={{
            fontFamily: "Display",
            fontSize: scale(42),
            letterSpacing: 4,
            marginTop: 8,
          }}
        >
          {fields.issuedOn}
        </div>

        <Rule width={1300} />

        <div
          style={{
            width: 1240,
            marginTop: 26,
            fontSize: 24,
            lineHeight: 1.6,
            textAlign: "center",
            color: MUTED,
          }}
        >
          {certificateStatement(fields.industry)}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 34,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assets.signature}
            alt="Signature"
            width={300}
            height={99}
            style={{ marginBottom: 6 }}
          />
          <div style={{ width: 380, height: 2, background: INK }} />
          <div style={{ fontSize: 26, fontWeight: 600, marginTop: 12 }}>
            Omole Usuangbon
          </div>
          <div style={{ fontSize: 20, color: MUTED, marginTop: 2 }}>
            Founder, JobMingle
          </div>
        </div>
      </div>
    </div>
  );
}
