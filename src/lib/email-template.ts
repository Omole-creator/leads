// Replace {{name}}, {{firstName}}, {{track}} (etc.) placeholders in a template.
export function renderTemplate(
  tpl: string,
  vars: Record<string, string>,
): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Wrap a plain-text body into a simple branded HTML email. */
export function bodyToHtml(text: string): string {
  const inner = escapeHtml(text)
    .split("\n")
    .map((l) => (l.trim() === "" ? "<br/>" : `<p style="margin:0 0 12px">${l}</p>`))
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

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
