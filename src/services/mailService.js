import nodemailer from "nodemailer";
import https from "https";
import { BrevoClient } from "@getbrevo/brevo";

// Initialize the client directly using your standard API key
const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

// export async function sendOtpEmail({ to, otp }) {
//   return new Promise((resolve, reject) => {
//     console.log(`📡 Sending email via Brevo REST API to: ${to}`);

//     const payloadString = JSON.stringify({
//       sender: {
//         name: "surelink",
//         email: "franklindery922@gmail.com",
//       },
//       to: [
//         {
//           email: to,
//         },
//       ],
//       subject: "Your SureLink Verification Code",
//       htmlContent: `<h3>Your verification code is: <b>${otp}</b></h3>`,
//     });

//     const options = {
//       hostname: "api.brevo.com",
//       port: 443,
//       path: "/v3/smtp/email", // This still works for REST API
//       method: "POST",
//       headers: {
//         accept: "application/json",
//         "api-key": process.env.BREVO_API_KEY, // ✅ REST API key goes here
//         "content-type": "application/json",
//         "content-length": Buffer.byteLength(payloadString),
//       },
//     };

//     const req = https.request(options, (res) => {
//       let dataBuffer = "";

//       res.on("data", (chunk) => {
//         dataBuffer += chunk;
//       });

//       res.on("end", () => {
//         console.log("📥 Response:", dataBuffer);

//         if (res.statusCode >= 200 && res.statusCode < 300) {
//           console.log("✅ Email sent successfully!");
//           resolve(JSON.parse(dataBuffer));
//         } else {
//           console.error("❌ Brevo API error:", dataBuffer);
//           reject(
//             new Error(
//               `Brevo rejected request with status ${res.statusCode}: ${dataBuffer}`,
//             ),
//           );
//         }
//       });
//     });

//     req.on("error", (networkError) => {
//       console.error("❌ Network error:", networkError.message);
//       reject(networkError);
//     });

//     req.write(payloadString);
//     req.end();
//   });
// }

// utils/emailService.js



// ==========================================
// HTML EMAIL TEMPLATES
// ==========================================

const getOtpEmailTemplate = ({ otp, userEmail, userName }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - SureLink</title>
      <style>
        /* Reset styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #f6f9fc;
          color: #1a1a1a;
          line-height: 1.6;
        }
        
        .container {
          max-width: 560px;
          margin: 0 auto;
          padding: 40px 20px;
          background-color: #ffffff;
        }
        
        .header {
          text-align: center;
          padding: 30px 0 20px 0;
          border-bottom: 2px solid #e8f0ff;
        }
        
        .logo {
          display: inline-block;
          font-size: 28px;
          font-weight: 700;
          color: #0057FF;
          text-decoration: none;
          letter-spacing: -0.5px;
        }
        
        .logo span {
          color: #1a1a1a;
        }
        
        .content {
          padding: 40px 30px;
          background-color: #ffffff;
          border-radius: 12px;
        }
        
        .greeting {
          font-size: 22px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 12px;
        }
        
        .message {
          color: #4a4a4a;
          font-size: 16px;
          margin-bottom: 28px;
        }
        
        .otp-container {
          background: linear-gradient(135deg, #f5f8ff 0%, #e8f0ff 100%);
          border-radius: 12px;
          padding: 30px 20px;
          text-align: center;
          margin: 24px 0 28px 0;
          border: 1px solid #d4e2fc;
        }
        
        .otp-label {
          font-size: 13px;
          font-weight: 600;
          color: #0057FF;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        
        .otp-code {
          font-size: 48px;
          font-weight: 700;
          color: #0057FF;
          letter-spacing: 12px;
          font-family: 'Courier New', monospace;
          background: #ffffff;
          padding: 12px 24px;
          border-radius: 8px;
          display: inline-block;
          box-shadow: 0 2px 8px rgba(0, 87, 255, 0.1);
        }
        
        .otp-expiry {
          font-size: 13px;
          color: #6b7280;
          margin-top: 12px;
        }
        
        .divider {
          border: none;
          height: 1px;
          background-color: #e8f0ff;
          margin: 28px 0;
        }
        
        .footer-message {
          font-size: 14px;
          color: #6b7280;
          margin-top: 8px;
        }
        
        .button {
          display: inline-block;
          background-color: #0057FF;
          color: #ffffff;
          padding: 14px 32px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          transition: background-color 0.3s;
        }
        
        .button:hover {
          background-color: #0045cc;
        }
        
        .security-note {
          background-color: #fef2f2;
          border-left: 4px solid #ef4444;
          padding: 16px 20px;
          border-radius: 6px;
          margin: 24px 0;
          font-size: 14px;
          color: #4a4a4a;
        }
        
        .security-note strong {
          color: #1a1a1a;
        }
        
        .footer {
          text-align: center;
          padding: 30px 20px 20px;
          border-top: 1px solid #e8f0ff;
          margin-top: 20px;
        }
        
        .footer-links {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        
        .footer-links a {
          color: #6b7280;
          text-decoration: none;
          font-size: 13px;
          transition: color 0.3s;
        }
        
        .footer-links a:hover {
          color: #0057FF;
        }
        
        .footer-text {
          color: #9ca3af;
          font-size: 12px;
          line-height: 1.5;
        }
        
        .footer-text strong {
          color: #6b7280;
        }
        
        .social-icons {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin: 16px 0;
        }
        
        .social-icons a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: #f3f4f6;
          color: #4a4a4a;
          text-decoration: none;
          transition: all 0.3s;
        }
        
        .social-icons a:hover {
          background-color: #0057FF;
          color: #ffffff;
        }
        
        @media (max-width: 480px) {
          .container {
            padding: 20px 16px;
          }
          
          .content {
            padding: 24px 16px;
          }
          
          .otp-code {
            font-size: 36px;
            letter-spacing: 8px;
            padding: 10px 16px;
          }
          
          .greeting {
            font-size: 20px;
          }
          
          .footer-links {
            gap: 16px;
            flex-direction: column;
            align-items: center;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header with Logo -->
        <div class="header">
          <a href="https://surelink.com" class="logo">
            Sure<span>Link</span>
          </a>
        </div>
        
        <!-- Main Content -->
        <div class="content">
          <!-- Greeting -->
          <h1 class="greeting">
            ${userName ? `Hi ${userName},` : 'Hello there!'}
          </h1>
          
          <!-- Message -->
          <p class="message">
            Thank you for choosing <strong>SureLink</strong>. To complete your verification, 
            please use the code below. This code will expire in <strong>10 minutes</strong>.
          </p>
          
          <!-- OTP Code -->
          <div class="otp-container">
            <div class="otp-label">Your Verification Code</div>
            <div class="otp-code">${otp}</div>
            <div class="otp-expiry">
              ⏱️ This code expires in 10 minutes
            </div>
          </div>
          
          <!-- Alternative Action -->
          <p class="message" style="font-size: 14px; text-align: center;">
            Or click the button below to verify instantly:
          </p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="https://surelink.com/verify?email=${userEmail}&code=${otp}" class="button">
              Verify Email
            </a>
          </div>
          
          <!-- Security Note -->
          <div class="security-note">
            <strong>🔒 Security Alert:</strong>
            <p style="margin-top: 4px; font-size: 14px;">
              If you didn't request this code, please ignore this email. 
              Never share this code with anyone. Our support team will never ask for your verification code.
            </p>
          </div>
          
          <hr class="divider" />
          
          <!-- Help Message -->
          <p class="footer-message" style="text-align: center;">
            Having trouble? <a href="https://surelink.com/support" style="color: #0057FF; text-decoration: none; font-weight: 500;">Contact our support team</a>
          </p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="social-icons">
            <a href="https://facebook.com/surelink" aria-label="Facebook">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://twitter.com/surelink" aria-label="Twitter">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://instagram.com/surelink" aria-label="Instagram">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://linkedin.com/company/surelink" aria-label="LinkedIn">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
          </div>
          
          <div class="footer-links">
            <a href="https://surelink.com/privacy">Privacy Policy</a>
            <a href="https://surelink.com/terms">Terms of Service</a>
            <a href="https://surelink.com/support">Help Center</a>
          </div>
          
          <p class="footer-text">
            © 2024 <strong>SureLink</strong>. All rights reserved.<br />
            <span style="font-size: 11px; color: #9ca3af;">
              This email was sent to <strong>${userEmail}</strong> because you requested 
              verification on SureLink.
            </span>
          </p>
          
          <p class="footer-text" style="margin-top: 8px; font-size: 11px;">
            <span style="color: #9ca3af;">
              If you did not request this verification, please ignore this email.
            </span>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ==========================================
// SEND OTP EMAIL
// ==========================================
export async function sendOtpEmail({ to, otp, userName }) {
  return new Promise((resolve, reject) => {
    console.log(`📡 Sending OTP email via Brevo REST API to: ${to}`);

    const htmlContent = getOtpEmailTemplate({
      otp,
      userEmail: to,
      userName: userName || 'there',
    });

    const payloadString = JSON.stringify({
      sender: {
        name: "SureLink",
        email: "franklindery922@gmail.com",
      },
      to: [
        {
          email: to,
        },
      ],
      subject: "🔐 Your SureLink Verification Code",
      htmlContent: htmlContent,
    });

    const options = {
      hostname: "api.brevo.com",
      port: 443,
      path: "/v3/smtp/email",
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
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
          console.log("✅ OTP email sent successfully!");
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

// ==========================================
// SEND WELCOME EMAIL
// ==========================================
export async function sendWelcomeEmail({ to, userName }) {
  const welcomeHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to SureLink</title>
      <style>
        /* Same styles as above but with welcome-specific content */
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc; color: #1a1a1a; line-height: 1.6; }
        .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; }
        .header { text-align: center; padding: 30px 0 20px 0; border-bottom: 2px solid #e8f0ff; }
        .logo { display: inline-block; font-size: 28px; font-weight: 700; color: #0057FF; text-decoration: none; letter-spacing: -0.5px; }
        .logo span { color: #1a1a1a; }
        .content { padding: 40px 30px; background-color: #ffffff; border-radius: 12px; }
        .greeting { font-size: 22px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; }
        .message { color: #4a4a4a; font-size: 16px; margin-bottom: 20px; }
        .welcome-banner { background: linear-gradient(135deg, #0057FF 0%, #0045cc 100%); border-radius: 12px; padding: 30px 20px; text-align: center; color: #ffffff; margin: 20px 0; }
        .button { display: inline-block; background-color: #0057FF; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
        .button:hover { background-color: #0045cc; }
        .features { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
        .feature-item { background-color: #f5f8ff; padding: 16px; border-radius: 8px; text-align: center; }
        .feature-item h4 { color: #0057FF; margin-bottom: 4px; font-size: 14px; }
        .feature-item p { color: #6b7280; font-size: 12px; margin: 0; }
        .footer { text-align: center; padding: 30px 20px 20px; border-top: 1px solid #e8f0ff; margin-top: 20px; }
        .footer-text { color: #9ca3af; font-size: 12px; line-height: 1.5; }
        @media (max-width: 480px) { .features { grid-template-columns: 1fr; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="https://surelink.com" class="logo">Sure<span>Link</span></a>
        </div>
        <div class="content">
          <h1 class="greeting">🎉 Welcome to SureLink, ${userName || 'there'}!</h1>
          <p class="message">
            We're excited to have you on board. You've taken the first step towards 
            connecting with trusted professionals in your area.
          </p>
          <div class="welcome-banner">
            <h2 style="margin: 0 0 8px 0; font-size: 20px;">Get Started Today</h2>
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">
              Find the right service provider for your needs
            </p>
          </div>
          <div class="features">
            <div class="feature-item">
              <h4>🔍 Find Providers</h4>
              <p>Browse verified professionals</p>
            </div>
            <div class="feature-item">
              <h4>📅 Book Services</h4>
              <p>Schedule with ease</p>
            </div>
            <div class="feature-item">
              <h4>💬 Chat Securely</h4>
              <p>Communicate directly</p>
            </div>
            <div class="feature-item">
              <h4>⭐ Rate & Review</h4>
              <p>Share your experience</p>
            </div>
          </div>
          <div style="text-align: center;">
            <a href="https://surelink.com" class="button">Explore Services</a>
          </div>
        </div>
        <div class="footer">
          <p class="footer-text">
            © 2024 <strong>SureLink</strong>. All rights reserved.<br />
            <span style="font-size: 11px; color: #9ca3af;">
              This email was sent to <strong>${to}</strong>.
            </span>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Similar implementation as sendOtpEmail but with welcomeHtml
  // ... (same structure as sendOtpEmail)
}
