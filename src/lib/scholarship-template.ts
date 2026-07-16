// Prewritten scholarship-offer email loaded into the bulk composer via the
// "Load scholarship offer" button. Uses the price tokens the send route provides
// per lead: {{firstName}} {{name}} {{track}} {{scholarshipPrice}} {{installment}}
// {{oldPrice}}. The admin reviews and edits before sending — nothing auto-sends.
export const SCHOLARSHIP_SUBJECT =
  "{{firstName}}, your {{track}} scholarship price is {{scholarshipPrice}}";

export const SCHOLARSHIP_BODY = `Hi {{firstName}},

Good news — your JobMingle scholarship for {{track}} is confirmed.

The regular price for {{track}} is {{oldPrice}}. With your scholarship, you pay just **{{scholarshipPrice}}** — or spread it across three installments of **{{installment}}** each.

**What's included:**
- Project-based learning with expert tutors
- A 3-month internship, guaranteed
- Our AI Skill-Retention Engine, so what you learn sticks
- One-on-one mentorship
- A certificate when you finish
- Job placement support after the program
- A private community learning right beside you

Our next cohort starts July 31st, and seats are limited.

**Where to pay:**
Bank Name: Zenith Bank
Account Number: 1311340458
Account Name: JobMingle Limited

Once you've paid, send your receipt to 08074071356 on WhatsApp and we'll start your onboarding the same day.

This scholarship price won't last. Miss July 31st and the next cohort won't open until November.

Send your proof, and we'll see you in class.

Talk soon,
The JobMingle Academy Team`;
