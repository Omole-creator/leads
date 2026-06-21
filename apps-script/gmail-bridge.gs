// JobMingle Gmail -> Lead ingestion bridge (Google Apps Script).
// Paste into script.google.com (signed in as jobminglengr@gmail.com),
// Save, Run processLeadEmails once to authorize, then add a 5-minute trigger.

var INGEST_URL = 'https://jobmingleleads.vercel.app/api/leads/ingest';
var INGEST_SECRET = 'D50ej7rvhxDwCaSYr3FVLhglimTtqfwa';
var LABEL_PROCESSED = 'lead-processed';
var LABEL_FAILED = 'lead-failed';
var LEAD_QUERY = 'new lead just submitted -label:lead-processed -label:lead-failed';

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
  function get(labels) {
    for (var j = 0; j < labels.length; j++) {
      var m = body.match(new RegExp(labels[j] + '\\s*:\\s*(.+)'));
      if (m) return m[1].trim();
    }
    return '';
  }
  return {
    fullName: get(['Full Name']),
    email: get(['Email']),
    phone: get(['WhatsApp', 'Phone']),
    trackSelected: get(['Interested Skill', 'Track']),
    startTimeline: get(['Start Timeline']),
    howFoundUs: get(['How Did You Hear About Us', 'How Did You Hear'])
  };
}

function getOrCreateLabel(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}
