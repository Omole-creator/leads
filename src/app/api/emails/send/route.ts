import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { leadWhere, type LeadFilters } from "@/lib/leads";
import { sendBulkEmails, emailEnabled, type OutgoingEmail } from "@/lib/email";
import { renderTemplate, bodyToHtml, firstName } from "@/lib/email-template";
import type { Stage } from "@prisma/client";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  if (!emailEnabled) {
    return NextResponse.json(
      { error: "Email is not configured (RESEND_API_KEY missing)." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const subjectTpl = String(body?.subject ?? "").trim();
  const bodyTpl = String(body?.body ?? "").trim();
  if (!subjectTpl || !bodyTpl) {
    return NextResponse.json(
      { error: "Subject and message are required." },
      { status: 400 },
    );
  }

  const filters: LeadFilters = {
    segment: body?.segment || undefined,
    trackId: body?.trackId || undefined,
    stage: (body?.stage as Stage) || undefined,
    cohortId: body?.cohortId || undefined,
  };

  const leads = await prisma.lead.findMany({
    where: leadWhere(auth.user, filters),
    include: { track: true },
  });

  // De-duplicate by email; build personalized messages.
  const seen = new Set<string>();
  const messages: OutgoingEmail[] = [];
  for (const lead of leads) {
    const to = lead.email.toLowerCase().trim();
    if (!to || seen.has(to)) continue;
    seen.add(to);
    const vars = {
      name: lead.fullName,
      firstName: firstName(lead.fullName),
      track: lead.track.name,
    };
    const text = renderTemplate(bodyTpl, vars);
    messages.push({
      to: lead.email,
      subject: renderTemplate(subjectTpl, vars),
      text,
      html: bodyToHtml(text),
    });
  }

  if (messages.length === 0) {
    return NextResponse.json({ error: "No matching leads." }, { status: 400 });
  }

  const result = await sendBulkEmails(messages);

  await prisma.emailCampaign.create({
    data: {
      subject: subjectTpl,
      body: bodyTpl,
      segment: filters.segment ?? null,
      trackId: filters.trackId ?? null,
      stage: filters.stage ?? null,
      cohortId: filters.cohortId ?? null,
      recipients: messages.length,
      sent: result.sent,
      failed: result.failed,
      sentById: auth.user.id,
    },
  });

  return NextResponse.json({ recipients: messages.length, ...result });
}
