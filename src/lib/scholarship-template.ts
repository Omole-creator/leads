// Prewritten scholarship-offer email loaded into the bulk composer via the
// "Load scholarship offer" button. Uses the price tokens the send route provides
// per lead: {{firstName}} {{name}} {{track}} {{scholarshipPrice}} {{installment}}
// {{oldPrice}} {{covered}}. The admin reviews and edits before sending, nothing
// auto-sends. Voice + rules follow COPYWRITING-PLAYBOOK.md (no em dashes, plain
// spoken language, make the reader feel chosen). Under 400 words. Fixed dates
// are for the July 2026 cohort, update them for future runs.
export const SCHOLARSHIP_SUBJECT =
  "Congratulations {{firstName}}, you got the JobMingle scholarship for {{track}} 🎉";

export const SCHOLARSHIP_BODY = `Congratulations, {{name}}.

Read this slowly, because it is real. Out of 913 people who applied, you are one of only 10 we picked for a JobMingle scholarship in {{track}}. We went through your application and agreed you are exactly who we want in this room.

So here is what we have already done for you. You will not pay the full {{oldPrice}} that everyone else pays. We have covered **{{covered}}** of your fee ourselves, which brings your part down to just **{{scholarshipPrice}}**. And you do not even pay it in one go.

On your application you chose to pay in three parts, and said you can make your first payment within five days. So all you pay is **{{installment}} a month for three months**, and nothing after that.

To hold your place, make that first payment of {{installment}} on or before 20 July 2026. The moment it lands, we start your onboarding.

Here is where to send it:
Bank: Zenith Bank
Account Number: 1311340458
Account Name: JobMingle Limited

Once you have paid, send your proof on WhatsApp to 08074071356 and we will welcome you that same day.

Your seat gives you:
- Real projects built our way with the C.L.I Framework, which you will only find at JobMingle
- A three-month internship that is guaranteed
- A mentor who works with you one on one
- Our AI Skill-Retention Engine, so what you learn actually stays with you
- A certificate and job support when you finish
- A small group learning right there beside you

Classes start on 31 July 2026 and hold at least twice a week on Zoom, from 7pm to 9pm.

Learning is a real commitment, so if it helps you decide, a few of our students have shared what it felt like for them, in their own words, on our Instagram: https://www.instagram.com/jobmingle_

One more thing. Please accept your scholarship on or before 20 July 2026. If we do not hear from you by then, we pass your seat to the next person in line, and we would hate for that to be you.

Congratulations again, {{firstName}}. You earned this, and we cannot wait to see what you build with it. Wishing you all the best.

Best regards,
The JobMingle Academy Team
https://www.jobmingle.co

PS: Got a question? Message us on WhatsApp at 08074071356 before you pay and we will help you out.`;
