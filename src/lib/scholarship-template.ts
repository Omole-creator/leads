// Prewritten scholarship-offer email loaded into the bulk composer via the
// "Load scholarship offer" button. Uses the price tokens the send route provides
// per lead: {{firstName}} {{name}} {{track}} {{scholarshipPrice}} {{installment}}
// {{oldPrice}} {{covered}}. The admin reviews and edits before sending — nothing
// auto-sends. Kept under 400 words. Fixed dates below are for the July 2026
// cohort; update them for future runs.
export const SCHOLARSHIP_SUBJECT =
  "Congratulations {{firstName}} — you got a JobMingle scholarship for {{track}} 🎉";

export const SCHOLARSHIP_BODY = `Congratulations, {{name}}!

Out of 913 applications, you are one of only 10 people selected for a JobMingle scholarship in {{track}}. This isn't a mass offer — you earned your place.

Here's what it means for you. You will no longer pay the regular price of {{oldPrice}}. We've already paid **{{covered}}** of your tuition, so your scholarship price is just **{{scholarshipPrice}}**.

On your application you chose the 3-instalment plan and said you'd make your first payment within 5 days. So you'll pay just **{{installment}} a month for 3 months** — nothing more.

**Your first payment of {{installment}} is due on or before 20 July 2026**, so we can onboard you immediately.

**Make your first payment to:**
Bank: Zenith Bank
Account Number: 1311340458
Account Name: JobMingle Limited

Then send your proof of payment to 08074071356 on WhatsApp and we'll start your onboarding the same day.

Inside the cohort you get:
- Project-based learning built on our C.L.I Framework — available only at JobMingle
- A 3-month internship, guaranteed
- One-on-one mentorship
- Our AI Skill-Retention Engine, so what you learn sticks
- A certificate and job-placement support when you finish
- A private community learning right beside you

Classes begin 31 July 2026 and hold at least twice a week on Zoom, 7–9pm.

Learning is a big commitment, so if it helps you feel confident about yours, over 10 of our students share what the experience has been like for them here: https://www.instagram.com/jobmingle_

To keep your slot, please accept your scholarship on or before **20 July 2026**. After that, it will be offered to the next most qualified applicant.

Congratulations once again, {{firstName}} — we can't wait to see what you'll build. All the best.

Best regards,
The JobMingle Academy Team
https://www.jobmingle.co

PS: Have questions? WhatsApp us on 08074071356 before making payment.`;
