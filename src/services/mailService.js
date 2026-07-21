import nodemailer from "nodemailer";
import https from "https";
import { BrevoClient } from "@getbrevo/brevo";

// Initialize the client directly using your standard API key
const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

export async function sendOtpEmail({ to, otp }) {
  return new Promise((resolve, reject) => {
    console.log(`📡 Sending email via Brevo REST API to: ${to}`);

    const payloadString = JSON.stringify({
      sender: {
        name: "surelink",
        email: "franklindery922@gmail.com",
      },
      to: [
        {
          email: to,
        },
      ],
      subject: "Your SureLink Verification Code",
      htmlContent: `<h3>Your verification code is: <b>${otp}</b></h3>`,
    });

    const options = {
      hostname: "api.brevo.com",
      port: 443,
      path: "/v3/smtp/email", // This still works for REST API
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY, // ✅ REST API key goes here
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payloadString),
      },
    };

    const req = https.request(options, (res) => {
      let dataBuffer = "";

      res.on("data", (chunk) => {
        dataBuffer += chunk;
      });

      res.on("end", () => {
        console.log("📥 Response:", dataBuffer);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log("✅ Email sent successfully!");
          resolve(JSON.parse(dataBuffer));
        } else {
          console.error("❌ Brevo API error:", dataBuffer);
          reject(
            new Error(
              `Brevo rejected request with status ${res.statusCode}: ${dataBuffer}`,
            ),
          );
        }
      });
    });

    req.on("error", (networkError) => {
      console.error("❌ Network error:", networkError.message);
      reject(networkError);
    });

    req.write(payloadString);
    req.end();
  });
}
