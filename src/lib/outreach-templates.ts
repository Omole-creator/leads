import type {
  OutreachRequirement,
  OutreachVariantId,
} from "./outreach-constants";

// The four cold-outreach variants. One template that tries to fit everybody
// reads like a mail merge, so instead each variant is written for a situation
// and carries the tick-boxes that situation needs (`requires`). Loading a
// variant in the composer ticks those automatically.
//
// House rule, enforced by tests/unit/outreach-templates.test.ts: EVERY token
// carries a `|fallback`. Contacts are imported from ragged CSVs, so a bare
// {{first_name}} would send "Hi ," to a real prospect.
// Copy style follows COPYWRITING-PLAYBOOK.md: no em dashes, plain spoken words.

export interface OutreachVariant {
  id: OutreachVariantId;
  label: string;
  hint: string;
  /** Tick-boxes auto-checked when this variant is loaded. */
  requires: OutreachRequirement[];
  subject: string;
  body: string;
}

const SIGN_OFF = `Omole
JobMingle Limited`;

export const OUTREACH_VARIANTS: OutreachVariant[] = [
  {
    id: "A",
    label: "A. Active job opening",
    hint: "They are hiring right now and you know the role.",
    requires: ["companyName", "hiringRoles"],
    subject: "Candidates for your {{hiring_role|open roles}}",
    body: `Hi {{first_name|there}},

I noticed {{company|your team}} is hiring {{hiring_role|at the moment}}.

I handle recruitment at JobMingle. We keep a bench of pre-vetted tech and business talent, and we can usually put three or four people who fit in front of you within a week.

{{personalization|Happy to send a couple of profiles first so you can judge the quality before we even talk.}}

You pay nothing until someone you want accepts an offer.

Is it worth fifteen minutes this week?

${SIGN_OFF}`,
  },
  {
    id: "B",
    label: "B. No known hiring",
    hint: "Safe default. Never mentions a role you do not have.",
    requires: ["companyName"],
    subject: "Hiring help for {{company|your team}}",
    body: `Hi {{first_name|there}},

I came across {{company|your company}} and thought I would reach out.

I run recruitment at JobMingle. We help growing {{industry|companies}} hire pre-vetted tech and business talent, without the usual back and forth of sorting through applications that go nowhere.

{{personalization|Most teams come to us once a role has stayed open longer than they planned for.}}

If hiring is on your list this quarter, I can send a few profiles so you can see the standard we work to. No fee until you actually hire.

Worth a short call?

${SIGN_OFF}`,
  },
  {
    id: "C",
    label: "C. Founders and startups",
    hint: "Leads on a trigger event: funding, expansion, a launch.",
    requires: ["companyName", "triggerEvent"],
    subject: "Hiring after {{trigger|your recent growth}}",
    body: `Hi {{first_name|there}},

Congratulations on {{trigger|the progress you have been making}}. {{company|Your team}} is clearly moving.

That is usually the point where hiring turns into the bottleneck. I run recruitment at JobMingle and we place pre-vetted tech and business talent, so founders stop losing weeks to screening.

{{personalization|We work best with small teams where the next few hires have to be right first time.}}

Send me the role and I will come back with three or four people worth your time. Nothing to pay until one of them accepts.

Open to a quick call?

${SIGN_OFF}`,
  },
  {
    id: "D",
    label: "D. HR and talent acquisition",
    hint: "For people who already own hiring and have their own process.",
    requires: ["jobTitle"],
    subject: "An extra pipeline for your {{hiring_role|open roles}}",
    body: `Hi {{first_name|there}},

I am reaching out to you as {{job_title|the person who owns hiring}} at {{company|your company}}.

I run recruitment at JobMingle. We work alongside internal teams as an extra pipeline, mostly on {{hiring_role|technical and business roles}} that are slow to fill, across {{location|Nigeria}} and remote.

{{personalization|We screen first, so what reaches you is a short list of people who actually match the brief.}}

Every candidate is pre-vetted and you pay nothing until someone accepts.

Would it help to see a sample shortlist?

${SIGN_OFF}`,
  },
];

export function outreachVariant(id: string): OutreachVariant | undefined {
  return OUTREACH_VARIANTS.find((v) => v.id === id);
}

/**
 * Footer for every outreach email. Returned as HTML and passed straight into
 * bodyToHtml's `shell.footer`, which does NOT escape it, so nothing here may
 * come from user input. Without a URL (the composer preview) the unsubscribe
 * line still shows, just not clickable, so the layout matches what is sent.
 */
export function outreachFooter(unsubscribeUrl?: string): string {
  const unsub = unsubscribeUrl
    ? `<a href="${unsubscribeUrl}" style="color:#888">Unsubscribe</a>`
    : "Unsubscribe";
  return `JobMingle Limited<br/>49/51 Mumunie Street, Lagos, Nigeria<br/>${unsub}`;
}

/** Stand-in values so the composer preview shows a finished email. */
export const OUTREACH_SAMPLE_VARS: Record<string, string> = {
  first_name: "Sarah",
  company: "ABC Tech",
  job_title: "HR Manager",
  hiring_role: "a Backend Developer",
  industry: "fintech",
  personalization: "I saw you are expanding the engineering team this quarter.",
  trigger: "the new funding round",
  location: "Lagos",
};
