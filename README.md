# Summit Solutions Site

Static marketing site and Vercel-ready quote form for Summit Solutions.

## Form integrations

The frontend quote form submits to `/api/quote`.

To enable live delivery, set these Vercel environment variables:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_FROM`
- `NOTIFICATION_EMAIL`
- `GMAIL_SCOPE`
- `GOOGLE_SHEETS_CLIENT_EMAIL`
- `GOOGLE_SHEETS_PRIVATE_KEY`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_TAB_NAME`

## Suggested setup

1. Create or open your Google Sheet for leads.
2. Share the Sheet with the Google service account email so it can append rows.
3. Add the service account email, private key, and spreadsheet ID to Vercel env vars.
4. Add the Gmail OAuth client ID, client secret, Gmail sender, and notification email to Vercel env vars.
5. Generate a Gmail refresh token for the Google account that will send notifications.

## Local deployment notes

This project is designed to be hosted on Vercel as a static site with one serverless function in `api/quote.js`.

## Getting a Gmail refresh token

Run this from the project folder:

```bash
GMAIL_CLIENT_ID=your_client_id \
GMAIL_CLIENT_SECRET=your_client_secret \
node scripts/get-gmail-refresh-token.js
```

The script will print a Google authorization URL. Open it, approve the Gmail send scope, copy the authorization code Google returns, and paste it back into the terminal. The script will then print the refresh token you should store in Vercel as `GMAIL_REFRESH_TOKEN`.

If Google rejects the request, make sure your Google OAuth client allows the redirect URI:

```text
http://127.0.0.1:48231/oauth2callback
```

The updated helper script starts a temporary localhost listener and Google redirects back automatically after approval.
# Summit-Website
