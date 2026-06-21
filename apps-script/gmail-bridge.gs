// JobMingle Gmail -> Lead ingestion bridge (Google Apps Script).
// Paste into script.google.com (signed in as jobminglengr@gmail.com),
// Save, Run processLeadEmails once to authorize, then add a 5-minute trigger.

var INGEST_URL = 'https://jobmingleleads.vercel.app/api/leads/ingest';
var INGEST_SECRET = 'D50ej7rvhxDwCaSYr3FVLhglimTtqfwa';
var LABEL_PROCESSED = 'lead-processed';
var LABEL_FAILED = 'lead-failed';
var LEAD_QUERY = 'new lead just submitted -label:lead-processed -label:lead-failed';
var EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/;

function processLeadEmails() {
  var threads = GmailApp.search(LEAD_QUERY, 0, 30);
  var processed = getOrCreateLabel(LABEL_PROCESSED);
  var failed = getOrCreateLabel(LABEL_FAILED);
  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var msg = thread.getMessages()[0];
    try {
      var payload = parseLeadEmail(msg.getPlainBody());
      if (!payload.fullName || !payload.email) throw new Error('missing fields');
      var res = UrlFetchApp.fetch(INGEST_URL, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-ingest-secret': INGEST_SECRET },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 201) {
        thread.addLabel(processed);
      } else {
        thread.addLabel(failed);
        Logger.log('Ingest failed ' + res.getResponseCode() + ': ' + res.getContentText());
      }
    } catch (e) {
      thread.addLabel(failed);
      Logger.log('Parse failed: ' + e.message);
    }
  }
}

function parseLeadEmail(body) {
  // Gmail renders the HTML email as "*Label:* value" (asterisks = bold), so we
  // allow optional asterisks around the label and strip any from the value.
  function getRaw(labels) {
    for (var j = 0; j < labels.length; j++) {
      var m = body.match(new RegExp('\\*?\\s*' + labels[j] + '\\s*:\\s*\\*?\\s*(.+)'));
      if (m) return m[1].replace(/\*/g, '').trim();
    }
    return '';
  }
  // Pull a clean email out of whatever the "Email:" line contains; fall back
  // to scanning the whole body if the labelled line had no valid address.
  var rawEmail = getRaw(['Email']);
  var emailMatch = rawEmail.match(EMAIL_RE) || body.match(EMAIL_RE);
  return {
    fullName: getRaw(['Full Name']),
    email: emailMatch ? emailMatch[0] : '',
    phone: getRaw(['WhatsApp', 'Phone']),
    trackSelected: getRaw(['Interested Skill', 'Track']),
    startTimeline: getRaw(['Start Timeline']),
    howFoundUs: getRaw(['How Did You Hear About Us', 'How Did You Hear'])
  };
}

function getOrCreateLabel(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

// --- Helpers ---

// Run this and paste the log if leads still fail to parse - shows the raw body.
function debugLatestLead() {
  var threads = GmailApp.search('new lead just submitted', 0, 1);
  if (!threads.length) { Logger.log('no matching email found'); return; }
  Logger.log('----- RAW PLAIN BODY -----\n' + threads[0].getMessages()[0].getPlainBody());
}

// Run once to clear the lead-failed label so previously-failed emails retry.
function clearFailedLabel() {
  var label = GmailApp.getUserLabelByName(LABEL_FAILED);
  if (!label) { Logger.log('no lead-failed label'); return; }
  var threads = label.getThreads();
  for (var i = 0; i < threads.length; i++) threads[i].removeLabel(label);
  Logger.log('Cleared lead-failed from ' + threads.length + ' thread(s)');
}
