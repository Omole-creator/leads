// Prewritten partial-scholarship email loaded into the bulk composer via the
// "Load scholarship offer" button. Uses the price tokens the send route provides
// per lead: {{firstName}} {{name}} {{track}} {{scholarshipPrice}} {{installment}}
// {{oldPrice}} {{covered}}. The admin reviews and edits before sending, nothing
// auto-sends. Voice + rules follow COPYWRITING-PLAYBOOK.md (no em dashes, plain
// spoken language, make the reader feel chosen). Under 400 words. The Instagram
// link is written as [text](url) so only the word is clickable and the naked URL
// stays hidden. Fixed dates are for the July 2026 cohort, update them each run.
export const SCHOLARSHIP_SUBJECT =
  "Congratulations {{firstName}}, you got a JobMingle partial scholarship for {{track}} 🎉";

export const SCHOLARSHIP_BODY = `Congratulations, {{name}}.

Out of 913 people who applied, you are one of only 10 chosen for a JobMingle partial scholarship in {{track}}. That puts you in a very small group, and we are glad you are in it.

Here is what your partial scholarship means. The full fee for {{track}} is {{oldPrice}}. Andrew Akhabue, the CEO of Flologpharma, has already paid **{{covered}}** of it for you. That leaves your part at just **{{scholarshipPrice}}**, and you do not have to pay it all at once.

On your application you chose to pay in three parts, and said you can make your first payment within five days. So all you pay is **{{installment}} a month for three months**, and nothing after that.

To hold your spot, make your first payment of {{installment}} on or before 20 July 2026.

Here is where to send it:
Bank: Zenith Bank
Account Number: 1311340458
Account Name: JobMingle Limited

Once you have paid, send your proof on WhatsApp to 08074071356 and we will onboard you immediately.

Your seat gives you:
- Project-based learning using our C.L.I Framework, which is only found on JobMingle
- A three-month internship that is guaranteed
- A mentor who works with you one on one
- Our AI Skill-Retention Engine, so what you learn actually stays with you
- A certificate and job support when you finish
- A supportive community where you ask questions and get immediate feedback

Classes start on 31 July 2026 and hold at least twice a week on Zoom, from 7pm to 9pm.

If you would like a feel for what learning with us is like, about 10 of our students share their experience on our [Instagram](https://www.instagram.com/jobmingle_).

One more thing. Please accept your partial scholarship on or before 20 July 2026. If we do not hear from you by then, we pass your seat to the next person in line, and we would hate for that to be you.

Congratulations again, {{firstName}}. You earned this, and we cannot wait to see what you build with it. Wishing you all the best.

Best regards,
The JobMingle Academy Team
jobmingle.co

PS: Got a question? Message us on WhatsApp at 08074071356 before you pay and we will help you out.`;
