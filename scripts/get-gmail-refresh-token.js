const http = require("http");
const { google } = require("googleapis");

const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;
const scope = process.env.GMAIL_SCOPE || "https://www.googleapis.com/auth/gmail.send";
const port = Number(process.env.GMAIL_OAUTH_PORT || 48231);
const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;

if (!clientId || !clientSecret) {
  console.error("Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [scope]
});

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);

  if (url.pathname !== "/oauth2callback") {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    response.statusCode = 400;
    response.end(`Authorization failed: ${error}`);
    console.error(`Authorization failed: ${error}`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    response.statusCode = 400;
    response.end("Missing authorization code.");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    response.end("Authorization received. You can close this tab and return to Codex.");

    console.log("");
    console.log("Refresh token:");
    console.log(tokens.refresh_token || "");
    console.log("");

    if (!tokens.refresh_token) {
      console.log("No refresh token was returned.");
      console.log("If you previously approved this app, revoke access for it in your Google account and run this again.");
    }
  } catch (tokenError) {
    response.statusCode = 500;
    response.end("Failed to exchange the authorization code for tokens.");
    console.error("");
    console.error("Failed to exchange the authorization code for tokens.");
    console.error(tokenError.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("");
  console.log(`Listening on ${redirectUri}`);
  console.log("Open this URL in your browser and approve access:");
  console.log(authUrl);
  console.log("");
  console.log("After approval, Google should redirect back automatically and print the refresh token here.");
  console.log("");
});
