/**
 * JobMingle Gmail → Lead ingestion bridge (Google Apps Script).
 *
 * Reads new lead-submission emails sent to jobminglengr@gmail.com and POSTs
 * them to the app's /api/leads/ingest endpoint with the shared secret.
 *
 * SETUP (script.google.com):
 *  1. Script Properties → add:
 *       INGEST_URL    = https://leads.jobmingle.com/api/leads/ingest
 *       INGEST_SECRET = <same value as INGEST_SHARED_SECRET in the app>
 *  2. Confirm LEAD_QUERY below matches the real email subject. The body begins
 *     "A new lead just submitted their information on JobMingle Academy."
 *  3. Triggers → add a time-driven trigger for processLeadEmails every 5 minutes.
 */

const PROPS = PropertiesService.getScriptProperties();
const INGEST_URL = PROPS.getProperty('INGEST_URL');
const INGEST_SECRET = PROPS.getProperty('INGEST_SECRET');

const LABEL_PROCESSED = 'lead-processed';
const LABEL_FAILED = 'lead-failed';

// Adjust the subject phrase to the real form-notification subject if needed.
// As a fallback this also matches the unique body sentence.
const LEAD_QUERY =
  '("new lead just submitted" OR subject:"New JobMingle") ' +
  '-label:lead-processed -label:lead-failed';

function processLeadEmails() {
  const threads = GmailApp.search(LEAD_QUERY, 0, 20);
  const processed = getOrCreateLabel(LABEL_PROCESSED);
  const failed = getOrCreateLabel(LABEL_FAILED);

  for (const thread of threads) {
    const msg = thread.getMessages()[0];
    try {
      const payload = parseLeadEmail(msg.getPlainBody());
      if (!payload.fullName || !payload.email) {
        throw new Error('Missing required fields after parse');
      }
      const res = UrlFetchApp.fetch(INGEST_URL, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-ingest-secret': INGEST_SECRET },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });
      if (res.getResponseCode() === 201) {
        thread.addLabel(processed);
      } else {
        thread.addLabel(failed);
        Logger.log('Ingest failed (' + res.getResponseCode() + '): ' + res.getContentText());
      }
    } catch (e) {
      thread.addLabel(failed);
      Logger.log('Parse/send failed: ' + e.message);
    }
  }
}

/**
 * Parse the real JobMingle lead email. Captures only the 6 fields the app uses.
 * Example body lines:
 *   Full Name: Adegbite Ezekiel oluwafemi
 *   WhatsApp: 08066509858
 *   Interested Skill: Cybersecurity - ₦470,000
 *   Start Timeline: April 30th Cohort - Last cohort with paid internships
 *   How Did You Hear: instagram
 */
function parseLeadEmail(body) {
  const get = function (labels) {
    for (const label of labels) {
      const m = body.match(new RegExp(label + '\\s*:\\s*(.+)'));
      if (m) return m[1].trim();
    }
    return '';
  };

  return {
    fullName: get(['Full Name']),
    email: get(['Email']),
    phone: get(['WhatsApp', 'Phone']),
    // The app strips the " - ₦price" suffix and matches the track by name.
    trackSelected: get(['Interested Skill', 'Track']),
    startTimeline: get(['Start Timeline']),
    howFoundUs: get(['How Did You Hear About Us', 'How Did You Hear']),
  };
}

function getOrCreateLabel(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}
