import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { certificateSendSchema } from "@/lib/schemas";
import { certificateFileName } from "@/lib/certificate";
import { renderCertificatePng } from "@/lib/certificate-render";
import { pngToLandscapePdf } from "@/lib/pdf";
import { sendCertificateEmail } from "@/lib/email";
import { firstName } from "@/lib/email-template";

export const dynamic = "force-dynamic";

/**
 * Admin: render a student's certificate and email it to them with the PDF
 * attached. The recipient address is read from the lead, never from the request
 * body — the client only supplies what is printed on the certificate.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const parsed = certificateSendSchema.safeParse(
    await req.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const { leadId, ...fields } = parsed.data;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      fullName: true,
      email: true,
      // For the email copy only. The certificate itself prints the (editable)
      // course line the admin approved, which may be worded differently.
      studentTrack: { select: { name: true } },
      track: { select: { name: true } },
    },
  });
  if (!lead) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  if (!lead.email) {
    return NextResponse.json(
      { error: "This student has no email address on file." },
      { status: 400 },
    );
  }

  const png = await renderCertificatePng(fields);
  const pdf = await pngToLandscapePdf(png);

  const sent = await sendCertificateEmail({
    to: lead.email,
    firstName: firstName(lead.fullName),
    trackName: lead.studentTrack?.name ?? lead.track.name,
    fileName: certificateFileName(fields.name),
    pdf,
  });
  if (!sent) {
    return NextResponse.json(
      { error: "Email failed to send. Check the Resend logs." },
      { status: 502 },
    );
  }

  await prisma.activityLog.create({
    data: {
      leadId: lead.id,
      userId: auth.user.id,
      action: "CERTIFICATE_SENT",
      newValue: {
        to: lead.email,
        course: fields.course,
        issuedOn: fields.issuedOn,
      },
    },
  });

  return NextResponse.json({ sent: true, to: lead.email });
}
