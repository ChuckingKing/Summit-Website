const { google } = require("googleapis");

const REQUIRED_FIELDS = ["name", "phone", "email", "service", "city", "details"];

function sanitize(value) {
  return String(value || "").trim();
}

function json(response, statusCode, payload) {
  response.status(statusCode).setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function getTimestamp() {
  return new Date().toISOString();
}

async function appendToSheet(payload) {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const tabName = process.env.GOOGLE_SHEETS_TAB_NAME || "Leads";

  if (!clientEmail || !privateKey || !spreadsheetId) {
    return { configured: false };
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:J`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        getTimestamp(),
        payload.name,
        payload.company,
        payload.phone,
        payload.email,
        payload.service,
        payload.frequency,
        payload.city,
        payload.propertyType,
        payload.details
      ]]
    }
  });

  return { configured: true };
}

async function sendEmail(payload) {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const fromEmail = process.env.GMAIL_FROM;
  const toEmail = process.env.NOTIFICATION_EMAIL;
  const scope = process.env.GMAIL_SCOPE || "https://www.googleapis.com/auth/gmail.send";

  if (!clientId || !clientSecret || !refreshToken || !fromEmail || !toEmail) {
    return { configured: false };
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    scope
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const lines = [
    `From: Summit Solutions <${fromEmail}>`,
    `To: ${toEmail}`,
    `Reply-To: ${payload.email}`,
    `Subject: New Summit Solutions quote request: ${payload.service}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    `Name: ${payload.name}`,
    `Company: ${payload.company || "N/A"}`,
    `Phone: ${payload.phone}`,
    `Email: ${payload.email}`,
    `Service: ${payload.service}`,
    `Frequency: ${payload.frequency || "N/A"}`,
    `City: ${payload.city}`,
    `Property Type: ${payload.propertyType || "N/A"}`,
    "",
    "Project Details:",
    payload.details
  ];

  const raw = Buffer.from(lines.join("\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw
    }
  });

  return { configured: true };
}

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    return json(response, 405, { error: "Method not allowed." });
  }

  try {
    const payload = {
      name: sanitize(request.body?.name),
      company: sanitize(request.body?.company),
      phone: sanitize(request.body?.phone),
      email: sanitize(request.body?.email),
      service: sanitize(request.body?.service),
      frequency: sanitize(request.body?.frequency),
      city: sanitize(request.body?.city),
      propertyType: sanitize(request.body?.propertyType),
      details: sanitize(request.body?.details),
      website: sanitize(request.body?.website)
    };

    if (payload.website) {
      return json(response, 200, { message: "Thanks for reaching out." });
    }

    const missingField = REQUIRED_FIELDS.find((field) => !payload[field]);
    if (missingField) {
      return json(response, 400, { error: `Please complete the ${missingField} field.` });
    }

    const [sheetResult, emailResult] = await Promise.all([
      appendToSheet(payload),
      sendEmail(payload)
    ]);

    if (!sheetResult.configured && !emailResult.configured) {
      return json(response, 500, {
        error: "The quote form is deployed, but the email and Google Sheets integrations are not configured yet."
      });
    }

    return json(response, 200, {
      message: emailResult.configured
        ? "Thanks. A representative from Summit Solutions will follow up soon."
        : "Thanks. Your request was saved and a representative from Summit Solutions will follow up once email notifications are fully connected."
    });
  } catch (error) {
    return json(response, 500, {
      error: "We could not send your quote request right now."
    });
  }
};
