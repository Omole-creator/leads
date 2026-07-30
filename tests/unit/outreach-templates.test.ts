import { describe, it, expect } from "vitest";
import {
  OUTREACH_VARIANTS,
  outreachVariant,
  outreachFooter,
} from "@/lib/outreach-templates";
import {
  OUTREACH_REQUIREMENTS,
  OUTREACH_TOKENS,
  OUTREACH_VARIANT_IDS,
} from "@/lib/outreach-constants";
import { renderTemplate } from "@/lib/email-template";

const TOKEN_RE = /\{\{\s*(\w+)\s*(\|[^}]*)?\}\}/g;

const tokensIn = (s: string) =>
  [...s.matchAll(TOKEN_RE)].map((m) => ({
    name: m[1],
    hasFallback: m[2] !== undefined,
  }));

describe("OUTREACH_VARIANTS", () => {
  it("has all four variants with copy in them", () => {
    expect(OUTREACH_VARIANTS.map((v) => v.id)).toEqual([
      ...OUTREACH_VARIANT_IDS,
    ]);
    for (const v of OUTREACH_VARIANTS) {
      expect(v.subject.trim().length).toBeGreaterThan(0);
      expect(v.body.trim().length).toBeGreaterThan(0);
    }
  });

  // A token typo would reach a real prospect as literal braces.
  it("only uses tokens we actually supply", () => {
    for (const v of OUTREACH_VARIANTS) {
      for (const t of [...tokensIn(v.subject), ...tokensIn(v.body)]) {
        expect(
          OUTREACH_TOKENS as readonly string[],
          `${v.id} uses unknown token {{${t.name}}}`,
        ).toContain(t.name);
      }
    }
  });

  // The reason the fallback syntax exists: contacts come from ragged CSVs.
  it("gives every token a fallback", () => {
    for (const v of OUTREACH_VARIANTS) {
      for (const t of [...tokensIn(v.subject), ...tokensIn(v.body)]) {
        expect(t.hasFallback, `${v.id}: {{${t.name}}} has no |fallback`).toBe(
          true,
        );
      }
    }
  });

  it("reads cleanly for a contact where we know nothing", () => {
    for (const v of OUTREACH_VARIANTS) {
      const subject = renderTemplate(v.subject, {});
      const body = renderTemplate(v.body, {});
      for (const out of [subject, body]) {
        expect(out).not.toContain("{{");
        expect(out).not.toContain("}}");
        expect(out).not.toMatch(/[^\n] {2,}/); // no gap left by a blank value
        expect(out).not.toMatch(/^[,.]/m); // no line orphaned onto punctuation
        expect(out).not.toMatch(/\s+[,.]/); // no " ," or " ."
      }
    }
  });

  it("only requires real requirement ids", () => {
    for (const v of OUTREACH_VARIANTS) {
      for (const r of v.requires) {
        expect(OUTREACH_REQUIREMENTS as readonly string[]).toContain(r);
      }
    }
  });

  it("looks a variant up by id", () => {
    expect(outreachVariant("A")?.id).toBe("A");
    expect(outreachVariant("Z")).toBeUndefined();
  });
});

describe("outreachFooter", () => {
  it("carries the company name and address", () => {
    const f = outreachFooter();
    expect(f).toContain("JobMingle Limited");
    expect(f).toContain("49/51 Mumunie Street, Lagos, Nigeria");
  });

  it("links the unsubscribe when a URL is given, plain text otherwise", () => {
    expect(outreachFooter("https://x.co/u")).toContain(
      '<a href="https://x.co/u"',
    );
    expect(outreachFooter()).toContain("Unsubscribe");
    expect(outreachFooter()).not.toContain("<a");
  });
});
