import { Resend } from "resend";
import { formatNaira } from "./utils";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL ?? "leads@jobmingle.com";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const resend = apiKey ? new Resend(apiKey) : null;

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
