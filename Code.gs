/**
 * Student ID scan: server side.
 * Bound to the Google Sheet that stores the register (Extensions > Apps Script).
 */

const SHEET_NAME = 'Students';
const HEADERS = ['Student ID', 'Name', 'First scanned', 'Last scanned', 'Scan count'];
const DATE_FORMAT = 'd mmm yyyy, h:mm am/pm';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Student ID scan')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function normaliseId_(raw) {
  return String(raw || '').toUpperCase().replace(/[^\dA-Z]/g, '');
}

function formatDate_(d) {
  if (!(d instanceof Date)) return String(d || '');
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "d MMM yyyy, h:mm a");
}

/**
 * Looks up an ID. New IDs are added; existing ones get their last-scanned
 * time and scan count updated, and the first-scanned date is returned.
 */
function checkIn(rawId, rawName) {
  const id = normaliseId_(rawId);
  const name = String(rawName || '').trim();
  if (id.length < 4) throw new Error('That ID looks too short. Check it and try again.');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = getSheet_();
    const lastRow = sh.getLastRow();
    const now = new Date();

    if (lastRow > 1) {
      const hit = sh.getRange(2, 1, lastRow - 1, 1)
        .createTextFinder(id)
        .matchEntireCell(true)
        .findNext();
      if (hit) {
        const r = hit.getRow();
        const row = sh.getRange(r, 1, 1, HEADERS.length).getValues()[0];
        const scans = (Number(row[4]) || 1) + 1;
        sh.getRange(r, 4, 1, 2).setValues([[now, scans]]);
        sh.getRange(r, 4).setNumberFormat(DATE_FORMAT);
        if (!row[1] && name) sh.getRange(r, 2).setValue(name);
        return {
          status: 'existing',
          id: id,
          name: row[1] || name,
          firstScanned: formatDate_(row[2]),
          scans: scans
        };
      }
    }

    const r = lastRow + 1;
    sh.getRange(r, 1).setNumberFormat('@'); // keep leading zeros
    sh.getRange(r, 1, 1, HEADERS.length).setValues([[id, name, now, now, 1]]);
    sh.getRange(r, 3, 1, 2).setNumberFormat(DATE_FORMAT);
    return { status: 'new', id: id, name: name, firstScanned: formatDate_(now), scans: 1 };
  } finally {
    lock.releaseLock();
  }
}
