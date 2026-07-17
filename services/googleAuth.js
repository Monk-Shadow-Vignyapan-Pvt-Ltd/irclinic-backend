import express from "express";
import { google } from "googleapis";

const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Step 1: Redirect user to Google
router.get("/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // Required for refresh token
    prompt: "consent",      // Forces Google to return a refresh token
    scope: [
      "https://www.googleapis.com/auth/calendar"
    ],
  });

  res.redirect(url);
});

// Step 2: Google redirects back here
router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query;

    const { tokens } = await oauth2Client.getToken(code);

    console.log("Access Token:", tokens.access_token);
    console.log("Refresh Token:", tokens.refresh_token);

    res.send(`
      <h2>Authentication Successful</h2>
      <p>Check your terminal.</p>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

export default router;