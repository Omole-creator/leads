import { describe, it, expect } from "vitest";
import { bodyToHtml, bodyToText, renderTemplate } from "@/lib/email-template";

const IMG = "https://x.co/a.png";

describe("bodyToHtml — images", () => {
  it("renders ![alt](url) as a responsive img", () => {
    const html = bodyToHtml(`![Course chart](${IMG})`);
    expect(html).toContain(`<img src="${IMG}"`);
    expect(html).toContain('alt="Course chart"');
    expect(html).toContain("display:block");
    expect(html).toContain("max-width:100%");
    expect(html).toContain("height:auto");
  });

  it("accepts an empty alt without falling through to the link pass", () => {
    const html = bodyToHtml(`![](${IMG})`);
    expect(html).toContain('alt=""');
    expect(html).not.toContain("<a");
  });

  it("leaves no stray ! and never degrades to !<a>", () => {
    const html = bodyToHtml(`![Chart](${IMG})`);
    expect(html).not.toContain("!<a");
    expect(html).not.toContain("!<img");
    expect(html).not.toContain("![");
  });

  // Regression guard: this fails if the image pass is ever "simplified" to emit
  // the <img> inline instead of holding it behind a placeholder — the bare-URL
  // autolinker then re-links the URL inside src="…" and corrupts the tag.
  it("is not touched by the bare-URL autolinker", () => {
    const html = bodyToHtml(`![Chart](${IMG})`);
    expect(html).not.toContain("<a href");
    expect(html).toContain(`src="${IMG}"`);
  });

  it("neutralises a double quote in the URL so it cannot start an attribute", () => {
    const html = bodyToHtml(`![x](https://x.co/a"onerror=alert(1))`);
    expect(html).not.toMatch(/"\s*onerror/);
    expect(html).toContain("&quot;");
  });

  it("keeps a query string intact as an HTML entity", () => {
    const html = bodyToHtml("![q](https://x.co/a.png?w=1&h=2)");
    expect(html).toContain("&amp;h=2");
  });

  it("strips bold markers out of the alt attribute", () => {
    const html = bodyToHtml(`![**bold alt**](${IMG})`);
    expect(html).toContain('alt="bold alt"');
    expect(html).not.toMatch(/alt="[^"]*<strong>/);
  });

  it("handles an image, a markdown link and a bare URL on one line", () => {
    const html = bodyToHtml(
      `Look ![a](https://x.co/1.png) then [IG](https://ig.com/x) and https://jobmingle.co here`,
    );
    expect(html.match(/<img/g)).toHaveLength(1);
    expect(html.match(/<a href/g)).toHaveLength(2);
    // The IG link shows only its label; its naked URL stays hidden.
    expect(html).toContain(">IG</a>");
    expect(html).not.toContain(">https://ig.com/x</a>");
  });

  it("keeps the per-line paragraph wrapper around an image-only line", () => {
    expect(bodyToHtml(`![Chart](${IMG})`)).toContain(
      '<p style="margin:0 0 12px"><img',
    );
  });
});

describe("bodyToHtml — no regressions", () => {
  it("still bolds, breaks blank lines and hides link URLs", () => {
    const html = bodyToHtml("**Bold** stays\n\n[Instagram](https://ig.com/jm)");
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<br/>");
    expect(html).toContain(">Instagram</a>");
    expect(html).not.toContain(">https://ig.com/jm</a>");
  });

  it("still autolinks a bare www. URL and keeps trailing punctuation outside", () => {
    const html = bodyToHtml("See www.jobmingle.co.");
    expect(html).toContain('href="https://www.jobmingle.co"');
    expect(html).toContain("</a>.");
  });

  it("escapes a double quote in ordinary body copy", () => {
    expect(bodyToHtml('He said "hi"')).toContain("&quot;hi&quot;");
  });
});

describe("bodyToText", () => {
  it("flattens an image to [image: alt] url, not !alt (url)", () => {
    const text = bodyToText(`![Chart](${IMG})`);
    expect(text).toBe(`[image: Chart] ${IMG}`);
    expect(text).not.toContain("!Chart");
  });

  it("flattens an image with no alt", () => {
    expect(bodyToText(`![](${IMG})`)).toBe(`[image] ${IMG}`);
  });

  it("flattens links and drops bold markers, in order", () => {
    expect(
      bodyToText(
        `**Hi** ![Chart](${IMG}) see [IG](https://ig.com/x) and ![](https://x.co/b.png)`,
      ),
    ).toBe(
      `Hi [image: Chart] ${IMG} see IG (https://ig.com/x) and [image] https://x.co/b.png`,
    );
  });

  it("leaves marker-free text untouched", () => {
    expect(bodyToText("Plain sentence, nothing to do.")).toBe(
      "Plain sentence, nothing to do.",
    );
  });

  // Locks in that extracting this helper did not change what already-sent
  // campaigns produced for bold + links (the only markers in use before images).
  it("matches the previous inline flattening for bold and links", () => {
    const input = "**Pay** via [Zenith](https://zenith.com/x) today";
    const previous = input
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)");
    expect(bodyToText(input)).toBe(previous);
  });
});

describe("renderTemplate", () => {
  it("substitutes known tokens and blanks unknown ones", () => {
    expect(renderTemplate("Hi {{firstName}}, {{nope}}done", { firstName: "Ada" })).toBe(
      "Hi Ada, done",
    );
  });

  // Pins the pre-fallback behaviour: adding `|fallback` support must not change
  // what the welcome / certificate / scholarship templates already produce.
  it("still blanks a pipe-less token whose value is empty or missing", () => {
    expect(renderTemplate("[{{a}}]", { a: "" })).toBe("[]");
    expect(renderTemplate("[{{a}}]", {})).toBe("[]");
    expect(renderTemplate("[{{a}}]", { a: "x" })).toBe("[x]");
  });

  it("uses the fallback when the value is missing, empty or whitespace", () => {
    expect(renderTemplate("Hi {{first_name|there}},", {})).toBe("Hi there,");
    expect(renderTemplate("Hi {{first_name|there}},", { first_name: "" })).toBe(
      "Hi there,",
    );
    expect(
      renderTemplate("Hi {{first_name|there}},", { first_name: "   " }),
    ).toBe("Hi there,");
  });

  it("prefers the real value over the fallback", () => {
    expect(
      renderTemplate("Hi {{first_name|there}},", { first_name: "Sarah" }),
    ).toBe("Hi Sarah,");
  });

  it("supports a multi-word fallback and tolerates spacing", () => {
    expect(renderTemplate("{{ company | your team }}", {})).toBe("your team");
  });

  it("leaves a pipe in ordinary body text alone", () => {
    expect(renderTemplate("a | b", {})).toBe("a | b");
  });
});

describe("bodyToHtml — footer", () => {
  it("keeps the course-enquiry footer when no shell is passed", () => {
    expect(bodyToHtml("Hello")).toContain(
      "You're receiving this because you enquired about JobMingle Academy.",
    );
  });

  it("swaps in a supplied footer", () => {
    const html = bodyToHtml("Hello", { footer: "JobMingle Limited<br/>Lagos" });
    expect(html).toContain("JobMingle Limited<br/>Lagos");
    expect(html).not.toContain("enquired about JobMingle Academy");
  });
});
