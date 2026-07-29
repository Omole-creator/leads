// The display faces offered for the certificate's name, course and date.
//
// Pure data (no `fs`) so both the client dropdown and the server-side asset
// loader can import it. Every file here must be a STATIC TTF: satori cannot
// decode woff2 and throws parsing a variable font's `fvar` table, which is why
// plain Cinzel (variable-only on Google Fonts) is absent and its Decorative cut
// is used instead. `tests/unit/certificate-assets.test.ts` enforces that.

export interface DisplayFont {
  id: string;
  /** Shown in the Font dropdown. */
  label: string;
  file: string;
  /** The weight the file actually contains, for satori's font registration. */
  weight: 400 | 700;
  /**
   * Sizes in `certificate-art.tsx` are calibrated against Cinzel Decorative,
   * the widest of these faces. Narrower faces can be set a little larger and
   * still clear the rule, so each one carries its own multiplier.
   */
  sizeScale: number;
}

export const DISPLAY_FONTS: DisplayFont[] = [
  {
    id: "cinzel-decorative",
    label: "Cinzel Decorative (default)",
    file: "CinzelDecorative-Bold.ttf",
    weight: 700,
    sizeScale: 1,
  },
  {
    id: "marcellus-sc",
    label: "Marcellus SC",
    file: "MarcellusSC-Regular.ttf",
    weight: 400,
    sizeScale: 1.1,
  },
  {
    id: "marcellus",
    label: "Marcellus",
    file: "Marcellus-Regular.ttf",
    weight: 400,
    sizeScale: 1.1,
  },
  {
    id: "spectral",
    label: "Spectral",
    file: "Spectral-Bold.ttf",
    weight: 700,
    sizeScale: 1.05,
  },
  {
    id: "blackletter",
    label: "Blackletter (matches the heading)",
    file: "UnifrakturCook-Bold.ttf",
    weight: 700,
    sizeScale: 1.08,
  },
];

export const DISPLAY_FONT_IDS = DISPLAY_FONTS.map((f) => f.id) as [
  string,
  ...string[],
];

export const DEFAULT_DISPLAY_FONT = "cinzel-decorative";

/** The chosen face, falling back to the default for an unknown id. */
export function displayFont(id: string | undefined): DisplayFont {
  return (
    DISPLAY_FONTS.find((f) => f.id === id) ??
    DISPLAY_FONTS.find((f) => f.id === DEFAULT_DISPLAY_FONT)!
  );
}
