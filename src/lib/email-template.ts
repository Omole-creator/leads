// Replace {{name}}, {{firstName}}, {{track}} (etc.) placeholders in a template.
export function renderTemplate(
  tpl: string,
  vars: Record<string, string>,
): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? "");
}

// The double quote is escaped too: every URL we interpolate lands inside a
// double-quoted src/href, and a URL containing `"` would otherwise close that
// attribute and let the next characters start a new one (e.g. `onerror=`). The
// composer's preview <iframe srcDoc> has no sandbox attribute, so it is
// same-origin with /admin/email — that would be a real injection path, not just
// a broken tag. `&quot;` renders as `"` in body copy, so text is unaffected.
// Single quotes need no escaping: every attribute we emit is double-quoted.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert **bold** markers to <strong> (run after escaping so tags survive). */
function boldify(line: string): string {
  return line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

const anchor = (href: string, label: string) =>
  `<a href="${href}" style="color:#1D4ED8">${label}</a>`;

// `display:block` removes the ~4px inline-descender gap Gmail and Outlook leave
// under an image; `border:0` suppresses Outlook's blue border when an image sits
// inside a link. Note that Outlook desktop's Word engine ignores `max-width`
// entirely, so the real width cap happens at upload time (see image-resize.ts).
const image = (src: string, alt: string) =>
  `<img src="${src}" alt="${alt}" style="display:block;max-width:100%;height:auto;border:0" />`;

/**
 * Render inline markdown in a line (run after escaping, before boldify):
 *  - `![alt](url)` becomes a responsive <img>; the alt may be empty.
 *  - markdown `[label](url)` becomes a link whose visible text is the label, so
 *    the raw URL stays hidden.
 *  - any remaining bare http(s):// or www. URL is auto-linked.
 * Images and links are both pulled out behind \x00-delimited placeholders, and
 * the order matters twice. Images must go first, or the link pass would degrade
 * `![a](u)` into `!<a>a</a>`. And both must be *held*, never emitted inline, or
 * the bare-URL pass re-links the URL sitting inside the src="…"/href="…" it just
 * wrote — `[^\s<]+` swallows the closing quote and corrupts the whole tag.
 * Trailing sentence punctuation stays outside a link.
 */
function renderLinks(line: string): string {
  const held: string[] = [];
  let s = line.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, alt: string, url: string) =>
      // Drop `*` from the alt text: boldify() runs after the placeholders are
      // substituted back in and would otherwise inject <strong> inside alt="".
      `\x00${held.push(image(url, alt.replace(/\*/g, "").trim())) - 1}\x00`,
  );
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, label: string, url: string) =>
      `\x00${held.push(anchor(url, label)) - 1}\x00`,
  );
  s = s.replace(
    /(https?:\/\/[^\s<]+|www\.[^\s<]+?)([.,;:!?)]*)(?=\s|$)/g,
    (_m, url: string, trail: string) =>
      anchor(url.startsWith("http") ? url : `https://${url}`, url) + trail,
  );
  return s.replace(/\x00(\d+)\x00/g, (_m, i: string) => held[Number(i)]);
}

/** Wrap a plain-text body into a simple branded HTML email. */
export function bodyToHtml(text: string): string {
  const inner = escapeHtml(text)
    .split("\n")
    .map((l) =>
      l.trim() === ""
        ? "<br/>"
        : `<p style="margin:0 0 12px">${boldify(renderLinks(l))}</p>`,
    )
    .join("");
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#0A0A0A;line-height:1.5">
  <div style="max-width:560px;margin:0 auto;padding:20px">
    <div style="border-top:4px solid #FFD400;padding-top:16px">${inner}</div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
    <p style="font-size:12px;color:#888;margin:0">
      You're receiving this because you enquired about JobMingle Academy.
    </p>
  </div></body></html>`;
}

/**
 * Flatten the template markers for the plain-text alternative part of an email.
 * Images become "[image: alt] url" so a text-only client can still reach them,
 * links become "label (url)", and the **bold** markers are dropped. The image
 * pass has to run before the link pass, or `![a](u)` flattens to a stray "!a (u)".
 * Shared by the bulk send route and the welcome email so the two can't drift.
 */
export function bodyToText(text: string): string {
  return text
    .replace(
      /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
      (_m, alt: string, url: string) =>
        alt.trim() ? `[image: ${alt.trim()}] ${url}` : `[image] ${url}`,
    )
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)")
    .replace(/\*\*(.+?)\*\*/g, "$1");
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
