import { Resend } from "resend";
import { formatNaira } from "./utils";

const apiKey = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "leads@jobmingle.com";
const FROM_NAME = process.env.RESEND_FROM_NAME ?? "JobMingle Academy";
// Recipients see "JobMingle Academy <contact@jobmingle.co>".
const FROM = `${FROM_NAME} <${FROM_EMAIL}>`;
const REPLY_TO = process.env.RESEND_REPLY_TO ?? FROM_EMAIL;
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const resend = apiKey ? new Resend(apiKey) : null;

export const emailEnabled = !!resend;

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send a batch of personalized emails via Resend (chunked to 100/request, with
 * a small pause to respect rate limits). Returns counts. Never throws.
 */
export async function sendBulkEmails(
  messages: OutgoingEmail[],
): Promise<{ sent: number; failed: number }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping bulk send.");
    return { sent: 0, failed: messages.length };
  }
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const { error } = await resend.batch.send(
        chunk.map((m) => ({
          from: FROM,
          replyTo: REPLY_TO,
          to: m.to,
          subject: m.subject,
          html: m.html,
          text: m.text,
        })),
      );
      if (error) {
        failed += chunk.length;
        console.error("[email] batch error:", error);
      } else {
        sent += chunk.length;
      }
    } catch (err) {
      failed += chunk.length;
      console.error("[email] batch send threw:", err);
    }
    if (i + 100 < messages.length) await new Promise((r) => setTimeout(r, 600));
  }
  return { sent, failed };
}

export interface LeadAssignedEmail {
  repName: string;
  repEmail: string;
  leadId: string;
  fullName: string;
  phone: string;
  email: string;
  trackName: string;
  amountPaid: number;
  balanceLeft: number;
  howFoundUs: string;
}

/**
 * Notify a rep that a new lead was assigned to them.
 * Never throws — a Resend outage must not lose a lead. Returns false if skipped.
 */
export async function sendLeadAssignedEmail(
  data: LeadAssignedEmail,
): Promise<boolean> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send.");
    return false;
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: data.repEmail,
      subject: `New lead assigned: ${data.fullName}`,
      text: [
        `Hi ${data.repName},`,
        "",
        "A new lead has been assigned to you:",
        "",
        `Name: ${data.fullName}`,
        `Phone: ${data.phone}`,
        `Email: ${data.email}`,
        `Track: ${data.trackName}`,
        `Amount paid: ${formatNaira(data.amountPaid)}`,
        `Balance: ${formatNaira(data.balanceLeft)}`,
        `Source: ${data.howFoundUs}`,
        "",
        `Open lead: ${APP_URL}/leads/${data.leadId}`,
        "",
        "— JobMingle Lead System",
      ].join("\n"),
    });
    return true;
  } catch (err) {
    console.error("[email] failed to send lead-assigned email:", err);
    return false;
  }
}
