import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/outreach-unsubscribe";

// Public on purpose: the recipient is a company contact with no account. The
// HMAC keeps it from becoming "unsubscribe anyone by guessing an id". Exempted
// from auth in src/middleware.ts.

const page = (title: string, message: string) =>
  `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#0A0A0A;line-height:1.5">
  <div style="max-width:480px;margin:64px auto;padding:24px;border-top:4px solid #FFD400">
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    <p style="margin:0;color:#444">${message}</p>
  </div>
</body></html>`;

const html = (body: string, status: number) =>
  new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const id = sp.get("c") ?? "";
  const token = sp.get("t") ?? "";

  if (!id || !verifyUnsubscribeToken(id, token)) {
    return html(
      page("That link is not valid", "Please reply to the email and we will take you off the list."),
      400,
    );
  }

  const contact = await prisma.companyContact
    .update({ where: { id }, data: { unsubscribed: true } })
    .catch(() => null);

  if (!contact) {
    return html(
      page("Nothing to do", "We could not find that address, so it will not be emailed again."),
      200,
    );
  }

  return html(
    page(
      "You're unsubscribed",
      `We won't email ${contact.email} again. Sorry for the interruption.`,
    ),
    200,
  );
}
