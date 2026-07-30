import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { outreachSendSchema } from "@/lib/schemas";
import { sendBulkEmails, emailEnabled, type OutgoingEmail } from "@/lib/email";
import { renderTemplate, bodyToHtml, bodyToText } from "@/lib/email-template";
import { senderName } from "@/lib/outreach-constants";
import { outreachFooter } from "@/lib/outreach-templates";
import { unsubscribeUrl } from "@/lib/outreach-unsubscribe";
import { outreachVars, outreachWhere, toOutreachFilters } from "@/lib/outreach";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  if (!emailEnabled) {
    return NextResponse.json(
      { error: "Email is not configured (RESEND_API_KEY missing)." },
      { status: 400 },
    );
  }

  const parsed = outreachSendSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const { subject: subjectTpl, body: bodyTpl, contactIds, filters } = parsed.data;

  const contacts = await prisma.companyContact.findMany({
    where: outreachWhere({
      ...toOutreachFilters(filters),
      // Unsubscribed contacts are never reachable from here, whatever the
      // draft was saved with.
      includeUnsubscribed: false,
      onlyIds: contactIds?.length ? contactIds : undefined,
    }),
  });

  const seen = new Set<string>();
  const messages: OutgoingEmail[] = [];
  const sentIds: string[] = [];
  for (const c of contacts) {
    const to = c.email.toLowerCase().trim();
    if (!to || seen.has(to)) continue;
    seen.add(to);

    // Tokens are substituted BEFORE bodyToHtml, so CSV-sourced values (company
    // names, personalization notes) go through escapeHtml. Building the HTML
    // first and substituting after would be an injection path, and the
    // composer's preview iframe has no sandbox.
    const vars = outreachVars(c);
    const rendered = renderTemplate(bodyTpl, vars);
    messages.push({
      to: c.email,
      subject: renderTemplate(subjectTpl, vars),
      text: bodyToText(rendered),
      html: bodyToHtml(rendered, { footer: outreachFooter(unsubscribeUrl(c.id)) }),
    });
    sentIds.push(c.id);
  }

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "No matching contacts." },
      { status: 400 },
    );
  }

  const result = await sendBulkEmails(messages, {
    fromName: senderName(parsed.data.fromName),
  });

  await prisma.companyContact.updateMany({
    where: { id: { in: sentIds } },
    data: { lastEmailedAt: new Date(), emailCount: { increment: 1 } },
  });

  const data = {
    status: "SENT",
    subject: subjectTpl,
    body: bodyTpl,
    fromName: senderName(parsed.data.fromName),
    variant: parsed.data.variant ?? null,
    filters: filters ?? {},
    recipients: messages.length,
    sent: result.sent,
    failed: result.failed,
    sentById: auth.user.id,
  };

  // Sending from a draft converts it; otherwise record a fresh send.
  if (parsed.data.id) {
    await prisma.outreachCampaign
      .update({ where: { id: parsed.data.id }, data })
      .catch(() => prisma.outreachCampaign.create({ data }));
  } else {
    await prisma.outreachCampaign.create({ data });
  }

  return NextResponse.json({ recipients: messages.length, ...result });
}
