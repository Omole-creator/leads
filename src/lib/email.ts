import { Resend } from "resend";
import { formatNaira } from "./utils";
import { renderTemplate, bodyToHtml } from "./email-template";

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

// Promotional welcome email sent to a lead on new form submission. Payment
// amounts are filled per track: Once = full price, Twice = half, Three times =
// a third rounded up to the nearest ₦10,000 (so ₦350k reads ₦120,000 x3,
// ₦150k reads ₦50,000 x3). Tokens: {{firstName}} {{track}} {{once}} {{twice}}
// {{thrice}}.
const WELCOME_SUBJECT = "{{firstName}}, don't pay us yet";

const WELCOME_BODY = `Hi {{firstName}},

Don't pay us yet. Seriously.

Most people who sign up for a tech course drop off by week three. Not because they're lazy. Because the academy hands them a pile of videos and then disappears. We watched that happen one too many times, so we built JobMingle to work the opposite way.

When you join {{track}}, you get a tutor who knows your name, projects you actually build, and someone checking in when you go quiet.

Our next cohort starts July 31st, and we keep the classes small on purpose.

**What's included:**
- Project-based learning with expert tutors
- A 3-month internship, guaranteed
- Our AI Skill-Retention Engine, so what you learn sticks
- One-on-one mentorship
- A certificate when you finish
- Job placement support after the program
- A private community learning right beside you

**Payment plans for {{track}}:**
- Once: {{once}}
- Twice: {{twice}} each
- Three times: {{thrice}} each

**Here's our promise:** give it two weeks. Show up, do the work, and if you still feel it's not for you, we'll refund every naira. No forms. No awkward questions. The risk is on us, not you.

**Where to pay:**
Bank Name: Zenith Bank
Account Number: 1311340458
Account Name: JobMingle Limited

Once you've paid, send your receipt to 08074071356 on WhatsApp and we'll start your onboarding the same day.

Seats are limited and they go fast. Miss July 31st and the next cohort won't open until November. That's months of waiting for a decision you can make right now.

So make it. Send your proof, and we'll see you in class.

Talk soon,
The JobMingle Academy Team`;

export interface WelcomeEmail {
  to: string;
  firstName: string;
  trackName: string;
  trackCost: number;
}

/**
 * Per-track payment plan amounts for the welcome email.
 * Once = full price, Twice = half, Three times = a third rounded UP to the
 * nearest ₦10,000 (₦350,000 -> ₦120,000 x3; ₦150,000 -> ₦50,000 x3).
 */
export function welcomePlanAmounts(trackCost: number): {
  once: number;
  twice: number;
  thrice: number;
} {
  return {
    once: trackCost,
    twice: Math.round(trackCost / 2),
    thrice: Math.ceil(trackCost / 3 / 10000) * 10000,
  };
}

/** "I'm not sure yet" / "Undecided" leads haven't chosen a program — don't pitch them. */
export function isUndecidedTrack(trackName: string): boolean {
  return /\b(not sure|undecided)\b/i.test(trackName);
}

/**
 * Send the promotional welcome email to a newly-submitted lead.
 * Never throws — a Resend outage must not block lead ingestion. Skips (returns
 * false) when email is disabled, the lead hasn't picked a program ("I'm not
 * sure yet"), or the track has no price, so we never send a "₦0" plan or pitch
 * someone who hasn't chosen a track.
 */
export async function sendWelcomeEmail(data: WelcomeEmail): Promise<boolean> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping welcome email.");
    return false;
  }
  if (isUndecidedTrack(data.trackName)) {
    console.warn(
      `[email] lead is undecided ("${data.trackName}") — skipping welcome email.`,
    );
    return false;
  }
  if (!(data.trackCost > 0)) {
    console.warn(
      `[email] track "${data.trackName}" has no price — skipping welcome email.`,
    );
    return false;
  }
  const { once, twice, thrice } = welcomePlanAmounts(data.trackCost);
  const vars = {
    firstName: data.firstName,
    track: data.trackName,
    once: formatNaira(once),
    twice: formatNaira(twice),
    thrice: formatNaira(thrice),
  };
  const rendered = renderTemplate(WELCOME_BODY, vars);
  // Plain-text fallback: drop the **bold** markers; HTML keeps them as <strong>.
  const text = rendered.replace(/\*\*(.+?)\*\*/g, "$1");
  try {
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to: data.to,
      subject: renderTemplate(WELCOME_SUBJECT, vars),
      text,
      html: bodyToHtml(rendered),
    });
    return true;
  } catch (err) {
    console.error("[email] failed to send welcome email:", err);
    return false;
  }
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
