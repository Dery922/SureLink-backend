import https from "https";

/**
 * Transactional email delivery via the Brevo (Sendinblue) REST API.
 *
 * Ported from the team's `frank-server` implementation, trimmed to use only the
 * built-in `https` module so it needs no SDK dependency (`@getbrevo/brevo` and
 * `nodemailer` were imported there but unused). Requires `BREVO_API_KEY`; the
 * sender is configurable via `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME`.
 */
const BREVO_HOST = "api.brevo.com";
const BREVO_PATH = "/v3/smtp/email";
const DEFAULT_SENDER_EMAIL = "franklindery922@gmail.com";
const DEFAULT_SENDER_NAME = "SureLink";

/**
 * Send a one-time passcode to an email address.
 *
 * Resolves with Brevo's JSON response on 2xx, rejects on missing key, network
 * error, or non-2xx status. Callers should wrap this so a delivery failure does
 * not block the auth flow.
 */
export async function sendOtpEmail({ to, otp }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  const payloadString = JSON.stringify({
    sender: {
      name: process.env.BREVO_SENDER_NAME || DEFAULT_SENDER_NAME,
      email: process.env.BREVO_SENDER_EMAIL || DEFAULT_SENDER_EMAIL,
    },
    to: [{ email: to }],
    subject: "Your SureLink Verification Code",
    htmlContent: `<h3>Your verification code is: <b>${otp}</b></h3>`,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: BREVO_HOST,
      port: 443,
      path: BREVO_PATH,
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payloadString),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body ? JSON.parse(body) : {});
        } else {
          reject(new Error(`Brevo rejected request (status ${res.statusCode}): ${body}`));
        }
      });
    });

    req.on("error", reject);
    req.write(payloadString);
    req.end();
  });
}
