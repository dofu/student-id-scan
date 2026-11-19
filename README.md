# Student ID scan

Phone web app. Take a photo of a student card, it reads the ID on the phone (Tesseract.js, nothing sent to an OCR service), then checks a Google Sheet. New IDs are added; known IDs show an "Already in the system" notice with the date first added and the scan count.

## Install (about 5 minutes)

1. Create a Google Sheet. Open **Extensions > Apps Script**.
2. Replace the contents of `Code.gs` with the file `Code.gs`.
3. Add an HTML file named exactly `Index` (**+ > HTML**) and paste in `Index.html`.
4. **Project Settings**: set the time zone (used for the "first added" date).
5. **Deploy > New deployment > Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone within [your organisation]** if available, otherwise **Anyone with a Google account**. Avoid "Anyone": the register holds student IDs.
6. Authorise, copy the web app URL, open it on the phone, and add it to the home screen.

The sheet tab **Students** is created on first save: Student ID, Name, First scanned, Last scanned, Scan count.

## Changing the ID format

`Index.html` has `ID_PATTERN` near the top of the script. The default accepts up to two letters, 5 to 10 digits and an optional trailing letter (2301234, A0123456X). Tighten it to the real card format so phone numbers and dates are not picked up.

## Notes

- After editing code, use **Deploy > Manage deployments > Edit > New version**, or the URL keeps serving the old code.
- The scanner always fills an editable field; the person scanning confirms before saving. When several numbers are found, they appear as chips to tap.
- IDs are stored upper case with spaces and symbols removed, as text, so leading zeros stay.
