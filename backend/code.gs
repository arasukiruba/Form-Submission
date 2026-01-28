
// --- CONFIGURATION ---
const SHEET_ID = ""; // Leave empty if script is bound to the spreadsheet
const USER_SHEET_NAME = "Users";
const ADMIN_SHEET_NAME = "Admins";
const NAMES_SHEET_NAME = "Names";
const ADMIN_EMAIL = "arasukirubanandhan@gmail.com";
// The Folder ID provided by the user for storing screenshots
const DRIVE_FOLDER_ID = "1Sp-G7ySxEhC0_TJqSEn7VomRVBBuCyWh";

function doPost(e) {
  const lock = LockService.getScriptLock();
  // Wait for up to 30 seconds for other processes to finish.
  lock.tryLock(30000); 
  
  try {
    setupDatabase();

    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result = null;

    switch (action) {
      case 'login':
        result = handleLogin(data.userId, data.password);
        break;
      case 'register':
        result = handleRegister(data.user);
        break;
      case 'createUser': 
        result = handleCreateUser(data.user);
        break;
      case 'getUsers':
        result = handleGetUsers();
        break;
      case 'updateUser':
        result = handleUpdateUser(data.user);
        break;
      case 'deductCredit':
        // Updated to pass count
        result = handleDeductCredit(data.userId, data.count);
        break;
      case 'getQrCode':
        result = handleGetQrCode();
        break;
      case 'fetchForm':
        result = handleFetchForm(data.url);
        break;
      case 'getNames':
        result = handleGetNames();
        break;
      default:
        throw new Error("Invalid action");
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getSpreadsheet() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function setupDatabase() {
  const ss = getSpreadsheet();
  
  let adminSheet = ss.getSheetByName(ADMIN_SHEET_NAME);
  if (!adminSheet) {
    adminSheet = ss.insertSheet(ADMIN_SHEET_NAME);
    adminSheet.appendRow(["Username", "Password"]);
    adminSheet.appendRow(["admin", "admin"]);
  }

  let userSheet = ss.getSheetByName(USER_SHEET_NAME);
  if (!userSheet) {
    userSheet = ss.insertSheet(USER_SHEET_NAME);
    userSheet.appendRow(["Name", "UserID", "Password", "Contact", "Email", "CreditsAvailed", "CreditsRemaining", "Plan", "PaymentID", "ScreenshotURL", "Status"]);
  }
  
  // Ensure Names sheet exists? Usually user creates it, but good to handle graceful check in getNames
}

function handleLogin(userId, password) {
  const ss = getSpreadsheet();
  const adminSheet = ss.getSheetByName(ADMIN_SHEET_NAME);
  const adminData = adminSheet.getDataRange().getValues();
  
  for (let i = 1; i < adminData.length; i++) {
    if (String(adminData[i][0]) === String(userId) && String(adminData[i][1]) === String(password)) {
      return { role: 'admin', name: 'Administrator', userId: userId };
    }
  }

  const userSheet = ss.getSheetByName(USER_SHEET_NAME);
  const userData = userSheet.getDataRange().getValues();
  
  for (let i = 1; i < userData.length; i++) {
    const row = userData[i];
    if (String(row[1]) === String(userId) && String(row[2]) === String(password)) {
      if (row[10] !== 'Active') throw new Error("Account is " + row[10] + ". Please contact admin.");
      if (row[6] <= 0) throw new Error("Credits exhausted. Please recharge.");
      
      return {
        role: 'user',
        name: row[0],
        userId: row[1],
        contact: row[3],
        email: row[4],
        creditsAvailed: row[5],
        creditsRemaining: row[6],
        plan: row[7],
        paymentId: row[8],
        screenshotUrl: row[9],
        status: row[10]
      };
    }
  }
  throw new Error("Invalid credentials");
}

function handleRegister(user) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(USER_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(user.userId)) throw new Error("User ID already exists.");
  }

  let screenshotUrl = "No Screenshot";
  if (user.screenshotData && user.screenshotMime) {
    try {
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const decoded = Utilities.base64Decode(user.screenshotData.split(',')[1]);
      const blob = Utilities.newBlob(decoded, user.screenshotMime, `Payment_${user.userId}_${Date.now()}`);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      screenshotUrl = file.getUrl();
    } catch (e) {
      console.error("Drive Upload Error: " + e.toString());
      screenshotUrl = "Upload Failed: " + e.toString();
    }
  } else if (user.screenshotUrl) {
    screenshotUrl = user.screenshotUrl;
  }

  let credits = 0;
  if (user.plan) {
    if (user.plan.includes('150')) credits = 150;
    else if (user.plan.includes('300')) credits = 300;
    else if (user.plan.includes('500')) credits = 500;
  }

  sheet.appendRow([
    user.name,
    user.userId,
    user.password,
    user.contact,
    user.email,
    credits,
    credits,
    user.plan,
    user.paymentId,
    screenshotUrl,
    'Pending'
  ]);

  try {
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: "🔔 New FormGenie User Registration",
      htmlBody: `
        <h2>New User Registration</h2>
        <p><strong>Name:</strong> ${user.name}</p>
        <p><strong>User ID:</strong> ${user.userId}</p>
        <p><strong>Payment ID:</strong> ${user.paymentId}</p>
        <p><strong>Screenshot:</strong> <a href="${screenshotUrl}">View Proof</a></p>
        <p>Please log in to verify.</p>
      `
    });
  } catch(e) {}

  return { message: "Registration successful" };
}

function handleCreateUser(user) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(USER_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(user.userId)) throw new Error("User ID already exists.");
  }

  const credits = Number(user.creditsRemaining) || 0;

  sheet.appendRow([
    user.name,
    user.userId,
    user.password,
    user.contact || 'N/A',
    user.email || 'N/A',
    credits, 
    credits, 
    user.plan || 'Custom Admin Plan',
    'Admin Created',
    'N/A',
    user.status || 'Active'
  ]);

  return { message: "User created successfully" };
}

function handleGetQrCode() {
  const qrFileId = "11aXROhyMJ2v--yIJ1xDh-ehA7oAqmKNS";
  return { 
    url: `https://lh3.googleusercontent.com/d/${qrFileId}`,
    found: true 
  };
}

function handleGetUsers() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(USER_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const users = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    users.push({
      rowIndex: i + 1,
      name: row[0],
      userId: row[1],
      password: row[2],
      contact: row[3],
      email: row[4],
      creditsAvailed: row[5],
      creditsRemaining: row[6],
      plan: row[7],
      paymentId: row[8],
      screenshotUrl: row[9],
      status: row[10]
    });
  }
  return users;
}

function handleUpdateUser(user) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(USER_SHEET_NAME);
  if (!user.rowIndex) throw new Error("Invalid row index");
  
  const range = sheet.getRange(user.rowIndex, 1, 1, 11);
  range.setValues([[
    user.name,
    user.userId,
    user.password,
    user.contact,
    user.email,
    user.creditsAvailed,
    user.creditsRemaining,
    user.plan,
    user.paymentId,
    user.screenshotUrl,
    user.status
  ]]);
  
  return { message: "User updated successfully" };
}

function handleDeductCredit(userId, count) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(USER_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const deduction = count ? Number(count) : 1;
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(userId)) {
      const current = Number(data[i][6]);
      const newVal = Math.max(0, current - deduction);
      
      sheet.getRange(i + 1, 7).setValue(newVal);
      return { remaining: newVal };
    }
  }
  throw new Error("User not found");
}

function handleFetchForm(url) {
  try {
    const response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
    return { html: response.getContentText() };
  } catch (e) {
    throw new Error("Failed to fetch form from Google: " + e.toString());
  }
}

function handleGetNames() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(NAMES_SHEET_NAME);
  if (!sheet) return { male: [], female: [] }; 
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { male: [], female: [] };
  
  // Assume Column A is Male, Column B is Female. Start from Row 2 (headers in row 1)
  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const male = [];
  const female = [];
  
  data.forEach(row => {
    if (row[0] && String(row[0]).trim() !== '') male.push(String(row[0]).trim());
    if (row[1] && String(row[1]).trim() !== '') female.push(String(row[1]).trim());
  });
  
  return { male, female };
}
