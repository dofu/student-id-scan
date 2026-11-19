/** @OnlyCurrentDoc */

/**
 * Student ID scan: server side.
 * Bound to the Google Sheet that stores the register (Extensions > Apps Script).
 */

const SHEET_NAME = 'Students';
const HEADERS = ['Student ID', 'Name', 'University', 'Card expiry', 'First scanned', 'Last scanned', 'Scan count'];
const COL = { id: 1, name: 2, uni: 3, expiry: 4, first: 5, last: 6, count: 7 };
// Columns added after the first version; older sheets get them inserted in place.
const ADDED_COLUMNS = ['University', 'Card expiry'];
const DATE_FORMAT = 'd mmm yyyy, h:mm am/pm';

// Offer shown after saving. Edit the wording here; leave empty ('') to hide the line.
const OFFER_NEW = 'RM1 meal';
const OFFER_RETURNING = '10% discount';

// Universities offered as suggestions, on top of those already in the sheet.
const UNIVERSITIES = [];

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
  } else {
    const have = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    HEADERS.forEach((h, i) => {
      if (ADDED_COLUMNS.includes(h) && !have.includes(h)) {
        sh.insertColumnBefore(i + 1);
        sh.getRange(1, i + 1).setValue(h).setFontWeight('bold');
        have.splice(i, 0, h);
      }
    });
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

/** University names for the suggestion list: the preset list plus every name already saved. */
function getUniversities() {
  const sh = getSheet_();
  const names = new Set(UNIVERSITIES);
  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    sh.getRange(2, COL.uni, lastRow - 1, 1).getValues().forEach(r => { if (r[0]) names.add(String(r[0]).trim()); });
  }
  return [...names].sort();
}

/**
 * Looks up an ID. New IDs are added; existing ones get their last-scanned
 * time and scan count updated, and the previous scan time is returned.
 */
function checkIn(rawId, rawName, rawUni, rawExpiry) {
  const id = normaliseId_(rawId);
  const name = String(rawName || '').trim();
  const uni = String(rawUni || '').trim();
  const expiry = String(rawExpiry || '').trim();
  if (id.length < 4) throw new Error('That ID looks too short. Check it and try again.');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = getSheet_();
    const lastRow = sh.getLastRow();
    const now = new Date();

    if (lastRow > 1) {
      const hit = sh.getRange(2, COL.id, lastRow - 1, 1)
        .createTextFinder(id)
        .matchEntireCell(true)
        .findNext();
      if (hit) {
        const r = hit.getRow();
        const row = sh.getRange(r, 1, 1, HEADERS.length).getValues()[0];
        const scans = (Number(row[COL.count - 1]) || 1) + 1;
        sh.getRange(r, COL.last, 1, 2).setValues([[now, scans]]);
        sh.getRange(r, COL.last).setNumberFormat(DATE_FORMAT);
        if (!row[COL.name - 1] && name) sh.getRange(r, COL.name).setValue(name);
        if (!row[COL.uni - 1] && uni) sh.getRange(r, COL.uni).setValue(uni);
        // A renewed card replaces the stored expiry.
        if (expiry && expiry !== String(row[COL.expiry - 1])) sh.getRange(r, COL.expiry).setNumberFormat('@').setValue(expiry);
        return {
          status: 'existing',
          id: id,
          name: row[COL.name - 1] || name,
          university: row[COL.uni - 1] || uni,
          expiry: expiry || String(row[COL.expiry - 1] || ''),
          firstScanned: formatDate_(row[COL.first - 1]),
          lastScanned: formatDate_(row[COL.last - 1]),
          scans: scans,
          offer: OFFER_RETURNING
        };
      }
    }

    const r = lastRow + 1;
    sh.getRange(r, COL.id).setNumberFormat('@'); // keep leading zeros
    sh.getRange(r, COL.expiry).setNumberFormat('@'); // keep the date as printed
    sh.getRange(r, 1, 1, HEADERS.length).setValues([[id, name, uni, expiry, now, now, 1]]);
    sh.getRange(r, COL.first, 1, 2).setNumberFormat(DATE_FORMAT);
    return { status: 'new', id: id, name: name, university: uni, expiry: expiry, firstScanned: formatDate_(now), scans: 1, offer: OFFER_NEW };
  } finally {
    lock.releaseLock();
  }
}
